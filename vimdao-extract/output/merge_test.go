package output

import "testing"

func TestMergeCommandIndices(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "dd", Frequency: 5, Chapters: []int{1, 2}, Category: "other"},
			{Command: "w", Frequency: 10, Chapters: []int{1}, Category: "motion"},
		},
	}
	b := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "dd", Frequency: 3, Chapters: []int{6}, Category: "other"},
			{Command: "gc", Frequency: 7, Chapters: []int{6, 7}, Category: "other"},
		},
	}

	merged := MergeIndices(a, b)

	if len(merged.Commands) != 3 {
		t.Fatalf("expected 3 commands, got %d", len(merged.Commands))
	}

	for _, cmd := range merged.Commands {
		if cmd.Command == "dd" {
			if cmd.Frequency != 8 {
				t.Errorf("dd frequency: got %d, want 8", cmd.Frequency)
			}
			if len(cmd.Chapters) != 3 {
				t.Errorf("dd chapters: got %v, want [1, 2, 6]", cmd.Chapters)
			}
		}
	}
}

func TestMergeNilIndex(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "w", Frequency: 1, Category: "motion"},
		},
	}
	merged := MergeIndices(a, nil)
	if len(merged.Commands) != 1 {
		t.Errorf("expected 1 command, got %d", len(merged.Commands))
	}
}

func TestMergeSortsByFrequency(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "a", Frequency: 1, Category: "other"},
			{Command: "b", Frequency: 10, Category: "other"},
		},
	}
	merged := MergeIndices(a)
	if merged.Commands[0].Command != "b" {
		t.Errorf("expected b first (highest frequency), got %q", merged.Commands[0].Command)
	}
}
