package challenge

import (
	"fmt"
	"strings"
	"time"

	"github.com/scipio/vimdao-extract/detect"
	"github.com/scipio/vimdao-extract/extract"
	"github.com/scipio/vimdao-extract/translate"
)

// Generate produces a ChallengeSet from an extracted book.
func Generate(book *extract.ExtractedBook, bookSlug string) *ChallengeSet {
	cs := &ChallengeSet{
		SourceBook:  book.BookTitle,
		GeneratedAt: time.Now().Format(time.RFC3339),
	}

	abbr := slugAbbrev(bookSlug)

	for _, ch := range book.Chapters {
		for _, sec := range ch.Sections {
			for i, cb := range sec.CodeBlocks {
				if cb.Before == "" || cb.After == "" {
					continue
				}
				if cb.Before == cb.After {
					continue
				}

				challenge := buildChallenge(abbr, ch, sec, cb, i)
				cs.Challenges = append(cs.Challenges, challenge)
			}
		}
	}

	return cs
}

func buildChallenge(abbr string, ch extract.Chapter, sec extract.Section,
	cb extract.CodeBlock, seqIdx int) Challenge {

	id := fmt.Sprintf("%s-tip%02d-%03d", abbr, sec.TipNumber, seqIdx+1)

	cmds := detect.DetectCommands(cb.Keystrokes)
	cmdStrs := detect.CommandStrings(cmds)
	merged := detect.MergeCommands(cmds)
	mergedStrs := detect.CommandStrings(merged)

	category := dominantCategory(cmds)
	titleZh := buildTitleZh(sec.Title, mergedStrs)
	descZh := buildDescriptionZh(mergedStrs, cb.Keystrokes)
	hintText := buildHintTextZh(mergedStrs)
	conceptsZh := buildConceptsZh(cmds)

	needsTranslation := titleZh == sec.Title

	return Challenge{
		ID: id,
		Source: ChallengeSource{
			Book:      abbr,
			Chapter:   ch.ChapterID,
			Section:   sec.SectionID,
			TipNumber: sec.TipNumber,
		},
		TitleZh:          titleZh,
		TitleEn:          sec.Title,
		DescZh:           descZh,
		DescEn:           sec.Title,
		Category:         category,
		Difficulty:       ScoreDifficulty(cb.Keystrokes, cmdStrs),
		InitialText:      cb.Before,
		ExpectedText:     cb.After,
		CursorStart:      CursorPos{Line: 0, Col: 0}, // TODO: extract cursor position from keystroke table's highlighted char
		HintCommands:     mergedStrs,
		HintText:         hintText,
		Tags:             mergedStrs,
		ConceptsZh:       conceptsZh,
		NeedsTranslation: needsTranslation,
	}
}

func buildTitleZh(tipTitle string, cmds []string) string {
	var descs []string
	for _, cmd := range cmds {
		if d := translate.CommandDesc(cmd); d != "" {
			descs = append(descs, cmd+" ("+d+")")
			if len(descs) >= 2 {
				break
			}
		}
	}
	if len(descs) > 0 {
		return "練習：" + strings.Join(descs, "、")
	}
	return tipTitle
}

func buildDescriptionZh(cmds []string, keystrokes string) string {
	var parts []string
	for _, cmd := range cmds {
		if d := translate.CommandDesc(cmd); d != "" {
			parts = append(parts, fmt.Sprintf("用 %s %s", cmd, d))
		}
	}
	if len(parts) > 0 {
		return "使用 " + strings.Join(parts, "，") + "。按鍵序列：" + keystrokes
	}
	return "按鍵序列：" + keystrokes
}

func buildHintTextZh(cmds []string) string {
	var steps []string
	for i, cmd := range cmds {
		if d := translate.CommandDesc(cmd); d != "" {
			steps = append(steps, fmt.Sprintf("%d. %s — %s", i+1, cmd, d))
		}
	}
	return strings.Join(steps, "\n")
}

func buildConceptsZh(cmds []detect.CommandInfo) []string {
	seen := make(map[string]bool)
	var concepts []string
	for _, cmd := range cmds {
		cat := string(cmd.Category)
		concept := translate.ConceptZh(cat)
		if concept != "" && !seen[concept] {
			seen[concept] = true
			concepts = append(concepts, concept)
		}
	}
	return concepts
}

func dominantCategory(cmds []detect.CommandInfo) string {
	counts := make(map[string]int)
	total := 0
	for _, cmd := range cmds {
		cat := string(cmd.Category)
		if cat == "other" {
			continue
		}
		counts[cat]++
		total++
	}

	if total == 0 {
		return "other"
	}

	best := ""
	bestCount := 0
	for cat, count := range counts {
		if count > bestCount {
			bestCount = count
			best = cat
		}
	}

	// If one category holds >70% of non-other commands, use it directly
	if len(counts) >= 2 && float64(bestCount)/float64(total) <= 0.7 {
		return "combo"
	}
	return best
}

func slugAbbrev(slug string) string {
	switch {
	case strings.Contains(slug, "practical"):
		return "pv"
	case strings.Contains(slug, "lazyvim"):
		return "lv"
	default:
		if len(slug) > 4 {
			return slug[:4]
		}
		return slug
	}
}
