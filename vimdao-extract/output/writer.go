package output

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/scipio/vimdao-extract/detect"
	"github.com/scipio/vimdao-extract/extract"
)

// CommandIndex is the top-level command index output.
type CommandIndex struct {
	Commands []CommandEntry `json:"commands"`
}

// CommandEntry is a single command in the index.
type CommandEntry struct {
	Command         string   `json:"command"`
	Frequency       int      `json:"frequency"`
	Chapters        []int    `json:"chapters"`
	Sections        []string `json:"sections"`
	Category        string   `json:"category"`
	ContextExamples []string `json:"context_examples,omitempty"`
}

// WriteExtracted writes the extracted book JSON to a file.
func WriteExtracted(book *extract.ExtractedBook, outputDir, bookSlug string) error {
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return fmt.Errorf("failed to create output dir: %w", err)
	}

	path := filepath.Join(outputDir, bookSlug+"_extracted.json")
	return writeJSON(path, book)
}

// WriteCommandIndex builds and writes the command index JSON.
func WriteCommandIndex(book *extract.ExtractedBook, outputDir, bookSlug string) error {
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return fmt.Errorf("failed to create output dir: %w", err)
	}

	index := buildCommandIndex(book)
	path := filepath.Join(outputDir, bookSlug+"_commands.json")
	return writeJSON(path, index)
}

func buildCommandIndex(book *extract.ExtractedBook) *CommandIndex {
	type cmdData struct {
		frequency       int
		chapters        map[int]bool
		sections        map[string]bool
		category        string
		contextExamples []string
	}

	data := make(map[string]*cmdData)

	for _, ch := range book.Chapters {
		for _, sec := range ch.Sections {
			for _, cmdStr := range sec.VimCommands {
				d, ok := data[cmdStr]
				if !ok {
					cat := string(categorize(cmdStr))
					d = &cmdData{
						chapters: make(map[int]bool),
						sections: make(map[string]bool),
						category: cat,
					}
					data[cmdStr] = d
				}
				d.frequency++
				d.chapters[ch.ChapterID] = true
				d.sections[sec.SectionID] = true

				if sec.TipNumber > 0 && len(d.contextExamples) < 3 {
					example := fmt.Sprintf("Tip %d: %s", sec.TipNumber, sec.Title)
					d.contextExamples = append(d.contextExamples, example)
				}
			}
		}
	}

	var entries []CommandEntry
	for cmd, d := range data {
		chapters := sortedKeys(d.chapters)
		sections := sortedStringKeys(d.sections)

		entries = append(entries, CommandEntry{
			Command:         cmd,
			Frequency:       d.frequency,
			Chapters:        chapters,
			Sections:        sections,
			Category:        d.category,
			ContextExamples: d.contextExamples,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Frequency != entries[j].Frequency {
			return entries[i].Frequency > entries[j].Frequency
		}
		return entries[i].Command < entries[j].Command
	})

	return &CommandIndex{Commands: entries}
}

func categorize(cmd string) detect.Category {
	cmds := detect.DetectCommands(cmd)
	if len(cmds) > 0 {
		return cmds[0].Category
	}
	return detect.CatOther
}

func writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("failed to write %s: %w", path, err)
	}
	return nil
}

func sortedKeys(m map[int]bool) []int {
	var keys []int
	for k := range m {
		keys = append(keys, k)
	}
	sort.Ints(keys)
	return keys
}

func sortedStringKeys(m map[string]bool) []string {
	var keys []string
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
