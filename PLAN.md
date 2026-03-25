# VimDao 鍵道 — 開發計畫

## 來源書籍

1. **Practical Vim, 2nd Edition** — Drew Neil（120+ tips，Vim 核心功能）
2. **LazyVim for Ambitious Developers** — Dusty Phillips（LazyVim 特定功能）

將這兩本 EPUB 的內容提取、結構化、生成練習題，作為整個平台的教學素材。

---

## Phase 1：EPUB 提取工具 `vimdao-extract/`

### 1.1 專案結構

```
vimdao-extract/
├── main.go
├── epub/           # EPUB 解析
│   └── reader.go
├── extract/        # 內容清理與提取
│   └── cleaner.go
├── detect/         # Vim 指令偵測與分類
│   └── detector.go
├── challenge/      # 從提取內容自動生成練習題
│   └── generator.go
├── translate/      # 繁中翻譯模板（指令說明、提示文字）
│   └── zhTW.go
├── output/         # JSON 輸出
│   └── writer.go
├── go.mod
└── README.md
```

### 1.2 指令

```bash
# 提取單本書
vimdao-extract extract <file.epub>

# 提取後同時生成練習題
vimdao-extract generate <file.epub>

# 合併多本書的提取結果
vimdao-extract merge ./output/practical-vim/ ./output/lazyvim/
```

### 1.3 提取輸出

每本書產生三個 JSON：

#### `<bookname>_extracted.json` — 原始提取

```json
{
  "book_title": "Practical Vim, 2nd Edition",
  "author": "Drew Neil",
  "total_chapters": 21,
  "extracted_at": "2026-03-25T...",
  "chapters": [
    {
      "chapter_id": 1,
      "title": "The Vim Way",
      "sections": [
        {
          "section_id": "1.1",
          "title": "Tip 1: Meet the Dot Command",
          "raw_text": "...",
          "code_blocks": [
            {
              "before": "var foo = \"method(#{argument})\";",
              "after": "var foo = 'method(#{argument})';",
              "keystrokes": "f\"r'$;.",
              "description": "Change double quotes to single quotes"
            }
          ],
          "vim_commands": ["f", "r", "$", ";", "."],
          "word_count": 450
        }
      ],
      "has_vim_content": true
    }
  ]
}
```

重點：Practical Vim 的每個 tip 都有 **before/after 文字範例**和**按鍵序列**，這些是最有價值的練習素材，必須完整提取。

#### `<bookname>_commands.json` — 指令索引

```json
{
  "commands": [
    {
      "command": ".",
      "frequency": 47,
      "chapters": [1, 2, 3, 5],
      "sections": ["1.1", "1.2", "2.3"],
      "category": "other",
      "context_examples": [
        "Tip 1: 用 . 重複上次修改",
        "Tip 5: 用 . 進行逐行修改"
      ]
    }
  ]
}
```

#### `<bookname>_challenges.json` — 自動生成的練習題

```json
{
  "source_book": "Practical Vim, 2nd Edition",
  "generated_at": "2026-03-25T...",
  "challenges": [
    {
      "id": "pv-tip01-dot-quotes",
      "source": {
        "book": "practical-vim",
        "chapter": 1,
        "section": "1.1",
        "tip_number": 1
      },
      "title_zh": "用 dot 重複替換引號",
      "description_zh": "使用 f 搜尋雙引號，r 替換為單引號，再用 ; 和 . 重複操作。這是 Practical Vim 第一個 tip 的核心概念。",
      "category": "combo",
      "difficulty": 2,
      "initial_text": "var foo = \"method(#{argument})\";",
      "expected_text": "var foo = 'method(#{argument})';",
      "cursor_start": { "line": 0, "col": 0 },
      "hint_commands": ["f\"", "r'", ";", "."],
      "hint_text": "先用 f\" 找到第一個雙引號，r' 替換，然後 ; 跳到下一個，. 重複替換",
      "tags": ["f", "r", ";", "."],
      "concepts_zh": ["dot command", "行內搜尋", "重複"]
    }
  ]
}
```

### 1.4 練習題生成策略

從書中提取練習的方式：

**Practical Vim（主要來源）：**
- 每個 Tip 通常有 before/after 範例 + 按鍵序列 → 直接轉換為練習題
- 一個 Tip 可能產生 1~3 題（基礎版、變化版、綜合版）
- 120+ tips → 預期產生 150~300 題

**LazyVim for Ambitious Developers（補充來源）：**
- 提取書中的操作範例和程式碼片段
- 偏向 LazyVim 特定功能的練習（telescope, which-key 等不在 VimEngine 範圍內的跳過）
- 保留通用 Vim 操作的範例

**生成規則：**
1. 若書中有明確的 before/after + keystrokes → 直接生成練習，`difficulty` 根據按鍵序列長度和指令複雜度自動判定
2. 若書中只有指令說明無範例 → 生成指令速查卡，不生成練習題
3. 所有 `title_zh`、`description_zh`、`hint_text`、`concepts_zh` 由 Go 程式內建的翻譯模板生成（常見指令的繁中說明）
4. 未能自動翻譯的內容保留英文原文，標記 `"needs_translation": true`
5. `id` 格式：`{book_abbr}-tip{number}-{short_slug}` 或 `{book_abbr}-ch{chapter}-{short_slug}`

### 1.5 Vim 指令偵測分類

```
motion:      h j k l w W e E b B 0 ^ $ gg G f F t T % { } ( ) H M L
operator:    d c y > < = gU gu g~
text-object: iw aw iW aW i" a" i' a' i( a( i) a) i{ a{ i} a} i[ a[ i] a] i< a> it at
command:     以 : 開頭的所有指令
insert:      i I a A o O s S C R
visual:      v V <C-v>
other:       . @ q u <C-r> marks registers
```

### 1.6 繁中翻譯模板 (`translate/zhTW.go`)

內建常見 Vim 概念的繁中對照：

```go
var CommandDescriptions = map[string]string{
    ".":    "重複上次修改",
    "dd":   "刪除整行",
    "ciw":  "修改游標所在的單字",
    "di(":  "刪除括號內的文字",
    "f":    "向右搜尋字元",
    "t":    "向右搜尋字元（游標停在前一格）",
    ";":    "重複上次 f/t 搜尋",
    "*":    "搜尋游標下的單字",
    // ... 涵蓋所有 v1 支援的指令
}

var ConceptTranslations = map[string]string{
    "dot command":  "dot 指令（重複的力量）",
    "text object":  "文字物件",
    "motion":       "移動指令",
    "operator":     "操作符",
    "register":     "暫存器",
    "macro":        "巨集",
    "visual mode":  "視覺模式",
    // ...
}

var CategoryNames = map[string]string{
    "motion":      "移動",
    "operator":    "操作",
    "text-object": "文字物件",
    "command":     "命令列",
    "insert":      "插入",
    "visual":      "視覺",
    "combo":       "組合技",
    "other":       "其他",
}

var DifficultyNames = map[int]string{
    1: "入門",
    2: "進階",
    3: "精通",
}
```

### 1.7 注意事項

- 支援 EPUB2 + EPUB3
- UTF-8 全程，正確處理 CJK
- 跳過目錄、索引、版權頁、致謝
- Practical Vim 的 tip 格式有固定結構（Tip N: Title + 內文 + 範例），利用這個結構精準提取
- 書中的 before/after 範例通常在 `<pre>` 或 `<code>` 標籤內，有時用特殊 CSS class 標記
- 按鍵序列通常以特殊格式呈現（如 `<C-r>`、`{motion}`），需要正規表達式辨識
- 輸出放 `./output/`，最終複製到 `vimdao-web/public/data/`

---

## Phase 2：前端練習平台 `vimdao-web/`

### 2.1 專案結構

```
vimdao-web/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── data/                          # Phase 1 輸出的 JSON 放這裡
│       ├── practical-vim_challenges.json
│       ├── practical-vim_commands.json
│       ├── lazyvim_challenges.json
│       ├── lazyvim_commands.json
│       └── merged_commands.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── engine/                        # 純 TS Vim 引擎
│   │   ├── vim-types.ts
│   │   ├── vim-state.ts               # buffer, cursor, mode, registers, undo
│   │   ├── vim-motions.ts
│   │   ├── vim-operations.ts          # delete, change, yank, put
│   │   ├── vim-text-objects.ts
│   │   ├── vim-search.ts
│   │   └── vim-engine.ts              # 主引擎
│   ├── components/
│   │   ├── VimEditor/
│   │   │   ├── VimEditor.tsx
│   │   │   ├── Cursor.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── KeyLog.tsx
│   │   ├── Challenge/
│   │   │   ├── ChallengeView.tsx      # 練習頁
│   │   │   ├── ChallengeResult.tsx
│   │   │   └── ChallengeList.tsx
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── StreakCard.tsx
│   │   │   └── ProgressChart.tsx
│   │   ├── LearningPath/
│   │   │   ├── PathOverview.tsx       # 依書籍章節組織的學習路徑
│   │   │   └── ChapterView.tsx
│   │   ├── CommandRef/
│   │   │   ├── CommandCard.tsx
│   │   │   └── CommandGrid.tsx
│   │   └── Layout/
│   │       ├── Navbar.tsx
│   │       └── Footer.tsx
│   ├── hooks/
│   │   ├── useVimEditor.ts
│   │   ├── useProgress.ts
│   │   └── useChallenge.ts
│   ├── stores/
│   │   └── progress-store.ts          # localStorage
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── vim-editor.css
```

### 2.2 VimEngine 支援的指令（v1）

#### 移動
- `h` `j` `k` `l`
- `w` `W` `b` `B` `e` `E`
- `0` `^` `$`
- `gg` `G`
- `f{char}` `F{char}` `t{char}` `T{char}` `;` `,`
- `{` `}`

#### 編輯
- `x` `X` `r{char}`
- `dd` `D`
- `cc` `C`
- `yy` `Y`
- `p` `P`
- `u`（多步復原）
- `.`（重複上次操作 — 這是 Practical Vim 的核心概念，必須正確實作）

#### Operator + Motion/Text-object
- `d{motion}` `c{motion}` `y{motion}`
- `di{obj}` `da{obj}` `ci{obj}` `ca{obj}` `yi{obj}` `ya{obj}`
  - 物件：`w` `W` `"` `'` `` ` `` `(` `)` `{` `}` `[` `]` `<` `>` `t`

#### 數字前綴
- `{count}{motion}` — 如 `3w`, `5j`
- `{count}{operator}{motion}` — 如 `d2w`, `3dd`

#### 插入模式
- `i` `I` `a` `A` `o` `O`
- `Escape` 回到 Normal

#### 搜尋
- `/pattern` + `Enter`
- `n` `N`
- `*` `#`（搜尋游標下的字）

#### 視覺模式
- `v` `V`
- 選取後可搭配 `d` `c` `y`

#### Command 模式
- `:w` — 提交答案
- `:q` — 離開練習
- `:%s/old/new/g` — 全域替換

### 2.3 編輯器 UI

- 行號（左側 gutter）
- 游標：Normal = block，Insert = line
- 底部狀態列：模式 | 檔名 | 行:列 | 按鍵記錄
- 按鍵記錄即時顯示（如 `d → i → w`）
- Catppuccin Mocha 配色
- 支援繁中內容

### 2.4 頁面結構

```
/ — 道場總覽（Dashboard）
  ├── 學習進度
  ├── 今日建議練習（從未完成/低熟練度的題目中推薦）
  └── 連續天數

/path — 修練路徑
  ├── Practical Vim 路徑（依原書 tip 順序）
  │   ├── 第一章：The Vim Way（Tip 1-7）
  │   ├── 第二章：Normal Mode（Tip 8-18）
  │   ├── ...依書的結構展開
  │   └── 每個 tip 連結到對應的練習題
  ├── LazyVim 路徑（依原書章節）
  └── 綜合路徑（跨書、依主題分類）

/practice — 自由練習
  ├── 依類別篩選
  ├── 依難度篩選
  ├── 依來源書籍篩選
  └── 隨機挑戰

/challenge/:id — 單題練習頁
  ├── 題目說明（繁中）
  ├── 來源資訊（哪本書、哪個 tip/章節）
  ├── VimEditor 編輯器
  └── 結果判定

/commands — 指令速查
  ├── 合併兩本書的指令索引
  ├── 每指令：繁中說明、出處、頻率、練習連結
  └── 搜尋

/library — 書庫
  ├── Practical Vim
  │   ├── 章節列表
  │   ├── 每章偵測到的指令
  │   └── 相關練習
  └── LazyVim for Ambitious Developers
      ├── 章節列表
      ├── 每章偵測到的指令
      └── 相關練習
```

### 2.5 進度追蹤

```typescript
interface UserProgress {
  challenges_completed: Record<string, {
    completed_at: string;
    attempts: number;
    best_keystrokes: number;
    best_time_ms: number;
  }>;
  streak_days: number;
  last_practice_date: string;
  total_practice_time_ms: number;
  command_proficiency: Record<string, {
    times_used: number;
    success_rate: number;
    level: 'learning' | 'practicing' | 'mastered';
  }>;
  books_progress: Record<string, {
    chapters_completed: number[];
    challenges_completed: number;
    challenges_total: number;
  }>;
}
```

### 2.6 練習結果

完成後顯示：
- 通過/未通過
- 按鍵數 vs 書中建議按鍵數
- 按鍵序列回放
- 書中原文的解法說明（英文原文 + 繁中說明）
- 「再練一次」/「下一題」/「回到該 Tip」

---

## 開發順序

### Step 1：EPUB 提取（vimdao-extract）
- [ ] Go 專案初始化
- [ ] EPUB 解析器（讀取章節結構、提取 HTML 內容）
- [ ] HTML 清理器（去標籤、保留 code block）
- [ ] Vim 指令偵測器（正規表達式辨識指令 + 分類）
- [ ] 先跑 Practical Vim：提取所有 120+ tips 的 before/after 範例
- [ ] 輸出 `_extracted.json` 和 `_commands.json`
- [ ] 人工檢查提取結果，調整偵測規則

### Step 2：練習題生成（vimdao-extract）
- [ ] 練習題生成器：從 before/after + keystrokes 生成 challenge JSON
- [ ] 繁中翻譯模板
- [ ] 難度自動判定邏輯
- [ ] 跑 LazyVim 書
- [ ] merge 指令：合併兩本書的結果
- [ ] 輸出最終 JSON 到 `vimdao-web/public/data/`
- [ ] 人工檢查生成的練習題品質

### Step 3：前端 MVP（vimdao-web）
- [ ] Vite + React + TailwindCSS 初始化
- [ ] VimEngine 核心：vim-state, vim-motions（hjkl, w, b, 0, $, f, t, ;）
- [ ] VimEngine：delete, change, yank, put, undo, dot command
- [ ] VimEditor 元件：文字渲染、游標、模式切換、狀態列、按鍵記錄
- [ ] ChallengeView：載入 JSON 練習題、結果判定
- [ ] 用 Practical Vim 前幾個 tips 的練習題做端到端測試

### Step 4：VimEngine 完整實作
- [ ] Text objects 完整支援
- [ ] 數字前綴（count）
- [ ] 搜尋（/, n, N, *, #）
- [ ] Visual mode（v, V）
- [ ] Command 模式（:w, :q, :%s）
- [ ] r{char} 替換
- [ ] 確保所有 Practical Vim 的練習題都能在引擎中正確執行

### Step 5：完整頁面
- [ ] Dashboard + 進度追蹤
- [ ] Learning Path（依書籍章節結構）
- [ ] 自由練習頁（篩選、隨機）
- [ ] 指令速查頁
- [ ] 書庫頁
- [ ] 練習結果頁（回放、書中原文解法）
