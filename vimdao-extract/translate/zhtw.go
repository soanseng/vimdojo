package translate

// CommandDesc returns the zh-TW description for a Vim command.
// Returns "" if no translation exists.
func CommandDesc(cmd string) string {
	return commandDescriptions[cmd]
}

// ConceptZh returns the zh-TW translation for a Vim concept.
func ConceptZh(concept string) string {
	return conceptTranslations[concept]
}

// CategoryZh returns the zh-TW name for a command category.
func CategoryZh(category string) string {
	return categoryNames[category]
}

// DifficultyZh returns the zh-TW label for a difficulty level.
func DifficultyZh(level int) string {
	return difficultyNames[level]
}

var commandDescriptions = map[string]string{
	// motions
	"h": "向左移動", "j": "向下移動", "k": "向上移動", "l": "向右移動",
	"w": "移到下一個單字字首", "W": "移到下一個 WORD 字首",
	"e": "移到單字字尾", "E": "移到 WORD 字尾",
	"b": "移到上一個單字字首", "B": "移到上一個 WORD 字首",
	"0": "移到行首", "^": "移到行首非空白字元", "$": "移到行尾",
	"gg": "移到檔案開頭", "G": "移到檔案結尾",
	"f": "向右搜尋字元", "F": "向左搜尋字元",
	"t": "向右搜尋字元（游標停在前一格）", "T": "向左搜尋字元（游標停在後一格）",
	";": "重複上次 f/t 搜尋", ",": "反向重複上次 f/t 搜尋",
	"{": "移到上一個段落", "}": "移到下一個段落",
	"(": "移到上一個句子", ")": "移到下一個句子",
	"H": "移到畫面頂端", "M": "移到畫面中間", "L": "移到畫面底端",
	"%": "跳到配對的括號",
	"n": "搜尋下一個匹配", "N": "搜尋上一個匹配",
	"*": "搜尋游標下的單字", "#": "反向搜尋游標下的單字",

	// operators
	"d": "刪除", "c": "修改（刪除並進入插入模式）", "y": "複製（yank）",
	">": "增加縮排", "<": "減少縮排", "=": "自動縮排",
	"gU": "轉大寫", "gu": "轉小寫", "g~": "切換大小寫",

	// text objects
	"iw": "游標所在的單字（inner word）", "aw": "游標所在的單字含空白（a word）",
	"iW": "游標所在的 WORD", "aW": "游標所在的 WORD 含空白",
	`i"`: `雙引號內的文字`, `a"`: `雙引號內的文字含引號`,
	"i'": "單引號內的文字", "a'": "單引號內的文字含引號",
	"i(": "括號內的文字", "a(": "括號內的文字含括號",
	"i)": "括號內的文字", "a)": "括號內的文字含括號",
	"i{": "大括號內的文字", "a{": "大括號內的文字含大括號",
	"i}": "大括號內的文字", "a}": "大括號內的文字含大括號",
	"i[": "方括號內的文字", "a[": "方括號內的文字含方括號",
	"i]": "方括號內的文字", "a]": "方括號內的文字含方括號",
	"i<": "角括號內的文字", "a<": "角括號內的文字含角括號",
	"i>": "角括號內的文字", "a>": "角括號內的文字含角括號",
	"it": "HTML 標籤內的文字", "at": "HTML 標籤內的文字含標籤",

	// combined/other commands
	".": "重複上次修改", "u": "復原",
	"x": "刪除游標下的字元", "X": "刪除游標前的字元",
	"r": "替換游標下的字元",
	"dd": "刪除整行", "cc": "修改整行", "yy": "複製整行",
	"D": "刪除到行尾", "C": "修改到行尾", "Y": "複製整行",
	"p": "貼上到游標後", "P": "貼上到游標前",
	"J": "合併下一行", "~": "切換游標下字元大小寫",
	"q": "錄製巨集", "@": "播放巨集",
	"ciw": "修改游標所在的單字",
	"di(": "刪除括號內的文字",
	"daw": "刪除游標所在的單字含空白",

	// insert mode entry
	"i": "在游標前進入插入模式", "I": "在行首進入插入模式",
	"a": "在游標後進入插入模式", "A": "在行尾進入插入模式",
	"o": "在下方新增一行並進入插入模式", "O": "在上方新增一行並進入插入模式",
	"s": "刪除字元並進入插入模式", "S": "刪除整行並進入插入模式",
	"R": "進入取代模式",

	// visual mode
	"v": "進入視覺模式（字元選取）", "V": "進入視覺模式（行選取）",
	"<C-v>": "進入視覺模式（區塊選取）",

	// search
	"/": "向前搜尋",

	// ex commands
	":w": "儲存", ":q": "離開", ":wq": "儲存並離開",
	":%s": "全域替換",
}

var conceptTranslations = map[string]string{
	"dot command":      "dot 指令（重複的力量）",
	"text object":      "文字物件",
	"text-object":      "文字物件",
	"motion":           "移動指令",
	"operator":         "操作符",
	"register":         "暫存器",
	"macro":            "巨集",
	"visual mode":      "視覺模式",
	"visual":           "視覺模式",
	"insert mode":      "插入模式",
	"insert":           "插入模式",
	"normal mode":      "正常模式",
	"command mode":     "命令模式",
	"command":          "命令模式",
	"search":           "搜尋",
	"substitute":       "替換",
	"indent":           "縮排",
	"fold":             "摺疊",
	"mark":             "標記",
	"jump":             "跳轉",
	"completion":       "自動完成",
	"spell":            "拼字檢查",
	"undo":             "復原",
	"repeat":           "重複",
	"count":            "數字前綴",
	"operator-pending": "操作符等待模式",
	"surround":         "環繞操作",
	"comment":          "註解",
	"combo":            "組合技",
	"other":            "其他",
}

var categoryNames = map[string]string{
	"motion":      "移動",
	"operator":    "操作",
	"text-object": "文字物件",
	"command":     "命令列",
	"insert":      "插入",
	"visual":      "視覺",
	"combo":       "組合技",
	"other":       "其他",
}

var difficultyNames = map[int]string{
	1: "入門",
	2: "進階",
	3: "精通",
}
