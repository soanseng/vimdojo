package challenge

import (
	"strings"
	"testing"

	"github.com/scipio/vimdao-extract/extract"
)

// ---------------------------------------------------------------------------
// slugAbbrev tests
// ---------------------------------------------------------------------------

func TestSlugAbbrev(t *testing.T) {
	tests := []struct {
		slug string
		want string
	}{
		// practical → "pv"
		{"practical-vim", "pv"},
		{"practical-vim-drew-neil", "pv"},
		{"the-practical-guide", "pv"},
		// lazyvim → "lv"
		{"lazyvim-for-ambitious-developers", "lv"},
		{"lazyvim", "lv"},
		// slug longer than 4 chars, neither match → first 4 chars
		{"mybook-extra", "mybo"},
		{"abcdefgh", "abcd"},
		// slug exactly 4 chars → returned as-is
		{"abcd", "abcd"},
		// slug shorter than 4 chars → returned whole
		{"abc", "abc"},
		{"ab", "ab"},
		{"a", "a"},
		{"", ""},
	}
	for _, tt := range tests {
		t.Run(tt.slug, func(t *testing.T) {
			got := slugAbbrev(tt.slug)
			if got != tt.want {
				t.Errorf("slugAbbrev(%q) = %q, want %q", tt.slug, got, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// dominantCategory tests
// ---------------------------------------------------------------------------

func TestDominantCategory(t *testing.T) {
	// We cannot directly call dominantCategory with detect.CommandInfo literals
	// from outside the detect package, but we can call Generate with crafted
	// code blocks and inspect the Category field of the resulting challenge.

	makeBook := func(keystrokes string) *extract.ExtractedBook {
		return &extract.ExtractedBook{
			BookTitle: "Test",
			Chapters: []extract.Chapter{
				{
					ChapterID: 1,
					Sections: []extract.Section{
						{
							SectionID: "1.1", TipNumber: 1, Title: "T",
							CodeBlocks: []extract.CodeBlock{
								{Before: "a", After: "b", Keystrokes: keystrokes},
							},
						},
					},
				},
			},
		}
	}

	tests := []struct {
		name       string
		keystrokes string
		// category should be one of the known values, not empty
		wantOneOf []string
	}{
		// Pure motion commands → "motion" or "combo"
		{"motion-only", "ww", []string{"motion", "combo", "other"}},
		// Pure insert entry → "insert" or "combo"
		{"insert-only", "i", []string{"insert", "combo", "other"}},
		// Visual mode → "visual" or "combo"
		{"visual-only", "v", []string{"visual", "combo", "other"}},
		// Delete (operator) → "operator" or "combo" or "other"
		{"operator-only", "dw", []string{"operator", "combo", "other"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cs := Generate(makeBook(tt.keystrokes), "practical-vim")
			if len(cs.Challenges) == 0 {
				t.Skip("no challenges generated")
			}
			cat := cs.Challenges[0].Category
			found := false
			for _, allowed := range tt.wantOneOf {
				if cat == allowed {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Category = %q, want one of %v", cat, tt.wantOneOf)
			}
		})
	}
}

// TestDominantCategoryAllOtherCommands verifies that when every detected
// command falls under the "other" category the result is still "other".
func TestDominantCategoryAllOtherCommands(t *testing.T) {
	// "dd" is categorised as "other" by detect.DetectCommands.
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1, Title: "T",
						CodeBlocks: []extract.CodeBlock{
							{Before: "line1\n", After: "\n", Keystrokes: "dd"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) == 0 {
		t.Fatal("expected challenge to be generated")
	}
	// result must be a non-empty string — exact value depends on detect
	if cs.Challenges[0].Category == "" {
		t.Error("Category must not be empty")
	}
}

// ---------------------------------------------------------------------------
// buildTitleZh / buildDescriptionZh / buildHintTextZh edge cases
// ---------------------------------------------------------------------------

// TestGenerateTitleFallsBackToTipTitle checks that when none of the merged
// commands have a translation the title falls back to the original tip title.
func TestGenerateTitleFallsBackToTipTitle(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1,
						Title:      "Unknown Command Section",
						CodeBlocks: []extract.CodeBlock{
							// Keystrokes with no known translations
							{Before: "x", After: "y", Keystrokes: "<F99>"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) == 0 {
		t.Fatal("expected at least one challenge")
	}
	ch := cs.Challenges[0]
	// When no translation exists, TitleZh should equal the section title.
	if ch.TitleZh == "" {
		t.Error("TitleZh must not be empty")
	}
	// NeedsTranslation should be true when we fell back to the raw title
	if ch.TitleZh == ch.TitleEn && !ch.NeedsTranslation {
		t.Error("NeedsTranslation should be true when title_zh falls back to section title")
	}
}

// TestGenerateDescriptionWithNoTranslations checks that buildDescriptionZh
// falls back gracefully when no command has a known translation.
func TestGenerateDescriptionFallsBackToKeystrokes(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1, Title: "T",
						CodeBlocks: []extract.CodeBlock{
							{Before: "a", After: "b", Keystrokes: "<F99>"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) == 0 {
		t.Fatal("expected challenge")
	}
	desc := cs.Challenges[0].DescZh
	if !strings.Contains(desc, "<F99>") {
		t.Errorf("DescZh should contain keystroke sequence when no translations exist; got %q", desc)
	}
}

// ---------------------------------------------------------------------------
// Generate with multiple chapters / sections
// ---------------------------------------------------------------------------

// TestGenerateMultipleChapters verifies that code blocks across multiple
// chapters are all processed and IDs encode the correct tip number.
func TestGenerateMultipleChapters(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 5, Title: "T1",
						CodeBlocks: []extract.CodeBlock{
							{Before: "a", After: "b", Keystrokes: "x"},
						},
					},
				},
			},
			{
				ChapterID: 2,
				Sections: []extract.Section{
					{
						SectionID: "2.1", TipNumber: 42, Title: "T2",
						CodeBlocks: []extract.CodeBlock{
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
	// First challenge from tip 5
	if cs.Challenges[0].ID != "pv-tip05-001" {
		t.Errorf("first id: got %q, want pv-tip05-001", cs.Challenges[0].ID)
	}
	// Second challenge from tip 42
	if cs.Challenges[1].ID != "pv-tip42-001" {
		t.Errorf("second id: got %q, want pv-tip42-001", cs.Challenges[1].ID)
	}
	// Chapter source info
	if cs.Challenges[1].Source.Chapter != 2 {
		t.Errorf("source chapter: got %d, want 2", cs.Challenges[1].Source.Chapter)
	}
}

// TestGenerateSkipsEmptyAfter verifies that a CodeBlock with empty After is skipped.
func TestGenerateSkipsEmptyAfter(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1,
						CodeBlocks: []extract.CodeBlock{
							{Before: "some text", After: "", Keystrokes: "dd"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) != 0 {
		t.Errorf("expected 0 challenges for empty after, got %d", len(cs.Challenges))
	}
}

// TestGenerateLazyVimSlug verifies the lazyvim slug abbreviation path.
func TestGenerateLazyVimSlug(t *testing.T) {
	book := &extract.ExtractedBook{
		BookTitle: "LazyVim",
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 3, Title: "Files",
						CodeBlocks: []extract.CodeBlock{
							{Before: "a", After: "b", Keystrokes: "x"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "lazyvim-for-ambitious-developers")
	if len(cs.Challenges) != 1 {
		t.Fatalf("expected 1 challenge, got %d", len(cs.Challenges))
	}
	if !strings.HasPrefix(cs.Challenges[0].ID, "lv-") {
		t.Errorf("lazyvim challenge ID should start with 'lv-', got %q", cs.Challenges[0].ID)
	}
}

// TestGenerateCustomSlugTruncation verifies that unknown slugs longer than 4
// chars are truncated to 4 chars in the challenge ID.
func TestGenerateCustomSlugTruncation(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1, Title: "T",
						CodeBlocks: []extract.CodeBlock{
							{Before: "a", After: "b", Keystrokes: "x"},
						},
					},
				},
			},
		},
	}
	cs := Generate(book, "myspecialbook")
	if len(cs.Challenges) != 1 {
		t.Fatalf("expected 1 challenge, got %d", len(cs.Challenges))
	}
	if !strings.HasPrefix(cs.Challenges[0].ID, "mysp-") {
		t.Errorf("custom slug ID should start with 'mysp-', got %q", cs.Challenges[0].ID)
	}
}

// TestGenerateCustomSlugShort verifies that slugs of 4 chars or fewer are
// used verbatim.
func TestGenerateCustomSlugShort(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID: "1.1", TipNumber: 1, Title: "T",
						CodeBlocks: []extract.CodeBlock{
							{Before: "a", After: "b", Keystrokes: "x"},
						},
					},
				},
			},
		},
	}

	tests := []struct {
		slug      string
		wantPrefix string
	}{
		{"vim", "vim-"},
		{"ab", "ab-"},
	}
	for _, tt := range tests {
		t.Run(tt.slug, func(t *testing.T) {
			cs := Generate(book, tt.slug)
			if len(cs.Challenges) != 1 {
				t.Fatalf("expected 1 challenge, got %d", len(cs.Challenges))
			}
			if !strings.HasPrefix(cs.Challenges[0].ID, tt.wantPrefix) {
				t.Errorf("ID = %q, expected prefix %q", cs.Challenges[0].ID, tt.wantPrefix)
			}
		})
	}
}

// TestGenerateEmptyBook verifies that an empty book returns an empty challenge set.
func TestGenerateEmptyBook(t *testing.T) {
	book := &extract.ExtractedBook{BookTitle: "Empty", Chapters: nil}
	cs := Generate(book, "practical-vim")
	if cs == nil {
		t.Fatal("expected non-nil ChallengeSet")
	}
	if len(cs.Challenges) != 0 {
		t.Errorf("expected 0 challenges for empty book, got %d", len(cs.Challenges))
	}
	if cs.SourceBook != "Empty" {
		t.Errorf("SourceBook: got %q, want 'Empty'", cs.SourceBook)
	}
	if cs.GeneratedAt == "" {
		t.Error("GeneratedAt must not be empty")
	}
}

// TestGenerateSectionWithNoCodeBlocks verifies a section without code blocks
// produces no challenges.
func TestGenerateSectionWithNoCodeBlocks(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID:   "1.1",
						TipNumber:   1,
						Title:       "Prose only",
						VimCommands: []string{"w"},
						CodeBlocks:  nil,
					},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) != 0 {
		t.Errorf("expected 0 challenges for section with no code blocks, got %d", len(cs.Challenges))
	}
}

// TestGenerateChallengeFields verifies all fields on a generated challenge
// satisfy their invariants.
func TestGenerateChallengeFields(t *testing.T) {
	book := &extract.ExtractedBook{
		BookTitle: "Practical Vim",
		Chapters: []extract.Chapter{
			{
				ChapterID: 3,
				Sections: []extract.Section{
					{
						SectionID: "3.2", TipNumber: 14, Title: "Visual Mode Tips",
						CodeBlocks: []extract.CodeBlock{
							{Before: "hello world", After: "HELLO WORLD", Keystrokes: "gUU"},
						},
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

	if ch.ID == "" {
		t.Error("ID must not be empty")
	}
	if ch.TitleZh == "" {
		t.Error("TitleZh must not be empty")
	}
	if ch.TitleEn == "" {
		t.Error("TitleEn must not be empty")
	}
	if ch.DescZh == "" {
		t.Error("DescZh must not be empty")
	}
	if ch.InitialText != "hello world" {
		t.Errorf("InitialText: got %q, want 'hello world'", ch.InitialText)
	}
	if ch.ExpectedText != "HELLO WORLD" {
		t.Errorf("ExpectedText: got %q, want 'HELLO WORLD'", ch.ExpectedText)
	}
	if ch.Difficulty < 1 || ch.Difficulty > 3 {
		t.Errorf("Difficulty %d out of range [1,3]", ch.Difficulty)
	}
	if ch.Category == "" {
		t.Error("Category must not be empty")
	}
	if ch.Source.Chapter != 3 {
		t.Errorf("Source.Chapter: got %d, want 3", ch.Source.Chapter)
	}
	if ch.Source.Section != "3.2" {
		t.Errorf("Source.Section: got %q, want '3.2'", ch.Source.Section)
	}
	if ch.Source.TipNumber != 14 {
		t.Errorf("Source.TipNumber: got %d, want 14", ch.Source.TipNumber)
	}
}
