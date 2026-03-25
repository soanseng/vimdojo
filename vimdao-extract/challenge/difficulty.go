package challenge

import "strings"

// ScoreDifficulty returns 1 (入門), 2 (進階), or 3 (精通)
// based on keystroke length, command variety, and technique complexity.
func ScoreDifficulty(keystrokes string, commands []string) int {
	score := 0

	// Keystroke length
	ksLen := len(keystrokes)
	if ksLen <= 3 {
		score += 0
	} else if ksLen <= 6 {
		score += 1
	} else {
		score += 2
	}

	// Command diversity
	if len(commands) >= 4 {
		score += 2
	} else if len(commands) >= 3 {
		score += 1
	}

	// Technique complexity bonuses
	for _, cmd := range commands {
		switch {
		case cmd == "q" || cmd == "@": // macros
			score += 2
		case strings.HasPrefix(cmd, ":%s") || strings.HasPrefix(cmd, ":s"): // substitute
			score += 3
		case cmd == "*" || cmd == "#": // word search — common pattern, minor bump
			score += 0
		case cmd == "v" || cmd == "V": // visual mode
			score += 1
		case len(cmd) == 2 && (cmd[0] == 'i' || cmd[0] == 'a'): // text objects
			score += 1
		}
	}

	switch {
	case score <= 2:
		return 1
	case score <= 4:
		return 2
	default:
		return 3
	}
}
