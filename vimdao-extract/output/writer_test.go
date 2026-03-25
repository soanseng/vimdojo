package output

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/scipio/vimdao-extract/extract"
)

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

func makeTestBook() *extract.ExtractedBook {
	return &extract.ExtractedBook{
		BookTitle:     "Practical Vim",
		Author:        "Drew Neil",
		TotalChapters: 2,
		ExtractedAt:   "2026-03-25T00:00:00Z",
		Chapters: []extract.Chapter{
			{
				ChapterID:     1,
				Title:         "The Vim Way",
				HasVimContent: true,
				Sections: []extract.Section{
					{
						SectionID:   "1.1",
						TipNumber:   1,
						Title:       "Meet the Dot Command",
						RawText:     "The dot command repeats the last change.",
						VimCommands: []string{".", "dd", "x"},
						CodeBlocks: []extract.CodeBlock{
							{Before: "hello world", After: "world", Keystrokes: "dw"},
						},
						WordCount: 7,
					},
					{
						SectionID:   "1.2",
						TipNumber:   2,
						Title:       "Don't Repeat Yourself",
						RawText:     "Reduce keystrokes.",
						VimCommands: []string{".", "A", "j"},
						CodeBlocks: []extract.CodeBlock{
							{Before: "line 1\nline 2", After: "line 1;\nline 2;", Keystrokes: "A;<Esc>j."},
						},
						WordCount: 2,
					},
				},
			},
			{
				ChapterID:     2,
				Title:         "Normal Mode",
				HasVimContent: true,
				Sections: []extract.Section{
					{
						SectionID:   "2.1",
						TipNumber:   7,
						Title:       "Pause with Your Brush Off the Page",
						RawText:     "Normal mode is Vim resting state.",
						VimCommands: []string{"j", "k", "w", "b"},
						WordCount:   6,
					},
				},
			},
		},
	}
}

func makeTempDir(t *testing.T) string {
	t.Helper()
	dir, err := os.MkdirTemp("", "output_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	return dir
}

// ---------------------------------------------------------------------------
// WriteExtracted tests
// ---------------------------------------------------------------------------

func TestWriteExtracted(t *testing.T) {
	book := makeTestBook()
	dir := makeTempDir(t)

	err := WriteExtracted(book, dir, "practical_vim")
	if err != nil {
		t.Fatalf("WriteExtracted error: %v", err)
	}

	path := filepath.Join(dir, "practical_vim_extracted.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("expected output file %s to exist", path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read output file: %v", err)
	}

	var got extract.ExtractedBook
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("failed to parse output JSON: %v", err)
	}

	if got.BookTitle != "Practical Vim" {
		t.Errorf("BookTitle: got %q, want %q", got.BookTitle, "Practical Vim")
	}
	if got.Author != "Drew Neil" {
		t.Errorf("Author: got %q", got.Author)
	}
	if got.TotalChapters != 2 {
		t.Errorf("TotalChapters: got %d, want 2", got.TotalChapters)
	}
	if len(got.Chapters) != 2 {
		t.Fatalf("expected 2 chapters, got %d", len(got.Chapters))
	}
	if got.Chapters[0].Title != "The Vim Way" {
		t.Errorf("chapter 0 title: got %q", got.Chapters[0].Title)
	}
}

func TestWriteExtractedCreatesDirectory(t *testing.T) {
	book := makeTestBook()
	dir := makeTempDir(t)
	nestedDir := filepath.Join(dir, "deep", "nested", "path")

	err := WriteExtracted(book, nestedDir, "test")
	if err != nil {
		t.Fatalf("WriteExtracted error: %v", err)
	}

	path := filepath.Join(nestedDir, "test_extracted.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("expected output file to be created in nested directory")
	}
}

func TestWriteExtractedFileNaming(t *testing.T) {
	tests := []struct {
		slug     string
		wantFile string
	}{
		{"practical_vim", "practical_vim_extracted.json"},
		{"lazyvim", "lazyvim_extracted.json"},
		{"my-book", "my-book_extracted.json"},
	}

	for _, tt := range tests {
		t.Run(tt.slug, func(t *testing.T) {
			book := makeTestBook()
			dir := makeTempDir(t)

			if err := WriteExtracted(book, dir, tt.slug); err != nil {
				t.Fatalf("WriteExtracted error: %v", err)
			}

			expectedPath := filepath.Join(dir, tt.wantFile)
			if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
				t.Errorf("expected file %s to exist", expectedPath)
			}
		})
	}
}

func TestWriteExtractedJSONIsIndented(t *testing.T) {
	book := makeTestBook()
	dir := makeTempDir(t)

	if err := WriteExtracted(book, dir, "test"); err != nil {
		t.Fatalf("WriteExtracted error: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, "test_extracted.json"))
	if err != nil {
		t.Fatalf("read error: %v", err)
	}

	// Indented JSON should have newlines and spaces
	content := string(data)
	if !strings.Contains(content, "\n") {
		t.Error("expected indented JSON output (should contain newlines)")
	}
	if !strings.Contains(content, "  ") {
		t.Error("expected indented JSON output (should contain spaces)")
	}
}

func TestWriteExtractedInvalidDirectory(t *testing.T) {
	book := makeTestBook()

	// Use a path where we cannot create directories (file as parent)
	tmpFile, err := os.CreateTemp("", "not_a_dir_*")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Use the temp file as if it were a directory (should fail)
	err = WriteExtracted(book, filepath.Join(tmpFile.Name(), "subdir"), "test")
	if err == nil {
		t.Error("expected error when output directory is not creatable")
	}
}

// ---------------------------------------------------------------------------
// WriteCommandIndex tests
// ---------------------------------------------------------------------------

func TestWriteCommandIndex(t *testing.T) {
	book := makeTestBook()
	dir := makeTempDir(t)

	err := WriteCommandIndex(book, dir, "practical_vim")
	if err != nil {
		t.Fatalf("WriteCommandIndex error: %v", err)
	}

	path := filepath.Join(dir, "practical_vim_commands.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatalf("expected command index file to exist")
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read command index: %v", err)
	}

	var got CommandIndex
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("failed to parse command index JSON: %v", err)
	}

	if len(got.Commands) == 0 {
		t.Fatal("expected at least one command in index")
	}
}

func TestWriteCommandIndexFileNaming(t *testing.T) {
	tests := []struct {
		slug     string
		wantFile string
	}{
		{"practical_vim", "practical_vim_commands.json"},
		{"lazyvim", "lazyvim_commands.json"},
	}

	for _, tt := range tests {
		t.Run(tt.slug, func(t *testing.T) {
			book := makeTestBook()
			dir := makeTempDir(t)

			if err := WriteCommandIndex(book, dir, tt.slug); err != nil {
				t.Fatalf("WriteCommandIndex error: %v", err)
			}

			expectedPath := filepath.Join(dir, tt.wantFile)
			if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
				t.Errorf("expected file %s to exist", expectedPath)
			}
		})
	}
}

func TestWriteCommandIndexInvalidDirectory(t *testing.T) {
	book := makeTestBook()

	tmpFile, err := os.CreateTemp("", "not_a_dir_*")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	err = WriteCommandIndex(book, filepath.Join(tmpFile.Name(), "subdir"), "test")
	if err == nil {
		t.Error("expected error when output directory is not creatable")
	}
}

// ---------------------------------------------------------------------------
// buildCommandIndex tests
// ---------------------------------------------------------------------------

func TestBuildCommandIndex(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	if index == nil {
		t.Fatal("expected non-nil CommandIndex")
	}
	if len(index.Commands) == 0 {
		t.Fatal("expected at least one command")
	}
}

func TestBuildCommandIndexContainsAllCommands(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	cmdMap := make(map[string]*CommandEntry)
	for i := range index.Commands {
		cmdMap[index.Commands[i].Command] = &index.Commands[i]
	}

	// Commands from tip 1: ".", "dd", "x"
	// Commands from tip 2: ".", "A", "j"
	// Commands from tip 7: "j", "k", "w", "b"
	expected := []string{".", "dd", "x", "A", "j", "k", "w", "b"}
	for _, cmd := range expected {
		if _, ok := cmdMap[cmd]; !ok {
			t.Errorf("expected command %q in index, not found", cmd)
		}
	}
}

func TestBuildCommandIndexFrequency(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	cmdMap := make(map[string]*CommandEntry)
	for i := range index.Commands {
		cmdMap[index.Commands[i].Command] = &index.Commands[i]
	}

	// "." appears in tip 1 (section 1.1) and tip 2 (section 1.2) — frequency 2
	dotCmd, ok := cmdMap["."]
	if !ok {
		t.Fatal("expected '.' in command index")
	}
	if dotCmd.Frequency != 2 {
		t.Errorf("'.' frequency: got %d, want 2", dotCmd.Frequency)
	}

	// "j" appears in tip 2 and tip 7 — frequency 2
	jCmd, ok := cmdMap["j"]
	if !ok {
		t.Fatal("expected 'j' in command index")
	}
	if jCmd.Frequency != 2 {
		t.Errorf("'j' frequency: got %d, want 2", jCmd.Frequency)
	}

	// "x" appears only in tip 1 — frequency 1
	xCmd, ok := cmdMap["x"]
	if !ok {
		t.Fatal("expected 'x' in command index")
	}
	if xCmd.Frequency != 1 {
		t.Errorf("'x' frequency: got %d, want 1", xCmd.Frequency)
	}
}

func TestBuildCommandIndexChapters(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	cmdMap := make(map[string]*CommandEntry)
	for i := range index.Commands {
		cmdMap[index.Commands[i].Command] = &index.Commands[i]
	}

	// "." appears in chapter 1 only
	dotCmd := cmdMap["."]
	if dotCmd == nil {
		t.Fatal("expected '.' in index")
	}
	if len(dotCmd.Chapters) != 1 || dotCmd.Chapters[0] != 1 {
		t.Errorf("'.' chapters: got %v, want [1]", dotCmd.Chapters)
	}

	// "j" appears in chapter 1 (tip 2) and chapter 2 (tip 7)
	jCmd := cmdMap["j"]
	if jCmd == nil {
		t.Fatal("expected 'j' in index")
	}
	if len(jCmd.Chapters) != 2 {
		t.Errorf("'j' should appear in 2 chapters, got %v", jCmd.Chapters)
	}
}

func TestBuildCommandIndexSections(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	cmdMap := make(map[string]*CommandEntry)
	for i := range index.Commands {
		cmdMap[index.Commands[i].Command] = &index.Commands[i]
	}

	// "dd" only in section 1.1
	ddCmd := cmdMap["dd"]
	if ddCmd == nil {
		t.Fatal("expected 'dd' in index")
	}
	if len(ddCmd.Sections) != 1 || ddCmd.Sections[0] != "1.1" {
		t.Errorf("'dd' sections: got %v, want [1.1]", ddCmd.Sections)
	}
}

func TestBuildCommandIndexSortedByFrequency(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	// Commands should be sorted by frequency descending
	for i := 1; i < len(index.Commands); i++ {
		prev := index.Commands[i-1]
		curr := index.Commands[i]
		if prev.Frequency < curr.Frequency {
			t.Errorf("commands not sorted by frequency: %q (freq %d) before %q (freq %d)",
				prev.Command, prev.Frequency, curr.Command, curr.Frequency)
		}
	}
}

func TestBuildCommandIndexSortedAlphabeticallyOnTie(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	// Commands with same frequency should be sorted alphabetically
	for i := 1; i < len(index.Commands); i++ {
		prev := index.Commands[i-1]
		curr := index.Commands[i]
		if prev.Frequency == curr.Frequency {
			if prev.Command > curr.Command {
				t.Errorf("commands with equal frequency not alphabetically sorted: %q before %q",
					prev.Command, curr.Command)
			}
		}
	}
}

func TestBuildCommandIndexContextExamples(t *testing.T) {
	book := makeTestBook()
	index := buildCommandIndex(book)

	cmdMap := make(map[string]*CommandEntry)
	for i := range index.Commands {
		cmdMap[index.Commands[i].Command] = &index.Commands[i]
	}

	// "." appears in tips 1 and 2 — should have context examples
	dotCmd := cmdMap["."]
	if dotCmd == nil {
		t.Fatal("expected '.' in index")
	}
	if len(dotCmd.ContextExamples) == 0 {
		t.Error("expected context examples for '.' (tip-based sections)")
	}
	// Context examples format: "Tip N: Title"
	for _, ex := range dotCmd.ContextExamples {
		if !strings.HasPrefix(ex, "Tip ") {
			t.Errorf("context example should start with 'Tip ', got %q", ex)
		}
	}
}

func TestBuildCommandIndexContextExamplesMaxThree(t *testing.T) {
	// Build a book with a command appearing in 5 different sections
	// to verify the cap at 3 context examples.
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{SectionID: "1.1", TipNumber: 1, Title: "Tip One",   VimCommands: []string{"w"}},
					{SectionID: "1.2", TipNumber: 2, Title: "Tip Two",   VimCommands: []string{"w"}},
					{SectionID: "1.3", TipNumber: 3, Title: "Tip Three", VimCommands: []string{"w"}},
					{SectionID: "1.4", TipNumber: 4, Title: "Tip Four",  VimCommands: []string{"w"}},
					{SectionID: "1.5", TipNumber: 5, Title: "Tip Five",  VimCommands: []string{"w"}},
				},
			},
		},
	}

	index := buildCommandIndex(book)
	if len(index.Commands) == 0 {
		t.Fatal("expected commands in index")
	}

	for _, cmd := range index.Commands {
		if cmd.Command == "w" {
			if len(cmd.ContextExamples) > 3 {
				t.Errorf("context examples should be capped at 3, got %d", len(cmd.ContextExamples))
			}
			return
		}
	}
	t.Error("command 'w' not found in index")
}

func TestBuildCommandIndexCategory(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID:   "1.1",
						TipNumber:   1,
						Title:       "Motion Test",
						VimCommands: []string{"w", "dd", "i", "v", ">G"},
					},
				},
			},
		},
	}

	index := buildCommandIndex(book)
	cmdMap := make(map[string]*CommandEntry)
	for i := range index.Commands {
		cmdMap[index.Commands[i].Command] = &index.Commands[i]
	}

	tests := []struct {
		cmd      string
		wantCat  string
	}{
		{"w",  "motion"},
		{"dd", "other"},
		{"i",  "insert"},
		{"v",  "visual"},
	}

	for _, tt := range tests {
		entry, ok := cmdMap[tt.cmd]
		if !ok {
			t.Errorf("command %q not found in index", tt.cmd)
			continue
		}
		if entry.Category != tt.wantCat {
			t.Errorf("command %q category: got %q, want %q", tt.cmd, entry.Category, tt.wantCat)
		}
	}
}

func TestBuildCommandIndexEmptyBook(t *testing.T) {
	book := &extract.ExtractedBook{
		BookTitle: "Empty",
		Chapters:  nil,
	}
	index := buildCommandIndex(book)
	if index == nil {
		t.Fatal("expected non-nil index for empty book")
	}
	if len(index.Commands) != 0 {
		t.Errorf("expected 0 commands for empty book, got %d", len(index.Commands))
	}
}

func TestBuildCommandIndexSectionsWithNoCommands(t *testing.T) {
	book := &extract.ExtractedBook{
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Sections: []extract.Section{
					{
						SectionID:   "1.1",
						TipNumber:   1,
						Title:       "Descriptive Only",
						RawText:     "This section has no vim commands.",
						VimCommands: nil,
					},
				},
			},
		},
	}

	index := buildCommandIndex(book)
	if len(index.Commands) != 0 {
		t.Errorf("expected 0 commands, got %d: %v", len(index.Commands), index.Commands)
	}
}

// ---------------------------------------------------------------------------
// sortedKeys and sortedStringKeys tests
// ---------------------------------------------------------------------------

func TestSortedKeys(t *testing.T) {
	tests := []struct {
		name  string
		input map[int]bool
		want  []int
	}{
		{
			name:  "nil map",
			input: nil,
			want:  nil,
		},
		{
			name:  "empty map",
			input: map[int]bool{},
			want:  nil,
		},
		{
			name:  "single element",
			input: map[int]bool{5: true},
			want:  []int{5},
		},
		{
			name:  "multiple elements sorted",
			input: map[int]bool{3: true, 1: true, 2: true},
			want:  []int{1, 2, 3},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sortedKeys(tt.input)
			if len(got) != len(tt.want) {
				t.Errorf("sortedKeys(%v) = %v, want %v", tt.input, got, tt.want)
				return
			}
			for i, v := range tt.want {
				if got[i] != v {
					t.Errorf("sortedKeys[%d] = %d, want %d", i, got[i], v)
				}
			}
		})
	}
}

func TestSortedStringKeys(t *testing.T) {
	tests := []struct {
		name  string
		input map[string]bool
		want  []string
	}{
		{
			name:  "nil map",
			input: nil,
			want:  nil,
		},
		{
			name:  "empty map",
			input: map[string]bool{},
			want:  nil,
		},
		{
			name:  "single element",
			input: map[string]bool{"1.5": true},
			want:  []string{"1.5"},
		},
		{
			name:  "multiple elements sorted",
			input: map[string]bool{"2.1": true, "1.3": true, "1.1": true},
			want:  []string{"1.1", "1.3", "2.1"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sortedStringKeys(tt.input)
			if len(got) != len(tt.want) {
				t.Errorf("sortedStringKeys(%v) = %v, want %v", tt.input, got, tt.want)
				return
			}
			for i, v := range tt.want {
				if got[i] != v {
					t.Errorf("sortedStringKeys[%d] = %q, want %q", i, got[i], v)
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// categorize tests
// ---------------------------------------------------------------------------

func TestCategorize(t *testing.T) {
	tests := []struct {
		cmd      string
		wantCat  string
	}{
		{"w", "motion"},
		{"dw", "operator"},
		{"dd", "other"},
		{"i", "insert"},
		{"v", "visual"},
		{":w", "command"},
		{"gg", "motion"},
		{"iw", "text-object"},
		{"unknown_cmd_xyz", "other"},
	}

	for _, tt := range tests {
		t.Run(tt.cmd, func(t *testing.T) {
			got := string(categorize(tt.cmd))
			if got != tt.wantCat {
				t.Errorf("categorize(%q) = %q, want %q", tt.cmd, got, tt.wantCat)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// writeJSON tests
// ---------------------------------------------------------------------------

func TestWriteJSONCreatesValidJSON(t *testing.T) {
	type testData struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	dir := makeTempDir(t)
	path := filepath.Join(dir, "test.json")

	data := testData{Name: "hello", Value: 42}
	if err := writeJSON(path, data); err != nil {
		t.Fatalf("writeJSON error: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read error: %v", err)
	}

	var got testData
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if got.Name != "hello" {
		t.Errorf("Name: got %q", got.Name)
	}
	if got.Value != 42 {
		t.Errorf("Value: got %d", got.Value)
	}
}

func TestWriteJSONOverwritesExistingFile(t *testing.T) {
	dir := makeTempDir(t)
	path := filepath.Join(dir, "test.json")

	// Write initial content
	if err := writeJSON(path, map[string]string{"version": "1"}); err != nil {
		t.Fatalf("first writeJSON error: %v", err)
	}

	// Overwrite with new content
	if err := writeJSON(path, map[string]string{"version": "2"}); err != nil {
		t.Fatalf("second writeJSON error: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read error: %v", err)
	}

	var got map[string]string
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if got["version"] != "2" {
		t.Errorf("expected version 2 after overwrite, got %q", got["version"])
	}
}

func TestWriteJSONFailsOnNonexistentDirectory(t *testing.T) {
	path := "/nonexistent/directory/test.json"
	err := writeJSON(path, map[string]string{"key": "value"})
	if err == nil {
		t.Error("expected error writing to nonexistent directory")
	}
}

func TestWriteJSONProducesIndentedOutput(t *testing.T) {
	dir := makeTempDir(t)
	path := filepath.Join(dir, "test.json")

	data := map[string]interface{}{
		"name":   "test",
		"values": []int{1, 2, 3},
	}
	if err := writeJSON(path, data); err != nil {
		t.Fatalf("writeJSON error: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read error: %v", err)
	}

	content := string(raw)
	if !strings.Contains(content, "\n") {
		t.Error("expected indented JSON (should contain newlines)")
	}
	if !strings.Contains(content, "  ") {
		t.Error("expected indented JSON (should contain spaces)")
	}
}
