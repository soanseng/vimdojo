package output

import "sort"

// MergeIndices combines multiple CommandIndex into one, deduplicating commands
// and summing frequencies.
func MergeIndices(indices ...*CommandIndex) *CommandIndex {
	data := make(map[string]*CommandEntry)

	for _, idx := range indices {
		if idx == nil {
			continue
		}
		for _, entry := range idx.Commands {
			existing, ok := data[entry.Command]
			if !ok {
				e := entry
				data[entry.Command] = &e
				continue
			}
			existing.Frequency += entry.Frequency
			existing.Chapters = mergeIntSlice(existing.Chapters, entry.Chapters)
			existing.Sections = mergeStringSlice(existing.Sections, entry.Sections)
			for _, ex := range entry.ContextExamples {
				if len(existing.ContextExamples) < 3 {
					existing.ContextExamples = append(existing.ContextExamples, ex)
				}
			}
		}
	}

	var result []CommandEntry
	for _, entry := range data {
		result = append(result, *entry)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Frequency != result[j].Frequency {
			return result[i].Frequency > result[j].Frequency
		}
		return result[i].Command < result[j].Command
	})

	return &CommandIndex{Commands: result}
}

func mergeIntSlice(a, b []int) []int {
	seen := make(map[int]bool)
	for _, v := range a {
		seen[v] = true
	}
	for _, v := range b {
		seen[v] = true
	}
	var result []int
	for v := range seen {
		result = append(result, v)
	}
	sort.Ints(result)
	return result
}

func mergeStringSlice(a, b []string) []string {
	seen := make(map[string]bool)
	for _, v := range a {
		seen[v] = true
	}
	for _, v := range b {
		seen[v] = true
	}
	var result []string
	for v := range seen {
		result = append(result, v)
	}
	sort.Strings(result)
	return result
}
