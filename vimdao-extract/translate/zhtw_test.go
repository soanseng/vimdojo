package translate

import "testing"

func TestCommandDescription(t *testing.T) {
	tests := []struct {
		cmd  string
		want string
	}{
		{".", "重複上次修改"},
		{"dd", "刪除整行"},
		{"x", "刪除游標下的字元"},
		{"ciw", "修改游標所在的單字"},
		{"f", "向右搜尋字元"},
		{";", "重複上次 f/t 搜尋"},
		{"*", "搜尋游標下的單字"},
		{"di(", "刪除括號內的文字"},
		{"A", "在行尾進入插入模式"},
		{"v", "進入視覺模式（字元選取）"},
		{"V", "進入視覺模式（行選取）"},
		{"<C-v>", "進入視覺模式（區塊選取）"},
		{"p", "貼上到游標後"},
		{"u", "復原"},
		{"gg", "移到檔案開頭"},
		{":w", "儲存"},
		{"unknown_cmd", ""},
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

func TestConceptTranslation(t *testing.T) {
	tests := []struct {
		concept string
		want    string
	}{
		{"dot command", "dot 指令（重複的力量）"},
		{"text object", "文字物件"},
		{"motion", "移動指令"},
		{"operator", "操作符"},
		{"visual mode", "視覺模式"},
		{"unknown", ""},
	}
	for _, tt := range tests {
		t.Run(tt.concept, func(t *testing.T) {
			got := ConceptZh(tt.concept)
			if got != tt.want {
				t.Errorf("ConceptZh(%q) = %q, want %q", tt.concept, got, tt.want)
			}
		})
	}
}

func TestCategoryName(t *testing.T) {
	tests := []struct {
		cat  string
		want string
	}{
		{"motion", "移動"},
		{"operator", "操作"},
		{"text-object", "文字物件"},
		{"combo", "組合技"},
		{"nonexistent", ""},
	}
	for _, tt := range tests {
		t.Run(tt.cat, func(t *testing.T) {
			got := CategoryZh(tt.cat)
			if got != tt.want {
				t.Errorf("CategoryZh(%q) = %q, want %q", tt.cat, got, tt.want)
			}
		})
	}
}

func TestDifficultyName(t *testing.T) {
	tests := []struct {
		level int
		want  string
	}{
		{1, "入門"},
		{2, "進階"},
		{3, "精通"},
		{99, ""},
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

func TestCommandDescCoverage(t *testing.T) {
	// Ensure all common commands have translations
	required := []string{
		"h", "j", "k", "l", "w", "W", "e", "E", "b", "B",
		"0", "^", "$", "gg", "G", "f", "F", "t", "T", ";", ",",
		"d", "c", "y", ">", "<",
		"dd", "cc", "yy", "D", "C", "Y",
		"x", "X", "r", ".", "u", "p", "P", "J",
		"i", "I", "a", "A", "o", "O", "s", "S", "R",
		"v", "V", "<C-v>",
		"n", "N", "*", "#",
		"iw", "aw", "i(", "a(",
	}
	for _, cmd := range required {
		if CommandDesc(cmd) == "" {
			t.Errorf("missing translation for required command %q", cmd)
		}
	}
}
