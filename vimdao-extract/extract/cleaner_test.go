package extract

import (
	"os"
	"testing"

	"github.com/scipio/vimdao-extract/epub"
)

func loadTestBook(t *testing.T) *epub.Book {
	t.Helper()
	epubPath := "../../resources/Practical Vim - Drew Neil.epub"
	if _, err := os.Stat(epubPath); os.IsNotExist(err) {
		t.Skip("EPUB file not found")
	}
	book, err := epub.Open(epubPath)
	if err != nil {
		t.Fatalf("epub.Open() error: %v", err)
	}
	return book
}

func loadLazyVimBook(t *testing.T) *epub.Book {
	t.Helper()
	epubPath := "../../resources/LazyVim for Ambitious Developers - Dusty Phillips.epub"
	if _, err := os.Stat(epubPath); os.IsNotExist(err) {
		t.Skip("LazyVim EPUB file not found")
	}
	book, err := epub.Open(epubPath)
	if err != nil {
		t.Fatalf("epub.Open() error: %v", err)
	}
	return book
}

func TestParseChapterPage(t *testing.T) {
	book := loadTestBook(t)

	// f_0017.xhtml = Chapter 1: The Vim Way
	for _, item := range book.Items {
		if item.Href != "f_0017.xhtml" {
			continue
		}
		pc, err := ParsePage(item.Content)
		if err != nil {
			t.Fatalf("ParsePage error: %v", err)
		}
		if !pc.IsChapterPage {
			t.Error("expected chapter page")
		}
		if pc.ChapterNumber != 1 {
			t.Errorf("expected chapter 1, got %d", pc.ChapterNumber)
		}
		if pc.ChapterTitle != "The Vim Way" {
			t.Errorf("expected 'The Vim Way', got %q", pc.ChapterTitle)
		}
		t.Logf("Chapter %d: %s", pc.ChapterNumber, pc.ChapterTitle)
		return
	}
	t.Fatal("f_0017.xhtml not found")
}

func TestParseChapter16(t *testing.T) {
	book := loadTestBook(t)

	for _, item := range book.Items {
		if item.Href != "f_0144.xhtml" {
			continue
		}
		pc, err := ParsePage(item.Content)
		if err != nil {
			t.Fatalf("ParsePage error: %v", err)
		}
		t.Logf("IsChapter=%v ChapterNum=%d Title=%q", pc.IsChapterPage, pc.ChapterNumber, pc.ChapterTitle)
		if !pc.IsChapterPage {
			t.Error("expected chapter page")
		}
		if pc.ChapterNumber != 16 {
			t.Errorf("expected chapter 16, got %d", pc.ChapterNumber)
		}
		return
	}
	t.Fatal("f_0144.xhtml not found")
}

func TestParseTipPage(t *testing.T) {
	book := loadTestBook(t)

	// f_0018.xhtml = Tip 1: Meet the Dot Command
	for _, item := range book.Items {
		if item.Href != "f_0018.xhtml" {
			continue
		}
		pc, err := ParsePage(item.Content)
		if err != nil {
			t.Fatalf("ParsePage error: %v", err)
		}
		if !pc.IsTipPage {
			t.Error("expected tip page")
		}
		if pc.TipNumber != 1 {
			t.Errorf("expected tip 1, got %d", pc.TipNumber)
		}
		if pc.TipTitle != "Meet the Dot Command" {
			t.Errorf("expected 'Meet the Dot Command', got %q", pc.TipTitle)
		}
		t.Logf("Tip %d: %s", pc.TipNumber, pc.TipTitle)
		t.Logf("Keystroke tables: %d", len(pc.KeystrokeTables))
		t.Logf("Code blocks: %d", len(pc.CodeBlocks))

		if len(pc.KeystrokeTables) == 0 {
			t.Error("expected at least one keystroke table")
		}

		for i, kt := range pc.KeystrokeTables {
			t.Logf("Table %d: %d steps", i, len(kt.Steps))
			for j, step := range kt.Steps {
				t.Logf("  Step %d: keystroke=%q buffer=%q", j, step.Keystroke, truncate(step.BufferContent, 60))
			}
		}
		return
	}
	t.Fatal("f_0018.xhtml not found")
}

func TestParseTip2(t *testing.T) {
	book := loadTestBook(t)

	for _, item := range book.Items {
		if item.Href != "f_0019.xhtml" {
			continue
		}
		pc, err := ParsePage(item.Content)
		if err != nil {
			t.Fatalf("ParsePage error: %v", err)
		}
		if pc.TipNumber != 2 {
			t.Errorf("expected tip 2, got %d", pc.TipNumber)
		}
		t.Logf("Tip %d: %s", pc.TipNumber, pc.TipTitle)
		t.Logf("Keystroke tables: %d", len(pc.KeystrokeTables))
		t.Logf("Code blocks: %d", len(pc.CodeBlocks))

		for i, cb := range pc.CodeBlocks {
			t.Logf("Code block %d: %q", i, truncate(cb, 80))
		}

		for i, kt := range pc.KeystrokeTables {
			t.Logf("Table %d:", i)
			for j, step := range kt.Steps {
				t.Logf("  Step %d: keystroke=%q buf=%q", j, step.Keystroke, truncate(step.BufferContent, 60))
			}
		}
		return
	}
	t.Fatal("f_0019.xhtml not found")
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
