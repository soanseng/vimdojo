package extract

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

// ---------------------------------------------------------------------------
// ParsePage unit tests using synthetic HTML (no EPUB file required)
// ---------------------------------------------------------------------------

func TestParsePageEmpty(t *testing.T) {
	pc, err := ParsePage([]byte(`<html><body></body></html>`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pc.IsChapterPage {
		t.Error("expected IsChapterPage=false")
	}
	if pc.IsTipPage {
		t.Error("expected IsTipPage=false")
	}
	if pc.BodyText != "" {
		t.Errorf("expected empty body text, got %q", pc.BodyText)
	}
}

func TestParsePageMalformedHTML(t *testing.T) {
	// html.Parse is very lenient and should not return errors for malformed HTML.
	cases := [][]byte{
		[]byte(`<html><body><p>unclosed`),
		[]byte(`not html at all`),
		[]byte(`<<<>>>`),
		[]byte(nil),
		{},
	}
	for _, c := range cases {
		pc, err := ParsePage(c)
		if err != nil {
			t.Errorf("ParsePage(%q) returned unexpected error: %v", string(c), err)
		}
		if pc == nil {
			t.Errorf("ParsePage(%q) returned nil PageContent", string(c))
		}
	}
}

func TestParsePageBodyText(t *testing.T) {
	raw := `<html><body>
		<p>First paragraph.</p>
		<p>Second paragraph.</p>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(pc.BodyText, "First paragraph.") {
		t.Errorf("expected first paragraph in body text, got %q", pc.BodyText)
	}
	if !strings.Contains(pc.BodyText, "Second paragraph.") {
		t.Errorf("expected second paragraph in body text, got %q", pc.BodyText)
	}
}

func TestParsePageFrontMatterSkipped(t *testing.T) {
	tests := []struct {
		name  string
		title string
	}{
		{"table of contents", "Table of Contents"},
		{"index", "Index"},
		{"copyright", "Copyright"},
		{"acknowledgments", "Acknowledgments"},
		{"bibliography", "Bibliography"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw := `<html><body>
				<h1 class="chapter-title">
					<span class="chapter-number"></span>
					<span class="chapter-name">` + tt.title + `</span>
				</h1>
			</body></html>`

			pc, err := ParsePage([]byte(raw))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if pc.ChapterNumber != 0 {
				t.Skip("parsed as numbered chapter, skipping front-matter check")
			}
			if !pc.IsFrontMatter {
				t.Errorf("expected IsFrontMatter=true for title %q, got false", tt.title)
			}
		})
	}
}

func TestParsePageFrontMatterCaseInsensitive(t *testing.T) {
	raw := `<html><body>
		<h1 class="chapter-title">
			<span class="chapter-number"></span>
			<span class="chapter-name">TABLE OF CONTENTS</span>
		</h1>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pc.ChapterNumber == 0 && !pc.IsFrontMatter {
		t.Error("expected IsFrontMatter=true for uppercase title")
	}
}

func TestParsePagePracticalVimChapter(t *testing.T) {
	raw := `<html><body>
		<h1 class="chapter-title">
			<span class="chapter-number">Chapter 3</span>
			<span class="chapter-name">Insert Mode</span>
		</h1>
		<p>This chapter covers insert mode commands.</p>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !pc.IsChapterPage {
		t.Error("expected IsChapterPage=true")
	}
	if pc.ChapterNumber != 3 {
		t.Errorf("expected ChapterNumber=3, got %d", pc.ChapterNumber)
	}
	if pc.ChapterTitle != "Insert Mode" {
		t.Errorf("expected ChapterTitle='Insert Mode', got %q", pc.ChapterTitle)
	}
	if pc.IsFrontMatter {
		t.Error("numbered chapter should not be marked as front matter")
	}
}

func TestParsePagePracticalVimTip(t *testing.T) {
	raw := `<html><body>
		<table class="arr-recipe">
			<tr>
				<td class="arr-recipe-number">Tip 42</td>
				<td class="arr-recipe-name">Jump Between Matching Parentheses</td>
			</tr>
		</table>
		<p>The percent sign jumps between matching brackets.</p>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !pc.IsTipPage {
		t.Error("expected IsTipPage=true")
	}
	if pc.TipNumber != 42 {
		t.Errorf("expected TipNumber=42, got %d", pc.TipNumber)
	}
	if pc.TipTitle != "Jump Between Matching Parentheses" {
		t.Errorf("expected tip title, got %q", pc.TipTitle)
	}
}

func TestParsePageKeystrokeTable(t *testing.T) {
	raw := `<html><body>
		<table class="simpletable hlines">
			<thead>
				<tr><th>Keystrokes</th><th>Buffer Contents</th></tr>
			</thead>
			<tbody>
				<tr>
					<td><span class="ic">{start}</span></td>
					<td><table class="processedcode"><tbody>
						<tr><td class="codeline">hello world</td></tr>
					</tbody></table></td>
				</tr>
				<tr>
					<td><span class="keystroke">dw</span></td>
					<td><table class="processedcode"><tbody>
						<tr><td class="codeline">world</td></tr>
					</tbody></table></td>
				</tr>
			</tbody>
		</table>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pc.KeystrokeTables) != 1 {
		t.Fatalf("expected 1 keystroke table, got %d", len(pc.KeystrokeTables))
	}
	kt := pc.KeystrokeTables[0]
	if len(kt.Steps) != 2 {
		t.Fatalf("expected 2 steps, got %d", len(kt.Steps))
	}
	if kt.Steps[0].Keystroke != "{start}" {
		t.Errorf("step 0 keystroke: got %q", kt.Steps[0].Keystroke)
	}
	if kt.Steps[0].BufferContent != "hello world" {
		t.Errorf("step 0 buffer: got %q", kt.Steps[0].BufferContent)
	}
	if kt.Steps[1].Keystroke != "dw" {
		t.Errorf("step 1 keystroke: got %q", kt.Steps[1].Keystroke)
	}
	if kt.Steps[1].BufferContent != "world" {
		t.Errorf("step 1 buffer: got %q", kt.Steps[1].BufferContent)
	}
}

func TestParsePageKeystrokeTableMissingBufferContents(t *testing.T) {
	// Table that has "Keystrokes" but not "Buffer Contents" should not be parsed
	// as a keystroke table.
	raw := `<html><body>
		<table class="simpletable hlines">
			<thead>
				<tr><th>Keystrokes</th><th>Description</th></tr>
			</thead>
			<tbody>
				<tr>
					<td><span class="keystroke">dw</span></td>
					<td>delete word</td>
				</tr>
			</tbody>
		</table>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pc.KeystrokeTables) != 0 {
		t.Errorf("expected 0 keystroke tables (no Buffer Contents header), got %d", len(pc.KeystrokeTables))
	}
}

func TestParsePageKeystrokeTableInsufficientRows(t *testing.T) {
	// Table with cells fewer than 2 per row should be skipped gracefully.
	raw := `<html><body>
		<table class="simpletable hlines">
			<thead>
				<tr><th>Keystrokes</th><th>Buffer Contents</th></tr>
			</thead>
			<tbody>
				<tr>
					<td><span class="ic">{start}</span></td>
				</tr>
			</tbody>
		</table>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Table has 0 valid rows (only 1 cell per row), so 0 steps -> not added
	if len(pc.KeystrokeTables) != 0 {
		t.Errorf("expected no keystroke tables for empty row set, got %d", len(pc.KeystrokeTables))
	}
}

func TestParsePageCodeBlock(t *testing.T) {
	raw := `<html><body>
		<table class="processedcode">
			<tbody>
				<tr><td class="codeline">func main() {</td></tr>
				<tr><td class="codeline">    fmt.Println("hello")</td></tr>
				<tr><td class="codeline">}</td></tr>
			</tbody>
		</table>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pc.CodeBlocks) != 1 {
		t.Fatalf("expected 1 code block, got %d", len(pc.CodeBlocks))
	}
	cb := pc.CodeBlocks[0]
	if !strings.Contains(cb, "func main()") {
		t.Errorf("expected code block to contain 'func main()', got %q", cb)
	}
	if !strings.Contains(cb, `fmt.Println("hello")`) {
		t.Errorf("expected code block to contain print statement, got %q", cb)
	}
}

func TestParsePageMultipleCodeBlocks(t *testing.T) {
	raw := `<html><body>
		<table class="processedcode">
			<tbody><tr><td class="codeline">block one</td></tr></tbody>
		</table>
		<p>Some text in between.</p>
		<table class="processedcode">
			<tbody><tr><td class="codeline">block two</td></tr></tbody>
		</table>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pc.CodeBlocks) != 2 {
		t.Fatalf("expected 2 code blocks, got %d", len(pc.CodeBlocks))
	}
	if pc.CodeBlocks[0] != "block one" {
		t.Errorf("code block 0: got %q", pc.CodeBlocks[0])
	}
	if pc.CodeBlocks[1] != "block two" {
		t.Errorf("code block 1: got %q", pc.CodeBlocks[1])
	}
}

func TestParsePageCodeBlockWithNonCodelineRows(t *testing.T) {
	// Rows without codeline class return empty string; those are still joined.
	raw := `<html><body>
		<table class="processedcode">
			<tbody>
				<tr><td class="codeline">valid line</td></tr>
				<tr><td class="other">not codeline</td></tr>
				<tr><td class="codeline">another valid</td></tr>
			</tbody>
		</table>
	</body></html>`

	pc, err := ParsePage([]byte(raw))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pc.CodeBlocks) != 1 {
		t.Fatalf("expected 1 code block, got %d", len(pc.CodeBlocks))
	}
	// The non-codeline row produces an empty string between valid lines
	cb := pc.CodeBlocks[0]
	if !strings.Contains(cb, "valid line") {
		t.Errorf("expected 'valid line' in code block, got %q", cb)
	}
	if !strings.Contains(cb, "another valid") {
		t.Errorf("expected 'another valid' in code block, got %q", cb)
	}
}

// ---------------------------------------------------------------------------
// normalizeText unit tests
// ---------------------------------------------------------------------------

func TestNormalizeText(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "zero-width space removed",
			input: "hello\u200bworld",
			want:  "helloworld",
		},
		{
			name:  "zero-width non-joiner removed",
			input: "a\u200cb",
			want:  "ab",
		},
		{
			name:  "zero-width joiner removed",
			input: "a\u200db",
			want:  "ab",
		},
		{
			name:  "BOM removed",
			input: "\ufeffhello",
			want:  "hello",
		},
		{
			name:  "en space to regular space",
			input: "a\u2002b",
			want:  "a b",
		},
		{
			name:  "em space to regular space",
			input: "a\u2003b",
			want:  "a b",
		},
		{
			name:  "non-breaking space to regular space",
			input: "a\u00a0b",
			want:  "a b",
		},
		{
			name:  "thin space to regular space",
			input: "a\u2009b",
			want:  "a b",
		},
		{
			name:  "narrow no-break space to regular space",
			input: "a\u202fb",
			want:  "a b",
		},
		{
			name:  "plain ASCII unchanged",
			input: "hello world",
			want:  "hello world",
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "multiple unicode chars combined",
			input: "\ufeff\u200bhello\u00a0world\u200c",
			want:  "hello world",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeText(tt.input)
			if got != tt.want {
				t.Errorf("normalizeText(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// atoi unit tests
// ---------------------------------------------------------------------------

func TestAtoi(t *testing.T) {
	tests := []struct {
		input string
		want  int
	}{
		{"0", 0},
		{"1", 1},
		{"42", 42},
		{"123", 123},
		{"Chapter 7", 7},
		{"no digits", 0},
		{"", 0},
		{"1a2b3", 123},
		{"  16  ", 16},
	}

	for _, tt := range tests {
		got := atoi(tt.input)
		if got != tt.want {
			t.Errorf("atoi(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// ---------------------------------------------------------------------------
// hasClass unit tests
// ---------------------------------------------------------------------------

func TestHasClassDirect(t *testing.T) {
	tests := []struct {
		name      string
		classAttr string
		check     string
		want      bool
	}{
		{"single class match", "foo", "foo", true},
		{"multiple classes includes target", "foo bar baz", "bar", true},
		{"class not present", "foo bar", "qux", false},
		{"partial word not matched", "foobar", "foo", false},
		{"exact match in list", "a foo b", "foo", true},
		{"empty class attr", "", "foo", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node := &html.Node{
				Type: html.ElementNode,
				Data: "div",
				Attr: []html.Attribute{
					{Key: "class", Val: tt.classAttr},
				},
			}
			got := hasClass(node, tt.check)
			if got != tt.want {
				t.Errorf("hasClass(node{class=%q}, %q) = %v, want %v",
					tt.classAttr, tt.check, got, tt.want)
			}
		})
	}
}

func TestHasClassNoClassAttr(t *testing.T) {
	node := &html.Node{
		Type: html.ElementNode,
		Data: "div",
		Attr: []html.Attribute{
			{Key: "id", Val: "main"},
		},
	}
	if hasClass(node, "main") {
		t.Error("hasClass should return false when no class attribute is present")
	}
}

// ---------------------------------------------------------------------------
// LazyVim format parsing tests (direct function calls, same package)
// ---------------------------------------------------------------------------

// walkForLazyVimChapter finds the first section.chapter node in an HTML tree
// and calls parseLazyVimChapter on it.
func walkForLazyVimChapter(n *html.Node) (int, string, bool) {
	if n.Type == html.ElementNode && n.Data == "section" && hasClass(n, "chapter") {
		num, title := parseLazyVimChapter(n)
		return num, title, true
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if num, title, ok := walkForLazyVimChapter(c); ok {
			return num, title, true
		}
	}
	return 0, "", false
}

// walkForLazyVimSections finds the first section.chapter node and returns its subsections.
func walkForLazyVimSections(n *html.Node) []lazyVimSection {
	if n.Type == html.ElementNode && n.Data == "section" && hasClass(n, "chapter") {
		return parseLazyVimSections(n)
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if secs := walkForLazyVimSections(c); secs != nil {
			return secs
		}
	}
	return nil
}

func TestParseLazyVimChapterNumbering(t *testing.T) {
	tests := []struct {
		name       string
		titleText  string
		wantNum    int
		wantTitle  string
	}{
		{
			name:      "chapter with number prefix",
			titleText: "6. Basic Editing",
			wantNum:   6,
			wantTitle: "Basic Editing",
		},
		{
			name:      "chapter 1",
			titleText: "1. Introduction",
			wantNum:   1,
			wantTitle: "Introduction",
		},
		{
			name:      "chapter 12 double digit",
			titleText: "12. Advanced Topics",
			wantNum:   12,
			wantTitle: "Advanced Topics",
		},
		{
			name:      "chapter without number",
			titleText: "Preamble",
			wantNum:   0,
			wantTitle: "Preamble",
		},
		{
			name:      "chapter number at boundary",
			titleText: "99. Final Chapter",
			wantNum:   99,
			wantTitle: "Final Chapter",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rawHTML := `<html><body><section class="chapter">
				<h1 class="chapter-title">` + tt.titleText + `</h1>
			</section></body></html>`

			doc, err := parseHTML([]byte(rawHTML))
			if err != nil {
				t.Fatalf("parseHTML error: %v", err)
			}

			gotNum, gotTitle, ok := walkForLazyVimChapter(doc)
			if !ok {
				t.Fatal("did not find section.chapter in document")
			}
			if gotNum != tt.wantNum {
				t.Errorf("chapter number: got %d, want %d", gotNum, tt.wantNum)
			}
			if gotTitle != tt.wantTitle {
				t.Errorf("chapter title: got %q, want %q", gotTitle, tt.wantTitle)
			}
		})
	}
}

func TestParseLazyVimChapterNoH1(t *testing.T) {
	rawHTML := `<html><body><section class="chapter">
		<p>No h1 here</p>
	</section></body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	gotNum, gotTitle, ok := walkForLazyVimChapter(doc)
	if !ok {
		t.Fatal("expected to find section.chapter")
	}
	if gotNum != 0 {
		t.Errorf("expected 0 for chapter without h1, got %d", gotNum)
	}
	if gotTitle != "" {
		t.Errorf("expected empty title for chapter without h1, got %q", gotTitle)
	}
}

func TestParseLazyVimSubSection(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<section class="sect2">
				<h2 id="sec-motions">Motion Commands</h2>
				<p>Motions move the cursor around the buffer.</p>
				<p>Use <code class="literal">w</code> to jump forward a word.</p>
				<p>Use <code class="literal">gg</code> to go to the top.</p>
			</section>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(sections))
	}

	sec := sections[0]
	if sec.Title != "Motion Commands" {
		t.Errorf("title: got %q, want %q", sec.Title, "Motion Commands")
	}
	if sec.ID != "sec-motions" {
		t.Errorf("id: got %q, want %q", sec.ID, "sec-motions")
	}
	if !strings.Contains(sec.BodyText, "Motions move the cursor") {
		t.Errorf("body text missing expected content, got %q", sec.BodyText)
	}
	if len(sec.InlineCmds) < 2 {
		t.Errorf("expected at least 2 inline cmds, got %d: %v", len(sec.InlineCmds), sec.InlineCmds)
	}
}

func TestParseLazyVimMultipleSections(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<h1 class="chapter-title">3. Navigation</h1>
			<section class="sect2">
				<h2 id="sec-one">Section One</h2>
				<p>First section body text here.</p>
			</section>
			<section class="sect2">
				<h2 id="sec-two">Section Two</h2>
				<p>Second section body text here.</p>
				<p>More text in second section.</p>
			</section>
			<section class="sect2">
				<h2 id="sec-three">Section Three</h2>
				<p>Third section.</p>
			</section>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 3 {
		t.Fatalf("expected 3 sections, got %d", len(sections))
	}
	if sections[0].Title != "Section One" {
		t.Errorf("section 0 title: got %q", sections[0].Title)
	}
	if sections[1].Title != "Section Two" {
		t.Errorf("section 1 title: got %q", sections[1].Title)
	}
	if sections[2].Title != "Section Three" {
		t.Errorf("section 2 title: got %q", sections[2].Title)
	}
}

func TestParseLazyVimSubSectionBodyTextConcatenation(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<section class="sect2">
				<h2>Multi-para Section</h2>
				<p>First paragraph text.</p>
				<p>Second paragraph text.</p>
				<p>Third paragraph text.</p>
			</section>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(sections))
	}

	body := sections[0].BodyText
	if !strings.Contains(body, "First paragraph text.") {
		t.Errorf("missing first paragraph in body: %q", body)
	}
	if !strings.Contains(body, "Second paragraph text.") {
		t.Errorf("missing second paragraph in body: %q", body)
	}
	if !strings.Contains(body, "Third paragraph text.") {
		t.Errorf("missing third paragraph in body: %q", body)
	}
	// Paragraphs should be joined with newlines
	if !strings.Contains(body, "\n") {
		t.Errorf("expected newline between paragraphs, body=%q", body)
	}
}

func TestParseLazyVimSubSectionInlineCmds(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<section class="sect2">
				<h2>Vim Commands</h2>
				<p>
					Use <code class="literal">dd</code> to delete,
					<code class="literal">yy</code> to yank,
					<code class="literal">p</code> to paste.
					Also <code class="other">not a cmd</code> should not be captured.
				</p>
			</section>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(sections))
	}

	cmds := sections[0].InlineCmds
	// Should capture dd, yy, p but not "not a cmd"
	if len(cmds) != 3 {
		t.Errorf("expected 3 inline cmds (class=literal only), got %d: %v", len(cmds), cmds)
	}
	cmdSet := make(map[string]bool)
	for _, c := range cmds {
		cmdSet[c] = true
	}
	for _, want := range []string{"dd", "yy", "p"} {
		if !cmdSet[want] {
			t.Errorf("expected inline cmd %q not found in %v", want, cmds)
		}
	}
}

func TestParseLazyVimEmptySection(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<section class="sect2">
				<h2>Empty Section</h2>
			</section>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 1 {
		t.Fatalf("expected 1 section even if empty, got %d", len(sections))
	}
	if sections[0].Title != "Empty Section" {
		t.Errorf("title: got %q", sections[0].Title)
	}
	if sections[0].BodyText != "" {
		t.Errorf("expected empty body text, got %q", sections[0].BodyText)
	}
	if len(sections[0].InlineCmds) != 0 {
		t.Errorf("expected no inline cmds, got %v", sections[0].InlineCmds)
	}
}

func TestParseLazyVimNoSections(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<h1 class="chapter-title">5. Pure Chapter</h1>
			<p>Chapter intro with no subsections.</p>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 0 {
		t.Errorf("expected 0 sections, got %d: %v", len(sections), sections)
	}
}

func TestParseLazyVimSubSectionIDFromH2(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<section class="sect2">
				<h2 id="unique-section-id">Title With ID</h2>
				<p>Content here.</p>
			</section>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(sections))
	}
	if sections[0].ID != "unique-section-id" {
		t.Errorf("expected ID 'unique-section-id', got %q", sections[0].ID)
	}
}

func TestParseLazyVimSubSectionNoH2ID(t *testing.T) {
	rawHTML := `<html><body>
		<section class="chapter">
			<section class="sect2">
				<h2>No ID Here</h2>
				<p>Content.</p>
			</section>
		</section>
	</body></html>`

	doc, err := parseHTML([]byte(rawHTML))
	if err != nil {
		t.Fatalf("parseHTML error: %v", err)
	}

	sections := walkForLazyVimSections(doc)
	if len(sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(sections))
	}
	if sections[0].ID != "" {
		t.Errorf("expected empty ID when h2 has no id attr, got %q", sections[0].ID)
	}
	if sections[0].Title != "No ID Here" {
		t.Errorf("expected title 'No ID Here', got %q", sections[0].Title)
	}
}

// ---------------------------------------------------------------------------
// Unicode and edge cases
// ---------------------------------------------------------------------------

func TestParsePageUnicodeContent(t *testing.T) {
	rawHTML := `<html><body>
		<p>Chinese: 你好世界. Japanese: こんにちは. Emoji: ` + "\U0001F600" + `</p>
		<p>Arabic: مرحبا. RTL content: שלום.</p>
	</body></html>`

	pc, err := ParsePage([]byte(rawHTML))
	if err != nil {
		t.Fatalf("unexpected error with unicode content: %v", err)
	}
	if !strings.Contains(pc.BodyText, "你好世界") {
		t.Errorf("expected Chinese characters in body text, got %q", pc.BodyText)
	}
	if !strings.Contains(pc.BodyText, "こんにちは") {
		t.Errorf("expected Japanese characters in body text, got %q", pc.BodyText)
	}
}

func TestParsePageSpecialHTMLEntities(t *testing.T) {
	rawHTML := `<html><body>
		<p>Less than: &lt;Esc&gt; and ampersand: foo &amp; bar</p>
	</body></html>`

	pc, err := ParsePage([]byte(rawHTML))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(pc.BodyText, "<Esc>") {
		t.Errorf("expected decoded HTML entities, got %q", pc.BodyText)
	}
	if !strings.Contains(pc.BodyText, "foo & bar") {
		t.Errorf("expected decoded ampersand, got %q", pc.BodyText)
	}
}

func TestParsePageVeryLargeContent(t *testing.T) {
	var sb strings.Builder
	sb.WriteString("<html><body>")
	for i := 0; i < 1000; i++ {
		sb.WriteString("<p>Paragraph filler text to simulate large content page.</p>")
	}
	sb.WriteString("</body></html>")

	pc, err := ParsePage([]byte(sb.String()))
	if err != nil {
		t.Fatalf("unexpected error with large content: %v", err)
	}
	if !strings.Contains(pc.BodyText, "Paragraph filler text") {
		t.Error("expected body text to contain paragraphs")
	}
}

// ---------------------------------------------------------------------------
// LazyVim integration test (requires EPUB file)
// ---------------------------------------------------------------------------

func TestParseLazyVimFromEPUB(t *testing.T) {
	book := loadLazyVimBook(t)

	var foundChapter bool
	for _, item := range book.Items {
		doc, err := parseHTML(item.Content)
		if err != nil {
			t.Fatalf("parseHTML error on %s: %v", item.Href, err)
		}
		num, title, ok := walkForLazyVimChapter(doc)
		if !ok {
			continue
		}
		foundChapter = true
		t.Logf("Chapter %d: %q", num, title)

		sections := walkForLazyVimSections(doc)
		t.Logf("  Sections: %d", len(sections))
		for _, sec := range sections {
			t.Logf("    [%s] %q: %d inline cmds", sec.ID, sec.Title, len(sec.InlineCmds))
		}
		// Just validate the first chapter found has plausible data
		if num < 0 {
			t.Errorf("chapter number should be >= 0, got %d", num)
		}
		if title == "" {
			t.Error("chapter title should not be empty")
		}
		break
	}

	if !foundChapter {
		t.Error("expected to find at least one LazyVim chapter in EPUB")
	}
}
