# Step 5: Complete Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all remaining pages for VimDao — Dashboard with progress overview and recommendations, enhanced practice with filters, Command Reference, Library browser, and enriched Challenge Result with keystroke replay.

**Architecture:** Each page is a self-contained React component fetching its own data. All share `useProgress()` for user state. New data files (merged_commands.json, lazyvim data) are copied to `public/data/`. No new libraries — all built with React hooks + TailwindCSS + existing RPG components.

**Tech Stack:** React 18 + TypeScript strict + TailwindCSS v4 + React Router. No new dependencies.

**Current routes:** `/` (HomePage/ChapterMap), `/practice` (ChallengeList), `/challenge/:id` (ChallengeView)

**New routes:** `/` becomes Dashboard, `/path` is ChapterMap (moved), `/practice` enhanced with filters, `/commands` command reference, `/library` book browser

---

## File Structure

```
vimdao-web/
├── public/data/
│   ├── merged_commands.json         # (copy from vimdao-extract)
│   ├── lazyvim_keybindings.json     # (copy)
│   └── lazyvim_reference.json       # (copy)
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   └── Dashboard.tsx        # (create) Progress overview, recommendations, streak
│   │   ├── Challenge/
│   │   │   ├── ChallengeView.tsx    # (modify) Enhanced result display
│   │   │   ├── ChallengeList.tsx    # (modify) Add filters
│   │   │   └── ChallengeResult.tsx  # (create) Detailed result with replay
│   │   ├── CommandRef/
│   │   │   └── CommandRef.tsx       # (create) Command reference page
│   │   ├── Library/
│   │   │   └── Library.tsx          # (create) Book/chapter browser
│   │   └── Layout/
│   │       └── Navbar.tsx           # (modify) Add new nav links
│   ├── types/
│   │   └── index.ts                 # (modify) Add CommandEntry type
│   └── App.tsx                      # (modify) New routes
```

---

### Task 1: Copy Data Files + Add Types

Copy missing JSON data files and add TypeScript types for them.

**Files:**
- Copy: `vimdao-extract/dist/merged/merged_commands.json` → `vimdao-web/public/data/`
- Copy: `vimdao-extract/dist/lazyvim-*/lazyvim-*_keybindings.json` → `vimdao-web/public/data/lazyvim_keybindings.json`
- Modify: `vimdao-web/src/types/index.ts`

- [ ] **Step 1: Copy data files**

```bash
cp vimdao-extract/dist/merged/merged_commands.json vimdao-web/public/data/
cp vimdao-extract/dist/lazyvim-for-ambitious-developers-dusty-phillips/lazyvim-for-ambitious-developers-dusty-phillips_keybindings.json vimdao-web/public/data/lazyvim_keybindings.json
```

- [ ] **Step 2: Add command types to types/index.ts**

```typescript
export interface CommandEntry {
  command: string
  frequency: number
  chapters: number[]
  sections: string[]
  category: string
  context_examples?: string[]
}

export interface CommandIndex {
  commands: CommandEntry[]
}

export interface KeybindingEntry {
  keys: string
  description_en: string
  category: string
  plugin?: string
  chapter: number
  section_id?: string
  requires: string
}
```

- [ ] **Step 3: Verify types compile**

Run: `cd vimdao-web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add vimdao-web/public/data/ vimdao-web/src/types/
git commit -m "feat: add merged commands and lazyvim data files + types"
```

---

### Task 2: Dashboard Page

The main landing page showing progress overview, today's recommendations, and streak.

**Files:**
- Create: `vimdao-web/src/components/Dashboard/Dashboard.tsx`
- Modify: `vimdao-web/src/App.tsx`
- Modify: `vimdao-web/src/components/Layout/Navbar.tsx`

- [ ] **Step 1: Create Dashboard.tsx**

Layout (all text in 繁體中文):
```
┌─────────────────────────────────────────────┐
│  道場總覽                                    │
├──────────────┬──────────────────────────────┤
│              │                              │
│ CharacterPanel│  進度概覽                     │
│ (existing)   │  ├─ 完成 X/69 練習            │
│              │  ├─ 連續 N 天 🔥              │
│              │  └─ 已解鎖 N/13 章            │
│              │                              │
│              │  今日推薦練習                  │
│              │  ├─ [challenge card]          │
│              │  ├─ [challenge card]          │
│              │  └─ [challenge card]          │
│              │                              │
│              │  最近完成                      │
│              │  ├─ [completed challenge]     │
│              │  └─ [completed challenge]     │
├──────────────┴──────────────────────────────┤
│  快速連結: 修練路徑 | 自由練習 | 指令速查     │
└─────────────────────────────────────────────┘
```

**Recommendation logic** (pure function, no AI):
- Pick 3 challenges from incomplete ones, preferring:
  1. Challenges in the current unlocked chapter (highest priority)
  2. Challenges in earlier chapters that were skipped
  3. Lower difficulty first for the current chapter
- If all complete, recommend challenges with high keystroke counts for improvement

**Recent completions**: last 5 entries from `progress.challenges_completed` sorted by `completed_at`.

- [ ] **Step 2: Update App.tsx routing**

```tsx
import Dashboard from './components/Dashboard/Dashboard'
// Move HomePage to /path
<Route path="/" element={<Dashboard />} />
<Route path="/path" element={<HomePage />} />
<Route path="/practice" element={<ChallengeList />} />
<Route path="/commands" element={<CommandRef />} />
<Route path="/library" element={<Library />} />
<Route path="/challenge/:id" element={<ChallengeView />} />
```

- [ ] **Step 3: Update Navbar**

Add links for: 道場 (/), 修練路徑 (/path), 自由練習 (/practice), 指令速查 (/commands), 書庫 (/library)

- [ ] **Step 4: Verify compilation and build**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/
git commit -m "feat: add Dashboard page with progress overview and recommendations"
```

---

### Task 3: Enhanced Practice Page with Filters

Add difficulty, category, and search filters to ChallengeList.

**Files:**
- Modify: `vimdao-web/src/components/Challenge/ChallengeList.tsx`

- [ ] **Step 1: Add filter state and UI**

Add to ChallengeList:
```typescript
const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null)
const [filterCategory, setFilterCategory] = useState<string | null>(null)
const [searchQuery, setSearchQuery] = useState('')
```

Filter bar above the grid:
- Difficulty buttons: 全部 | 入門 | 進階 | 精通
- Category buttons: 全部 | 移動 | 操作 | 組合技 | 插入 | 其他
- Search input: 搜尋練習... (filters by title_zh, title_en, tags)
- "隨機挑戰" button: picks a random incomplete challenge

Filter logic:
```typescript
const filtered = challenges.filter(c => {
  if (filterDifficulty !== null && c.difficulty !== filterDifficulty) return false
  if (filterCategory !== null && c.category !== filterCategory) return false
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    return c.title_zh.toLowerCase().includes(q) ||
           c.title_en.toLowerCase().includes(q) ||
           c.tags.some(t => t.includes(q))
  }
  return true
})
```

Show completion status on each card (from useProgress).

- [ ] **Step 2: Verify and commit**

```bash
git add vimdao-web/src/components/Challenge/ChallengeList.tsx
git commit -m "feat: add difficulty, category, and search filters to practice page"
```

---

### Task 4: Command Reference Page

Browse all Vim commands with zh-TW descriptions, frequency, and linked challenges.

**Files:**
- Create: `vimdao-web/src/components/CommandRef/CommandRef.tsx`

- [ ] **Step 1: Create CommandRef.tsx**

Fetches `merged_commands.json`. Displays commands in a searchable grid/table.

Layout:
```
指令速查
[搜尋指令...]

按類別篩選: 全部 | 移動 | 操作 | 文字物件 | 插入 | 視覺 | 其他

┌──────┬──────┬────────────────┬──────┬────────┐
│ 指令  │ 類別 │ 繁中說明        │ 頻率 │ 出現章節 │
├──────┼──────┼────────────────┼──────┼────────┤
│ j    │ 移動 │ 向下移動        │ 21   │ 1,3,4  │
│ w    │ 移動 │ 移到下一個單字   │ 18   │ 1,2,8  │
│ dd   │ 其他 │ 刪除整行        │ 15   │ 1,2,10 │
└──────┴──────┴────────────────┴──────┴────────┘
```

Each command card shows:
- Command in monospace (ctp-blue)
- Category badge (same colors as skill lines)
- zh-TW description from `translate` constants (import them or hardcode the common ones)
- Frequency bar
- Chapters where it appears
- Context examples from the JSON

Search filters by command name or description.

- [ ] **Step 2: Wire into App.tsx routing** (already done in Task 2)

- [ ] **Step 3: Commit**

```bash
git add vimdao-web/src/components/CommandRef/
git commit -m "feat: add Command Reference page (/commands)"
```

---

### Task 5: Library Page

Browse books, chapters, and their associated challenges.

**Files:**
- Create: `vimdao-web/src/components/Library/Library.tsx`

- [ ] **Step 1: Create Library.tsx**

Fetches `story.json` + `practical-vim_challenges.json` + `lazyvim_keybindings.json`.

Layout:
```
書庫

┌─ Practical Vim, 2nd Edition ─────────────┐
│ Drew Neil                                 │
│                                           │
│ 第1章: 鍵道入門 (The Vim Way)  — 5 練習    │
│ 第2章: 正常模式之力 (Normal Mode) — 5 練習  │
│ 第3章: 插入之術 (Insert Mode) — 3 練習     │
│ ...                                       │
└───────────────────────────────────────────┘

┌─ LazyVim for Ambitious Developers ────────┐
│ Dusty Phillips                             │
│                                            │
│ Neovim/LazyVim 按鍵參考                    │
│ Leader keys: 165 | Bracket jumps: 63       │
│ G-prefix: 26 | Surround: 15               │
└────────────────────────────────────────────┘
```

Clicking a Practical Vim chapter shows its challenges (links to `/challenge/:id`).
LazyVim section shows keybinding categories with counts.

- [ ] **Step 2: Commit**

```bash
git add vimdao-web/src/components/Library/
git commit -m "feat: add Library page (/library) for browsing books and chapters"
```

---

### Task 6: Enhanced Challenge Result

After challenge completion, show detailed results with keystroke comparison and replay.

**Files:**
- Create: `vimdao-web/src/components/Challenge/ChallengeResult.tsx`
- Modify: `vimdao-web/src/components/Challenge/ChallengeView.tsx`

- [ ] **Step 1: Create ChallengeResult.tsx**

Props: `challenge: Challenge`, `keyLog: string[]`, `passed: boolean`, `onRetry: () => void`, `onNext: () => void`

Shows:
- Pass/fail status with RPG styling
- 按鍵數比較: "你用了 N 次按鍵（書中建議 M 次）"
- XP gained (from challenge.xp_reward)
- 按鍵回放: display the keyLog as a sequence of key badges (reuse KeyLog component style)
- 書中解法: show `hint_commands` and `hint_text` (the book's suggested approach)
- Action buttons: "再練一次" (retry), "下一題" (next challenge), "返回修練路徑" (back to path)

If BOSS challenge: show special RPG completion frame.

- [ ] **Step 2: Integrate into ChallengeView**

When `result === 'pass'` or `result === 'fail'`, render `<ChallengeResult>` below the editor instead of the simple pass/fail text.

- [ ] **Step 3: Add "next challenge" navigation**

Find the next challenge in sequence (same chapter, next tip number; or first challenge of next chapter).

- [ ] **Step 4: Commit**

```bash
git add vimdao-web/src/components/Challenge/
git commit -m "feat: add enhanced Challenge Result with keystroke replay and book solution"
```

---

## Execution Dependencies

```
Task 1 (data + types) → Task 4 (CommandRef), Task 5 (Library)
Task 2 (Dashboard + routing) → all pages accessible
Task 3 (filters) — independent
Task 6 (result) — independent
```

Tasks 1 and 2 first (foundational). Then 3, 4, 5, 6 can be done in any order.
