package detect

import (
	"regexp"
	"sort"
	"strings"
)

// Category is a Vim command category.
type Category string

const (
	CatMotion     Category = "motion"
	CatOperator   Category = "operator"
	CatTextObject Category = "text-object"
	CatCommand    Category = "command"
	CatInsert     Category = "insert"
	CatVisual     Category = "visual"
	CatOther      Category = "other"
)

// CommandInfo holds detected command metadata.
type CommandInfo struct {
	Command  string   `json:"command"`
	Category Category `json:"category"`
}

// motions is the set of known motion commands.
var motions = map[string]bool{
	"h": true, "j": true, "k": true, "l": true,
	"w": true, "W": true, "e": true, "E": true, "b": true, "B": true,
	"0": true, "^": true, "$": true,
	"gg": true, "G": true,
	"f": true, "F": true, "t": true, "T": true,
	";": true, ",": true,
	"{": true, "}": true, "(": true, ")": true,
	"H": true, "M": true, "L": true,
	"%": true,
	"n": true, "N": true,
	"*": true, "#": true,
}

var operators = map[string]bool{
	"d": true, "c": true, "y": true,
	">": true, "<": true, "=": true,
	"gU": true, "gu": true, "g~": true,
}

var insertCommands = map[string]bool{
	"i": true, "I": true, "a": true, "A": true,
	"o": true, "O": true, "s": true, "S": true,
	"C": true, "R": true,
}

var visualCommands = map[string]bool{
	"v": true, "V": true,
}

var otherCommands = map[string]bool{
	".": true, "@": true, "q": true,
	"u": true,
	"x": true, "X": true, "r": true,
	"p": true, "P": true,
	"J": true,
	"~": true,
	"dd": true, "cc": true, "yy": true,
	"D": true, "Y": true,
}

// textObjectPrefixes are inner/around markers.
var textObjectChars = map[byte]bool{
	'w': true, 'W': true,
	'"': true, '\'': true, '`': true,
	'(': true, ')': true, 'b': true,
	'{': true, '}': true, 'B': true,
	'[': true, ']': true,
	'<': true, '>': true,
	't': true,
	'p': true, 's': true,
}

var (
	// Matches Vim special key notation like <C-r>, <Esc>, <CR>, <C-v>
	reSpecialKey = regexp.MustCompile(`<[A-Za-z][-\w]*>`)
	// Matches f/F/t/T followed by a char
	reFindChar = regexp.MustCompile(`^[fFtT].`)
	// Matches text objects like iw, aw, i", a(, etc.
	reTextObject = regexp.MustCompile(`^[ia][wW"'` + "`" + `()bBb{}\[\]<>tps]`)
	// Matches :commands
	reExCommand = regexp.MustCompile(`^:[\w%/!]+`)
	// Matches operator + motion like dw, cw, y$
	reOperatorMotion = regexp.MustCompile(`^[dcy][hjklwWeEbB0^$GnN{}()%fFtT;,HML]`)
)

// DetectCommands finds all Vim commands in a keystroke string.
// It tracks mode transitions so that typed text in insert mode is not
// misidentified as normal-mode commands.
func DetectCommands(keystrokes string) []CommandInfo {
	if keystrokes == "" || keystrokes == "{start}" {
		return nil
	}

	seen := make(map[string]bool)
	var result []CommandInfo

	add := func(cmd string, cat Category) {
		if !seen[cmd] {
			seen[cmd] = true
			result = append(result, CommandInfo{Command: cmd, Category: cat})
		}
	}

	// Split on <Esc> to identify insert-mode segments.
	// Pattern: normalKeys insertCmd typedText<Esc> normalKeys ...
	// We process the string by finding insert-mode-entering commands, then
	// skipping until the next <Esc>.

	// First, find <special> key positions
	type specialKey struct {
		start, end int
		key        string
	}

	var specials []specialKey
	for _, loc := range reSpecialKey.FindAllStringIndex(keystrokes, -1) {
		specials = append(specials, specialKey{
			start: loc[0],
			end:   loc[1],
			key:   keystrokes[loc[0]:loc[1]],
		})
	}

	// Build a version with special keys replaced by single placeholder chars
	// to simplify index math. We'll process the original string with awareness
	// of special key boundaries.

	// Simpler approach: split into segments between special keys, tracking mode.
	inInsert := false
	pos := 0

	for pos < len(keystrokes) {
		// Check if we're at a special key
		var foundSpecial *specialKey
		for idx := range specials {
			if specials[idx].start == pos {
				foundSpecial = &specials[idx]
				break
			}
		}

		if foundSpecial != nil {
			lower := strings.ToLower(foundSpecial.key)
			if lower == "<esc>" {
				inInsert = false
			} else if lower == "<cr>" || lower == "<enter>" {
				// part of ex-command or insert mode
			} else if strings.HasPrefix(lower, "<c-") {
				if !inInsert {
					add(foundSpecial.key, CatOther)
				}
			}
			pos = foundSpecial.end
			continue
		}

		// If in insert mode, skip typed characters
		if inInsert {
			pos++
			continue
		}

		ch := keystrokes[pos]

		// Ex commands
		if ch == ':' {
			end := pos + 1
			for end < len(keystrokes) && keystrokes[end] != '\n' {
				// Stop at special keys
				isSpecial := false
				for _, sp := range specials {
					if sp.start == end {
						isSpecial = true
						break
					}
				}
				if isSpecial {
					break
				}
				end++
			}
			cmd := keystrokes[pos:end]
			add(cmd, CatCommand)
			pos = end
			continue
		}

		// Two-char lookahead (only for non-special-key next char)
		nextPos := pos + 1
		hasNext := nextPos < len(keystrokes)
		nextIsSpecial := false
		if hasNext {
			for _, sp := range specials {
				if sp.start == nextPos {
					nextIsSpecial = true
					break
				}
			}
		}

		if hasNext && !nextIsSpecial {
			two := keystrokes[pos : pos+2]

			// Text objects: iw, aw, i", a(, etc.
			if (ch == 'i' || ch == 'a') && textObjectChars[keystrokes[pos+1]] {
				add(two, CatTextObject)
				pos += 2
				continue
			}

			// Doubled operators: dd, cc, yy
			if two == "dd" || two == "cc" || two == "yy" {
				add(two, CatOther)
				pos += 2
				continue
			}

			// gg, gU, gu, g~
			if ch == 'g' {
				switch keystrokes[pos+1] {
				case 'g':
					add("gg", CatMotion)
					pos += 2
					continue
				case 'U':
					add("gU", CatOperator)
					pos += 2
					continue
				case 'u':
					add("gu", CatOperator)
					pos += 2
					continue
				case '~':
					add("g~", CatOperator)
					pos += 2
					continue
				}
			}

			// f/F/t/T + char
			if ch == 'f' || ch == 'F' || ch == 't' || ch == 'T' {
				add(string(ch), CatMotion)
				pos += 2 // skip the target char
				continue
			}

			// >G and similar operator+motion
			if operators[string(ch)] {
				add(string(ch), CatOperator)
				next := string(keystrokes[pos+1])
				if motions[next] {
					add(next, CatMotion)
					pos += 2
					continue
				}
				pos++
				continue
			}
		}

		s := string(ch)

		if motions[s] {
			add(s, CatMotion)
		} else if operators[s] {
			add(s, CatOperator)
		} else if insertCommands[s] {
			add(s, CatInsert)
			inInsert = true
		} else if visualCommands[s] {
			add(s, CatVisual)
		} else if otherCommands[s] {
			add(s, CatOther)
		}

		pos++
	}

	return result
}

// DetectFromText finds Vim command references in descriptive text (not keystroke sequences).
// Only detects multi-character commands and ex-commands to avoid false positives
// from single letters in prose.
func DetectFromText(text string) []CommandInfo {
	seen := make(map[string]bool)
	var result []CommandInfo

	add := func(cmd string, cat Category) {
		if !seen[cmd] {
			seen[cmd] = true
			result = append(result, CommandInfo{Command: cmd, Category: cat})
		}
	}

	words := strings.Fields(text)
	for _, w := range words {
		w = strings.Trim(w, ".,;:!?\"'`()[]")
		if w == "" {
			continue
		}

		// Only match multi-character commands or ex-commands from prose
		// to avoid false positives from single letters
		if len(w) < 2 {
			continue
		}

		if motions[w] {
			add(w, CatMotion)
		} else if operators[w] {
			add(w, CatOperator)
		} else if otherCommands[w] {
			add(w, CatOther)
		}
	}

	return result
}

// MergeCommands deduplicates a list of CommandInfo.
func MergeCommands(cmds []CommandInfo) []CommandInfo {
	seen := make(map[string]bool)
	var result []CommandInfo
	for _, c := range cmds {
		if !seen[c.Command] {
			seen[c.Command] = true
			result = append(result, c)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Command < result[j].Command
	})
	return result
}

// CommandStrings extracts just the command names from CommandInfo slice.
func CommandStrings(cmds []CommandInfo) []string {
	var result []string
	for _, c := range cmds {
		result = append(result, c.Command)
	}
	return result
}
