package challenge

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/scipio/vimdao-extract/extract"
)

func TestGenerateChallenges(t *testing.T) {
	book := &extract.ExtractedBook{
		BookTitle: "Test Book",
		Author:    "Test Author",
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Title:     "The Vim Way",
				Sections: []extract.Section{
					{
						SectionID: "1.1",
						TipNumber: 1,
						Title:     "Meet the Dot Command",
						CodeBlocks: []extract.CodeBlock{
							{
								Before:     "Line one\nLine two",
								After:      "ine one\nLine two",
								Keystrokes: "x",
							},
						},
						VimCommands: []string{"x", "."},
					},
				},
			},
		},
	}

	cs := Generate(book, "practical-vim")

	if len(cs.Challenges) != 1 {
		t.Fatalf("expected 1 challenge, got %d", len(cs.Challenges))
	}

	ch := cs.Challenges[0]
	if ch.ID != "pv-tip01-001" {
		t.Errorf("id: got %q", ch.ID)
	}
	if ch.InitialText != "Line one\nLine two" {
		t.Errorf("initial_text: got %q", ch.InitialText)
	}
	if ch.ExpectedText != "ine one\nLine two" {
		t.Errorf("expected_text: got %q", ch.ExpectedText)
	}
	if ch.Difficulty < 1 || ch.Difficulty > 3 {
		t.Errorf("difficulty out of range: %d", ch.Difficulty)
	}
	if ch.Source.TipNumber != 1 {
		t.Errorf("source tip: got %d", ch.Source.TipNumber)
	}
	if ch.Source.Book != "pv" {
		t.Errorf("source book: got %q", ch.Source.Book)
	}
	if ch.TitleZh == "" {
		t.Error("title_zh should not be empty")
	}
	if ch.TitleEn == "" {
		t.Error("title_en should not be empty")
	}
	if len(ch.HintCommands) == 0 {
		t.Error("hint_commands should not be empty")
	}
}

func TestGenerateSkipsIdentical(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1,
						CodeBlocks: []extract.CodeBlock{
							{Before: "same", After: "same", Keystrokes: "x"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) != 0 {
		t.Errorf("expected 0 challenges for identical before/after, got %d", len(cs.Challenges))
	}
}

func TestGenerateSkipsEmpty(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1,
						CodeBlocks: []extract.CodeBlock{
							{Before: "", After: "text", Keystrokes: "x"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) != 0 {
		t.Errorf("expected 0 challenges for empty before, got %d", len(cs.Challenges))
	}
}

func TestGenerateMultipleCodeBlocks(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1, Title: "Test Tip",
						CodeBlocks: []extract.CodeBlock{
							{Before: "a", After: "b", Keystrokes: "x"},
							{Before: "c", After: "d", Keystrokes: "dd"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) != 2 {
		t.Fatalf("expected 2 challenges, got %d", len(cs.Challenges))
	}
	if cs.Challenges[0].ID != "pv-tip01-001" {
		t.Errorf("first id: %q", cs.Challenges[0].ID)
	}
	if cs.Challenges[1].ID != "pv-tip01-002" {
		t.Errorf("second id: %q", cs.Challenges[1].ID)
	}
}

func TestGenerateFromPracticalVim(t *testing.T) {
	data, err := os.ReadFile("../dist/practical-vim-drew-neil/practical-vim-drew-neil_extracted.json")
	if err != nil {
		t.Skip("extracted data not found, run extract first")
	}
	var book extract.ExtractedBook
	if err := json.Unmarshal(data, &book); err != nil {
		t.Fatal(err)
	}

	cs := Generate(&book, "practical-vim")

	t.Logf("Generated %d challenges", len(cs.Challenges))
	if len(cs.Challenges) < 50 {
		t.Errorf("expected at least 50 challenges, got %d", len(cs.Challenges))
	}

	// Spot check
	for _, ch := range cs.Challenges[:5] {
		t.Logf("  %s: %s (diff=%d, cat=%s)", ch.ID, ch.TitleZh, ch.Difficulty, ch.Category)
	}

	// Verify no empty fields
	for _, ch := range cs.Challenges {
		if ch.InitialText == "" {
			t.Errorf("%s: empty initial_text", ch.ID)
		}
		if ch.ExpectedText == "" {
			t.Errorf("%s: empty expected_text", ch.ID)
		}
		if ch.TitleZh == "" {
			t.Errorf("%s: empty title_zh", ch.ID)
		}
	}

	// Count difficulty distribution
	diffs := map[int]int{}
	for _, ch := range cs.Challenges {
		diffs[ch.Difficulty]++
	}
	t.Logf("Difficulty distribution: %v", diffs)
}
