# LazyVim Practice System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ~100 LazyVim/Neovim practice exercises — engine-based text manipulation (surround, comment, line-move) + keybinding memory quizzes (telescope, harpoon, neo-tree, obsidian, gitsigns, etc.) + :command quizzes + a complete RPG story line — so users can practice the full modern Neovim workflow.

**Architecture:** Three subsystems: (1) VimEngine extensions for surround/comment/line-move/Ctrl-a/Ctrl-x, tested with Vitest. (2) QuizView — a new React component for keybinding memory tests (no VimEditor, just prompt → input → verify). (3) Hand-authored JSON data files with exercises, plugin metadata, and LazyVim story chapters. All integrated into the existing RPG progression system.

**Tech Stack:** TypeScript strict, React 18, TailwindCSS v4, Vitest. No new dependencies.

---

## File Structure

```
vimdao-web/
├── public/data/
│   ├── lazyvim_exercises.json      # (create) Hand-authored: engine exercises + quiz exercises
│   ├── lazyvim_plugins.json        # (create) Plugin metadata with repo URLs
│   └── lazyvim_story.json          # (create) Story chapters for LazyVim path
├── src/
│   ├── engine/
│   │   ├── vim-surround.ts         # (create) gsa/gsd/gsr operations
│   │   ├── vim-comment.ts          # (create) gcc/gc{motion} toggle comment
│   │   ├── vim-engine.ts           # (modify) Wire surround, comment, [e/]e, Ctrl-a/x
│   │   └── __tests__/
│   │       ├── vim-surround.test.ts
│   │       ├── vim-comment.test.ts
│   │       └── vim-engine-lazyvim.test.ts
│   ├── types/
│   │   └── index.ts                # (modify) Add QuizExercise, PluginInfo types
│   ├── components/
│   │   ├── Quiz/
│   │   │   ├── QuizView.tsx        # (create) Single quiz exercise page
│   │   │   └── QuizList.tsx        # (create) Browse/filter quiz exercises
│   │   ├── Challenge/
│   │   │   └── ChallengeList.tsx   # (modify) Add tab for LazyVim exercises
│   │   └── RPG/
│   │       └── HomePage.tsx        # (modify) Add LazyVim path alongside Practical Vim
│   └── App.tsx                     # (modify) Add /quiz/:id and /lazyvim routes
```

---

### Task 1: Exercise Data + Types + Plugin Metadata

Create the JSON data files and TypeScript types.

**Files:**
- Create: `vimdao-web/public/data/lazyvim_exercises.json`
- Create: `vimdao-web/public/data/lazyvim_plugins.json`
- Create: `vimdao-web/public/data/lazyvim_story.json`
- Modify: `vimdao-web/src/types/index.ts`

- [ ] **Step 1: Add types to types/index.ts**

```typescript
// Quiz exercise — keybinding memory test (no VimEditor)
export interface QuizExercise {
  id: string
  type: 'quiz'           // keybinding quiz
  plugin: string         // plugin name (e.g., "telescope")
  category: string       // "file-navigation" | "editing" | "completion" | "git" | "diagnostics" | "notes" | "ui" | "command"
  title_zh: string
  title_en: string
  scenario_zh: string    // situation description: "你想在專案中搜尋文字"
  answer_keys: string    // correct key combo: "<Space>sg"
  answer_aliases?: string[]  // alternative accepted answers
  explanation_zh: string // what the command does
  explanation_en: string
  difficulty: number     // 1-3
  xp_reward: number
  is_boss: boolean
  flavor_zh?: string
  reference_url?: string // plugin repo URL
}

// Engine exercise — text manipulation in VimEditor (reuses Challenge interface)
// Uses the existing Challenge type with source.book = "lazyvim"

// Combined exercise set
export interface LazyVimExerciseSet {
  source: string
  exercises: Array<Challenge | QuizExercise>
}

// Plugin metadata
export interface PluginInfo {
  id: string
  name: string
  repo_url: string
  description_zh: string
  description_en: string
  category: string
  stars: string          // "19K" etc.
  author: string
}
```

- [ ] **Step 2: Create lazyvim_plugins.json**

```json
{
  "plugins": [
    {
      "id": "telescope",
      "name": "telescope.nvim",
      "repo_url": "https://github.com/nvim-telescope/telescope.nvim",
      "description_zh": "模糊搜尋器 — 搜檔案、文字、buffer、help 等一切",
      "description_en": "Extensible fuzzy finder over lists",
      "category": "file-navigation",
      "stars": "19K",
      "author": "nvim-telescope"
    },
    {
      "id": "harpoon",
      "name": "harpoon",
      "repo_url": "https://github.com/ThePrimeagen/harpoon",
      "description_zh": "快速標記與切換檔案 — 用最少按鍵到達目標",
      "description_en": "Getting you where you want with the fewest keystrokes",
      "category": "file-navigation",
      "stars": "9K",
      "author": "ThePrimeagen"
    },
    {
      "id": "neo-tree",
      "name": "neo-tree.nvim",
      "repo_url": "https://github.com/nvim-neo-tree/neo-tree.nvim",
      "description_zh": "側邊樹狀檔案管理器",
      "description_en": "Manage the file system and other tree-like structures",
      "category": "file-navigation",
      "stars": "5K",
      "author": "nvim-neo-tree"
    },
    {
      "id": "mini-surround",
      "name": "mini.surround",
      "repo_url": "https://github.com/nvim-mini/mini.nvim",
      "description_zh": "環繞操作 — 新增、刪除、替換引號/括號/標籤",
      "description_en": "Add/delete/replace surrounding pairs",
      "category": "editing",
      "stars": "9K",
      "author": "echasnovski"
    },
    {
      "id": "blink-cmp",
      "name": "blink.cmp",
      "repo_url": "https://github.com/Saghen/blink.cmp",
      "description_zh": "高效自動補全引擎",
      "description_en": "Performant, batteries-included completion plugin",
      "category": "completion",
      "stars": "6K",
      "author": "Saghen"
    },
    {
      "id": "obsidian",
      "name": "obsidian.nvim",
      "repo_url": "https://github.com/obsidian-nvim/obsidian.nvim",
      "description_zh": "在 Neovim 中操作 Obsidian vault",
      "description_en": "Obsidian integration for Neovim",
      "category": "notes",
      "stars": "7K",
      "author": "obsidian-nvim"
    },
    {
      "id": "flash",
      "name": "flash.nvim",
      "repo_url": "https://github.com/folke/flash.nvim",
      "description_zh": "搜尋標籤跳轉 — 用標籤快速移動到任意位置",
      "description_en": "Navigate your code with search labels",
      "category": "file-navigation",
      "stars": "4K",
      "author": "folke"
    },
    {
      "id": "which-key",
      "name": "which-key.nvim",
      "repo_url": "https://github.com/folke/which-key.nvim",
      "description_zh": "按鍵提示 — 顯示可用的快捷鍵",
      "description_en": "Shows available keybindings in a popup",
      "category": "ui",
      "stars": "7K",
      "author": "folke"
    },
    {
      "id": "gitsigns",
      "name": "gitsigns.nvim",
      "repo_url": "https://github.com/lewis6991/gitsigns.nvim",
      "description_zh": "Git 整合 — 行內 blame、hunk 操作、diff 標記",
      "description_en": "Git integration for buffers",
      "category": "git",
      "stars": "7K",
      "author": "lewis6991"
    },
    {
      "id": "trouble",
      "name": "trouble.nvim",
      "repo_url": "https://github.com/folke/trouble.nvim",
      "description_zh": "診斷列表 — 集中顯示所有錯誤、警告、參考",
      "description_en": "Pretty diagnostics list",
      "category": "diagnostics",
      "stars": "7K",
      "author": "folke"
    },
    {
      "id": "todo-comments",
      "name": "todo-comments.nvim",
      "repo_url": "https://github.com/folke/todo-comments.nvim",
      "description_zh": "TODO 註解高亮與搜尋",
      "description_en": "Highlight, list and search todo comments",
      "category": "diagnostics",
      "stars": "4K",
      "author": "folke"
    },
    {
      "id": "conform",
      "name": "conform.nvim",
      "repo_url": "https://github.com/stevearc/conform.nvim",
      "description_zh": "輕量格式化工具",
      "description_en": "Lightweight formatter plugin",
      "category": "diagnostics",
      "stars": "5K",
      "author": "stevearc"
    },
    {
      "id": "noice",
      "name": "noice.nvim",
      "repo_url": "https://github.com/folke/noice.nvim",
      "description_zh": "替換訊息、命令列、彈出選單的 UI",
      "description_en": "Replaces UI for messages, cmdline, popupmenu",
      "category": "ui",
      "stars": "6K",
      "author": "folke"
    },
    {
      "id": "snacks",
      "name": "snacks.nvim",
      "repo_url": "https://github.com/folke/snacks.nvim",
      "description_zh": "品質提升套件集合 — dashboard、通知、終端機等",
      "description_en": "Collection of QoL plugins",
      "category": "ui",
      "stars": "7K",
      "author": "folke"
    }
  ]
}
```

- [ ] **Step 3: Create lazyvim_exercises.json**

This is the big one. Hand-author ~100 exercises across all plugins. Structure:

```json
{
  "source": "LazyVim for Ambitious Developers + Community Plugins",
  "exercises": [
    {
      "id": "lv-telescope-001",
      "type": "quiz",
      "plugin": "telescope",
      "category": "file-navigation",
      "title_zh": "Telescope：搜尋檔案",
      "title_en": "Telescope: Find Files",
      "scenario_zh": "你想在專案中用名稱搜尋一個檔案。",
      "answer_keys": "<Space>ff",
      "answer_aliases": ["<leader>ff"],
      "explanation_zh": "<Space>ff 開啟 Telescope 檔案搜尋器，輸入檔名模糊搜尋。",
      "explanation_en": "Opens Telescope file finder for fuzzy file search.",
      "difficulty": 1,
      "xp_reward": 10,
      "is_boss": false,
      "reference_url": "https://github.com/nvim-telescope/telescope.nvim"
    },
    {
      "id": "lv-surround-001",
      "type": "engine",
      "source": { "book": "lazyvim", "chapter": 4, "section": "4.1", "tip_number": 1 },
      "title_zh": "Surround：為單字加上雙引號",
      "title_en": "Surround: Add quotes around word",
      "description_zh": "將初始文字修改為目標文字。\n提示按鍵：gsaiw\"",
      "category": "editing",
      "difficulty": 2,
      "initial_text": "hello world",
      "expected_text": "\"hello\" world",
      "cursor_start": { "line": 0, "col": 0 },
      "hint_commands": ["gsa", "iw"],
      "hint_keystrokes": "gsaiw\"",
      "hint_text": "按鍵順序：gsaiw\"\n\n• gsa — 新增環繞\n• iw — 選取游標所在單字\n• \" — 用雙引號環繞",
      "tags": ["gsa", "iw"],
      "concepts_zh": ["環繞操作"],
      "is_boss": false,
      "xp_reward": 15,
      "flavor_zh": "在虛擬終端中，文字需要被正確的符號包裹才能發揮力量。"
    }
  ]
}
```

Write ALL exercises for these plugins (with :commands mixed in):

**Telescope** (~8 quizzes): `<Space>ff`, `<Space>fg`, `<Space>fb`, `<Space>fh`, `<Space>fr`, `<Space>/`, `<C-n>`/`<C-p>` in picker, `<C-x>`/`<C-v>` split open

**Harpoon** (~5 quizzes): `<leader>a` add, `<C-e>` menu, `<C-h>`/`<C-j>`/`<C-k>`/`<C-l>` jump 1-4

**Neo-tree** (~8 quizzes): `<Space>e` toggle, `a` new file, `d` delete, `r` rename, `c` copy, `m` move, `H` hidden, `?` help

**Surround** (~10 engine): `gsaiw"`, `gsaiw(`, `gsd"`, `gsd(`, `gsr"'`, `gsr([`, `gsa$"`, plus BOSS

**Comment** (~5 engine): `gcc` toggle line, `gc3j` comment 3 lines, `gcap` comment paragraph, plus BOSS

**Line move** (~3 engine): `[e` move line up, `]e` move line down, multiple moves

**blink.cmp** (~5 quizzes): `<C-n>`/`<C-p>`, `<CR>` confirm, `<C-e>` cancel, `<C-Space>` trigger, `<Tab>` snippet jump

**Obsidian** (~8 quizzes): `<leader>oo` open, `<leader>os` search, `<leader>on` new, `<leader>od` daily, `<leader>ot` template, `<CR>` follow link, `]o`/`[o` navigate links, `[[` autocomplete

**Gitsigns** (~6 quizzes): `]c`/`[c` next/prev hunk, `<leader>hs` stage hunk, `<leader>hr` reset hunk, `<leader>hp` preview hunk, `<leader>hb` blame line

**Flash** (~4 quizzes): `s` seek, `S` treesitter select, `r` remote, `<C-s>` toggle in search

**Trouble** (~4 quizzes): `<leader>xx` toggle, `<leader>xw` workspace, `<leader>xd` document, `]q`/`[q` next/prev

**Todo-comments** (~3 quizzes): `]t`/`[t` next/prev todo, `<leader>xt` todo list, `<leader>xT` all todos

**Conform** (~2 quizzes): `<leader>cf` format, `<leader>cF` format buffer

**Snacks/Noice** (~4 quizzes): `<leader>un` dismiss notifications, `<leader>.` terminal, `<C-/>` toggle terminal, `<leader>gg` lazygit

**LazyVim :commands** (~8 quizzes): `:Lazy` plugin manager, `:Mason` LSP installer, `:LazyExtras` extras, `:checkhealth`, `:Telescope`, `:Trouble`, `:Obsidian today`, `:ConformInfo`

**Ctrl-a/Ctrl-x** (~3 engine): increment/decrement numbers

- [ ] **Step 4: Create lazyvim_story.json**

Story for LazyVim path — a SEPARATE cultivation story about "進階修煉：Neovim 的力量". The cultivator discovers that beyond basic Vim, there exists a realm of powerful plugins. Each chapter corresponds to a plugin group.

```json
{
  "path_title_zh": "LazyVim 進階修煉",
  "path_title_en": "LazyVim Advanced Training",
  "chapters": [
    {
      "chapter_id": 101,
      "title_zh": "搜尋的藝術",
      "title_en": "The Art of Search",
      "plugins": ["telescope", "flash"],
      "intro_story": [...],
      "outro_story": [...],
      "boss_intro": [...],
      "scene_image": "lv-ch1-search.png",
      "unlock_requires": null
    }
  ]
}
```

Chapters:
1. 搜尋的藝術 (telescope, flash) — 模糊搜尋與標籤跳轉
2. 檔案管理之道 (neo-tree, harpoon) — 樹狀管理與快速標記
3. 環繞與註解 (surround, comment) — 文字操縱的進階技法
4. 程式碼品質 (trouble, todo-comments, conform) — 診斷與格式化
5. Git 修煉 (gitsigns) — 版本控制的內功
6. 補全與速度 (blink.cmp, snacks) — 預知與效率
7. 知識管理 (obsidian) — 數位筆記的鍵道
8. 終極試煉 (mixed) — 綜合所有 plugin 的 BOSS 挑戰

- [ ] **Step 5: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('public/data/lazyvim_exercises.json')); print('valid')"
python3 -c "import json; json.load(open('public/data/lazyvim_plugins.json')); print('valid')"
python3 -c "import json; json.load(open('public/data/lazyvim_story.json')); print('valid')"
```

- [ ] **Step 6: Commit**

```bash
git add vimdao-web/public/data/lazyvim_*.json vimdao-web/src/types/index.ts
git commit -m "feat: add LazyVim exercise data, plugin metadata, and story chapters"
```

---

### Task 2: VimEngine — Surround (gsa/gsd/gsr)

Pure TypeScript module for surround operations.

**Files:**
- Create: `vimdao-web/src/engine/vim-surround.ts`
- Create: `vimdao-web/src/engine/__tests__/vim-surround.test.ts`
- Modify: `vimdao-web/src/engine/vim-engine.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { addSurround, deleteSurround, replaceSurround } from '../vim-surround'

describe('addSurround', () => {
  it('wraps word in double quotes', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '"')
    expect(getText(result)).toBe('"hello" world')
  })
  it('wraps with parens', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '(')
    expect(getText(result)).toBe('(hello) world')
  })
  it('wraps with brackets', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '[')
    expect(getText(result)).toBe('[hello] world')
  })
})

describe('deleteSurround', () => {
  it('removes double quotes', () => {
    const s = createState('"hello" world')
    s.cursor = { line: 0, col: 3 }
    const result = deleteSurround(s, '"')
    expect(getText(result)).toBe('hello world')
  })
  it('removes parens', () => {
    const s = createState('(hello) world')
    s.cursor = { line: 0, col: 3 }
    const result = deleteSurround(s, '(')
    expect(getText(result)).toBe('hello world')
  })
})

describe('replaceSurround', () => {
  it('replaces double quotes with single quotes', () => {
    const s = createState('"hello" world')
    s.cursor = { line: 0, col: 3 }
    const result = replaceSurround(s, '"', "'")
    expect(getText(result)).toBe("'hello' world")
  })
  it('replaces parens with brackets', () => {
    const s = createState('(hello) world')
    s.cursor = { line: 0, col: 3 }
    const result = replaceSurround(s, '(', '[')
    expect(getText(result)).toBe('[hello] world')
  })
})
```

- [ ] **Step 2: Implement vim-surround.ts**

Functions:
- `addSurround(state, range, char)` — insert open/close around range
- `deleteSurround(state, char)` — find matching pair around cursor, remove both
- `replaceSurround(state, oldChar, newChar)` — find pair, replace both

Pair mapping: `(` → `()`, `[` → `[]`, `{` → `{}`, `<` → `<>`, `"` → `""`, `'` → `''`, `` ` `` → ` `` ` ``

- [ ] **Step 3: Wire into vim-engine.ts**

Handle `g` → `s` → `a`/`d`/`r` key sequence:
- `gsa` + text-object + char → addSurround with resolved range
- `gsd` + char → deleteSurround
- `gsr` + old-char + new-char → replaceSurround

Add to the `g` prefix handler in `handleNormalMode`. Need sub-pending states: `gs` → wait for `a`/`d`/`r` → then text-object or char.

- [ ] **Step 4: Run tests — all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: add surround operations (gsa/gsd/gsr) to VimEngine"
```

---

### Task 3: VimEngine — Comment (gcc/gc) + Line Move ([e/]e) + Ctrl-a/x

**Files:**
- Create: `vimdao-web/src/engine/vim-comment.ts`
- Create: `vimdao-web/src/engine/__tests__/vim-comment.test.ts`
- Modify: `vimdao-web/src/engine/vim-engine.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// vim-comment.test.ts
import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { toggleLineComment, toggleRangeComment } from '../vim-comment'

describe('toggleLineComment', () => {
  it('comments a line', () => {
    const s = createState('hello world')
    const result = toggleLineComment(s, 0, 0)
    expect(getText(result)).toBe('// hello world')
  })
  it('uncomments a line', () => {
    const s = createState('// hello world')
    const result = toggleLineComment(s, 0, 0)
    expect(getText(result)).toBe('hello world')
  })
  it('comments multiple lines', () => {
    const s = createState('aaa\nbbb\nccc')
    const result = toggleRangeComment(s, 0, 1)
    expect(getText(result)).toBe('// aaa\n// bbb\nccc')
  })
})
```

Engine tests for `gcc`, `[e`, `]e`, `Ctrl-a`, `Ctrl-x`:

```typescript
// vim-engine-lazyvim.test.ts
describe('gcc comment toggle', () => {
  it('gcc comments current line', () => {
    expect(applyKeys('hello', ['g', 'c', 'c'])).toBe('// hello')
  })
  it('gcc uncomments', () => {
    expect(applyKeys('// hello', ['g', 'c', 'c'])).toBe('hello')
  })
})

describe('[e ]e line move', () => {
  it(']e moves line down', () => {
    expect(applyKeys('aaa\nbbb\nccc', [']', 'e'])).toBe('bbb\naaa\nccc')
  })
  it('[e moves line up', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 1, col: 0 }
    let result = s
    for (const k of ['[', 'e']) result = processKey(result, k).state
    expect(getText(result)).toBe('bbb\naaa\nccc')
  })
})

describe('Ctrl-a / Ctrl-x', () => {
  it('Ctrl-a increments number under cursor', () => {
    const s = createState('count = 5')
    s.cursor = { line: 0, col: 8 }
    const result = processKey(s, 'Control-a').state  // or whatever the key name is
    expect(getText(result)).toBe('count = 6')
  })
  it('Ctrl-x decrements', () => {
    const s = createState('count = 5')
    s.cursor = { line: 0, col: 8 }
    const result = processKey(s, 'Control-x').state
    expect(getText(result)).toBe('count = 4')
  })
})
```

- [ ] **Step 2: Implement vim-comment.ts**

- `toggleLineComment(state, startLine, endLine)` — toggle `// ` prefix
- Comment detection: line starts with `//` (optionally with whitespace)

- [ ] **Step 3: Wire gcc, [e/]e, Ctrl-a/x into vim-engine.ts**

`gcc`: handle in the `g` prefix → `gc` sub-prefix → second `c` = current line, or motion = range
`[e`/`]e`: handle in `[`/`]` prefix handler — swap current line with line above/below
`Ctrl-a`/`Ctrl-x`: find number at/after cursor on current line, increment/decrement

- [ ] **Step 4: Run tests — all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: add comment toggle, line move, and Ctrl-a/x to VimEngine"
```

---

### Task 4: QuizView Component

New React component for keybinding memory quizzes.

**Files:**
- Create: `vimdao-web/src/components/Quiz/QuizView.tsx`
- Create: `vimdao-web/src/components/Quiz/QuizList.tsx`

- [ ] **Step 1: Create QuizView.tsx**

Page component at `/quiz/:id`. Loads exercise from `lazyvim_exercises.json`.

Layout:
```
╔══════════════════════════════════════════╗
║  🎯 按鍵測驗                              ║
║                                          ║
║  [telescope.nvim]  難度：入門              ║
║                                          ║
║  情境：你想在專案中用名稱搜尋一個檔案。      ║
║                                          ║
║  請輸入正確的按鍵組合：                     ║
║  ┌──────────────────────┐                ║
║  │ [user types here]    │                ║
║  └──────────────────────┘                ║
║                                          ║
║  [提交答案]  [顯示提示]  [跳過]            ║
║                                          ║
║  ═══════════════════════════════════════  ║
║  ✓ 正確！                                 ║
║  <Space>ff = Telescope 檔案搜尋器          ║
║  開啟 Telescope 用名稱模糊搜尋檔案。        ║
║                                          ║
║  📦 telescope.nvim (19K ⭐)               ║
║  github.com/nvim-telescope/telescope.nvim ║
║                                          ║
║  [下一題]  [返回列表]                      ║
╚══════════════════════════════════════════╝
```

Key features:
- Input field captures key combos (display `<Space>`, `<C-n>` etc.)
- Compare input to `answer_keys` and `answer_aliases`
- Show plugin info from `lazyvim_plugins.json` after answer
- Award XP via `useProgress` on first correct answer
- RPG styling (BossFrame for boss exercises)

For key input: use a custom handler that converts keyboard events to Vim notation:
- Space → `<Space>`
- Ctrl+n → `<C-n>`
- Regular chars → literal char

- [ ] **Step 2: Create QuizList.tsx**

Browse all LazyVim exercises. Filter by:
- Plugin (telescope, harpoon, etc.)
- Category (file-navigation, editing, etc.)
- Type (quiz vs engine)
- Difficulty
- Completion status

Show plugin badges with stars count.

- [ ] **Step 3: Update App.tsx routing**

```tsx
import QuizView from './components/Quiz/QuizView'
import QuizList from './components/Quiz/QuizList'

<Route path="/lazyvim" element={<QuizList />} />
<Route path="/quiz/:id" element={<QuizView />} />
```

Also add "LazyVim 修煉" to Navbar.

- [ ] **Step 4: Handle engine exercises in QuizList**

When a `type: "engine"` exercise is clicked, navigate to `/challenge/:id` (reuse ChallengeView). The ChallengeView already handles any challenge with `initial_text`/`expected_text`.

For this, ChallengeView needs to also load from `lazyvim_exercises.json` — modify its fetch to try both files, or merge them.

Simplest approach: QuizList passes `?source=lazyvim` query param, ChallengeView reads from the correct JSON.

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/components/Quiz/ vimdao-web/src/App.tsx
git commit -m "feat: add QuizView and QuizList for LazyVim keybinding practice"
```

---

### Task 5: LazyVim Story + RPG Integration

Wire the LazyVim path into the RPG system.

**Files:**
- Modify: `vimdao-web/src/components/RPG/HomePage.tsx`
- Modify: `vimdao-web/src/components/Dashboard/Dashboard.tsx`
- Modify: `vimdao-web/src/rpg/constants.ts`
- Modify: `vimdao-web/src/components/Layout/Navbar.tsx`

- [ ] **Step 1: Add LazyVim skill lines to constants.ts**

Add new skill lines for LazyVim:
```typescript
{ id: 'search-nav', name: '搜尋導航', color: 'ctp-teal', tags: [] },
{ id: 'file-mgmt', name: '檔案管理', color: 'ctp-peach', tags: [] },
{ id: 'plugin-ops', name: '插件操作', color: 'ctp-mauve', tags: [] },
```

- [ ] **Step 2: Update HomePage — dual path**

Show two paths side by side:
- Left: Practical Vim 修練路徑 (existing ChapterMap)
- Right: LazyVim 進階修煉 (new chapter map from lazyvim_story.json)

Each LazyVim chapter shows its plugin icons and exercise count.

- [ ] **Step 3: Update Dashboard recommendations**

Include LazyVim exercises in the recommendation pool — interleave with Practical Vim based on user progress.

- [ ] **Step 4: Update Navbar**

Add "LazyVim" link pointing to `/lazyvim`.

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/
git commit -m "feat: integrate LazyVim path into RPG system and navigation"
```

---

### Task 6: ChallengeView — Support LazyVim Engine Exercises

Make ChallengeView work with exercises from `lazyvim_exercises.json`.

**Files:**
- Modify: `vimdao-web/src/components/Challenge/ChallengeView.tsx`

- [ ] **Step 1: Support loading from lazyvim_exercises.json**

When URL has query param `?source=lazyvim` or when the exercise ID starts with `lv-`, fetch from `lazyvim_exercises.json` instead of `practical-vim_challenges.json`.

```typescript
const source = id?.startsWith('lv-') ? 'lazyvim' : 'practical-vim'
const url = source === 'lazyvim'
  ? '/data/lazyvim_exercises.json'
  : '/data/practical-vim_challenges.json'
```

Filter to `type: "engine"` exercises only (quizzes go to QuizView).

- [ ] **Step 2: Show plugin info on LazyVim exercises**

When the challenge is from LazyVim, show the plugin name and repo link below the title.

- [ ] **Step 3: Commit**

```bash
git add vimdao-web/src/components/Challenge/ChallengeView.tsx
git commit -m "feat: ChallengeView supports LazyVim engine exercises"
```

---

## Execution Dependencies

```
Task 1 (data + types) → all other tasks
Task 2 (surround engine) ──→ Task 6 (ChallengeView support)
Task 3 (comment/move engine) ──→ Task 6
Task 4 (QuizView) → Task 5 (RPG integration)
Task 5 (story + RPG) — independent after Task 1
Task 6 (ChallengeView) — after Tasks 2, 3
```

Task 1 first. Then Tasks 2, 3, 4 in parallel. Then Tasks 5, 6.
