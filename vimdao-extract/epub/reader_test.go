package epub

import (
	"os"
	"testing"
)

func TestOpenPracticalVim(t *testing.T) {
	epubPath := "../../resources/Practical Vim - Drew Neil.epub"
	if _, err := os.Stat(epubPath); os.IsNotExist(err) {
		t.Skip("EPUB file not found, skipping integration test")
	}

	book, err := Open(epubPath)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}

	if book.Title == "" {
		t.Error("expected non-empty title")
	}
	t.Logf("Title: %s", book.Title)
	t.Logf("Author: %s", book.Author)
	t.Logf("Spine items: %d", len(book.Items))

	if len(book.Items) < 50 {
		t.Errorf("expected at least 50 spine items, got %d", len(book.Items))
	}

	// Spot-check first content item has data
	if len(book.Items[0].Content) == 0 {
		t.Error("first spine item has empty content")
	}
}
