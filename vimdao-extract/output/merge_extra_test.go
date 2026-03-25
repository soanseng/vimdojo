package output

import (
	"testing"
)

// TestMergeEmptyInput verifies that MergeIndices with no arguments returns an
// empty, non-nil CommandIndex.
func TestMergeEmptyInput(t *testing.T) {
	result := MergeIndices()
	if result == nil {
		t.Fatal("expected non-nil CommandIndex")
	}
	if len(result.Commands) != 0 {
		t.Errorf("expected 0 commands, got %d", len(result.Commands))
	}
}

// TestMergeAllNilInputs verifies that passing only nil indices returns an
// empty, non-nil CommandIndex.
func TestMergeAllNilInputs(t *testing.T) {
	result := MergeIndices(nil, nil, nil)
	if result == nil {
		t.Fatal("expected non-nil CommandIndex")
	}
	if len(result.Commands) != 0 {
		t.Errorf("expected 0 commands, got %d", len(result.Commands))
	}
}

// TestMergeSingleIndex verifies that merging a single non-nil index returns
// an equivalent index without modification.
func TestMergeSingleIndex(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "w", Frequency: 7, Chapters: []int{1, 3}, Sections: []string{"1.1", "3.2"}, Category: "motion"},
			{Command: "x", Frequency: 2, Chapters: []int{2}, Sections: []string{"2.1"}, Category: "other"},
		},
	}
	result := MergeIndices(a)
	if len(result.Commands) != 2 {
		t.Fatalf("expected 2 commands, got %d", len(result.Commands))
	}
	// Highest frequency should sort first
	if result.Commands[0].Command != "w" {
		t.Errorf("expected 'w' first (freq 7), got %q", result.Commands[0].Command)
	}
}

// TestMergeSectionsMergedAndDeduped verifies that string sections from two
// indices are deduplicated and sorted.
func TestMergeSectionsMergedAndDeduped(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "dd", Frequency: 2, Sections: []string{"1.1", "2.3"}, Chapters: []int{1}},
		},
	}
	b := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "dd", Frequency: 1, Sections: []string{"2.3", "3.5"}, Chapters: []int{3}},
		},
	}
	result := MergeIndices(a, b)
	if len(result.Commands) != 1 {
		t.Fatalf("expected 1 command, got %d", len(result.Commands))
	}
	dd := result.Commands[0]
	// Sections "1.1", "2.3", "3.5" — "2.3" appears in both, deduped to 3 entries
	if len(dd.Sections) != 3 {
		t.Errorf("sections: got %v, want [1.1 2.3 3.5]", dd.Sections)
	}
	if dd.Sections[0] != "1.1" || dd.Sections[1] != "2.3" || dd.Sections[2] != "3.5" {
		t.Errorf("sections order: got %v, want [1.1 2.3 3.5]", dd.Sections)
	}
}

// TestMergeChaptersMergedAndDeduped verifies that integer chapters from two
// indices are deduplicated and sorted.
func TestMergeChaptersMergedAndDeduped(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "w", Frequency: 3, Chapters: []int{5, 1, 3}},
		},
	}
	b := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "w", Frequency: 2, Chapters: []int{3, 7}},
		},
	}
	result := MergeIndices(a, b)
	if len(result.Commands) != 1 {
		t.Fatalf("expected 1 command, got %d", len(result.Commands))
	}
	w := result.Commands[0]
	// Chapters: {1, 3, 5, 7} — 3 deduped, sorted ascending
	if len(w.Chapters) != 4 {
		t.Errorf("chapters: got %v, want [1 3 5 7]", w.Chapters)
	}
	expected := []int{1, 3, 5, 7}
	for i, v := range expected {
		if w.Chapters[i] != v {
			t.Errorf("chapters[%d] = %d, want %d", i, w.Chapters[i], v)
		}
	}
}

// TestMergeContextExamplesCappedAtThree verifies that when two indices together
// have more than 3 context examples for the same command, only 3 are kept.
// The cap of 3 applies to examples appended from the second index onward;
// examples carried in from the first index are kept as-is.
func TestMergeContextExamplesCappedAtThree(t *testing.T) {
	// a has 3 examples → stored as-is when first seen.
	// b has 3 more → none are appended because existing len is already >= 3.
	a := &CommandIndex{
		Commands: []CommandEntry{
			{
				Command:         "w",
				Frequency:       3,
				Chapters:        []int{1},
				ContextExamples: []string{"Tip 1: First", "Tip 2: Second", "Tip 3: Third"},
			},
		},
	}
	b := &CommandIndex{
		Commands: []CommandEntry{
			{
				Command:         "w",
				Frequency:       4,
				Chapters:        []int{2},
				ContextExamples: []string{"Tip 4: Fourth", "Tip 5: Fifth", "Tip 6: Sixth"},
			},
		},
	}
	result := MergeIndices(a, b)
	if len(result.Commands) != 1 {
		t.Fatalf("expected 1 command, got %d", len(result.Commands))
	}
	w := result.Commands[0]
	// The cap logic is `len < 3`, so examples from b are not appended
	// once the existing set already has 3. Result stays at 3.
	if len(w.ContextExamples) > 3 {
		t.Errorf("context examples must not exceed 3, got %d: %v", len(w.ContextExamples), w.ContextExamples)
	}
	if len(w.ContextExamples) == 0 {
		t.Error("context examples must not be empty after merge")
	}
}

// TestMergeContextExamplesPartialFill verifies that examples from the second
// index are appended only up to the cap of 3.
func TestMergeContextExamplesPartialFill(t *testing.T) {
	// a has 2 examples → stored as base.
	// b has 3 more → only 1 appended (2 < 3 → append "C", then 3 >= 3 → stop).
	a := &CommandIndex{
		Commands: []CommandEntry{
			{
				Command:         "w",
				Frequency:       2,
				Chapters:        []int{1},
				ContextExamples: []string{"A", "B"},
			},
		},
	}
	b := &CommandIndex{
		Commands: []CommandEntry{
			{
				Command:         "w",
				Frequency:       3,
				Chapters:        []int{2},
				ContextExamples: []string{"C", "D", "E"},
			},
		},
	}
	result := MergeIndices(a, b)
	if len(result.Commands) != 1 {
		t.Fatalf("expected 1 command, got %d", len(result.Commands))
	}
	w := result.Commands[0]
	// Should be capped at 3: [A, B, C]
	if len(w.ContextExamples) != 3 {
		t.Errorf("expected 3 context examples, got %d: %v", len(w.ContextExamples), w.ContextExamples)
	}
	if w.ContextExamples[0] != "A" || w.ContextExamples[1] != "B" || w.ContextExamples[2] != "C" {
		t.Errorf("unexpected examples: %v, want [A B C]", w.ContextExamples)
	}
}

// TestMergeFrequencyAccumulates verifies frequency summing across three indices.
func TestMergeFrequencyAccumulates(t *testing.T) {
	a := &CommandIndex{Commands: []CommandEntry{{Command: "j", Frequency: 10, Chapters: []int{1}}}}
	b := &CommandIndex{Commands: []CommandEntry{{Command: "j", Frequency: 5, Chapters: []int{2}}}}
	c := &CommandIndex{Commands: []CommandEntry{{Command: "j", Frequency: 3, Chapters: []int{3}}}}
	result := MergeIndices(a, b, c)
	if len(result.Commands) != 1 {
		t.Fatalf("expected 1 command, got %d", len(result.Commands))
	}
	if result.Commands[0].Frequency != 18 {
		t.Errorf("frequency: got %d, want 18", result.Commands[0].Frequency)
	}
}

// TestMergeDisjointCommandSets verifies that commands unique to each index
// appear in the merged result.
func TestMergeDisjointCommandSets(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "w", Frequency: 5, Chapters: []int{1}},
			{Command: "b", Frequency: 3, Chapters: []int{1}},
		},
	}
	b := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "gg", Frequency: 2, Chapters: []int{2}},
			{Command: "G", Frequency: 8, Chapters: []int{2}},
		},
	}
	result := MergeIndices(a, b)
	if len(result.Commands) != 4 {
		t.Fatalf("expected 4 commands, got %d", len(result.Commands))
	}
	// Highest frequency (G: 8) should sort first
	if result.Commands[0].Command != "G" {
		t.Errorf("expected 'G' first (freq 8), got %q", result.Commands[0].Command)
	}
}

// TestMergeTieBreakAlphabetical verifies that equal-frequency commands are
// sorted alphabetically.
func TestMergeTieBreakAlphabetical(t *testing.T) {
	a := &CommandIndex{
		Commands: []CommandEntry{
			{Command: "z", Frequency: 5, Chapters: []int{1}},
			{Command: "a", Frequency: 5, Chapters: []int{1}},
			{Command: "m", Frequency: 5, Chapters: []int{1}},
		},
	}
	result := MergeIndices(a)
	if len(result.Commands) != 3 {
		t.Fatalf("expected 3 commands, got %d", len(result.Commands))
	}
	order := []string{"a", "m", "z"}
	for i, want := range order {
		if result.Commands[i].Command != want {
			t.Errorf("commands[%d] = %q, want %q", i, result.Commands[i].Command, want)
		}
	}
}

// TestMergeNilAmongMultiple verifies that nil indices interspersed among
// valid ones are skipped without corrupting the merge.
func TestMergeNilAmongMultiple(t *testing.T) {
	a := &CommandIndex{Commands: []CommandEntry{{Command: "w", Frequency: 4, Chapters: []int{1}}}}
	b := &CommandIndex{Commands: []CommandEntry{{Command: "b", Frequency: 2, Chapters: []int{2}}}}
	result := MergeIndices(nil, a, nil, b, nil)
	if len(result.Commands) != 2 {
		t.Fatalf("expected 2 commands, got %d", len(result.Commands))
	}
}

// ---------------------------------------------------------------------------
// mergeIntSlice and mergeStringSlice internal helper tests
// ---------------------------------------------------------------------------

func TestMergeIntSliceBothNonEmpty(t *testing.T) {
	tests := []struct {
		name string
		a, b []int
		want []int
	}{
		{
			name: "disjoint sets",
			a:    []int{1, 3, 5},
			b:    []int{2, 4, 6},
			want: []int{1, 2, 3, 4, 5, 6},
		},
		{
			name: "overlapping sets",
			a:    []int{1, 2, 3},
			b:    []int{2, 3, 4},
			want: []int{1, 2, 3, 4},
		},
		{
			name: "identical sets",
			a:    []int{5, 5, 5},
			b:    []int{5},
			want: []int{5},
		},
		{
			name: "empty a",
			a:    []int{},
			b:    []int{1, 2},
			want: []int{1, 2},
		},
		{
			name: "empty b",
			a:    []int{3, 4},
			b:    []int{},
			want: []int{3, 4},
		},
		{
			name: "both empty",
			a:    []int{},
			b:    []int{},
			want: []int{},
		},
		{
			name: "nil a",
			a:    nil,
			b:    []int{7},
			want: []int{7},
		},
		{
			name: "nil b",
			a:    []int{7},
			b:    nil,
			want: []int{7},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mergeIntSlice(tt.a, tt.b)
			if len(got) != len(tt.want) {
				t.Fatalf("mergeIntSlice(%v, %v) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
			for i, v := range tt.want {
				if got[i] != v {
					t.Errorf("[%d]: got %d, want %d", i, got[i], v)
				}
			}
		})
	}
}

func TestMergeStringSliceBothNonEmpty(t *testing.T) {
	tests := []struct {
		name string
		a, b []string
		want []string
	}{
		{
			name: "disjoint sets",
			a:    []string{"1.1", "2.3"},
			b:    []string{"3.5", "4.7"},
			want: []string{"1.1", "2.3", "3.5", "4.7"},
		},
		{
			name: "overlapping sets",
			a:    []string{"1.1", "2.3"},
			b:    []string{"2.3", "3.5"},
			want: []string{"1.1", "2.3", "3.5"},
		},
		{
			name: "identical sets",
			a:    []string{"tip"},
			b:    []string{"tip"},
			want: []string{"tip"},
		},
		{
			name: "empty a",
			a:    []string{},
			b:    []string{"x", "y"},
			want: []string{"x", "y"},
		},
		{
			name: "empty b",
			a:    []string{"x", "y"},
			b:    []string{},
			want: []string{"x", "y"},
		},
		{
			name: "nil a",
			a:    nil,
			b:    []string{"z"},
			want: []string{"z"},
		},
		{
			name: "nil b",
			a:    []string{"z"},
			b:    nil,
			want: []string{"z"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mergeStringSlice(tt.a, tt.b)
			if len(got) != len(tt.want) {
				t.Fatalf("mergeStringSlice(%v, %v) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
			for i, v := range tt.want {
				if got[i] != v {
					t.Errorf("[%d]: got %q, want %q", i, got[i], v)
				}
			}
		})
	}
}
