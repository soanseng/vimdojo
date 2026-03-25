package challenge

import (
	"strings"
	"testing"

	"github.com/scipio/vimdao-extract/extract"
)

// TestGenerateReferenceEmptyKeybindings verifies that a book with no
// keybindings returns an empty ReferenceSet with correct metadata.
func TestGenerateReferenceEmptyKeybindings(t *testing.T) {
	lvBook := &extract.LazyVimBook{
		BookTitle:   "LazyVim Empty",
		Keybindings: nil,
	}
	rs := GenerateReference(lvBook)
	if rs == nil {
		t.Fatal("expected non-nil ReferenceSet")
	}
	if len(rs.Cards) != 0 {
		t.Errorf("expected 0 cards for empty keybindings, got %d", len(rs.Cards))
	}
	if rs.SourceBook != "LazyVim Empty" {
		t.Errorf("SourceBook: got %q, want 'LazyVim Empty'", rs.SourceBook)
	}
	if rs.GeneratedAt == "" {
		t.Error("GeneratedAt must not be empty")
	}
}

// TestGenerateReferenceKnownTranslation verifies the branch where a command
// has a known zh-TW translation: NeedsTranslation should be false and DescZh
// should equal the translation (not the original English description).
func TestGenerateReferenceKnownTranslation(t *testing.T) {
	// "dd" has a translation in commandDescriptions: "刪除整行"
	lvBook := &extract.LazyVimBook{
		BookTitle: "LazyVim Test",
		Keybindings: []extract.Keybinding{
			{
				Keys:          "dd",
				DescriptionEn: "Delete the current line",
				Category:      "vim-core",
				Requires:      "vim",
				Chapter:       1,
			},
		},
	}
	rs := GenerateReference(lvBook)
	if len(rs.Cards) != 1 {
		t.Fatalf("expected 1 card, got %d", len(rs.Cards))
	}
	card := rs.Cards[0]
	if card.NeedsTranslation {
		t.Error("NeedsTranslation should be false for a key with known translation")
	}
	if card.TitleZh == "" {
		t.Error("TitleZh must not be empty for known translation")
	}
	// DescZh should be set to the translation, not the English description
	if card.DescZh == card.TitleEn {
		t.Errorf("DescZh should not equal TitleEn when translation exists; got %q", card.DescZh)
	}
}

// TestGenerateReferenceUnknownTranslation verifies the branch where a command
// has no known zh-TW translation: NeedsTranslation should be true and TitleZh
// should fall back to the English description.
func TestGenerateReferenceUnknownTranslation(t *testing.T) {
	lvBook := &extract.LazyVimBook{
		BookTitle: "LazyVim Test",
		Keybindings: []extract.Keybinding{
			{
				Keys:          "<Space>ff",
				DescriptionEn: "Find files",
				Category:      "leader-key",
				Requires:      "lazyvim",
				Chapter:       4,
			},
		},
	}
	rs := GenerateReference(lvBook)
	if len(rs.Cards) != 1 {
		t.Fatalf("expected 1 card, got %d", len(rs.Cards))
	}
	card := rs.Cards[0]
	if !card.NeedsTranslation {
		t.Error("NeedsTranslation should be true for key without known translation")
	}
	// TitleZh falls back to English description
	if card.TitleZh != "Find files" {
		t.Errorf("TitleZh fallback: got %q, want 'Find files'", card.TitleZh)
	}
}

// TestGenerateReferenceIDSequencing verifies that reference card IDs are
// sequential in "lv-ref-NNN" format, starting from 001.
func TestGenerateReferenceIDSequencing(t *testing.T) {
	lvBook := &extract.LazyVimBook{
		BookTitle: "LazyVim Test",
		Keybindings: []extract.Keybinding{
			{Keys: "w", DescriptionEn: "Word forward", Category: "motion", Chapter: 1},
			{Keys: "b", DescriptionEn: "Word backward", Category: "motion", Chapter: 1},
			{Keys: "e", DescriptionEn: "End of word", Category: "motion", Chapter: 1},
		},
	}
	rs := GenerateReference(lvBook)
	if len(rs.Cards) != 3 {
		t.Fatalf("expected 3 cards, got %d", len(rs.Cards))
	}
	expected := []string{"lv-ref-001", "lv-ref-002", "lv-ref-003"}
	for i, want := range expected {
		if rs.Cards[i].ID != want {
			t.Errorf("card[%d].ID = %q, want %q", i, rs.Cards[i].ID, want)
		}
	}
}

// TestGenerateReferenceCardFields verifies all fields are propagated correctly
// from the source Keybinding to the resulting ReferenceCard.
func TestGenerateReferenceCardFields(t *testing.T) {
	lvBook := &extract.LazyVimBook{
		BookTitle: "LazyVim Test",
		Keybindings: []extract.Keybinding{
			{
				Keys:          "gcc",
				DescriptionEn: "Toggle comment on current line",
				Category:      "comment",
				Requires:      "neovim",
				Plugin:        "Comment.nvim",
				Chapter:       6,
			},
		},
	}
	rs := GenerateReference(lvBook)
	if len(rs.Cards) != 1 {
		t.Fatalf("expected 1 card, got %d", len(rs.Cards))
	}
	card := rs.Cards[0]
	if card.Keys != "gcc" {
		t.Errorf("Keys: got %q, want 'gcc'", card.Keys)
	}
	if card.TitleEn != "Toggle comment on current line" {
		t.Errorf("TitleEn: got %q", card.TitleEn)
	}
	if card.DescEn != "Toggle comment on current line" {
		t.Errorf("DescEn: got %q", card.DescEn)
	}
	if card.Category != "comment" {
		t.Errorf("Category: got %q, want 'comment'", card.Category)
	}
	if card.Requires != "neovim" {
		t.Errorf("Requires: got %q, want 'neovim'", card.Requires)
	}
	if card.Plugin != "Comment.nvim" {
		t.Errorf("Plugin: got %q, want 'Comment.nvim'", card.Plugin)
	}
	if card.Chapter != 6 {
		t.Errorf("Chapter: got %d, want 6", card.Chapter)
	}
}

// TestGenerateReferenceDeduplicatesIDSequence verifies that after deduplication
// the IDs remain sequential (no gaps from skipped duplicates).
func TestGenerateReferenceDeduplicatesIDSequence(t *testing.T) {
	lvBook := &extract.LazyVimBook{
		BookTitle: "LazyVim Test",
		Keybindings: []extract.Keybinding{
			{Keys: "w", DescriptionEn: "Forward", Category: "motion", Chapter: 1},
			{Keys: "w", DescriptionEn: "Forward again (dup)", Category: "motion", Chapter: 2},
			{Keys: "b", DescriptionEn: "Backward", Category: "motion", Chapter: 1},
		},
	}
	rs := GenerateReference(lvBook)
	if len(rs.Cards) != 2 {
		t.Fatalf("expected 2 cards after dedup, got %d", len(rs.Cards))
	}
	if rs.Cards[0].ID != "lv-ref-001" {
		t.Errorf("first card ID: got %q, want 'lv-ref-001'", rs.Cards[0].ID)
	}
	if rs.Cards[1].ID != "lv-ref-002" {
		t.Errorf("second card ID: got %q, want 'lv-ref-002'", rs.Cards[1].ID)
	}
}

// TestGenerateReferenceManyCards verifies that the ID counter pads correctly
// beyond 9 and 99.
func TestGenerateReferenceManyCards(t *testing.T) {
	kbs := make([]extract.Keybinding, 110)
	for i := range kbs {
		kbs[i] = extract.Keybinding{
			Keys:          string(rune('a' + i%26)) + string(rune('A' + i%26)),
			DescriptionEn: "Cmd",
			Category:      "other",
			Chapter:       1,
		}
		// ensure keys are unique so no deduplication occurs
		kbs[i].Keys = kbs[i].Keys + strings.Repeat("x", i)
	}
	lvBook := &extract.LazyVimBook{BookTitle: "Big", Keybindings: kbs}
	rs := GenerateReference(lvBook)
	if len(rs.Cards) != 110 {
		t.Fatalf("expected 110 cards, got %d", len(rs.Cards))
	}
	// Check padding at double-digit boundaries
	if rs.Cards[9].ID != "lv-ref-010" {
		t.Errorf("card[9].ID = %q, want 'lv-ref-010'", rs.Cards[9].ID)
	}
	if rs.Cards[99].ID != "lv-ref-100" {
		t.Errorf("card[99].ID = %q, want 'lv-ref-100'", rs.Cards[99].ID)
	}
}
