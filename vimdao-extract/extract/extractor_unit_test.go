package extract

import (
	"strings"
	"testing"
	"time"

	"github.com/scipio/vimdao-extract/epub"
)

// ---------------------------------------------------------------------------
// keystrokeTableToCodeBlock unit tests
// ---------------------------------------------------------------------------

func TestKeystrokeTableToCodeBlock(t *testing.T) {
	tests := []struct {
		name      string
		table     KeystrokeTable
		wantNil   bool
		wantBefore string
		wantAfter  string
		wantKeys   string
	}{
		{
			name: "standard before/after table",
			table: KeystrokeTable{
				Steps: []KeystrokeStep{
					{Keystroke: "{start}", BufferContent: "hello world"},
					{Keystroke: "dw",      BufferContent: "world"},
				},
			},
			wantNil:    false,
			wantBefore: "hello world",
			wantAfter:  "world",
			wantKeys:   "dw",
		},
		{
			name: "multi-step table concatenates keystrokes",
			table: KeystrokeTable{
				Steps: []KeystrokeStep{
					{Keystroke: "{start}", BufferContent: "line one\nline two\nline three"},
					{Keystroke: "dd",      BufferContent: "line two\nline three"},
					{Keystroke: ".",       BufferContent: "line three"},
				},
			},
			wantNil:    false,
			wantBefore: "line one\nline two\nline three",
			wantAfter:  "line three",
			wantKeys:   "dd.",
		},
		{
			name: "single step returns nil (needs at least 2)",
			table: KeystrokeTable{
				Steps: []KeystrokeStep{
					{Keystroke: "{start}", BufferContent: "text"},
				},
			},
			wantNil: true,
		},
		{
			name:    "empty table returns nil",
			table:   KeystrokeTable{Steps: nil},
			wantNil: true,
		},
		{
			name: "before equals after returns nil",
			table: KeystrokeTable{
				Steps: []KeystrokeStep{
					{Keystroke: "{start}", BufferContent: "same text"},
					{Keystroke: "j",       BufferContent: "same text"},
				},
			},
			wantNil: true,
		},
		{
			name: "start marker is skipped in keystrokes",
			table: KeystrokeTable{
				Steps: []KeystrokeStep{
					{Keystroke: "{start}", BufferContent: "before"},
					{Keystroke: "x",       BufferContent: "efore"},
					{Keystroke: ".",       BufferContent: "fore"},
				},
			},
			wantNil:    false,
			wantBefore: "before",
			wantAfter:  "fore",
			wantKeys:   "x.",
		},
		{
			name: "empty keystroke step is skipped",
			table: KeystrokeTable{
				Steps: []KeystrokeStep{
					{Keystroke: "",  BufferContent: "initial"},
					{Keystroke: "x", BufferContent: "nitial"},
				},
			},
			wantNil:    false,
			wantBefore: "initial",
			wantAfter:  "nitial",
			wantKeys:   "x",
		},
		{
			name: "whitespace-only keystroke is skipped",
			table: KeystrokeTable{
				Steps: []KeystrokeStep{
					{Keystroke: "   ", BufferContent: "initial"},
					{Keystroke: "dd",  BufferContent: ""},
				},
			},
			wantNil:    false,
			wantBefore: "initial",
			wantAfter:  "",
			wantKeys:   "dd",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := keystrokeTableToCodeBlock(tt.table)
			if tt.wantNil {
				if got != nil {
					t.Errorf("expected nil, got %+v", got)
				}
				return
			}
			if got == nil {
				t.Fatal("expected non-nil CodeBlock, got nil")
			}
			if got.Before != tt.wantBefore {
				t.Errorf("Before: got %q, want %q", got.Before, tt.wantBefore)
			}
			if got.After != tt.wantAfter {
				t.Errorf("After: got %q, want %q", got.After, tt.wantAfter)
			}
			if got.Keystrokes != tt.wantKeys {
				t.Errorf("Keystrokes: got %q, want %q", got.Keystrokes, tt.wantKeys)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// countWords unit tests
// ---------------------------------------------------------------------------

func TestCountWords(t *testing.T) {
	tests := []struct {
		input string
		want  int
	}{
		{"", 0},
		{"one", 1},
		{"one two three", 3},
		{"  leading and trailing  ", 3},
		{"multiple   spaces   between", 3},
		{"line one\nline two", 4},
		{"tab\tseparated\twords", 3},
	}

	for _, tt := range tests {
		got := countWords(tt.input)
		if got != tt.want {
			t.Errorf("countWords(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// ---------------------------------------------------------------------------
// Section.HasVimContent unit tests
// ---------------------------------------------------------------------------

func TestSectionHasVimContent(t *testing.T) {
	tests := []struct {
		name    string
		section Section
		want    bool
	}{
		{
			name:    "empty section has no content",
			section: Section{},
			want:    false,
		},
		{
			name: "section with code blocks has content",
			section: Section{
				CodeBlocks: []CodeBlock{{Before: "a", After: "b"}},
			},
			want: true,
		},
		{
			name: "section with vim commands has content",
			section: Section{
				VimCommands: []string{"dd", "w"},
			},
			want: true,
		},
		{
			name: "section with both has content",
			section: Section{
				CodeBlocks:  []CodeBlock{{Before: "a", After: "b"}},
				VimCommands: []string{"dw"},
			},
			want: true,
		},
		{
			name: "section with only text has no vim content",
			section: Section{
				RawText:   "Some descriptive text.",
				WordCount: 3,
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.section.HasVimContent()
			if got != tt.want {
				t.Errorf("HasVimContent() = %v, want %v", got, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// buildSection unit tests
// ---------------------------------------------------------------------------

func TestBuildSection(t *testing.T) {
	pc := &PageContent{
		TipNumber: 5,
		TipTitle:  "Delete a Word",
		BodyText:  "Use dw to delete a word.",
		KeystrokeTables: []KeystrokeTable{
			{
				Steps: []KeystrokeStep{
					{Keystroke: "{start}", BufferContent: "hello world"},
					{Keystroke: "dw",      BufferContent: "world"},
				},
			},
		},
	}

	sec := buildSection(pc, 2)

	if sec.SectionID != "2.5" {
		t.Errorf("SectionID: got %q, want %q", sec.SectionID, "2.5")
	}
	if sec.TipNumber != 5 {
		t.Errorf("TipNumber: got %d, want 5", sec.TipNumber)
	}
	if sec.Title != "Delete a Word" {
		t.Errorf("Title: got %q", sec.Title)
	}
	if len(sec.CodeBlocks) != 1 {
		t.Fatalf("expected 1 code block, got %d", len(sec.CodeBlocks))
	}
	if sec.CodeBlocks[0].Keystrokes != "dw" {
		t.Errorf("Keystrokes: got %q", sec.CodeBlocks[0].Keystrokes)
	}
	if len(sec.VimCommands) == 0 {
		t.Error("expected vim commands to be detected")
	}
	if sec.WordCount == 0 {
		t.Error("expected non-zero word count")
	}
}

func TestBuildSectionNoKeystrokeTables(t *testing.T) {
	pc := &PageContent{
		TipNumber: 10,
		TipTitle:  "Using gg",
		BodyText:  "The gg command jumps to the top.",
	}

	sec := buildSection(pc, 1)

	if sec.SectionID != "1.10" {
		t.Errorf("SectionID: got %q, want %q", sec.SectionID, "1.10")
	}
	if len(sec.CodeBlocks) != 0 {
		t.Errorf("expected 0 code blocks, got %d", len(sec.CodeBlocks))
	}
	// gg is detectable from text
	found := false
	for _, cmd := range sec.VimCommands {
		if cmd == "gg" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected 'gg' in vim commands, got %v", sec.VimCommands)
	}
}

func TestBuildSectionTableWithNoChange(t *testing.T) {
	// A table where before == after produces no code block.
	pc := &PageContent{
		TipNumber: 7,
		TipTitle:  "Navigation Only",
		BodyText:  "Move around with j and k.",
		KeystrokeTables: []KeystrokeTable{
			{
				Steps: []KeystrokeStep{
					{Keystroke: "{start}", BufferContent: "same content"},
					{Keystroke: "jj",      BufferContent: "same content"},
				},
			},
		},
	}

	sec := buildSection(pc, 3)
	if len(sec.CodeBlocks) != 0 {
		t.Errorf("expected 0 code blocks when before==after, got %d", len(sec.CodeBlocks))
	}
}

// ---------------------------------------------------------------------------
// detectBookFormat unit tests
// ---------------------------------------------------------------------------

func TestDetectBookFormat(t *testing.T) {
	tests := []struct {
		name         string
		items        []epub.SpineItem
		wantFormat   bookFormat
	}{
		{
			name: "Practical Vim format detected by arr-recipe",
			items: []epub.SpineItem{
				{Content: []byte(`<html><body><table class="arr-recipe"></table></body></html>`)},
			},
			wantFormat: formatPracticalVim,
		},
		{
			name: "LazyVim format detected by chapter and sect2",
			items: []epub.SpineItem{
				{Content: []byte(`<html><body><section class="chapter"><section class="sect2"></section></section></body></html>`)},
			},
			wantFormat: formatLazyVim,
		},
		{
			name:       "empty items defaults to Practical Vim",
			items:      nil,
			wantFormat: formatPracticalVim,
		},
		{
			name: "unrecognized content defaults to Practical Vim",
			items: []epub.SpineItem{
				{Content: []byte(`<html><body><p>No special markers here.</p></body></html>`)},
			},
			wantFormat: formatPracticalVim,
		},
		{
			name: "only chapter class without sect2 not LazyVim",
			items: []epub.SpineItem{
				{Content: []byte(`<html><body><section class="chapter"></section></body></html>`)},
			},
			wantFormat: formatPracticalVim,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			book := &epub.Book{
				Title:  "Test Book",
				Author: "Author",
				Items:  tt.items,
			}
			got := detectBookFormat(book)
			if got != tt.wantFormat {
				t.Errorf("detectBookFormat() = %v, want %v", got, tt.wantFormat)
			}
		})
	}
}

func TestDetectBookFormatChecksFirst5Items(t *testing.T) {
	// Format detection only checks the first 5 items (i>5 break).
	// Put the marker beyond position 5 to confirm it's not detected.
	items := make([]epub.SpineItem, 10)
	for i := range items {
		items[i] = epub.SpineItem{
			Content: []byte(`<html><body><p>plain content</p></body></html>`),
		}
	}
	// Place LazyVim marker at position 6 (beyond the 5-item check window)
	items[6] = epub.SpineItem{
		Content: []byte(`<html><body><section class="chapter"><section class="sect2"></section></section></body></html>`),
	}

	book := &epub.Book{Items: items}
	got := detectBookFormat(book)
	if got != formatPracticalVim {
		t.Errorf("expected formatPracticalVim when marker is beyond check window, got %v", got)
	}
}

// ---------------------------------------------------------------------------
// ExtractBook unit tests using synthetic epub.Book
// ---------------------------------------------------------------------------

func makeMinimalPracticalVimBook() *epub.Book {
	chapterPage := `<html><body>
		<h1 class="chapter-title">
			<span class="chapter-number">Chapter 1</span>
			<span class="chapter-name">The Vim Way</span>
		</h1>
	</body></html>`

	tipPage := `<html><body>
		<table class="arr-recipe">
			<tr>
				<td class="arr-recipe-number">Tip 1</td>
				<td class="arr-recipe-name">Meet the Dot Command</td>
			</tr>
		</table>
		<p>The dot command repeats the last change.</p>
		<table class="simpletable hlines">
			<thead><tr><th>Keystrokes</th><th>Buffer Contents</th></tr></thead>
			<tbody>
				<tr>
					<td><span class="ic">{start}</span></td>
					<td><table class="processedcode"><tbody>
						<tr><td class="codeline">hello world</td></tr>
					</tbody></table></td>
				</tr>
				<tr>
					<td><span class="keystroke">x</span></td>
					<td><table class="processedcode"><tbody>
						<tr><td class="codeline">ello world</td></tr>
					</tbody></table></td>
				</tr>
			</tbody>
		</table>
	</body></html>`

	return &epub.Book{
		Title:  "Test Practical Vim",
		Author: "Test Author",
		Items: []epub.SpineItem{
			{ID: "ch1", Href: "ch1.xhtml", Content: []byte(chapterPage)},
			{ID: "tip1", Href: "tip1.xhtml", Content: []byte(tipPage)},
		},
	}
}

func TestExtractBookPracticalVimSynthetic(t *testing.T) {
	book := makeMinimalPracticalVimBook()
	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	if result.BookTitle != "Test Practical Vim" {
		t.Errorf("BookTitle: got %q", result.BookTitle)
	}
	if result.Author != "Test Author" {
		t.Errorf("Author: got %q", result.Author)
	}
	if result.TotalChapters != 1 {
		t.Errorf("TotalChapters: got %d, want 1", result.TotalChapters)
	}
	if result.ExtractedAt == "" {
		t.Error("ExtractedAt should not be empty")
	}
	// Validate timestamp is parseable RFC3339
	if _, err := time.Parse(time.RFC3339, result.ExtractedAt); err != nil {
		t.Errorf("ExtractedAt is not valid RFC3339: %q", result.ExtractedAt)
	}

	if len(result.Chapters) != 1 {
		t.Fatalf("expected 1 chapter, got %d", len(result.Chapters))
	}
	ch := result.Chapters[0]
	if ch.ChapterID != 1 {
		t.Errorf("ChapterID: got %d, want 1", ch.ChapterID)
	}
	if ch.Title != "The Vim Way" {
		t.Errorf("Title: got %q", ch.Title)
	}
	if len(ch.Sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(ch.Sections))
	}
	sec := ch.Sections[0]
	if sec.TipNumber != 1 {
		t.Errorf("TipNumber: got %d, want 1", sec.TipNumber)
	}
	if sec.Title != "Meet the Dot Command" {
		t.Errorf("Title: got %q", sec.Title)
	}
	if len(sec.CodeBlocks) != 1 {
		t.Errorf("expected 1 code block, got %d", len(sec.CodeBlocks))
	}
}

func makeMinimalLazyVimBook() *epub.Book {
	chapterPage := `<html><body>
		<section class="chapter">
			<h1 class="chapter-title">6. Basic Editing</h1>
			<section class="sect2">
				<h2 id="sec-deletions">Deletions and Changes</h2>
				<p>In normal mode, you can delete with <code class="literal">dd</code>.</p>
				<p>Use <code class="literal">x</code> to delete under cursor.</p>
			</section>
			<section class="sect2">
				<h2 id="sec-undo">Undoing Changes</h2>
				<p>Press <code class="literal">u</code> to undo.</p>
			</section>
		</section>
	</body></html>`

	return &epub.Book{
		Title:  "LazyVim for Ambitious Developers",
		Author: "Dusty Phillips",
		Items: []epub.SpineItem{
			{ID: "ch6", Href: "ch6.xhtml", Content: []byte(chapterPage)},
		},
	}
}

func TestExtractBookLazyVimSynthetic(t *testing.T) {
	book := makeMinimalLazyVimBook()
	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	if result.BookTitle != "LazyVim for Ambitious Developers" {
		t.Errorf("BookTitle: got %q", result.BookTitle)
	}
	if result.TotalChapters != 1 {
		t.Errorf("TotalChapters: got %d, want 1", result.TotalChapters)
	}

	if len(result.Chapters) != 1 {
		t.Fatalf("expected 1 chapter, got %d", len(result.Chapters))
	}
	ch := result.Chapters[0]
	if ch.ChapterID != 6 {
		t.Errorf("ChapterID: got %d, want 6", ch.ChapterID)
	}
	if ch.Title != "Basic Editing" {
		t.Errorf("Title: got %q, want 'Basic Editing'", ch.Title)
	}
	if len(ch.Sections) != 2 {
		t.Fatalf("expected 2 sections, got %d", len(ch.Sections))
	}
	if ch.Sections[0].Title != "Deletions and Changes" {
		t.Errorf("section 0 title: got %q", ch.Sections[0].Title)
	}
	if ch.Sections[1].Title != "Undoing Changes" {
		t.Errorf("section 1 title: got %q", ch.Sections[1].Title)
	}
	// Sections should have section IDs in format "chapterID.sectionNum"
	if ch.Sections[0].SectionID != "6.1" {
		t.Errorf("section 0 ID: got %q, want '6.1'", ch.Sections[0].SectionID)
	}
	if ch.Sections[1].SectionID != "6.2" {
		t.Errorf("section 1 ID: got %q, want '6.2'", ch.Sections[1].SectionID)
	}
}

func TestExtractBookLazyVimSkipsReservedTitles(t *testing.T) {
	// Chapters with skip titles (preamble, about the author, etc.) should be excluded.
	skippedPage := `<html><body>
		<section class="chapter">
			<h1 class="chapter-title">Preamble</h1>
			<section class="sect2">
				<h2>Some Section</h2>
				<p>Content that should be skipped.</p>
			</section>
		</section>
	</body></html>`

	validPage := `<html><body>
		<section class="chapter">
			<h1 class="chapter-title">1. Introduction</h1>
			<section class="sect2">
				<h2>What is LazyVim</h2>
				<p>LazyVim is a Neovim configuration.</p>
			</section>
		</section>
	</body></html>`

	book := &epub.Book{
		Title: "Test",
		Items: []epub.SpineItem{
			{Content: []byte(skippedPage)},
			{Content: []byte(validPage)},
		},
	}

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	// Only the valid chapter should appear
	if result.TotalChapters != 1 {
		t.Errorf("expected 1 chapter (Preamble skipped), got %d", result.TotalChapters)
	}
	if len(result.Chapters) > 0 && result.Chapters[0].Title == "Preamble" {
		t.Error("Preamble chapter should have been skipped")
	}
}

func TestExtractBookLazyVimSkipsEmptyChapters(t *testing.T) {
	// A LazyVim chapter with no subsections should not appear in output.
	pageWithNoSections := `<html><body>
		<section class="chapter">
			<h1 class="chapter-title">2. Empty Chapter</h1>
		</section>
	</body></html>`

	book := &epub.Book{
		Title: "Test",
		Items: []epub.SpineItem{
			{Content: []byte(pageWithNoSections)},
		},
	}

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	if result.TotalChapters != 0 {
		t.Errorf("expected 0 chapters (no subsections), got %d", result.TotalChapters)
	}
}

func TestExtractBookEmptyBook(t *testing.T) {
	book := &epub.Book{
		Title:  "Empty Book",
		Author: "Nobody",
		Items:  nil,
	}

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}
	if result.TotalChapters != 0 {
		t.Errorf("expected 0 chapters for empty book, got %d", result.TotalChapters)
	}
	if len(result.Chapters) != 0 {
		t.Errorf("expected empty chapters slice, got %d", len(result.Chapters))
	}
}

func TestExtractBookPracticalVimFrontMatterSkipped(t *testing.T) {
	// Front matter pages should not produce chapters or sections.
	frontMatterPage := `<html><body>
		<h1 class="chapter-title">
			<span class="chapter-number"></span>
			<span class="chapter-name">Table of Contents</span>
		</h1>
	</body></html>`

	chapterPage := `<html><body>
		<h1 class="chapter-title">
			<span class="chapter-number">Chapter 2</span>
			<span class="chapter-name">Normal Mode</span>
		</h1>
	</body></html>`

	book := &epub.Book{
		Title: "Test Book",
		Items: []epub.SpineItem{
			{Content: []byte(frontMatterPage)},
			{Content: []byte(chapterPage)},
		},
	}

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	// Should have chapter 2 but not the front matter
	if result.TotalChapters != 1 {
		t.Errorf("expected 1 chapter (front matter skipped), got %d", result.TotalChapters)
	}
	if len(result.Chapters) > 0 && result.Chapters[0].ChapterID != 2 {
		t.Errorf("expected chapter 2, got chapter %d", result.Chapters[0].ChapterID)
	}
}

func TestExtractBookPracticalVimTipWithoutChapter(t *testing.T) {
	// A tip that appears before any chapter header should be silently ignored.
	tipBeforeChapter := `<html><body>
		<table class="arr-recipe">
			<tr>
				<td class="arr-recipe-number">Tip 1</td>
				<td class="arr-recipe-name">Orphan Tip</td>
			</tr>
		</table>
		<p>This tip has no parent chapter.</p>
	</body></html>`

	book := &epub.Book{
		Title: "Test",
		Items: []epub.SpineItem{
			{Content: []byte(tipBeforeChapter)},
		},
	}

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	// Tip with no chapter parent should result in 0 chapters (or 0 sections in any chapter)
	totalSections := 0
	for _, ch := range result.Chapters {
		totalSections += len(ch.Sections)
	}
	if totalSections != 0 {
		t.Errorf("expected 0 sections for orphan tip, got %d", totalSections)
	}
}

func TestExtractBookHasVimContentFlag(t *testing.T) {
	chapterPage := `<html><body>
		<h1 class="chapter-title">
			<span class="chapter-number">Chapter 1</span>
			<span class="chapter-name">Motion Chapter</span>
		</h1>
	</body></html>`

	tipWithContent := `<html><body>
		<table class="arr-recipe">
			<tr>
				<td class="arr-recipe-number">Tip 1</td>
				<td class="arr-recipe-name">The Dot Command</td>
			</tr>
		</table>
		<p>Use dd to delete a line.</p>
		<table class="simpletable hlines">
			<thead><tr><th>Keystrokes</th><th>Buffer Contents</th></tr></thead>
			<tbody>
				<tr>
					<td><span class="ic">{start}</span></td>
					<td><table class="processedcode"><tbody>
						<tr><td class="codeline">before</td></tr>
					</tbody></table></td>
				</tr>
				<tr>
					<td><span class="keystroke">x</span></td>
					<td><table class="processedcode"><tbody>
						<tr><td class="codeline">after</td></tr>
					</tbody></table></td>
				</tr>
			</tbody>
		</table>
	</body></html>`

	book := &epub.Book{
		Title: "Test",
		Items: []epub.SpineItem{
			{Content: []byte(chapterPage)},
			{Content: []byte(tipWithContent)},
		},
	}

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	if len(result.Chapters) == 0 {
		t.Fatal("expected at least 1 chapter")
	}
	if !result.Chapters[0].HasVimContent {
		t.Error("chapter with keystroke table should have HasVimContent=true")
	}
}

func TestExtractBookLazyVimVimCommandsDetected(t *testing.T) {
	page := `<html><body>
		<section class="chapter">
			<h1 class="chapter-title">7. Operators</h1>
			<section class="sect2">
				<h2>Delete Operations</h2>
				<p>Use <code class="literal">dd</code> to delete a line.</p>
				<p>Use <code class="literal">dw</code> to delete a word.</p>
				<p>The dot command <code class="literal">.</code> repeats.</p>
			</section>
		</section>
	</body></html>`

	book := &epub.Book{
		Title: "Test LazyVim",
		Items: []epub.SpineItem{
			{Content: []byte(page)},
		},
	}

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	if len(result.Chapters) == 0 {
		t.Fatal("expected chapters")
	}
	if len(result.Chapters[0].Sections) == 0 {
		t.Fatal("expected sections")
	}

	sec := result.Chapters[0].Sections[0]
	if len(sec.VimCommands) == 0 {
		t.Error("expected vim commands to be detected from inline code")
	}
	t.Logf("Detected commands: %v", sec.VimCommands)
}

// ---------------------------------------------------------------------------
// Integration tests (require EPUB files)
// ---------------------------------------------------------------------------

func TestExtractLazyVimBook(t *testing.T) {
	book := loadLazyVimBook(t)

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	t.Logf("Book: %s by %s", result.BookTitle, result.Author)
	t.Logf("Chapters: %d", result.TotalChapters)

	if result.TotalChapters == 0 {
		t.Fatal("expected at least some chapters")
	}
	if result.BookTitle == "" {
		t.Error("expected non-empty book title")
	}

	totalSections := 0
	for _, ch := range result.Chapters {
		t.Logf("  Ch%d: %q (%d sections, has_vim=%v)",
			ch.ChapterID, ch.Title, len(ch.Sections), ch.HasVimContent)
		totalSections += len(ch.Sections)
	}
	t.Logf("Total sections: %d", totalSections)

	if totalSections == 0 {
		t.Error("expected at least some sections")
	}
}

func TestExtractLazyVimSectionWordCounts(t *testing.T) {
	book := loadLazyVimBook(t)

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	// Every section should have a positive word count if it has body text
	zeroWordSectionsWithText := 0
	for _, ch := range result.Chapters {
		for _, sec := range ch.Sections {
			if sec.RawText != "" && sec.WordCount == 0 {
				zeroWordSectionsWithText++
				t.Logf("Section %q has text but zero word count", sec.Title)
			}
		}
	}
	if zeroWordSectionsWithText > 0 {
		t.Errorf("%d sections have text but zero word count", zeroWordSectionsWithText)
	}
}

func TestExtractLazyVimSectionIDs(t *testing.T) {
	book := loadLazyVimBook(t)

	result, err := ExtractBook(book)
	if err != nil {
		t.Fatalf("ExtractBook error: %v", err)
	}

	seen := make(map[string]bool)
	for _, ch := range result.Chapters {
		for _, sec := range ch.Sections {
			if sec.SectionID == "" {
				t.Errorf("section %q has empty SectionID", sec.Title)
				continue
			}
			if seen[sec.SectionID] {
				t.Errorf("duplicate SectionID %q found", sec.SectionID)
			}
			seen[sec.SectionID] = true

			// SectionID should be in format "chapterID.N"
			prefix := strings.Split(sec.SectionID, ".")[0]
			if prefix == "" {
				t.Errorf("SectionID %q has empty chapter prefix", sec.SectionID)
			}
		}
	}
}

// TestExtractBookParseHTMLError exercises the error path in extractLazyVim.
// html.Parse never fails on well-formed or malformed HTML, but we test that
// malformed input is handled gracefully.
func TestParseHTMLGraceful(t *testing.T) {
	cases := [][]byte{
		[]byte(`<html><body></body></html>`),
		[]byte(`not html at all`),
		[]byte(`<<<invalid>>>`),
		nil,
		{},
	}
	for _, c := range cases {
		doc, err := parseHTML(c)
		if err != nil {
			t.Errorf("parseHTML(%q) returned unexpected error: %v", string(c), err)
		}
		if doc == nil {
			t.Errorf("parseHTML(%q) returned nil doc", string(c))
		}
	}
}
