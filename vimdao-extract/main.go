package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"encoding/json"

	"github.com/scipio/vimdao-extract/challenge"
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
	case "generate":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: vimdao-extract generate <file.epub> [output-dir]")
			os.Exit(1)
		}
		epubPath := os.Args[2]
		outputDir := "./dist"
		if len(os.Args) >= 4 {
			outputDir = os.Args[3]
		}
		if err := runGenerate(epubPath, outputDir); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
	case "merge":
		if len(os.Args) < 4 {
			fmt.Fprintln(os.Stderr, "usage: vimdao-extract merge <dir1> <dir2> [output-dir]")
			os.Exit(1)
		}
		dir1 := os.Args[2]
		dir2 := os.Args[3]
		outputDir := "./dist/merged"
		if len(os.Args) >= 5 {
			outputDir = os.Args[4]
		}
		if err := runMerge(dir1, dir2, outputDir); err != nil {
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
	fmt.Fprintln(os.Stderr, "  extract  <file.epub> [output-dir]   Extract content from EPUB")
	fmt.Fprintln(os.Stderr, "  generate <file.epub> [output-dir]   Extract + generate challenges")
	fmt.Fprintln(os.Stderr, "  merge    <dir1> <dir2> [output-dir] Merge command indices")
}

func runExtract(epubPath, outputDir string) error {
	fmt.Printf("Opening %s...\n", epubPath)

	book, err := epub.Open(epubPath)
	if err != nil {
		return fmt.Errorf("failed to open EPUB: %w", err)
	}
	fmt.Printf("Book: %s by %s (%d spine items)\n", book.Title, book.Author, len(book.Items))

	// Derive slug from filename
	slug := slugFromPath(epubPath)
	subDir := filepath.Join(outputDir, slug)

	// Detect book format and use appropriate extraction
	isLazyVim := detectIsLazyVim(book)

	if isLazyVim {
		return runLazyVimExtract(book, subDir, slug)
	}
	return runPracticalVimExtract(book, subDir, slug)
}

func runPracticalVimExtract(book *epub.Book, subDir, slug string) error {
	fmt.Println("Extracting content (Practical Vim format)...")
	extracted, err := extract.ExtractBook(book)
	if err != nil {
		return fmt.Errorf("extraction failed: %w", err)
	}

	fmt.Printf("Writing to %s/\n", subDir)
	if err := output.WriteExtracted(extracted, subDir, slug); err != nil {
		return err
	}
	if err := output.WriteCommandIndex(extracted, subDir, slug); err != nil {
		return err
	}

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

func runLazyVimExtract(book *epub.Book, subDir, slug string) error {
	fmt.Println("Extracting content (LazyVim/Neovim format)...")
	lvBook, err := extract.ExtractLazyVimBook(book)
	if err != nil {
		return fmt.Errorf("extraction failed: %w", err)
	}

	fmt.Printf("Writing to %s/\n", subDir)
	if err := output.WriteLazyVimBook(lvBook, subDir, slug); err != nil {
		return err
	}
	if err := output.WriteLazyVimKeybindings(lvBook, subDir, slug); err != nil {
		return err
	}
	if err := output.WriteLazyVimTips(lvBook, subDir, slug); err != nil {
		return err
	}

	// Count stats
	totalSections := 0
	totalCommands := 0
	totalKeybindings := 0
	categoryCount := make(map[string]int)
	requiresCount := make(map[string]int)

	for _, ch := range lvBook.Chapters {
		totalSections += len(ch.Sections)
		for _, sec := range ch.Sections {
			totalCommands += len(sec.Commands)
			totalKeybindings += len(sec.Keybindings)
		}
	}
	for _, kb := range lvBook.Keybindings {
		categoryCount[kb.Category]++
		requiresCount[kb.Requires]++
	}

	fmt.Println()
	fmt.Printf("=== LazyVim/Neovim Extraction Summary ===\n")
	fmt.Printf("Chapters:     %d\n", len(lvBook.Chapters))
	fmt.Printf("Sections:     %d\n", totalSections)
	fmt.Printf("Commands:     %d\n", totalCommands)
	fmt.Printf("Keybindings:  %d\n", len(lvBook.Keybindings))
	fmt.Printf("Tips/Notes:   %d\n", len(lvBook.Tips))
	fmt.Println()
	fmt.Println("Keybindings by category:")
	for cat, count := range categoryCount {
		fmt.Printf("  %-20s %d\n", cat, count)
	}
	fmt.Println("Keybindings by requirement:")
	for req, count := range requiresCount {
		fmt.Printf("  %-20s %d\n", req, count)
	}
	fmt.Printf("\nOutput: %s/%s_full.json\n", subDir, slug)
	fmt.Printf("        %s/%s_keybindings.json\n", subDir, slug)
	fmt.Printf("        %s/%s_tips.json\n", subDir, slug)

	return nil
}

func runGenerate(epubPath, outputDir string) error {
	book, err := epub.Open(epubPath)
	if err != nil {
		return fmt.Errorf("failed to open EPUB: %w", err)
	}
	fmt.Printf("Book: %s by %s\n", book.Title, book.Author)

	slug := slugFromPath(epubPath)
	subDir := filepath.Join(outputDir, slug)
	isLV := detectIsLazyVim(book)

	if isLV {
		// LazyVim: extract + generate reference cards
		fmt.Println("Extracting + generating reference cards (LazyVim)...")
		lvBook, err := extract.ExtractLazyVimBook(book)
		if err != nil {
			return fmt.Errorf("extraction failed: %w", err)
		}

		rs := challenge.GenerateReference(lvBook)

		if err := output.WriteNamedJSON(rs, subDir, slug+"_challenges.json"); err != nil {
			return err
		}
		if err := output.WriteLazyVimKeybindings(lvBook, subDir, slug); err != nil {
			return err
		}
		if err := output.WriteLazyVimTips(lvBook, subDir, slug); err != nil {
			return err
		}

		fmt.Printf("\n=== LazyVim Generation Summary ===\n")
		fmt.Printf("Reference cards: %d\n", len(rs.Cards))
		fmt.Printf("Output: %s/%s_challenges.json\n", subDir, slug)
		return nil
	}

	// Practical Vim: extract + generate challenges
	fmt.Println("Extracting + generating challenges (Practical Vim)...")
	extracted, err := extract.ExtractBook(book)
	if err != nil {
		return fmt.Errorf("extraction failed: %w", err)
	}

	cs := challenge.Generate(extracted, slug)

	if err := output.WriteNamedJSON(cs, subDir, slug+"_challenges.json"); err != nil {
		return err
	}
	if err := output.WriteCommandIndex(extracted, subDir, slug); err != nil {
		return err
	}

	// Difficulty distribution
	diffs := map[int]int{}
	for _, ch := range cs.Challenges {
		diffs[ch.Difficulty]++
	}

	fmt.Printf("\n=== Practical Vim Generation Summary ===\n")
	fmt.Printf("Challenges: %d\n", len(cs.Challenges))
	fmt.Printf("Difficulty: 入門=%d  進階=%d  精通=%d\n", diffs[1], diffs[2], diffs[3])
	fmt.Printf("Output: %s/%s_challenges.json\n", subDir, slug)
	fmt.Printf("        %s/%s_commands.json\n", subDir, slug)

	return nil
}

func runMerge(dir1, dir2, outputDir string) error {
	fmt.Printf("Merging command indices from %s and %s...\n", dir1, dir2)

	load := func(dir string) (*output.CommandIndex, error) {
		// Find *_commands.json in dir
		entries, err := os.ReadDir(dir)
		if err != nil {
			return nil, fmt.Errorf("failed to read %s: %w", dir, err)
		}
		for _, e := range entries {
			if strings.HasSuffix(e.Name(), "_commands.json") {
				data, err := os.ReadFile(filepath.Join(dir, e.Name()))
				if err != nil {
					return nil, err
				}
				var idx output.CommandIndex
				if err := json.Unmarshal(data, &idx); err != nil {
					return nil, fmt.Errorf("failed to parse %s: %w", e.Name(), err)
				}
				return &idx, nil
			}
		}
		return nil, nil
	}

	idx1, err := load(dir1)
	if err != nil {
		return err
	}
	idx2, err := load(dir2)
	if err != nil {
		return err
	}

	merged := output.MergeIndices(idx1, idx2)

	if err := output.WriteNamedJSON(merged, outputDir, "merged_commands.json"); err != nil {
		return err
	}

	fmt.Printf("Merged %d commands → %s/merged_commands.json\n", len(merged.Commands), outputDir)
	return nil
}

func detectIsLazyVim(book *epub.Book) bool {
	for i, item := range book.Items {
		if i > 5 {
			break
		}
		content := string(item.Content)
		if strings.Contains(content, `class="chapter"`) && strings.Contains(content, `class="sect2"`) {
			return true
		}
	}
	return false
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
