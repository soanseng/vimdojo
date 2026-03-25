package output

import "testing"

// TestCategorizeEmptyCommand verifies that categorize returns "other" for an
// empty string — DetectCommands returns an empty slice for empty input,
// exercising the `return detect.CatOther` fallback branch.
func TestCategorizeEmptyCommand(t *testing.T) {
	tests := []struct {
		name string
		cmd  string
		want string
	}{
		{"empty string", "", "other"},
		{"whitespace only", "   ", "other"},
		{"newline only", "\n", "other"},
		// <F1> is an unrecognised special key, so DetectCommands returns []
		{"unrecognised special key", "<F1>", "other"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := string(categorize(tt.cmd))
			if got != tt.want {
				t.Errorf("categorize(%q) = %q, want %q", tt.cmd, got, tt.want)
			}
		})
	}
}
