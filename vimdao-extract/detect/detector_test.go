package detect

import (
	"testing"
)

func TestDetectCommands(t *testing.T) {
	tests := []struct {
		name       string
		keystrokes string
		wantCmds   []string
	}{
		{
			name:       "dot command with x",
			keystrokes: "x..",
			wantCmds:   []string{"x", "."},
		},
		{
			name:       "dd then dot",
			keystrokes: "dd.",
			wantCmds:   []string{"dd", "."},
		},
		{
			name:       "indent to end",
			keystrokes: ">G",
			wantCmds:   []string{">", "G"},
		},
		{
			name:       "append semicolon",
			keystrokes: "A;<Esc>",
			wantCmds:   []string{"A"},
		},
		{
			name:       "find and replace char",
			keystrokes: "f\"r';.",
			wantCmds:   []string{"f", "r", ";", "."},
		},
		{
			name:       "delete word",
			keystrokes: "dw",
			wantCmds:   []string{"d", "w"},
		},
		{
			name:       "change inner word",
			keystrokes: "ciw",
			wantCmds:   []string{"c", "iw"},
		},
		{
			name:       "empty",
			keystrokes: "",
			wantCmds:   nil,
		},
		{
			name:       "start marker",
			keystrokes: "{start}",
			wantCmds:   nil,
		},
		{
			name:       "visual delete",
			keystrokes: "vjd",
			wantCmds:   []string{"v", "j", "d"},
		},
		{
			name:       "gg motion",
			keystrokes: "gg",
			wantCmds:   []string{"gg"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DetectCommands(tt.keystrokes)
			gotStrs := CommandStrings(got)

			if tt.wantCmds == nil && gotStrs != nil {
				t.Errorf("expected nil, got %v", gotStrs)
				return
			}
			if len(gotStrs) != len(tt.wantCmds) {
				t.Errorf("expected %v, got %v", tt.wantCmds, gotStrs)
				return
			}
			for i, want := range tt.wantCmds {
				if gotStrs[i] != want {
					t.Errorf("cmd[%d]: expected %q, got %q", i, want, gotStrs[i])
				}
			}
		})
	}
}

func TestDetectCategories(t *testing.T) {
	cmds := DetectCommands("dw")
	if len(cmds) != 2 {
		t.Fatalf("expected 2 commands, got %d", len(cmds))
	}
	if cmds[0].Category != CatOperator {
		t.Errorf("expected operator for 'd', got %s", cmds[0].Category)
	}
	if cmds[1].Category != CatMotion {
		t.Errorf("expected motion for 'w', got %s", cmds[1].Category)
	}
}
