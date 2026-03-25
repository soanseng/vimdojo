package challenge

import "testing"

func TestScoreDifficulty(t *testing.T) {
	tests := []struct {
		name       string
		keystrokes string
		commands   []string
		want       int
	}{
		{"simple single key", "x", []string{"x"}, 1},
		{"dd dot", "dd.", []string{"dd", "."}, 1},
		{"A with insert", "A;<Esc>j.j.", []string{"A", ".", "j"}, 2},
		{"search replace", "*cwcopy<Esc>n.", []string{"*", "c", "w", "n", "."}, 2},
		{"text object combo", "ci{new<Esc>", []string{"c", "i{"}, 2},
		{"complex indent", ">Gj.j.", []string{">", "G", "j", "."}, 2},
		{"visual + macro", "qaVjdq3@a", []string{"q", "V", "j", "d", "@"}, 3},
		{"regex substitute", ":%s/old/new/g", []string{":%s"}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ScoreDifficulty(tt.keystrokes, tt.commands)
			if got != tt.want {
				t.Errorf("ScoreDifficulty(%q, %v) = %d, want %d",
					tt.keystrokes, tt.commands, got, tt.want)
			}
		})
	}
}
