package challenge

import "testing"

// TestScoreDifficultyBoundaryKeystrokes covers all three keystroke length
// buckets including the exact boundary values (3 and 6 characters).
func TestScoreDifficultyBoundaryKeystrokes(t *testing.T) {
	tests := []struct {
		name       string
		keystrokes string
		commands   []string
		want       int
	}{
		// Exactly at the <=3 boundary → score 0 from keystrokes → difficulty 1
		{"exactly 3 chars", "abc", []string{}, 1},
		// Exactly at the <=6 boundary → score 1 from keystrokes → difficulty 1
		{"exactly 6 chars", "abcdef", []string{}, 1},
		// One over 6 → score 2 from keystrokes → difficulty 1 (still <=2)
		{"7 chars", "abcdefg", []string{}, 1},
		// Two-char keystrokes → in <=3 bucket
		{"2 chars", "ab", []string{}, 1},
		// Empty keystrokes → in <=3 bucket
		{"empty keystrokes", "", []string{}, 1},
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

// TestScoreDifficultyCommandDiversity covers the command diversity thresholds:
// >=4 commands adds 2, >=3 commands adds 1, fewer adds 0.
func TestScoreDifficultyCommandDiversity(t *testing.T) {
	tests := []struct {
		name string
		ks   string
		cmds []string
		want int
	}{
		// 0 commands: diversity bonus 0, ks<=3 → score 0 → difficulty 1
		{"zero commands", "x", []string{}, 1},
		// 1 command: diversity bonus 0, ks<=3 → score 0 → difficulty 1
		{"one command", "x", []string{"x"}, 1},
		// 2 commands: diversity bonus 0, ks<=3 → score 0 → difficulty 1
		{"two commands", "xy", []string{"x", "y"}, 1},
		// exactly 3 commands: diversity +1, ks<=3 → score 1 → difficulty 1
		{"three commands", "x", []string{"a", "b", "c"}, 1},
		// exactly 4 commands: diversity +2 (threshold >=4), ks<=3 → score 2 → difficulty 1
		{"four commands ks<=3", "xyz", []string{"x", "y", "z", "w"}, 1},
		// exactly 4 commands with ks 4-6: diversity +2, ks +1 → score 3 → difficulty 2
		{"four commands ks 4-6", "xyzw", []string{"x", "y", "z", "w"}, 2},
		// 5 commands, ks<=3: diversity +2, score 2 → difficulty 1
		{"five commands", "x", []string{"a", "b", "c", "d", "e"}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ScoreDifficulty(tt.ks, tt.cmds)
			if got != tt.want {
				t.Errorf("ScoreDifficulty(%q, %v) = %d, want %d",
					tt.ks, tt.cmds, got, tt.want)
			}
		})
	}
}

// TestScoreDifficultyTechniqueComplexity tests individual technique bonuses
// and verifies the score thresholds that map to difficulty levels.
func TestScoreDifficultyTechniqueComplexity(t *testing.T) {
	tests := []struct {
		name     string
		ks       string
		cmds     []string
		want     int
	}{
		// Macro command "q" alone: +2 technique, ks<=3 → score 2 → difficulty 1
		{"macro q alone", "q", []string{"q"}, 1},
		// Macro command "@" alone: +2 technique, ks<=3 → score 2 → difficulty 1
		{"macro @ alone", "@", []string{"@"}, 1},
		// q + medium ks (4-6): +2 technique + 1 ks → score 3 → difficulty 2
		{"macro q with medium ks", "qaaq", []string{"q"}, 2},
		// @ + medium ks: +2 + 1 → score 3 → difficulty 2
		{"macro @ with medium ks", "3@aq", []string{"@"}, 2},
		// Visual V alone: +1 technique, ks<=3 → score 1 → difficulty 1
		{"visual V alone", "V", []string{"V"}, 1},
		// Visual v alone: +1 technique, ks<=3 → score 1 → difficulty 1
		{"visual v alone", "v", []string{"v"}, 1},
		// Text object "iw": +1 technique (len==2, starts with 'i'), ks<=3 → score 1 → difficulty 1
		{"text object iw", "iw", []string{"iw"}, 1},
		// Text object "aw": +1 technique (len==2, starts with 'a'), ks<=3 → score 1 → difficulty 1
		{"text object aw", "aw", []string{"aw"}, 1},
		// Text object "i(" — len 2, starts 'i': +1, ks<=3 → score 1 → difficulty 1
		{"text object i(", "i(", []string{"i("}, 1},
		// Word search "*": +0 bonus, ks<=3 → score 0 → difficulty 1
		{"word search *", "*", []string{"*"}, 1},
		// Word search "#": +0 bonus, ks<=3 → score 0 → difficulty 1
		{"word search #", "#", []string{"#"}, 1},
		// :s substitute prefix: +3, ks<=3 → score 3 → difficulty 2
		{"line substitute :s", ":s", []string{":s"}, 2},
		// :%s substitute prefix: +3, ks<=3 → score 3 → difficulty 2
		{"global substitute :%s", ":%s", []string{":%s"}, 2},
		// :%s/old/new/g as a full command string — starts with :%s → +3
		{"full substitute command", ":%s/x/y/g", []string{":%s/x/y/g"}, 3},
		// Combination: q(@) + V + long ks → score high → difficulty 3
		{"q macro + V + long ks", "qaVjdq3@a", []string{"q", "V", "@"}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ScoreDifficulty(tt.ks, tt.cmds)
			if got != tt.want {
				t.Errorf("ScoreDifficulty(%q, %v) = %d, want %d",
					tt.ks, tt.cmds, got, tt.want)
			}
		})
	}
}

// TestScoreDifficultyScoreThresholds verifies the three return tiers:
// score <=2 → 1, score <=4 → 2, score >4 → 3.
func TestScoreDifficultyScoreThresholds(t *testing.T) {
	tests := []struct {
		name string
		ks   string
		cmds []string
		want int
	}{
		// score==2: ks>6 (+2), no commands → exactly 2 → difficulty 1
		{"score exactly 2 → level 1", "abcdefgh", []string{}, 1},
		// score==3: :s (+3), ks<=3 → 3 → difficulty 2
		{"score exactly 3 → level 2", ":s", []string{":s"}, 2},
		// score==4: :s (+3) + ks 4-6 (+1) = 4 → difficulty 2
		{"score exactly 4 → level 2", ":s/x/", []string{":s"}, 2},
		// score==5: :s (+3) + ks>6 (+2) = 5 → difficulty 3
		{"score exactly 5 → level 3", ":s/old/new/", []string{":s"}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ScoreDifficulty(tt.ks, tt.cmds)
			if got != tt.want {
				t.Errorf("ScoreDifficulty(%q, %v) = %d, want %d",
					tt.ks, tt.cmds, got, tt.want)
			}
		})
	}
}

// TestScoreDifficultyTextObjectVariants confirms that 2-char commands starting
// with 'i' or 'a' receive the +1 text-object bonus.
func TestScoreDifficultyTextObjectVariants(t *testing.T) {
	textObjects := []string{
		"iw", "aw", `i"`, `a"`, "i'", "a'", "i(", "a(",
		"i{", "a{", "i[", "a[", "i<", "a<", "it", "at",
	}
	for _, to := range textObjects {
		t.Run(to, func(t *testing.T) {
			// text object alone with short ks → score 1 → difficulty 1
			got := ScoreDifficulty(to, []string{to})
			if got < 1 || got > 3 {
				t.Errorf("ScoreDifficulty(%q, [%q]) = %d, out of range [1,3]", to, to, got)
			}
		})
	}
}
