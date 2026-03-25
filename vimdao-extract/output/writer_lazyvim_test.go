package output

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/scipio/vimdao-extract/extract"
)

// makeTestLazyVimBook builds a minimal LazyVimBook for testing.
func makeTestLazyVimBook() *extract.LazyVimBook {
	return &extract.LazyVimBook{
		BookTitle:   "LazyVim for Ambitious Developers",
		Author:      "Dusty Phillips",
		ExtractedAt: "2026-03-25T00:00:00Z",
		Chapters: []extract.LazyVimChapter{
			{
				ChapterID:     1,
				Title:         "Introduction",
				HasVimContent: true,
				Sections: []extract.LazyVimSection{
					{
						SectionID: "1.1",
						Title:     "Getting Started",
						RawText:   "Install LazyVim.",
						WordCount: 2,
					},
				},
			},
		},
		Keybindings: []extract.Keybinding{
			{
				Keys:          "<Space>ff",
				DescriptionEn: "Find files",
				Category:      "leader-key",
				Requires:      "lazyvim",
				Chapter:       4,
			},
			{
				Keys:          "gcc",
				DescriptionEn: "Toggle comment on current line",
				Category:      "comment",
				Requires:      "neovim",
				Plugin:        "Comment.nvim",
				Chapter:       6,
			},
		},
		Tips: []extract.Tip{
			{Text: "Use <Space>ff to find files quickly.", TipType: "tip", Chapter: 4},
			{Text: "gcc comments the current line.", TipType: "note", Chapter: 6},
		},
	}
}

// ---------------------------------------------------------------------------
// WriteLazyVimBook tests
// ---------------------------------------------------------------------------

func TestWriteLazyVimBook(t *testing.T) {
	book := makeTestLazyVimBook()
	dir := makeTempDir(t)

	err := WriteLazyVimBook(book, dir, "lazyvim")
	if err != nil {
		t.Fatalf("WriteLazyVimBook error: %v", err)
	}

	path := filepath.Join(dir, "lazyvim_full.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("expected output file %s to exist", path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read output file: %v", err)
	}

	var got extract.LazyVimBook
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}
	if got.BookTitle != "LazyVim for Ambitious Developers" {
		t.Errorf("BookTitle: got %q", got.BookTitle)
	}
	if len(got.Keybindings) != 2 {
		t.Errorf("Keybindings: got %d, want 2", len(got.Keybindings))
	}
	if len(got.Tips) != 2 {
		t.Errorf("Tips: got %d, want 2", len(got.Tips))
	}
}

func TestWriteLazyVimBookCreatesDirectory(t *testing.T) {
	book := makeTestLazyVimBook()
	dir := makeTempDir(t)
	nestedDir := filepath.Join(dir, "deep", "nested")

	if err := WriteLazyVimBook(book, nestedDir, "lazyvim"); err != nil {
		t.Fatalf("WriteLazyVimBook error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(nestedDir, "lazyvim_full.json")); os.IsNotExist(err) {
		t.Fatal("expected output file in nested directory")
	}
}

func TestWriteLazyVimBookInvalidDirectory(t *testing.T) {
	book := makeTestLazyVimBook()
	tmpFile, err := os.CreateTemp("", "not_a_dir_*")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	err = WriteLazyVimBook(book, filepath.Join(tmpFile.Name(), "sub"), "lazyvim")
	if err == nil {
		t.Error("expected error when output directory cannot be created")
	}
}

// ---------------------------------------------------------------------------
// WriteLazyVimKeybindings tests
// ---------------------------------------------------------------------------

func TestWriteLazyVimKeybindings(t *testing.T) {
	book := makeTestLazyVimBook()
	dir := makeTempDir(t)

	err := WriteLazyVimKeybindings(book, dir, "lazyvim")
	if err != nil {
		t.Fatalf("WriteLazyVimKeybindings error: %v", err)
	}

	path := filepath.Join(dir, "lazyvim_keybindings.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("expected keybindings file %s to exist", path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read keybindings file: %v", err)
	}

	var got []extract.Keybinding
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("failed to parse keybindings JSON: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("expected 2 keybindings, got %d", len(got))
	}
	if got[0].Keys != "<Space>ff" {
		t.Errorf("first keybinding keys: got %q, want '<Space>ff'", got[0].Keys)
	}
}

func TestWriteLazyVimKeybindingsCreatesDirectory(t *testing.T) {
	book := makeTestLazyVimBook()
	dir := makeTempDir(t)
	nestedDir := filepath.Join(dir, "kb", "output")

	if err := WriteLazyVimKeybindings(book, nestedDir, "lv"); err != nil {
		t.Fatalf("WriteLazyVimKeybindings error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(nestedDir, "lv_keybindings.json")); os.IsNotExist(err) {
		t.Fatal("expected keybindings file in nested directory")
	}
}

func TestWriteLazyVimKeybindingsInvalidDirectory(t *testing.T) {
	book := makeTestLazyVimBook()
	tmpFile, err := os.CreateTemp("", "not_a_dir_*")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	err = WriteLazyVimKeybindings(book, filepath.Join(tmpFile.Name(), "sub"), "lv")
	if err == nil {
		t.Error("expected error when output directory cannot be created")
	}
}

// ---------------------------------------------------------------------------
// WriteLazyVimTips tests
// ---------------------------------------------------------------------------

func TestWriteLazyVimTips(t *testing.T) {
	book := makeTestLazyVimBook()
	dir := makeTempDir(t)

	err := WriteLazyVimTips(book, dir, "lazyvim")
	if err != nil {
		t.Fatalf("WriteLazyVimTips error: %v", err)
	}

	path := filepath.Join(dir, "lazyvim_tips.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("expected tips file %s to exist", path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read tips file: %v", err)
	}

	var got []extract.Tip
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("failed to parse tips JSON: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("expected 2 tips, got %d", len(got))
	}
	if got[0].TipType != "tip" {
		t.Errorf("first tip type: got %q, want 'tip'", got[0].TipType)
	}
}

func TestWriteLazyVimTipsCreatesDirectory(t *testing.T) {
	book := makeTestLazyVimBook()
	dir := makeTempDir(t)
	nestedDir := filepath.Join(dir, "tips", "out")

	if err := WriteLazyVimTips(book, nestedDir, "lv"); err != nil {
		t.Fatalf("WriteLazyVimTips error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(nestedDir, "lv_tips.json")); os.IsNotExist(err) {
		t.Fatal("expected tips file in nested directory")
	}
}

func TestWriteLazyVimTipsInvalidDirectory(t *testing.T) {
	book := makeTestLazyVimBook()
	tmpFile, err := os.CreateTemp("", "not_a_dir_*")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	err = WriteLazyVimTips(book, filepath.Join(tmpFile.Name(), "sub"), "lv")
	if err == nil {
		t.Error("expected error when output directory cannot be created")
	}
}

// ---------------------------------------------------------------------------
// WriteNamedJSON tests
// ---------------------------------------------------------------------------

func TestWriteNamedJSON(t *testing.T) {
	type payload struct {
		Name  string `json:"name"`
		Count int    `json:"count"`
	}

	dir := makeTempDir(t)
	v := payload{Name: "test", Count: 42}

	err := WriteNamedJSON(v, dir, "custom_output.json")
	if err != nil {
		t.Fatalf("WriteNamedJSON error: %v", err)
	}

	path := filepath.Join(dir, "custom_output.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("expected file %s to exist", path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read file: %v", err)
	}

	var got payload
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}
	if got.Name != "test" {
		t.Errorf("Name: got %q, want 'test'", got.Name)
	}
	if got.Count != 42 {
		t.Errorf("Count: got %d, want 42", got.Count)
	}
}

func TestWriteNamedJSONCreatesDirectory(t *testing.T) {
	dir := makeTempDir(t)
	nestedDir := filepath.Join(dir, "named", "output")

	if err := WriteNamedJSON(map[string]int{"x": 1}, nestedDir, "data.json"); err != nil {
		t.Fatalf("WriteNamedJSON error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(nestedDir, "data.json")); os.IsNotExist(err) {
		t.Fatal("expected data.json in nested directory")
	}
}

func TestWriteNamedJSONInvalidDirectory(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "not_a_dir_*")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	err = WriteNamedJSON("value", filepath.Join(tmpFile.Name(), "sub"), "out.json")
	if err == nil {
		t.Error("expected error when output directory cannot be created")
	}
}

func TestWriteNamedJSONEmptySlice(t *testing.T) {
	dir := makeTempDir(t)
	if err := WriteNamedJSON([]string{}, dir, "empty.json"); err != nil {
		t.Fatalf("WriteNamedJSON error: %v", err)
	}

	data, _ := os.ReadFile(filepath.Join(dir, "empty.json"))
	var got []string
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("expected empty slice, got %v", got)
	}
}
