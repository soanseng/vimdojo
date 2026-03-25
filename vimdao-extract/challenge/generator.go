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

	// Second pass: mark BOSS challenges and assign XP rewards.
	// The last challenge per chapter is BOSS.
	lastByChapter := make(map[int]int) // chapter -> index of last challenge
	for i, c := range cs.Challenges {
		lastByChapter[c.Source.Chapter] = i
	}
	bossIndices := make(map[int]bool)
	for _, idx := range lastByChapter {
		bossIndices[idx] = true
	}
	for i := range cs.Challenges {
		if bossIndices[i] {
			cs.Challenges[i].IsBoss = true
			cs.Challenges[i].XpReward = 80
		} else {
			cs.Challenges[i].XpReward = 15
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

	// cmdStrs preserves detection order (sequence of operations)
	// mergedStrs is deduplicated+sorted (for tags/categorization)
	category := dominantCategory(cmds)

	// Use ordered commands (cmdStrs) for hints — shows the actual sequence
	// Use deduplicated (mergedStrs) for tags — for filtering/categorization
	orderedUnique := uniquePreserveOrder(cmdStrs)
	titleZh := buildTitleZh(sec.Title, orderedUnique)
	descZh := buildDescriptionZh(orderedUnique, cb.Keystrokes)
	hintText := buildHintTextZh(orderedUnique, cb.Keystrokes)
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
		HintCommands:     orderedUnique,
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
	// Build a natural-language description based on the operation sequence
	var steps []string
	for _, cmd := range cmds {
		if d := translate.CommandDesc(cmd); d != "" {
			steps = append(steps, fmt.Sprintf("%s（%s）", cmd, d))
		}
	}
	if len(steps) > 0 {
		return "依序按 " + strings.Join(steps, " → ") + "\n按鍵序列：" + keystrokes
	}
	return "按鍵序列：" + keystrokes
}

func buildHintTextZh(cmds []string, keystrokes string) string {
	var steps []string
	stepNum := 0
	for _, cmd := range cmds {
		if d := translate.CommandDesc(cmd); d != "" {
			stepNum++
			steps = append(steps, fmt.Sprintf("步驟 %d：按 %s — %s", stepNum, cmd, d))
		}
	}
	if len(steps) > 0 {
		return strings.Join(steps, "\n") + "\n\n完整按鍵：" + keystrokes
	}
	return "完整按鍵：" + keystrokes
}

// uniquePreserveOrder deduplicates while preserving first-occurrence order.
func uniquePreserveOrder(strs []string) []string {
	seen := make(map[string]bool)
	var result []string
	for _, s := range strs {
		if !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}
	return result
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
