package translate

import "testing"

// TestCommandDescRemainingCommands verifies translations for commands not
// covered by TestCommandDescCoverage, exercising the full commandDescriptions
// map including motions, ex-commands, and visual variants.
func TestCommandDescRemainingCommands(t *testing.T) {
	tests := []struct {
		cmd  string
		want string
	}{
		// motions
		{"W", "移到下一個 WORD 字首"},
		{"E", "移到 WORD 字尾"},
		{"B", "移到上一個 WORD 字首"},
		{"0", "移到行首"},
		{"^", "移到行首非空白字元"},
		{"$", "移到行尾"},
		{"F", "向左搜尋字元"},
		{"t", "向右搜尋字元（游標停在前一格）"},
		{"T", "向左搜尋字元（游標停在後一格）"},
		{",", "反向重複上次 f/t 搜尋"},
		{"{", "移到上一個段落"},
		{"}", "移到下一個段落"},
		{"(", "移到上一個句子"},
		{")", "移到下一個句子"},
		{"H", "移到畫面頂端"},
		{"M", "移到畫面中間"},
		{"L", "移到畫面底端"},
		{"%", "跳到配對的括號"},
		{"N", "搜尋上一個匹配"},
		{"#", "反向搜尋游標下的單字"},

		// operators
		{"<", "減少縮排"},
		{"=", "自動縮排"},
		{"gU", "轉大寫"},
		{"gu", "轉小寫"},
		{"g~", "切換大小寫"},

		// combined/other
		{"X", "刪除游標前的字元"},
		{"r", "替換游標下的字元"},
		{"cc", "修改整行"},
		{"yy", "複製整行"},
		{"D", "刪除到行尾"},
		{"C", "修改到行尾"},
		{"Y", "複製整行"},
		{"P", "貼上到游標前"},
		{"J", "合併下一行"},
		{"~", "切換游標下字元大小寫"},
		{"daw", "刪除游標所在的單字含空白"},

		// insert mode entry
		{"I", "在行首進入插入模式"},
		{"o", "在下方新增一行並進入插入模式"},
		{"O", "在上方新增一行並進入插入模式"},
		{"s", "刪除字元並進入插入模式"},
		{"S", "刪除整行並進入插入模式"},
		{"R", "進入取代模式"},

		// ex commands
		{":q", "離開"},
		{":wq", "儲存並離開"},
		{":%s", "全域替換"},
		{"/", "向前搜尋"},

		// text objects
		{"iW", "游標所在的 WORD"},
		{"aW", "游標所在的 WORD 含空白"},
		{`a"`, "雙引號內的文字含引號"},
		{"i'", "單引號內的文字"},
		{"a'", "單引號內的文字含引號"},
		{"a(", "括號內的文字含括號"},
		{"i)", "括號內的文字"},
		{"a)", "括號內的文字含括號"},
		{"i{", "大括號內的文字"},
		{"a{", "大括號內的文字含大括號"},
		{"i}", "大括號內的文字"},
		{"a}", "大括號內的文字含大括號"},
		{"i[", "方括號內的文字"},
		{"a[", "方括號內的文字含方括號"},
		{"i]", "方括號內的文字"},
		{"a]", "方括號內的文字含方括號"},
		{"i<", "角括號內的文字"},
		{"a<", "角括號內的文字含角括號"},
		{"i>", "角括號內的文字"},
		{"a>", "角括號內的文字含角括號"},
		{"it", "HTML 標籤內的文字"},
		{"at", "HTML 標籤內的文字含標籤"},

		// block visual
		{"<C-v>", "進入視覺模式（區塊選取）"},
	}
	for _, tt := range tests {
		t.Run(tt.cmd, func(t *testing.T) {
			got := CommandDesc(tt.cmd)
			if got != tt.want {
				t.Errorf("CommandDesc(%q) = %q, want %q", tt.cmd, got, tt.want)
			}
		})
	}
}

// TestConceptTranslationAllEntries verifies all entries in conceptTranslations
// return a non-empty string.
func TestConceptTranslationAllEntries(t *testing.T) {
	concepts := []string{
		"dot command", "text object", "text-object", "motion", "operator",
		"register", "macro", "visual mode", "visual", "insert mode", "insert",
		"normal mode", "command mode", "command", "search", "substitute",
		"indent", "fold", "mark", "jump", "completion", "spell", "undo",
		"repeat", "count", "operator-pending", "surround", "comment",
		"combo", "other",
	}
	for _, concept := range concepts {
		t.Run(concept, func(t *testing.T) {
			got := ConceptZh(concept)
			if got == "" {
				t.Errorf("ConceptZh(%q) returned empty string; expected a translation", concept)
			}
		})
	}
}

// TestCategoryNameAllEntries verifies all category names return a non-empty string.
func TestCategoryNameAllEntries(t *testing.T) {
	categories := []string{
		"motion", "operator", "text-object", "command", "insert", "visual", "combo", "other",
	}
	for _, cat := range categories {
		t.Run(cat, func(t *testing.T) {
			got := CategoryZh(cat)
			if got == "" {
				t.Errorf("CategoryZh(%q) returned empty string; expected a translation", cat)
			}
		})
	}
}

// TestDifficultyNameAllLevels verifies all difficulty levels 1-3 have translations.
func TestDifficultyNameAllLevels(t *testing.T) {
	tests := []struct {
		level int
		want  string
	}{
		{1, "入門"},
		{2, "進階"},
		{3, "精通"},
	}
	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := DifficultyZh(tt.level)
			if got != tt.want {
				t.Errorf("DifficultyZh(%d) = %q, want %q", tt.level, got, tt.want)
			}
		})
	}
}

// TestDifficultyNameUnknownLevel verifies that out-of-range difficulty levels
// return an empty string rather than panicking.
func TestDifficultyNameUnknownLevel(t *testing.T) {
	unknownLevels := []int{0, -1, 4, 100}
	for _, level := range unknownLevels {
		t.Run("unknown", func(t *testing.T) {
			got := DifficultyZh(level)
			if got != "" {
				t.Errorf("DifficultyZh(%d) = %q, want empty string for unknown level", level, got)
			}
		})
	}
}

// TestCommandDescEmptyString verifies that an empty command string returns "".
func TestCommandDescEmptyString(t *testing.T) {
	if got := CommandDesc(""); got != "" {
		t.Errorf("CommandDesc(\"\") = %q, want empty string", got)
	}
}

// TestConceptZhEmptyString verifies that an empty concept string returns "".
func TestConceptZhEmptyString(t *testing.T) {
	if got := ConceptZh(""); got != "" {
		t.Errorf("ConceptZh(\"\") = %q, want empty string", got)
	}
}

// TestCategoryZhEmptyString verifies that an empty category string returns "".
func TestCategoryZhEmptyString(t *testing.T) {
	if got := CategoryZh(""); got != "" {
		t.Errorf("CategoryZh(\"\") = %q, want empty string", got)
	}
}

// TestCommandDescAllCommandDescriptionsHaveContent verifies that every entry
// in the commandDescriptions map has a non-empty translation value. This
// catches accidental blank entries added during future maintenance.
func TestCommandDescAllCommandDescriptionsHaveContent(t *testing.T) {
	// Enumerate every key present in the map through known commands.
	allCommands := []string{
		"h", "j", "k", "l",
		"w", "W", "e", "E", "b", "B",
		"0", "^", "$",
		"gg", "G",
		"f", "F", "t", "T", ";", ",",
		"{", "}", "(", ")",
		"H", "M", "L",
		"%", "n", "N", "*", "#",
		"d", "c", "y", ">", "<", "=",
		"gU", "gu", "g~",
		".", "u",
		"x", "X", "r",
		"dd", "cc", "yy", "D", "C", "Y",
		"p", "P", "J", "~",
		"q", "@",
		"ciw", "di(", "daw",
		"i", "I", "a", "A", "o", "O", "s", "S", "R",
		"v", "V", "<C-v>",
		"/",
		":w", ":q", ":wq", ":%s",
		"iw", "aw", "iW", "aW",
		`i"`, `a"`, "i'", "a'",
		"i(", "a(", "i)", "a)",
		"i{", "a{", "i}", "a}",
		"i[", "a[", "i]", "a]",
		"i<", "a<", "i>", "a>",
		"it", "at",
	}
	for _, cmd := range allCommands {
		t.Run(cmd, func(t *testing.T) {
			got := CommandDesc(cmd)
			if got == "" {
				t.Errorf("CommandDesc(%q) returned empty string; add a translation", cmd)
			}
		})
	}
}
