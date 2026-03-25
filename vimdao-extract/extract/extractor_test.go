package extract

import (
	"testing"
)

func TestExtractPracticalVim(t *testing.T) {
	book := loadTestBook(t)

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	t.Logf("Book: %s by %s", result.BookTitle, result.Author)
	t.Logf("Chapters: %d", result.TotalChapters)

	if result.TotalChapters == 0 {
		t.Fatal("expected at least some chapters")
	}

	totalTips := 0
	totalCodeBlocks := 0
	tipsWithCodeBlocks := 0

	for _, ch := range result.Chapters {
		tipCount := len(ch.Sections)
		totalTips += tipCount
		t.Logf("  Ch%d: %s (%d tips, has_vim=%v)", ch.ChapterID, ch.Title, tipCount, ch.HasVimContent)

		for _, sec := range ch.Sections {
			if len(sec.CodeBlocks) > 0 {
				tipsWithCodeBlocks++
				totalCodeBlocks += len(sec.CodeBlocks)
			}
		}
	}

	t.Logf("Total tips: %d", totalTips)
	t.Logf("Tips with code blocks: %d", tipsWithCodeBlocks)
	t.Logf("Total code blocks: %d", totalCodeBlocks)

	// Practical Vim has 120+ tips
	if totalTips < 100 {
		t.Errorf("expected at least 100 tips, got %d", totalTips)
	}

	// Most tips should have code blocks
	if tipsWithCodeBlocks < 30 {
		t.Errorf("expected at least 30 tips with code blocks, got %d", tipsWithCodeBlocks)
	}

	// Spot check Tip 1
	if len(result.Chapters) > 0 && len(result.Chapters[0].Sections) > 0 {
		tip1 := result.Chapters[0].Sections[0]
		if tip1.TipNumber != 1 {
			t.Errorf("first tip should be 1, got %d", tip1.TipNumber)
		}
		if tip1.Title != "Meet the Dot Command" {
			t.Errorf("tip 1 title: got %q", tip1.Title)
		}
		if len(tip1.VimCommands) == 0 {
			t.Error("tip 1 should have vim commands detected")
		}
		t.Logf("Tip 1 commands: %v", tip1.VimCommands)
		t.Logf("Tip 1 code blocks: %d", len(tip1.CodeBlocks))
		for i, cb := range tip1.CodeBlocks {
			t.Logf("  CB%d: keys=%q before=%q after=%q",
				i, cb.Keystrokes,
				truncate(cb.Before, 40), truncate(cb.After, 40))
		}
	}
}
