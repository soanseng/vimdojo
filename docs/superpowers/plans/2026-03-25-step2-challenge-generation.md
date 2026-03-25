# Step 2: Challenge Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate structured challenge JSON from extracted EPUB data — practice exercises from Practical Vim's before/after code blocks, and reference cards from LazyVim keybindings — all with 繁體中文 as the primary language.

**Architecture:** Three new packages (`translate/`, `challenge/`) plus CLI wiring. The `translate` package provides zh-TW templates for all Vim commands, concepts, and UI strings. The `challenge` package consumes `ExtractedBook` (Practical Vim) and `LazyVimBook` to produce `_challenges.json` (exercises) and `_reference.json` (keybinding cards). A `generate` subcommand orchestrates extract → generate → output. A `merge` subcommand combines command indices from both books.

**Tech Stack:** Go (pure Go, no CGo), standard library only. Output: JSON files for `vimdao-web/public/data/`.

**Language Policy:** 繁體中文 (zh-TW) is the primary language for all user-facing text (`title_zh`, `description_zh`, `hint_text`, `concepts_zh`). English originals are preserved in `_en` fields as secondary reference. The `needs_translation` flag marks entries without zh-TW templates.

---

## File Structure

```
vimdao-extract/
├── translate/
│   ├── zhtw.go              # zh-TW translation templates (commands, concepts, categories)
│   └── zhtw_test.go         # Tests for translation coverage and lookup
├── challenge/
│   ├── types.go             # Challenge, ReferenceCard, ChallengeSet types
│   ├── generator.go         # Generate challenges from ExtractedBook code blocks
│   ├── generator_test.go    # Unit + integration tests
│   ├── difficulty.go        # Difficulty scoring logic
│   ├── difficulty_test.go   # Tests for scoring
│   ├── reference.go         # Generate reference cards from LazyVimBook
│   └── reference_test.go    # Tests for reference card generation
├── output/
│   ├── writer.go            # (modify) Add WriteChallenges, WriteReference, WriteMerged
│   └── merge.go             # Merge command indices from multiple books
│   └── merge_test.go
├── main.go                  # (modify) Add `generate` and `merge` subcommands
```

---

### Task 1: Translation Templates (`translate/zhtw.go`)

Every downstream task needs this. Contains maps for Vim command → zh-TW description, concept → zh-TW name, category → zh-TW label, difficulty → zh-TW label.

**Files:**
- Create: `vimdao-extract/translate/zhtw.go`
- Create: `vimdao-extract/translate/zhtw_test.go`

- [ ] **Step 1: Write failing test for command description lookup**

```go
// translate/zhtw_test.go
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
    got := CategoryZh("motion")
    if got != "移動" {
        t.Errorf("got %q", got)
    }
}

func TestDifficultyName(t *testing.T) {
    got := DifficultyZh(1)
    if got != "入門" {
        t.Errorf("got %q", got)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd vimdao-extract && go test ./translate/ -v`
Expected: FAIL — package doesn't exist

- [ ] **Step 3: Implement translate/zhtw.go**

```go
// translate/zhtw.go
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

    // combined commands
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

    // insert
    "i": "在游標前進入插入模式", "I": "在行首進入插入模式",
    "a": "在游標後進入插入模式", "A": "在行尾進入插入模式",
    "o": "在下方新增一行並進入插入模式", "O": "在上方新增一行並進入插入模式",
    "s": "刪除字元並進入插入模式", "S": "刪除整行並進入插入模式",
    "R": "進入取代模式",

    // visual
    "v": "進入視覺模式（字元選取）", "V": "進入視覺模式（行選取）",

    // search
    "/": "向前搜尋",

    // ex commands
    ":w": "儲存", ":q": "離開", ":wq": "儲存並離開",
    ":%s": "全域替換",
}

var conceptTranslations = map[string]string{
    "dot command":      "dot 指令（重複的力量）",
    "text object":      "文字物件",
    "motion":           "移動指令",
    "operator":         "操作符",
    "register":         "暫存器",
    "macro":            "巨集",
    "visual mode":      "視覺模式",
    "insert mode":      "插入模式",
    "normal mode":      "正常模式",
    "command mode":     "命令模式",
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd vimdao-extract && go test ./translate/ -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add vimdao-extract/translate/
git commit -m "feat: add zh-TW translation templates for Vim commands and concepts"
```

---

### Task 2: Challenge Types (`challenge/types.go`)

Defines the output JSON schema for challenges and reference cards.

**Files:**
- Create: `vimdao-extract/challenge/types.go`

- [ ] **Step 1: Write the types file**

```go
// challenge/types.go
package challenge

// ChallengeSet is the top-level output for generated challenges.
type ChallengeSet struct {
    SourceBook  string      `json:"source_book"`
    GeneratedAt string      `json:"generated_at"`
    Challenges  []Challenge `json:"challenges"`
}

// Challenge is a single practice exercise generated from a code block.
type Challenge struct {
    ID          string       `json:"id"`
    Source      ChallengeSource `json:"source"`
    TitleZh     string       `json:"title_zh"`
    TitleEn     string       `json:"title_en"`
    DescZh      string       `json:"description_zh"`
    DescEn      string       `json:"description_en"`
    Category    string       `json:"category"`
    Difficulty  int          `json:"difficulty"`
    InitialText string       `json:"initial_text"`
    ExpectedText string      `json:"expected_text"`
    CursorStart  CursorPos   `json:"cursor_start"`
    HintCommands []string    `json:"hint_commands"`
    HintText    string       `json:"hint_text"`
    Tags        []string     `json:"tags"`
    ConceptsZh  []string     `json:"concepts_zh"`
    NeedsTranslation bool   `json:"needs_translation,omitempty"`
}

// ChallengeSource tracks where this challenge came from.
type ChallengeSource struct {
    Book      string `json:"book"`
    Chapter   int    `json:"chapter"`
    Section   string `json:"section"`
    TipNumber int    `json:"tip_number"`
}

// CursorPos is a line/column position.
type CursorPos struct {
    Line int `json:"line"`
    Col  int `json:"col"`
}

// ReferenceSet is the top-level output for Neovim/LazyVim reference cards.
type ReferenceSet struct {
    SourceBook  string          `json:"source_book"`
    GeneratedAt string          `json:"generated_at"`
    Cards       []ReferenceCard `json:"cards"`
}

// ReferenceCard is a keybinding reference card (not a practice exercise).
type ReferenceCard struct {
    ID          string `json:"id"`
    Keys        string `json:"keys"`
    TitleZh     string `json:"title_zh"`
    TitleEn     string `json:"title_en"`
    DescZh      string `json:"description_zh"`
    DescEn      string `json:"description_en"`
    Category    string `json:"category"`
    Requires    string `json:"requires"`
    Plugin      string `json:"plugin,omitempty"`
    Chapter     int    `json:"chapter"`
    Tags        []string `json:"tags,omitempty"`
    NeedsTranslation bool `json:"needs_translation,omitempty"`
}
```

- [ ] **Step 2: Run `go build ./challenge/` to verify it compiles**

- [ ] **Step 3: Commit**

```bash
git add vimdao-extract/challenge/types.go
git commit -m "feat: add challenge and reference card types"
```

---

### Task 3: Difficulty Scoring (`challenge/difficulty.go`)

Scores a challenge 1-3 based on keystroke length, command diversity, and technique complexity.

**Files:**
- Create: `vimdao-extract/challenge/difficulty.go`
- Create: `vimdao-extract/challenge/difficulty_test.go`

- [ ] **Step 1: Write failing tests**

```go
// challenge/difficulty_test.go
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
        {"complex multi-step", ">Gj.j.", []string{">", "G", "j", "."}, 2},
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
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement difficulty.go**

```go
// challenge/difficulty.go
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
    } else if ksLen <= 8 {
        score += 1
    } else {
        score += 2
    }

    // Command diversity
    if len(commands) >= 5 {
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
            score += 2
        case cmd == "*" || cmd == "#": // word search
            score += 1
        case cmd == "v" || cmd == "V": // visual mode
            score += 1
        case len(cmd) == 2 && (cmd[0] == 'i' || cmd[0] == 'a'): // text objects
            score += 1
        }
    }

    // Map score to difficulty level
    switch {
    case score <= 2:
        return 1
    case score <= 5:
        return 2
    default:
        return 3
    }
}
```

- [ ] **Step 4: Run tests, adjust scoring thresholds if needed**

Run: `cd vimdao-extract && go test ./challenge/ -v -run TestScoreDifficulty`

- [ ] **Step 5: Commit**

```bash
git add vimdao-extract/challenge/
git commit -m "feat: add difficulty scoring for challenges"
```

---

### Task 4: Challenge Generator (`challenge/generator.go`)

The core logic: takes `ExtractedBook` → produces `ChallengeSet`. Each code block with before/after/keystrokes becomes one challenge.

**Files:**
- Create: `vimdao-extract/challenge/generator.go`
- Create: `vimdao-extract/challenge/generator_test.go`

- [ ] **Step 1: Write failing unit test with a synthetic ExtractedBook**

```go
// challenge/generator_test.go
package challenge

import (
    "testing"

    "github.com/scipio/vimdao-extract/extract"
)

func TestGenerateChallenges(t *testing.T) {
    book := &extract.ExtractedBook{
        BookTitle: "Test Book",
        Author:    "Test Author",
        Chapters: []extract.Chapter{
            {
                ChapterID: 1,
                Title:     "The Vim Way",
                Sections: []extract.Section{
                    {
                        SectionID: "1.1",
                        TipNumber: 1,
                        Title:     "Meet the Dot Command",
                        CodeBlocks: []extract.CodeBlock{
                            {
                                Before:     "Line one\nLine two",
                                After:      "ine one\nLine two",
                                Keystrokes: "x",
                            },
                        },
                        VimCommands: []string{"x", "."},
                    },
                },
            },
        },
    }

    cs := Generate(book, "practical-vim")

    if len(cs.Challenges) != 1 {
        t.Fatalf("expected 1 challenge, got %d", len(cs.Challenges))
    }

    ch := cs.Challenges[0]
    if ch.ID != "pv-tip01-001" {
        t.Errorf("id: got %q", ch.ID)
    }
    if ch.InitialText != "Line one\nLine two" {
        t.Errorf("initial_text: got %q", ch.InitialText)
    }
    if ch.ExpectedText != "ine one\nLine two" {
        t.Errorf("expected_text: got %q", ch.ExpectedText)
    }
    if ch.Difficulty != 1 {
        t.Errorf("difficulty: got %d", ch.Difficulty)
    }
    if ch.Source.TipNumber != 1 {
        t.Errorf("source tip: got %d", ch.Source.TipNumber)
    }
    if ch.TitleZh == "" {
        t.Error("title_zh should not be empty")
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement generator.go**

Key design decisions:
- `id` format: `pv-tip{NN}-{seq}` where seq is 001, 002 etc. for multiple code blocks per tip
- `title_zh`: generated from tip title + command descriptions using `translate.CommandDesc()`
- `description_zh`: generated from the hint commands with zh-TW explanations
- `hint_commands`: parsed from the keystroke string using `detect.DetectCommands()`
- `category`: determined by the dominant command category in the keystrokes
- `concepts_zh`: mapped from detected command categories via `translate.ConceptZh()`
- `needs_translation`: true if any zh-TW field falls back to English

```go
// challenge/generator.go
package challenge

import (
    "fmt"
    "strings"
    "time"

    "github.com/scipio/vimdao-extract/detect"
    "github.com/scipio/vimdao-extract/extract"
    "github.com/scipio/vimdao-extract/translate"
)

// Generate produces a ChallengeSet from an extracted book.
func Generate(book *extract.ExtractedBook, bookSlug string) *ChallengeSet {
    cs := &ChallengeSet{
        SourceBook:  book.BookTitle,
        GeneratedAt: time.Now().Format(time.RFC3339),
    }

    abbr := slugAbbrev(bookSlug) // "practical-vim" -> "pv"

    for _, ch := range book.Chapters {
        for _, sec := range ch.Sections {
            for i, cb := range sec.CodeBlocks {
                if cb.Before == "" || cb.After == "" {
                    continue
                }
                if cb.Before == cb.After {
                    continue
                }

                challenge := buildChallenge(abbr, ch, sec, cb, i)
                cs.Challenges = append(cs.Challenges, challenge)
            }
        }
    }

    return cs
}

func buildChallenge(abbr string, ch extract.Chapter, sec extract.Section,
    cb extract.CodeBlock, seqIdx int) Challenge {

    id := fmt.Sprintf("%s-tip%02d-%03d", abbr, sec.TipNumber, seqIdx+1)

    // Detect commands from keystrokes
    cmds := detect.DetectCommands(cb.Keystrokes)
    cmdStrs := detect.CommandStrings(cmds)
    merged := detect.MergeCommands(cmds)
    mergedStrs := detect.CommandStrings(merged)

    // Determine category
    category := dominantCategory(cmds)

    // Build zh-TW content
    titleZh := buildTitleZh(sec.Title, mergedStrs)
    descZh := buildDescriptionZh(mergedStrs, cb.Keystrokes)
    hintText := buildHintTextZh(mergedStrs)
    conceptsZh := buildConceptsZh(cmds)

    needsTranslation := titleZh == sec.Title // fell back to English

    return Challenge{
        ID: id,
        Source: ChallengeSource{
            Book:      abbr,
            Chapter:   ch.ChapterID,
            Section:   sec.SectionID,
            TipNumber: sec.TipNumber,
        },
        TitleZh:      titleZh,
        TitleEn:      sec.Title,
        DescZh:       descZh,
        DescEn:       sec.Title,
        Category:     category,
        Difficulty:   ScoreDifficulty(cb.Keystrokes, cmdStrs),
        InitialText:  cb.Before,
        ExpectedText: cb.After,
        CursorStart:  CursorPos{Line: 0, Col: 0},
        HintCommands: mergedStrs,
        HintText:     hintText,
        Tags:         mergedStrs,
        ConceptsZh:   conceptsZh,
        NeedsTranslation: needsTranslation,
    }
}

func buildTitleZh(tipTitle string, cmds []string) string {
    // Try to build a zh-TW title from the commands
    var descs []string
    for _, cmd := range cmds {
        if d := translate.CommandDesc(cmd); d != "" {
            descs = append(descs, cmd+" ("+d+")")
            if len(descs) >= 2 {
                break
            }
        }
    }
    if len(descs) > 0 {
        return "練習：" + strings.Join(descs, "、")
    }
    return tipTitle // fallback to English
}

func buildDescriptionZh(cmds []string, keystrokes string) string {
    var parts []string
    for _, cmd := range cmds {
        if d := translate.CommandDesc(cmd); d != "" {
            parts = append(parts, fmt.Sprintf("用 %s %s", cmd, d))
        }
    }
    if len(parts) > 0 {
        return "使用 " + strings.Join(parts, "，") + "。按鍵序列：" + keystrokes
    }
    return "按鍵序列：" + keystrokes
}

func buildHintTextZh(cmds []string) string {
    var steps []string
    for i, cmd := range cmds {
        if d := translate.CommandDesc(cmd); d != "" {
            steps = append(steps, fmt.Sprintf("%d. %s — %s", i+1, cmd, d))
        }
    }
    return strings.Join(steps, "\n")
}

func buildConceptsZh(cmds []detect.CommandInfo) string {
    seen := make(map[string]bool)
    var concepts []string
    for _, cmd := range cmds {
        cat := string(cmd.Category)
        concept := translate.ConceptZh(cat)
        if concept != "" && !seen[concept] {
            seen[concept] = true
            concepts = append(concepts, concept)
        }
    }
    return concepts // NOTE: return type should be []string — adjust signature
}

func dominantCategory(cmds []detect.CommandInfo) string {
    counts := make(map[string]int)
    for _, cmd := range cmds {
        counts[string(cmd.Category)]++
    }

    // If multiple categories, it's a "combo"
    nonTrivial := 0
    best := ""
    bestCount := 0
    for cat, count := range counts {
        if cat == "other" {
            continue
        }
        nonTrivial++
        if count > bestCount {
            bestCount = count
            best = cat
        }
    }
    if nonTrivial >= 2 {
        return "combo"
    }
    if best != "" {
        return best
    }
    return "other"
}

func slugAbbrev(slug string) string {
    switch {
    case strings.Contains(slug, "practical"):
        return "pv"
    case strings.Contains(slug, "lazyvim"):
        return "lv"
    default:
        if len(slug) > 4 {
            return slug[:4]
        }
        return slug
    }
}
```

Note: `buildConceptsZh` return type has a comment — fix the signature to return `[]string`.

- [ ] **Step 4: Run tests, fix any issues**

Run: `cd vimdao-extract && go test ./challenge/ -v`

- [ ] **Step 5: Write integration test against real Practical Vim data**

```go
func TestGenerateFromPracticalVim(t *testing.T) {
    // Load real extracted data
    data, err := os.ReadFile("../dist/practical-vim-drew-neil/practical-vim-drew-neil_extracted.json")
    if err != nil {
        t.Skip("extracted data not found, run extract first")
    }
    var book extract.ExtractedBook
    if err := json.Unmarshal(data, &book); err != nil {
        t.Fatal(err)
    }

    cs := Generate(&book, "practical-vim")

    t.Logf("Generated %d challenges", len(cs.Challenges))
    if len(cs.Challenges) < 50 {
        t.Errorf("expected at least 50 challenges, got %d", len(cs.Challenges))
    }

    // Spot check
    for _, ch := range cs.Challenges[:5] {
        t.Logf("  %s: %s (difficulty=%d, category=%s)",
            ch.ID, ch.TitleZh, ch.Difficulty, ch.Category)
    }

    // Verify no empty fields
    for _, ch := range cs.Challenges {
        if ch.InitialText == "" {
            t.Errorf("%s: empty initial_text", ch.ID)
        }
        if ch.ExpectedText == "" {
            t.Errorf("%s: empty expected_text", ch.ID)
        }
    }
}
```

- [ ] **Step 6: Run integration test**

- [ ] **Step 7: Commit**

```bash
git add vimdao-extract/challenge/
git commit -m "feat: add challenge generator from Practical Vim code blocks"
```

---

### Task 5: Reference Card Generator (`challenge/reference.go`)

Generates reference cards from LazyVim keybindings — not exercises, but browseable keybinding reference with zh-TW descriptions.

**Files:**
- Create: `vimdao-extract/challenge/reference.go`
- Create: `vimdao-extract/challenge/reference_test.go`

- [ ] **Step 1: Write failing test**

```go
// challenge/reference_test.go
package challenge

import (
    "testing"
    "github.com/scipio/vimdao-extract/extract"
)

func TestGenerateReferenceCards(t *testing.T) {
    lvBook := &extract.LazyVimBook{
        BookTitle: "LazyVim Test",
        Keybindings: []extract.Keybinding{
            {
                Keys: "<Space>ff", DescriptionEn: "Find files",
                Category: "leader-key", Requires: "lazyvim", Chapter: 4,
            },
            {
                Keys: "gcc", DescriptionEn: "Toggle comment on current line",
                Category: "comment", Requires: "neovim", Plugin: "Comment.nvim", Chapter: 6,
            },
            {
                Keys: "gd", DescriptionEn: "Go to definition",
                Category: "g-prefix", Requires: "neovim", Chapter: 10,
            },
        },
        Tips: []extract.Tip{
            {Text: "Use Control-o to jump back", TipType: "tip", Chapter: 3},
        },
    }

    rs := GenerateReference(lvBook, "lazyvim")

    if len(rs.Cards) != 3 {
        t.Fatalf("expected 3 cards, got %d", len(rs.Cards))
    }

    card := rs.Cards[0]
    if card.Keys != "<Space>ff" {
        t.Errorf("keys: got %q", card.Keys)
    }
    if card.Requires != "lazyvim" {
        t.Errorf("requires: got %q", card.Requires)
    }
    if card.TitleEn != "Find files" {
        t.Errorf("title_en: got %q", card.TitleEn)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement reference.go**

```go
// challenge/reference.go
package challenge

import (
    "fmt"
    "time"

    "github.com/scipio/vimdao-extract/extract"
    "github.com/scipio/vimdao-extract/translate"
)

// GenerateReference produces reference cards from LazyVim keybindings.
func GenerateReference(book *extract.LazyVimBook, bookSlug string) *ReferenceSet {
    rs := &ReferenceSet{
        SourceBook:  book.BookTitle,
        GeneratedAt: time.Now().Format(time.RFC3339),
    }

    seen := make(map[string]bool)
    seq := 0

    for _, kb := range book.Keybindings {
        if seen[kb.Keys] {
            continue
        }
        seen[kb.Keys] = true
        seq++

        titleZh := translate.CommandDesc(kb.Keys)
        descZh := kb.DescriptionEn // fallback
        needsTranslation := true

        if titleZh != "" {
            needsTranslation = false
            descZh = titleZh
        }
        if titleZh == "" {
            titleZh = kb.DescriptionEn
        }

        card := ReferenceCard{
            ID:       fmt.Sprintf("lv-ref-%03d", seq),
            Keys:     kb.Keys,
            TitleZh:  titleZh,
            TitleEn:  kb.DescriptionEn,
            DescZh:   descZh,
            DescEn:   kb.DescriptionEn,
            Category: kb.Category,
            Requires: kb.Requires,
            Plugin:   kb.Plugin,
            Chapter:  kb.Chapter,
            NeedsTranslation: needsTranslation,
        }

        rs.Cards = append(rs.Cards, card)
    }

    return rs
}
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add vimdao-extract/challenge/reference.go vimdao-extract/challenge/reference_test.go
git commit -m "feat: add reference card generator from LazyVim keybindings"
```

---

### Task 6: Merge Command (`output/merge.go`)

Merges command indices from Practical Vim and LazyVim into a single `merged_commands.json`.

**Files:**
- Create: `vimdao-extract/output/merge.go`
- Create: `vimdao-extract/output/merge_test.go`

- [ ] **Step 1: Write failing test**

```go
// output/merge_test.go
package output

import "testing"

func TestMergeCommandIndices(t *testing.T) {
    a := &CommandIndex{
        Commands: []CommandEntry{
            {Command: "dd", Frequency: 5, Chapters: []int{1, 2}, Category: "other"},
            {Command: "w", Frequency: 10, Chapters: []int{1}, Category: "motion"},
        },
    }
    b := &CommandIndex{
        Commands: []CommandEntry{
            {Command: "dd", Frequency: 3, Chapters: []int{6}, Category: "other"},
            {Command: "gc", Frequency: 7, Chapters: []int{6, 7}, Category: "other"},
        },
    }

    merged := MergeIndices(a, b)

    if len(merged.Commands) != 3 {
        t.Fatalf("expected 3 commands, got %d", len(merged.Commands))
    }

    // dd should have combined frequency
    for _, cmd := range merged.Commands {
        if cmd.Command == "dd" {
            if cmd.Frequency != 8 {
                t.Errorf("dd frequency: got %d, want 8", cmd.Frequency)
            }
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement merge.go**

```go
// output/merge.go
package output

import "sort"

// MergeIndices combines two CommandIndex into one, deduplicating commands
// and summing frequencies.
func MergeIndices(indices ...*CommandIndex) *CommandIndex {
    data := make(map[string]*CommandEntry)

    for _, idx := range indices {
        for _, entry := range idx.Commands {
            existing, ok := data[entry.Command]
            if !ok {
                e := entry // copy
                data[entry.Command] = &e
                continue
            }
            existing.Frequency += entry.Frequency
            existing.Chapters = mergeIntSlice(existing.Chapters, entry.Chapters)
            existing.Sections = mergeStringSlice(existing.Sections, entry.Sections)
            for _, ex := range entry.ContextExamples {
                if len(existing.ContextExamples) < 5 {
                    existing.ContextExamples = append(existing.ContextExamples, ex)
                }
            }
        }
    }

    var result []CommandEntry
    for _, entry := range data {
        result = append(result, *entry)
    }
    sort.Slice(result, func(i, j int) bool {
        if result[i].Frequency != result[j].Frequency {
            return result[i].Frequency > result[j].Frequency
        }
        return result[i].Command < result[j].Command
    })

    return &CommandIndex{Commands: result}
}

func mergeIntSlice(a, b []int) []int {
    seen := make(map[int]bool)
    for _, v := range a {
        seen[v] = true
    }
    for _, v := range b {
        seen[v] = true
    }
    var result []int
    for v := range seen {
        result = append(result, v)
    }
    sort.Ints(result)
    return result
}

func mergeStringSlice(a, b []string) []string {
    seen := make(map[string]bool)
    for _, v := range a {
        seen[v] = true
    }
    for _, v := range b {
        seen[v] = true
    }
    var result []string
    for v := range seen {
        result = append(result, v)
    }
    sort.Strings(result)
    return result
}
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add vimdao-extract/output/merge.go vimdao-extract/output/merge_test.go
git commit -m "feat: add merge command for combining command indices"
```

---

### Task 7: CLI `generate` and `merge` Subcommands (`main.go`)

Wire everything together. `generate` runs extract → challenge/reference generation → output. `merge` combines outputs from multiple books.

**Files:**
- Modify: `vimdao-extract/main.go`
- Modify: `vimdao-extract/output/writer.go` (add `WriteChallenges`, `WriteReference`)

- [ ] **Step 1: Add output functions for challenges and reference cards**

Add to `output/writer.go`:

```go
// WriteChallenges writes the challenge set JSON.
func WriteChallenges(cs *challenge.ChallengeSet, outputDir, bookSlug string) error {
    if err := os.MkdirAll(outputDir, 0o755); err != nil {
        return fmt.Errorf("failed to create output dir: %w", err)
    }
    path := filepath.Join(outputDir, bookSlug+"_challenges.json")
    return writeJSON(path, cs)
}

// WriteReference writes the reference card set JSON.
func WriteReference(rs *challenge.ReferenceSet, outputDir, bookSlug string) error {
    if err := os.MkdirAll(outputDir, 0o755); err != nil {
        return fmt.Errorf("failed to create output dir: %w", err)
    }
    path := filepath.Join(outputDir, bookSlug+"_reference.json")
    return writeJSON(path, rs)
}

// WriteMergedIndex writes a merged command index JSON.
func WriteMergedIndex(index *CommandIndex, outputDir string) error {
    if err := os.MkdirAll(outputDir, 0o755); err != nil {
        return fmt.Errorf("failed to create output dir: %w", err)
    }
    path := filepath.Join(outputDir, "merged_commands.json")
    return writeJSON(path, index)
}
```

- [ ] **Step 2: Add `generate` subcommand to main.go**

```go
case "generate":
    if len(os.Args) < 3 {
        fmt.Fprintln(os.Stderr, "usage: vimdao-extract generate <file.epub> [output-dir]")
        os.Exit(1)
    }
    epubPath := os.Args[2]
    outputDir := "./dist"
    if len(os.Args) >= 4 {
        outputDir = os.Args[3]
    }
    if err := runGenerate(epubPath, outputDir); err != nil {
        fmt.Fprintf(os.Stderr, "error: %v\n", err)
        os.Exit(1)
    }
case "merge":
    if len(os.Args) < 4 {
        fmt.Fprintln(os.Stderr, "usage: vimdao-extract merge <dir1> <dir2> [output-dir]")
        os.Exit(1)
    }
    // Implementation: load _commands.json from each dir, merge, write
```

`runGenerate` calls `runExtract` first, then runs the appropriate generator (challenge or reference) based on book format.

- [ ] **Step 3: Build and test with both EPUBs**

```bash
cd vimdao-extract
go build -o ./vimdao-extract .
./vimdao-extract generate "../resources/Practical Vim - Drew Neil.epub"
./vimdao-extract generate "../resources/LazyVim for Ambitious Developers - Dusty Phillips.epub"
./vimdao-extract merge ./dist/practical-vim-drew-neil ./dist/lazyvim-for-ambitious-developers-dusty-phillips ./dist/merged
```

- [ ] **Step 4: Verify output quality**

```bash
python3 -c "
import json
with open('dist/practical-vim-drew-neil/practical-vim-drew-neil_challenges.json') as f:
    data = json.load(f)
print(f'Challenges: {len(data[\"challenges\"])}')
for ch in data['challenges'][:5]:
    print(f'  {ch[\"id\"]}: {ch[\"title_zh\"]} (diff={ch[\"difficulty\"]})')
"
```

- [ ] **Step 5: Run all tests**

Run: `cd vimdao-extract && go test -race ./...`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add vimdao-extract/main.go vimdao-extract/output/writer.go
git commit -m "feat: add generate and merge CLI subcommands"
```

---

### Task 8: Final Output to `vimdao-web/public/data/`

Copy final JSON files to the web project's data directory.

**Files:**
- Create directory: `vimdao-web/public/data/`

- [ ] **Step 1: Create output directory and copy files**

```bash
mkdir -p ../vimdao-web/public/data
cp dist/practical-vim-drew-neil/practical-vim-drew-neil_challenges.json ../vimdao-web/public/data/practical-vim_challenges.json
cp dist/practical-vim-drew-neil/practical-vim-drew-neil_commands.json ../vimdao-web/public/data/practical-vim_commands.json
cp dist/lazyvim-for-ambitious-developers-dusty-phillips/lazyvim-for-ambitious-developers-dusty-phillips_reference.json ../vimdao-web/public/data/lazyvim_reference.json
cp dist/lazyvim-for-ambitious-developers-dusty-phillips/lazyvim-for-ambitious-developers-dusty-phillips_keybindings.json ../vimdao-web/public/data/lazyvim_keybindings.json
cp dist/merged/merged_commands.json ../vimdao-web/public/data/merged_commands.json
```

- [ ] **Step 2: Spot-check a few challenges by hand**

Verify that `initial_text` → `expected_text` with the given `hint_commands` makes sense.

- [ ] **Step 3: Commit**

```bash
git add vimdao-web/public/data/
git commit -m "feat: add generated challenge and reference JSON for frontend"
```

---

## Execution Dependencies

```
Task 1 (translate) ──┬──→ Task 4 (generator) ──→ Task 7 (CLI) ──→ Task 8 (output)
Task 2 (types)    ───┤                            ↑
Task 3 (difficulty) ─┘                            │
Task 5 (reference) ───────────────────────────────┘
Task 6 (merge) ───────────────────────────────────┘
```

Tasks 1-3 can be done in parallel. Task 4 depends on 1-3. Tasks 5, 6 are independent. Task 7 integrates 4+5+6. Task 8 is the final output step.
