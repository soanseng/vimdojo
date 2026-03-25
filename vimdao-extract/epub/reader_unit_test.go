package epub

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"os"
	"path/filepath"
	"testing"
)

// ---------------------------------------------------------------------------
// Helpers: build synthetic EPUB zip in memory / on disk
// ---------------------------------------------------------------------------

type epubFile struct {
	name    string
	content string
}

func buildEPUBZip(t *testing.T, files []epubFile) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.epub")

	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("failed to create epub file: %v", err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	for _, ef := range files {
		fw, err := w.Create(ef.name)
		if err != nil {
			t.Fatalf("zip.Create(%s): %v", ef.name, err)
		}
		if _, err := fw.Write([]byte(ef.content)); err != nil {
			t.Fatalf("zip.Write(%s): %v", ef.name, err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatalf("zip.Close: %v", err)
	}

	return path
}

// minimalEPUB builds a valid minimal EPUB with container.xml + OPF + one XHTML file.
func minimalEPUB(t *testing.T, title, author string) string {
	t.Helper()
	return buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		},
		{
			name: "content.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">` + title + `</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">` + author + `</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="page1" href="page1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="page1"/>
  </spine>
</package>`,
		},
		{
			name:    "page1.xhtml",
			content: `<html><body><p>Hello, EPUB.</p></body></html>`,
		},
	})
}

// ---------------------------------------------------------------------------
// Open tests
// ---------------------------------------------------------------------------

func TestOpenMinimalEPUB(t *testing.T) {
	path := minimalEPUB(t, "Test Book", "Test Author")

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}

	if book.Title != "Test Book" {
		t.Errorf("Title: got %q, want %q", book.Title, "Test Book")
	}
	if book.Author != "Test Author" {
		t.Errorf("Author: got %q, want %q", book.Author, "Test Author")
	}
	if book.Language != "en" {
		t.Errorf("Language: got %q, want %q", book.Language, "en")
	}
	if len(book.Items) != 1 {
		t.Fatalf("expected 1 spine item, got %d", len(book.Items))
	}
	if string(book.Items[0].Content) == "" {
		t.Error("expected non-empty content in spine item")
	}
}

func TestOpenEPUBWithSubdirectoryOPF(t *testing.T) {
	// Test when OPF file is in a subdirectory (EPUB files often put content in OEBPS/)
	path := buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		},
		{
			name: "OEBPS/content.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Subdirectory Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">An Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`,
		},
		{
			name:    "OEBPS/chapter1.xhtml",
			content: `<html><body><h1>Chapter One</h1></body></html>`,
		},
	})

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}
	if book.Title != "Subdirectory Book" {
		t.Errorf("Title: got %q", book.Title)
	}
	if len(book.Items) != 1 {
		t.Fatalf("expected 1 spine item, got %d", len(book.Items))
	}
}

func TestOpenEPUBWithMultipleSpineItems(t *testing.T) {
	path := buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		},
		{
			name: "content.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Multi-Chapter Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="ch3.xhtml" media-type="application/xhtml+xml"/>
    <item id="img1" href="cover.png" media-type="image/png"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3"/>
    <itemref idref="img1"/>
  </spine>
</package>`,
		},
		{name: "ch1.xhtml", content: `<html><body><p>Chapter 1</p></body></html>`},
		{name: "ch2.xhtml", content: `<html><body><p>Chapter 2</p></body></html>`},
		{name: "ch3.xhtml", content: `<html><body><p>Chapter 3</p></body></html>`},
		{name: "cover.png", content: "\x89PNG\r\n"}, // fake PNG, not XHTML
	})

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}
	// Only XHTML items should be in spine (not the PNG)
	if len(book.Items) != 3 {
		t.Fatalf("expected 3 XHTML spine items, got %d", len(book.Items))
	}
	// Verify order is preserved
	for i, item := range book.Items {
		if item.Order != i {
			t.Errorf("item %d has Order %d, want %d", i, item.Order, i)
		}
	}
}

func TestOpenNonexistentFile(t *testing.T) {
	_, err := Open("/nonexistent/path/file.epub")
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestOpenNonZipFile(t *testing.T) {
	// Create a file that is not a zip
	dir := t.TempDir()
	path := filepath.Join(dir, "notzip.epub")
	if err := os.WriteFile(path, []byte("this is not a zip file"), 0o644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	_, err := Open(path)
	if err == nil {
		t.Error("expected error for non-zip file")
	}
}

func TestOpenEPUBWithNoOPFFile(t *testing.T) {
	// An EPUB with no OPF file at all — missing container.xml and no .opf file.
	path := buildEPUBZip(t, []epubFile{
		{name: "content.txt", content: "just a text file"},
	})

	_, err := Open(path)
	if err == nil {
		t.Error("expected error for EPUB with no OPF file")
	}
}

func TestOpenEPUBWithCorruptContainerXML(t *testing.T) {
	// container.xml is present but malformed — should fall back to OPF scan.
	path := buildEPUBZip(t, []epubFile{
		{
			name:    "META-INF/container.xml",
			content: `not valid xml <<<`,
		},
		{
			name: "content.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Fallback Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="p1"/>
  </spine>
</package>`,
		},
		{name: "page.xhtml", content: `<html><body><p>Fallback content.</p></body></html>`},
	})

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error (should fall back to OPF scan): %v", err)
	}
	if book.Title != "Fallback Book" {
		t.Errorf("Title: got %q, want 'Fallback Book'", book.Title)
	}
}

func TestOpenEPUBWithCorruptOPF(t *testing.T) {
	// OPF file is present but not valid XML.
	path := buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		},
		{
			name:    "content.opf",
			content: `this is not valid xml at all`,
		},
	})

	_, err := Open(path)
	if err == nil {
		t.Error("expected error for corrupt OPF file")
	}
}

func TestOpenEPUBSpineItemNotInManifest(t *testing.T) {
	// Spine references an ID that doesn't exist in the manifest.
	path := buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		},
		{
			name: "content.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Sparse Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="existing" href="page.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="existing"/>
    <itemref idref="nonexistent_id"/>
  </spine>
</package>`,
		},
		{name: "page.xhtml", content: `<html><body><p>Content.</p></body></html>`},
	})

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}
	// Only the valid spine item should appear
	if len(book.Items) != 1 {
		t.Errorf("expected 1 spine item (nonexistent skipped), got %d", len(book.Items))
	}
}

func TestOpenEPUBSpineItemFileNotInZip(t *testing.T) {
	// Manifest references a file that doesn't exist in the zip.
	path := buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		},
		{
			name: "content.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Missing File Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="p1" href="missing.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="p1"/>
  </spine>
</package>`,
		},
		// missing.xhtml is NOT in the zip
	})

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}
	// Missing file is silently skipped
	if len(book.Items) != 0 {
		t.Errorf("expected 0 items (missing file skipped), got %d", len(book.Items))
	}
}

func TestOpenEPUBContainerXMLWithEmptyRootFiles(t *testing.T) {
	// container.xml parses fine but has no rootfile entries — falls back to OPF scan.
	path := buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
  </rootfiles>
</container>`,
		},
		{
			name: "my_book.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Scanned Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="p1"/>
  </spine>
</package>`,
		},
		{name: "page.xhtml", content: `<html><body><p>Scanned.</p></body></html>`},
	})

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}
	if book.Title != "Scanned Book" {
		t.Errorf("Title: got %q, want 'Scanned Book'", book.Title)
	}
}

func TestOpenEPUBWithHTMLMediaType(t *testing.T) {
	// text/html media type should also be included (not just application/xhtml+xml).
	path := buildEPUBZip(t, []epubFile{
		{
			name: "META-INF/container.xml",
			content: `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		},
		{
			name: "content.opf",
			content: `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">HTML Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="p1" href="page.html" media-type="text/html"/>
  </manifest>
  <spine>
    <itemref idref="p1"/>
  </spine>
</package>`,
		},
		{name: "page.html", content: `<html><body><p>HTML page.</p></body></html>`},
	})

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}
	if len(book.Items) != 1 {
		t.Fatalf("expected 1 item for text/html media type, got %d", len(book.Items))
	}
}

// ---------------------------------------------------------------------------
// isXHTML tests
// ---------------------------------------------------------------------------

func TestIsXHTML(t *testing.T) {
	tests := []struct {
		mediaType string
		want      bool
	}{
		{"application/xhtml+xml", true},
		{"text/html", true},
		{"image/png", false},
		{"image/jpeg", false},
		{"text/css", false},
		{"application/x-dtbncx+xml", false},
		{"", false},
		{"application/xhtml", false}, // partial match not enough
		{"TEXT/HTML", false},         // case sensitive
	}

	for _, tt := range tests {
		got := isXHTML(tt.mediaType)
		if got != tt.want {
			t.Errorf("isXHTML(%q) = %v, want %v", tt.mediaType, got, tt.want)
		}
	}
}

// ---------------------------------------------------------------------------
// findOPFPath tests (via OPF scan fallback)
// ---------------------------------------------------------------------------

func TestFindOPFPathFallbackScan(t *testing.T) {
	// Build a zip with no container.xml but with an .opf file.
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.epub")

	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	w := zip.NewWriter(f)

	// No META-INF/container.xml — only a bare .opf file
	opfContent := `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">OPF Scan Book</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="p1" href="page.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="p1"/>
  </spine>
</package>`

	for _, ef := range []epubFile{
		{"book.opf", opfContent},
		{"page.xhtml", `<html><body><p>Page.</p></body></html>`},
	} {
		fw, err := w.Create(ef.name)
		if err != nil {
			t.Fatalf("zip create %s: %v", ef.name, err)
		}
		if _, err := fw.Write([]byte(ef.content)); err != nil {
			t.Fatalf("zip write %s: %v", ef.name, err)
		}
	}
	w.Close()
	f.Close()

	book, err := Open(zipPath)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}
	if book.Title != "OPF Scan Book" {
		t.Errorf("Title: got %q, want 'OPF Scan Book'", book.Title)
	}
}

// ---------------------------------------------------------------------------
// XML unmarshal correctness tests
// ---------------------------------------------------------------------------

func TestOPFXMLUnmarshal(t *testing.T) {
	opfXML := `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">My Title</dc:title>
    <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">My Author</dc:creator>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">zh</dc:language>
  </metadata>
  <manifest>
    <item id="item1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="item2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css1"  href="style.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="item1"/>
    <itemref idref="item2"/>
  </spine>
</package>`

	var pkg opfPackage
	if err := xml.Unmarshal([]byte(opfXML), &pkg); err != nil {
		t.Fatalf("xml.Unmarshal error: %v", err)
	}

	if pkg.Metadata.Title != "My Title" {
		t.Errorf("Title: got %q", pkg.Metadata.Title)
	}
	if pkg.Metadata.Creator != "My Author" {
		t.Errorf("Creator: got %q", pkg.Metadata.Creator)
	}
	if pkg.Metadata.Language != "zh" {
		t.Errorf("Language: got %q", pkg.Metadata.Language)
	}
	if len(pkg.Manifest.Items) != 3 {
		t.Errorf("manifest items: got %d, want 3", len(pkg.Manifest.Items))
	}
	if len(pkg.Spine.ItemRefs) != 2 {
		t.Errorf("spine items: got %d, want 2", len(pkg.Spine.ItemRefs))
	}
}

func TestContainerXMLUnmarshal(t *testing.T) {
	containerXMLContent := `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

	var c containerXML
	if err := xml.Unmarshal([]byte(containerXMLContent), &c); err != nil {
		t.Fatalf("xml.Unmarshal error: %v", err)
	}

	if len(c.RootFiles) != 1 {
		t.Fatalf("expected 1 rootfile, got %d", len(c.RootFiles))
	}
	if c.RootFiles[0].FullPath != "OEBPS/content.opf" {
		t.Errorf("full-path: got %q", c.RootFiles[0].FullPath)
	}
}

// ---------------------------------------------------------------------------
// readZipFile tests
// ---------------------------------------------------------------------------

func TestReadZipFile(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")

	content := "hello zip file content"

	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	w := zip.NewWriter(f)
	fw, _ := w.Create("test.txt")
	fw.Write([]byte(content))
	w.Close()
	f.Close()

	r, err := zip.OpenReader(zipPath)
	if err != nil {
		t.Fatalf("zip.OpenReader: %v", err)
	}
	defer r.Close()

	if len(r.File) != 1 {
		t.Fatalf("expected 1 file in zip")
	}

	got, err := readZipFile(r.File[0])
	if err != nil {
		t.Fatalf("readZipFile error: %v", err)
	}
	if string(got) != content {
		t.Errorf("readZipFile content: got %q, want %q", string(got), content)
	}
}

// ---------------------------------------------------------------------------
// SpineItem fields tests
// ---------------------------------------------------------------------------

func TestSpineItemFields(t *testing.T) {
	path := minimalEPUB(t, "Field Test", "Author")

	book, err := Open(path)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}

	if len(book.Items) == 0 {
		t.Fatal("expected at least one spine item")
	}

	item := book.Items[0]
	if item.ID == "" {
		t.Error("expected non-empty ID")
	}
	if item.Href == "" {
		t.Error("expected non-empty Href")
	}
	if len(item.Content) == 0 {
		t.Error("expected non-empty Content")
	}
	if item.Order != 0 {
		t.Errorf("first item Order should be 0, got %d", item.Order)
	}
}

// ---------------------------------------------------------------------------
// Practical Vim integration test (existing, kept for reference)
// ---------------------------------------------------------------------------

func TestOpenLazyVimEPUB(t *testing.T) {
	epubPath := "../../resources/LazyVim for Ambitious Developers - Dusty Phillips.epub"
	if _, err := os.Stat(epubPath); os.IsNotExist(err) {
		t.Skip("LazyVim EPUB file not found, skipping integration test")
	}

	book, err := Open(epubPath)
	if err != nil {
		t.Fatalf("Open() error: %v", err)
	}

	if book.Title == "" {
		t.Error("expected non-empty title")
	}
	if book.Author == "" {
		t.Error("expected non-empty author")
	}
	t.Logf("Title: %s", book.Title)
	t.Logf("Author: %s", book.Author)
	t.Logf("Language: %s", book.Language)
	t.Logf("Spine items: %d", len(book.Items))

	if len(book.Items) == 0 {
		t.Error("expected at least one spine item")
	}
}

// TestReadZipFileCompressed tests that readZipFile handles compressed entries.
func TestReadZipFileCompressed(t *testing.T) {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)
	fw, err := w.CreateHeader(&zip.FileHeader{
		Name:   "test.txt",
		Method: zip.Deflate,
	})
	if err != nil {
		t.Fatalf("CreateHeader: %v", err)
	}
	content := "this is the compressed file content, repeated many times for compression. " +
		"repeated content. repeated content. repeated content."
	fw.Write([]byte(content))
	w.Close()

	dir := t.TempDir()
	zipPath := filepath.Join(dir, "compressed.zip")
	if err := os.WriteFile(zipPath, buf.Bytes(), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	r, err := zip.OpenReader(zipPath)
	if err != nil {
		t.Fatalf("zip.OpenReader: %v", err)
	}
	defer r.Close()

	got, err := readZipFile(r.File[0])
	if err != nil {
		t.Fatalf("readZipFile error: %v", err)
	}
	if string(got) != content {
		t.Errorf("decompressed content mismatch")
	}
}
