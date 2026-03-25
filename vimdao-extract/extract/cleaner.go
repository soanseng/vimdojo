package extract

import (
	"bytes"
	"regexp"
	"strings"

	"golang.org/x/net/html"
)

// PageContent represents parsed content from a single XHTML page.
type PageContent struct {
	ChapterNumber int
	ChapterTitle  string
	TipNumber     int
	TipTitle      string
	BodyText      string
	CodeBlocks    []string         // standalone code blocks
	KeystrokeTables []KeystrokeTable // keystroke/buffer tables
	IsChapterPage bool
	IsTipPage     bool
	IsFrontMatter bool
	IsBackMatter  bool
}

// KeystrokeTable is a parsed "Keystrokes | Buffer Contents" table.
type KeystrokeTable struct {
	Steps []KeystrokeStep
}

// skipTitles are front/back matter pages to skip.
var skipTitles = map[string]bool{
	"Table of Contents":    true,
	"Index":                true,
	"Copyright":            true,
	"Acknowledgments":      true,
	"Bibliography":         true,
	"About the Pragmatic Bookshelf": true,
}

var (
	reWhitespace = regexp.MustCompile(`\s+`)
	reTipNumber  = regexp.MustCompile(`^Tip\s+(\d+)$`)
	reChapterNum = regexp.MustCompile(`(?s)Chapter\s+(\d+)`)
)

// ParsePage extracts structured content from an XHTML page.
func ParsePage(xhtmlBytes []byte) (*PageContent, error) {
	doc, err := html.Parse(bytes.NewReader(xhtmlBytes))
	if err != nil {
		return nil, err
	}

	pc := &PageContent{}

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch {
			case isChapterTitle(n):
				pc.IsChapterPage = true
				pc.ChapterNumber, pc.ChapterTitle = parseChapterHeading(n)
			case isTipHeader(n):
				pc.IsTipPage = true
				pc.TipNumber, pc.TipTitle = parseTipHeader(n)
			case isKeystrokeTable(n):
				table := parseKeystrokeTable(n)
				if len(table.Steps) > 0 {
					pc.KeystrokeTables = append(pc.KeystrokeTables, table)
				}
				return // don't recurse into table
			case isCodeBlock(n):
				code := extractCodeBlock(n)
				if code != "" {
					pc.CodeBlocks = append(pc.CodeBlocks, code)
				}
				return
			}
		}

		// Collect body text from paragraphs
		if n.Type == html.ElementNode && n.Data == "p" {
			text := extractText(n)
			text = strings.TrimSpace(text)
			if text != "" {
				if pc.BodyText != "" {
					pc.BodyText += "\n"
				}
				pc.BodyText += text
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// Check skip pages — only skip pages that aren't already identified as
	// numbered chapters (e.g., "Index and Navigate Source Code with ctags" is Ch16)
	if pc.ChapterNumber == 0 && pc.TipNumber == 0 {
		for title := range skipTitles {
			if strings.EqualFold(strings.TrimSpace(pc.ChapterTitle), title) ||
				strings.EqualFold(strings.TrimSpace(pc.TipTitle), title) {
				pc.IsFrontMatter = true
			}
		}
	}

	return pc, nil
}

func isChapterTitle(n *html.Node) bool {
	if n.Data != "h1" {
		return false
	}
	return hasClass(n, "chapter-title")
}

// isLazyVimChapter detects LazyVim book chapter format:
// <section class="chapter"><h1 class="chapter-title"><small class="subtitle">6. Basic Editing</small></h1>
func isLazyVimChapter(n *html.Node) bool {
	if n.Data != "section" {
		return false
	}
	return hasClass(n, "chapter")
}

// parseLazyVimChapter extracts chapter number and title from LazyVim format.
func parseLazyVimChapter(n *html.Node) (int, string) {
	var num int
	var title string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "h1" && hasClass(n, "chapter-title") {
			text := strings.TrimSpace(extractText(n))
			// Format: "6. Basic Editing"
			if idx := strings.Index(text, ". "); idx > 0 {
				num = atoi(text[:idx])
				title = strings.TrimSpace(text[idx+2:])
			} else {
				title = text
			}
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)
	return num, title
}

// parseLazyVimSections extracts subsections from a LazyVim chapter node.
func parseLazyVimSections(chapterNode *html.Node) []lazyVimSection {
	var sections []lazyVimSection

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "section" && hasClass(n, "sect2") {
			sec := parseLazyVimSubSection(n)
			sections = append(sections, sec)
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(chapterNode)

	return sections
}

type lazyVimSection struct {
	ID         string
	Title      string
	BodyText   string
	InlineCmds []string // Vim commands found in <code class="literal">
}

func parseLazyVimSubSection(n *html.Node) lazyVimSection {
	sec := lazyVimSection{}

	// Get ID from the h2 element
	var findH2 func(*html.Node)
	findH2 = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "h2" {
			sec.Title = strings.TrimSpace(extractText(n))
			for _, attr := range n.Attr {
				if attr.Key == "id" {
					sec.ID = attr.Val
				}
			}
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findH2(c)
		}
	}
	findH2(n)

	// Extract body text and inline code
	var walkContent func(*html.Node)
	walkContent = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "p" {
			text := strings.TrimSpace(extractText(n))
			if text != "" {
				if sec.BodyText != "" {
					sec.BodyText += "\n"
				}
				sec.BodyText += text
			}
		}
		if n.Type == html.ElementNode && n.Data == "code" && hasClass(n, "literal") {
			cmd := strings.TrimSpace(extractText(n))
			if cmd != "" {
				sec.InlineCmds = append(sec.InlineCmds, cmd)
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walkContent(c)
		}
	}
	walkContent(n)

	return sec
}

func isTipHeader(n *html.Node) bool {
	if n.Data != "table" {
		return false
	}
	return hasClass(n, "arr-recipe")
}

func isKeystrokeTable(n *html.Node) bool {
	if n.Data != "table" {
		return false
	}
	if !hasClass(n, "simpletable") || !hasClass(n, "hlines") {
		return false
	}
	// Check if it has "Keystrokes" header
	text := extractText(n)
	return strings.Contains(text, "Keystrokes") && strings.Contains(text, "Buffer Contents")
}

func isCodeBlock(n *html.Node) bool {
	if n.Data != "table" {
		return false
	}
	return hasClass(n, "processedcode")
}

func parseChapterHeading(n *html.Node) (int, string) {
	var chNum int
	var chName string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && hasClass(n, "chapter-number") {
			numText := extractText(n)
			matches := reChapterNum.FindStringSubmatch(numText)
			if len(matches) > 1 {
				chNum = atoi(matches[1])
			}
		}
		if n.Type == html.ElementNode && hasClass(n, "chapter-name") {
			chName = strings.TrimSpace(extractText(n))
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)

	return chNum, chName
}

func parseTipHeader(n *html.Node) (int, string) {
	var tipNum int
	var tipName string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && hasClass(n, "arr-recipe-number") {
			numText := extractText(n)
			matches := reTipNumber.FindStringSubmatch(strings.TrimSpace(numText))
			if len(matches) > 1 {
				tipNum = atoi(matches[1])
			}
		}
		if n.Type == html.ElementNode && hasClass(n, "arr-recipe-name") {
			tipName = strings.TrimSpace(extractText(n))
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)

	return tipNum, tipName
}

func parseKeystrokeTable(n *html.Node) KeystrokeTable {
	var table KeystrokeTable
	var rows []*html.Node

	// Find all <tr> in tbody
	var findRows func(*html.Node)
	findRows = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "tbody" {
			for c := n.FirstChild; c != nil; c = c.NextSibling {
				if c.Type == html.ElementNode && c.Data == "tr" {
					rows = append(rows, c)
				}
			}
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findRows(c)
		}
	}
	findRows(n)

	for _, row := range rows {
		var cells []*html.Node
		for c := row.FirstChild; c != nil; c = c.NextSibling {
			if c.Type == html.ElementNode && c.Data == "td" {
				cells = append(cells, c)
			}
		}
		if len(cells) < 2 {
			continue
		}

		keystroke := extractKeystroke(cells[0])
		bufContent := extractCodeFromCell(cells[1])

		table.Steps = append(table.Steps, KeystrokeStep{
			Keystroke:     keystroke,
			BufferContent: bufContent,
		})
	}

	return table
}

// extractKeystroke pulls keystroke text from a table cell.
func extractKeystroke(cell *html.Node) string {
	var parts []string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			if hasClass(n, "keystroke") {
				parts = append(parts, extractText(n))
				return
			}
			if hasClass(n, "ic") { // inline code like {start}, ;<Esc>
				parts = append(parts, extractText(n))
				return
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(cell)

	return strings.TrimSpace(strings.Join(parts, ""))
}

// extractCodeFromCell pulls code lines from a processedcode table inside a cell.
func extractCodeFromCell(cell *html.Node) string {
	var lines []string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "table" && hasClass(n, "processedcode") {
			// Each <tr> is a code line
			for tr := n.FirstChild; tr != nil; tr = tr.NextSibling {
				if tr.Type == html.ElementNode && (tr.Data == "tr" || tr.Data == "tbody") {
					if tr.Data == "tbody" {
						for inner := tr.FirstChild; inner != nil; inner = inner.NextSibling {
							if inner.Type == html.ElementNode && inner.Data == "tr" {
								line := extractCodeLine(inner)
								lines = append(lines, line)
							}
						}
					} else {
						line := extractCodeLine(tr)
						lines = append(lines, line)
					}
				}
			}
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(cell)

	return strings.Join(lines, "\n")
}

func extractCodeBlock(n *html.Node) string {
	var lines []string
	for tr := n.FirstChild; tr != nil; tr = tr.NextSibling {
		if tr.Type == html.ElementNode && (tr.Data == "tr" || tr.Data == "tbody") {
			if tr.Data == "tbody" {
				for inner := tr.FirstChild; inner != nil; inner = inner.NextSibling {
					if inner.Type == html.ElementNode && inner.Data == "tr" {
						line := extractCodeLine(inner)
						lines = append(lines, line)
					}
				}
			} else {
				line := extractCodeLine(tr)
				lines = append(lines, line)
			}
		}
	}
	return strings.Join(lines, "\n")
}

// extractCodeLine gets text from a <td class="codeline"> inside a <tr>.
func extractCodeLine(tr *html.Node) string {
	for td := tr.FirstChild; td != nil; td = td.NextSibling {
		if td.Type == html.ElementNode && td.Data == "td" && hasClass(td, "codeline") {
			return normalizeText(extractText(td))
		}
	}
	return ""
}

// textNormalizer is a package-level Replacer for Unicode normalization.
var textNormalizer = strings.NewReplacer(
	"\u200b", "", // zero-width space
	"\u200c", "", // zero-width non-joiner
	"\u200d", "", // zero-width joiner
	"\ufeff", "", // BOM / zero-width no-break space
	"\u2002", " ", // en space → regular space
	"\u2003", " ", // em space → regular space
	"\u00a0", " ", // non-breaking space → regular space
	"\u2009", " ", // thin space → regular space
	"\u202f", " ", // narrow no-break space → regular space
)

// normalizeText cleans up Unicode special characters from extracted text.
func normalizeText(s string) string {
	return textNormalizer.Replace(s)
}

// extractText recursively collects all text content from a node.
func extractText(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}
	var sb strings.Builder
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		sb.WriteString(extractText(c))
	}
	return sb.String()
}

func hasClass(n *html.Node, class string) bool {
	for _, attr := range n.Attr {
		if attr.Key == "class" {
			for _, c := range strings.Fields(attr.Val) {
				if c == class {
					return true
				}
			}
		}
	}
	return false
}

func atoi(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}
