package epub

import (
	"archive/zip"
	"encoding/xml"
	"fmt"
	"io"
	"path"
	"strings"
)

// opfPackage represents the OPF content.opf structure.
type opfPackage struct {
	XMLName  xml.Name    `xml:"package"`
	Metadata opfMetadata `xml:"metadata"`
	Manifest opfManifest `xml:"manifest"`
	Spine    opfSpine    `xml:"spine"`
}

type opfMetadata struct {
	Title    string `xml:"title"`
	Creator  string `xml:"creator"`
	Language string `xml:"language"`
}

type opfManifest struct {
	Items []opfItem `xml:"item"`
}

type opfItem struct {
	ID        string `xml:"id,attr"`
	Href      string `xml:"href,attr"`
	MediaType string `xml:"media-type,attr"`
}

type opfSpine struct {
	ItemRefs []opfItemRef `xml:"itemref"`
}

type opfItemRef struct {
	IDRef string `xml:"idref,attr"`
}

// container.xml points to the OPF file.
type containerXML struct {
	XMLName xml.Name       `xml:"container"`
	RootFiles []rootFile   `xml:"rootfiles>rootfile"`
}

type rootFile struct {
	FullPath  string `xml:"full-path,attr"`
	MediaType string `xml:"media-type,attr"`
}

// Open reads an EPUB file and returns a Book with all spine items loaded.
func Open(filepath string) (*Book, error) {
	r, err := zip.OpenReader(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to open epub: %w", err)
	}
	defer r.Close()

	files := make(map[string]*zip.File)
	for _, f := range r.File {
		// Reject ZIP entries with path traversal
		if strings.Contains(f.Name, "..") {
			continue
		}
		files[f.Name] = f
	}

	// Find the OPF file via META-INF/container.xml or by scanning for .opf
	opfPath, err := findOPFPath(files)
	if err != nil {
		return nil, err
	}

	opfFile, ok := files[opfPath]
	if !ok {
		return nil, fmt.Errorf("OPF file %q referenced but not found in EPUB", opfPath)
	}

	opfData, err := readZipFile(opfFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read OPF: %w", err)
	}

	var pkg opfPackage
	if err := xml.Unmarshal(opfData, &pkg); err != nil {
		return nil, fmt.Errorf("failed to parse OPF: %w", err)
	}

	// Build manifest lookup: id -> item
	manifestByID := make(map[string]opfItem)
	for _, item := range pkg.Manifest.Items {
		manifestByID[item.ID] = item
	}

	// Resolve base directory of the OPF file for relative href resolution
	opfDir := path.Dir(opfPath)

	// Read spine items in order
	var items []SpineItem
	for i, ref := range pkg.Spine.ItemRefs {
		mItem, ok := manifestByID[ref.IDRef]
		if !ok {
			continue
		}
		if !isXHTML(mItem.MediaType) {
			continue
		}

		href := mItem.Href
		fullPath := path.Join(opfDir, href)

		zf, ok := files[fullPath]
		if !ok {
			// Try without directory prefix
			zf, ok = files[href]
			if !ok {
				continue
			}
		}

		content, err := readZipFile(zf)
		if err != nil {
			return nil, fmt.Errorf("failed to read %s: %w", href, err)
		}

		items = append(items, SpineItem{
			ID:      mItem.ID,
			Href:    href,
			Content: content,
			Order:   i,
		})
	}

	return &Book{
		Title:    pkg.Metadata.Title,
		Author:   pkg.Metadata.Creator,
		Language: pkg.Metadata.Language,
		Items:    items,
	}, nil
}

func findOPFPath(files map[string]*zip.File) (string, error) {
	// Try META-INF/container.xml first (standard EPUB)
	if cf, ok := files["META-INF/container.xml"]; ok {
		data, err := readZipFile(cf)
		if err == nil {
			var c containerXML
			if err := xml.Unmarshal(data, &c); err == nil && len(c.RootFiles) > 0 {
				return c.RootFiles[0].FullPath, nil
			}
		}
	}

	// Fallback: scan for .opf file
	for name := range files {
		if strings.HasSuffix(name, ".opf") {
			return name, nil
		}
	}

	return "", fmt.Errorf("no OPF file found in EPUB")
}

// maxEntrySize limits decompressed size of a single ZIP entry (50 MB).
const maxEntrySize = 50 << 20

func readZipFile(f *zip.File) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(io.LimitReader(rc, maxEntrySize))
}

func isXHTML(mediaType string) bool {
	return mediaType == "application/xhtml+xml" || mediaType == "text/html"
}
