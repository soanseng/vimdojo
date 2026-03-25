package challenge

import (
	"fmt"
	"time"

	"github.com/scipio/vimdao-extract/extract"
	"github.com/scipio/vimdao-extract/translate"
)

// GenerateReference produces reference cards from LazyVim keybindings.
func GenerateReference(book *extract.LazyVimBook) *ReferenceSet {
	rs := &ReferenceSet{
		SourceBook:  book.BookTitle,
		GeneratedAt: time.Now().Format(time.RFC3339),
	}

	seen := make(map[string]bool)
	seq := 0

	for _, kb := range book.Keybindings {
		if seen[kb.Keys] {
			continue
		}
		seen[kb.Keys] = true
		seq++

		titleZh := translate.CommandDesc(kb.Keys)
		descZh := kb.DescriptionEn
		needsTranslation := true

		if titleZh != "" {
			needsTranslation = false
			descZh = titleZh
		}
		if titleZh == "" {
			titleZh = kb.DescriptionEn
		}

		card := ReferenceCard{
			ID:               fmt.Sprintf("lv-ref-%03d", seq),
			Keys:             kb.Keys,
			TitleZh:          titleZh,
			TitleEn:          kb.DescriptionEn,
			DescZh:           descZh,
			DescEn:           kb.DescriptionEn,
			Category:         kb.Category,
			Requires:         kb.Requires,
			Plugin:           kb.Plugin,
			Chapter:          kb.Chapter,
			NeedsTranslation: needsTranslation,
		}

		rs.Cards = append(rs.Cards, card)
	}

	return rs
}
