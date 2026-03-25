package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/scipio/vimdao-extract/epub"
	"github.com/scipio/vimdao-extract/extract"
	"github.com/scipio/vimdao-extract/output"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "extract":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: vimdao-extract extract <file.epub> [output-dir]")
			os.Exit(1)
		}
		epubPath := os.Args[2]
		outputDir := "./dist"
		if len(os.Args) >= 4 {
			outputDir = os.Args[3]
		}
		if err := runExtract(epubPath, outputDir); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "usage: vimdao-extract <command> [args]")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "commands:")
	fmt.Fprintln(os.Stderr, "  extract <file.epub> [output-dir]  Extract content from EPUB")
}

func runExtract(epubPath, outputDir string) error {
	fmt.Printf("Opening %s...\n", epubPath)

	book, err := epub.Open(epubPath)
	if err != nil {
		return fmt.Errorf("failed to open EPUB: %w", err)
	}
	fmt.Printf("Book: %s by %s (%d spine items)\n", book.Title, book.Author, len(book.Items))

	fmt.Println("Extracting content...")
	extracted, err := extract.ExtractBook(book)
	if err != nil {
		return fmt.Errorf("extraction failed: %w", err)
	}

	// Derive slug from filename
	slug := slugFromPath(epubPath)
	subDir := filepath.Join(outputDir, slug)

	fmt.Printf("Writing to %s/\n", subDir)
	if err := output.WriteExtracted(extracted, subDir, slug); err != nil {
		return err
	}
	if err := output.WriteCommandIndex(extracted, subDir, slug); err != nil {
		return err
	}

	// Print summary
	totalTips := 0
	totalCodeBlocks := 0
	for _, ch := range extracted.Chapters {
		totalTips += len(ch.Sections)
		for _, sec := range ch.Sections {
			totalCodeBlocks += len(sec.CodeBlocks)
		}
	}

	fmt.Println()
	fmt.Printf("=== Extraction Summary ===\n")
	fmt.Printf("Chapters:    %d\n", extracted.TotalChapters)
	fmt.Printf("Tips:        %d\n", totalTips)
	fmt.Printf("Code blocks: %d\n", totalCodeBlocks)
	fmt.Printf("Output:      %s/%s_extracted.json\n", subDir, slug)
	fmt.Printf("             %s/%s_commands.json\n", subDir, slug)

	return nil
}

func slugFromPath(path string) string {
	base := filepath.Base(path)
	ext := filepath.Ext(base)
	name := strings.TrimSuffix(base, ext)

	// Simplify common book names
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " - ", "-")
	name = strings.ReplaceAll(name, " ", "-")

	// Remove special chars
	var sb strings.Builder
	for _, c := range name {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' {
			sb.WriteRune(c)
		}
	}
	return sb.String()
}
