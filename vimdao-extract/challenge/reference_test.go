package challenge

import (
	"testing"

	"github.com/scipio/vimdao-extract/extract"
)

func TestGenerateReferenceCards(t *testing.T) {
	lvBook := &extract.LazyVimBook{
		BookTitle: "LazyVim Test",
		Keybindings: []extract.Keybinding{
			{
				Keys: "<Space>ff", DescriptionEn: "Find files",
				Category: "leader-key", Requires: "lazyvim", Chapter: 4,
			},
			{
				Keys: "gcc", DescriptionEn: "Toggle comment on current line",
				Category: "comment", Requires: "neovim", Plugin: "Comment.nvim", Chapter: 6,
			},
			{
				Keys: "gd", DescriptionEn: "Go to definition",
				Category: "g-prefix", Requires: "neovim", Chapter: 10,
			},
		},
	}

	rs := GenerateReference(lvBook)

	if len(rs.Cards) != 3 {
		t.Fatalf("expected 3 cards, got %d", len(rs.Cards))
	}

	card := rs.Cards[0]
	if card.Keys != "<Space>ff" {
		t.Errorf("keys: got %q", card.Keys)
	}
	if card.Requires != "lazyvim" {
		t.Errorf("requires: got %q", card.Requires)
	}
	if card.TitleEn != "Find files" {
		t.Errorf("title_en: got %q", card.TitleEn)
	}
	if card.ID == "" {
		t.Error("id should not be empty")
	}
}

func TestGenerateReferenceDeduplicates(t *testing.T) {
	lvBook := &extract.LazyVimBook{
		BookTitle: "LazyVim Test",
		Keybindings: []extract.Keybinding{
			{Keys: "gcc", DescriptionEn: "Toggle comment", Category: "comment", Requires: "neovim", Chapter: 6},
			{Keys: "gcc", DescriptionEn: "Toggle comment again", Category: "comment", Requires: "neovim", Chapter: 8},
		},
	}

	rs := GenerateReference(lvBook)
	if len(rs.Cards) != 1 {
		t.Errorf("expected 1 deduplicated card, got %d", len(rs.Cards))
	}
}
