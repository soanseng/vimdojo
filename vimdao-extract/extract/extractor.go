package extract

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"golang.org/x/net/html"

	"github.com/scipio/vimdao-extract/detect"
	"github.com/scipio/vimdao-extract/epub"
)

// ExtractBook processes an EPUB book into structured extraction results.
// It auto-detects the book format (Practical Vim vs LazyVim).
func ExtractBook(book *epub.Book) (*ExtractedBook, error) {
	format := detectBookFormat(book)

	var chapters []Chapter
	var err error

	switch format {
	case formatPracticalVim:
		chapters, err = extractPracticalVim(book)
	case formatLazyVim:
		chapters, err = extractLazyVim(book)
	default:
		chapters, err = extractPracticalVim(book)
	}
	if err != nil {
		return nil, err
	}

	return &ExtractedBook{
		BookTitle:     book.Title,
		Author:        book.Author,
		TotalChapters: len(chapters),
		ExtractedAt:   time.Now().Format(time.RFC3339),
		Chapters:      chapters,
	}, nil
}

type bookFormat int

const (
	formatPracticalVim bookFormat = iota
	formatLazyVim
)

func detectBookFormat(book *epub.Book) bookFormat {
	// Check first few content pages for format indicators
	for i, item := range book.Items {
		if i > 5 {
			break
		}
		content := string(item.Content)
		if strings.Contains(content, "arr-recipe") {
			return formatPracticalVim
		}
		if strings.Contains(content, `class="chapter"`) && strings.Contains(content, `class="sect2"`) {
			return formatLazyVim
		}
	}
	return formatPracticalVim
}

func extractPracticalVim(book *epub.Book) ([]Chapter, error) {
	var chapters []Chapter
	var currentChapter *Chapter

	for _, item := range book.Items {
		pc, err := ParsePage(item.Content)
		if err != nil {
			return nil, fmt.Errorf("failed to parse %s: %w", item.Href, err)
		}

		if pc.IsFrontMatter || pc.IsBackMatter {
			continue
		}

		if pc.IsChapterPage && pc.ChapterNumber > 0 {
			if currentChapter != nil {
				if currentChapter.Sections == nil {
					currentChapter.Sections = []Section{}
				}
				chapters = append(chapters, *currentChapter)
			}
			currentChapter = &Chapter{
				ChapterID: pc.ChapterNumber,
				Title:     pc.ChapterTitle,
				Sections:  []Section{},
			}
			continue
		}

		if pc.IsChapterPage && pc.ChapterNumber == 0 {
			continue
		}

		if pc.IsTipPage && pc.TipNumber > 0 && currentChapter != nil {
			section := buildSection(pc, currentChapter.ChapterID)
			currentChapter.Sections = append(currentChapter.Sections, section)
			if section.HasVimContent() {
				currentChapter.HasVimContent = true
			}
		}
	}

	if currentChapter != nil {
		chapters = append(chapters, *currentChapter)
	}

	return chapters, nil
}

func extractLazyVim(book *epub.Book) ([]Chapter, error) {
	var chapters []Chapter

	// LazyVim skip titles
	lvSkip := map[string]bool{
		"preamble": true, "about the author": true,
		"where to go next": true,
	}

	for _, item := range book.Items {
		doc, err := parseHTML(item.Content)
		if err != nil {
			return nil, fmt.Errorf("failed to parse %s: %w", item.Href, err)
		}

		// Find <section class="chapter"> nodes
		var findChapter func(*html.Node)
		findChapter = func(n *html.Node) {
			if n.Type == html.ElementNode && isLazyVimChapter(n) {
				chNum, chTitle := parseLazyVimChapter(n)
				if chTitle == "" || lvSkip[strings.ToLower(chTitle)] {
					return
				}

				ch := Chapter{
					ChapterID: chNum,
					Title:     chTitle,
				}

				// Parse subsections
				lvSections := parseLazyVimSections(n)
				sectionNum := 0
				for _, lvSec := range lvSections {
					sectionNum++
					sectionID := fmt.Sprintf("%d.%d", chNum, sectionNum)

					// Detect vim commands from inline code
					var allCmds []detect.CommandInfo
					for _, cmd := range lvSec.InlineCmds {
						cmds := detect.DetectCommands(cmd)
						allCmds = append(allCmds, cmds...)
					}
					textCmds := detect.DetectFromText(lvSec.BodyText)
					allCmds = append(allCmds, textCmds...)
					merged := detect.MergeCommands(allCmds)

					sec := Section{
						SectionID:   sectionID,
						Title:       lvSec.Title,
						RawText:     lvSec.BodyText,
						VimCommands: detect.CommandStrings(merged),
						WordCount:   countWords(lvSec.BodyText),
					}

					ch.Sections = append(ch.Sections, sec)
					if sec.HasVimContent() {
						ch.HasVimContent = true
					}
				}

				if len(ch.Sections) > 0 {
					chapters = append(chapters, ch)
				}
				return
			}
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				findChapter(c)
			}
		}
		findChapter(doc)
	}

	return chapters, nil
}

func parseHTML(content []byte) (*html.Node, error) {
	return html.Parse(bytes.NewReader(content))
}

func buildSection(pc *PageContent, chapterID int) Section {
	sectionID := fmt.Sprintf("%d.%d", chapterID, pc.TipNumber)

	// Build code blocks from keystroke tables
	var codeBlocks []CodeBlock
	for _, kt := range pc.KeystrokeTables {
		cb := keystrokeTableToCodeBlock(kt)
		if cb != nil {
			codeBlocks = append(codeBlocks, *cb)
		}
	}

	// Detect vim commands from all keystrokes
	var allCommands []detect.CommandInfo
	for _, kt := range pc.KeystrokeTables {
		for _, step := range kt.Steps {
			cmds := detect.DetectCommands(step.Keystroke)
			allCommands = append(allCommands, cmds...)
		}
	}
	// Also detect from body text for commands mentioned but not in tables
	textCmds := detect.DetectFromText(pc.BodyText)
	allCommands = append(allCommands, textCmds...)

	merged := detect.MergeCommands(allCommands)

	return Section{
		SectionID:   sectionID,
		TipNumber:   pc.TipNumber,
		Title:       pc.TipTitle,
		RawText:     pc.BodyText,
		CodeBlocks:  codeBlocks,
		VimCommands: detect.CommandStrings(merged),
		WordCount:   countWords(pc.BodyText),
	}
}

// keystrokeTableToCodeBlock converts a keystroke table into a CodeBlock
// by using the first step's buffer as "before" and the last step's buffer as "after",
// and concatenating all keystrokes.
func keystrokeTableToCodeBlock(kt KeystrokeTable) *CodeBlock {
	if len(kt.Steps) < 2 {
		return nil
	}

	// First step is usually {start}
	before := kt.Steps[0].BufferContent
	after := kt.Steps[len(kt.Steps)-1].BufferContent

	// Skip tables where before == after (no change demonstrated)
	if before == after {
		return nil
	}

	// Collect all keystrokes (skip {start})
	var keystrokes []string
	for _, step := range kt.Steps {
		ks := strings.TrimSpace(step.Keystroke)
		if ks == "" || ks == "{start}" {
			continue
		}
		keystrokes = append(keystrokes, ks)
	}

	// Build description from keystrokes
	ksStr := strings.Join(keystrokes, "")

	return &CodeBlock{
		Before:     before,
		After:      after,
		Keystrokes: ksStr,
	}
}

func (s Section) HasVimContent() bool {
	return len(s.CodeBlocks) > 0 || len(s.VimCommands) > 0
}

func countWords(s string) int {
	return len(strings.Fields(s))
}
