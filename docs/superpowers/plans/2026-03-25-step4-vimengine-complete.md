# Step 4: VimEngine Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the VimEngine to support all v1 Vim commands — text objects, count prefix, search, visual mode, command mode, and r{char} — so all 69 Practical Vim challenges can be executed by the engine.

**Architecture:** Each feature is a new module or extension to an existing module in `src/engine/`. All pure TypeScript, no React dependency. The engine dispatcher (`vim-engine.ts`) grows to handle new modes (visual, command) and new pending states (count accumulator, search input). The 6 currently-skipped tests in `practical-vim-tips.test.ts` are the acceptance criteria.

**Tech Stack:** TypeScript strict, Vitest. No new dependencies.

**Current state:** 605-line engine dispatcher, 429-line motions, 327-line operations. 256 tests (250 pass, 6 skip).

---

## File Structure

```
vimdao-web/src/engine/
├── vim-types.ts          # (modify) Add 'visual' | 'command' to VimMode, add visual selection, search state, count
├── vim-state.ts          # (no change)
├── vim-motions.ts        # (modify) Add { } paragraph motions, s command
├── vim-operations.ts     # (modify) Add replaceChar, indent/dedent line ops
├── vim-text-objects.ts   # (create) iw/aw/i"/a"/i(/a(/i{/a{/i[/a[/it/at resolution
├── vim-search.ts         # (create) / search, n/N next/prev, * # word search
├── vim-engine.ts         # (modify) Add count prefix, text object dispatch, visual mode, command mode, r{char}, > operator, search mode
└── __tests__/
    ├── vim-text-objects.test.ts  # (create)
    ├── vim-search.test.ts        # (create)
    ├── vim-engine.test.ts        # (modify) Add tests for count, visual, command, r, >
    └── practical-vim-tips.test.ts # (modify) Unskip all 6 tests
```

---

### Task 1: Text Objects (`vim-text-objects.ts`)

Pure functions that resolve text object boundaries to a `{ start, end }` range.

**Files:**
- Create: `vimdao-web/src/engine/vim-text-objects.ts`
- Create: `vimdao-web/src/engine/__tests__/vim-text-objects.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { createState } from '../vim-state'
import { resolveTextObject } from '../vim-text-objects'

describe('word objects', () => {
  it('iw selects inner word', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 1 } // inside "hello"
    const range = resolveTextObject(s, 'i', 'w')
    expect(range).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 5 } })
  })

  it('aw selects word with trailing space', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 1 }
    const range = resolveTextObject(s, 'a', 'w')
    expect(range).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 6 } })
  })
})

describe('quote objects', () => {
  it('i" selects inside double quotes', () => {
    const s = createState('say "hello" please')
    s.cursor = { line: 0, col: 6 } // inside quotes
    const range = resolveTextObject(s, 'i', '"')
    expect(range).toEqual({ start: { line: 0, col: 5 }, end: { line: 0, col: 10 } })
  })

  it('a" selects including quotes', () => {
    const s = createState('say "hello" please')
    s.cursor = { line: 0, col: 6 }
    const range = resolveTextObject(s, 'a', '"')
    expect(range).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 11 } })
  })
})

describe('bracket objects', () => {
  it('i( selects inside parens', () => {
    const s = createState('call(arg1, arg2)')
    s.cursor = { line: 0, col: 8 }
    const range = resolveTextObject(s, 'i', '(')
    expect(range).toEqual({ start: { line: 0, col: 5 }, end: { line: 0, col: 15 } })
  })

  it('a( selects including parens', () => {
    const s = createState('call(arg1, arg2)')
    s.cursor = { line: 0, col: 8 }
    const range = resolveTextObject(s, 'a', '(')
    expect(range).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 16 } })
  })

  it('i{ selects inside braces', () => {
    const s = createState('if (x) { return y }')
    s.cursor = { line: 0, col: 12 }
    const range = resolveTextObject(s, 'i', '{')
    expect(range).toEqual({ start: { line: 0, col: 9 }, end: { line: 0, col: 18 } })
  })

  it('i[ selects inside brackets', () => {
    const s = createState('arr[0]')
    s.cursor = { line: 0, col: 4 }
    const range = resolveTextObject(s, 'i', '[')
    expect(range).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 5 } })
  })
})

describe('returns null when not found', () => {
  it('i( returns null when no parens', () => {
    const s = createState('no parens here')
    const range = resolveTextObject(s, 'i', '(')
    expect(range).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Implement vim-text-objects.ts**

Export `resolveTextObject(state, modifier: 'i' | 'a', obj: string): { start: CursorPos, end: CursorPos } | null`

Objects to support: `w`, `W`, `"`, `'`, `` ` ``, `(`, `)`, `b` (same as `(`), `{`, `}`, `B` (same as `{`), `[`, `]`, `<`, `>`, `t` (HTML tag).

For bracket pairs: scan outward from cursor to find matching pair. For `i` modifier: exclude the delimiters. For `a` modifier: include them.

For word: find word boundaries around cursor. `iw` = the word chars. `aw` = word + trailing whitespace (or leading if at end).

For quotes: find the pair on the current line containing/after cursor.

Also add `{` and `}` paragraph motions to `vim-motions.ts`:
- `{` — move to previous blank line (or start of file)
- `}` — move to next blank line (or end of file)

And add `s` command support to `vim-engine.ts` (delete char under cursor + enter insert mode — equivalent to `cl`).

Wire `{`, `}`, and `s` into `trySimpleMotion` / `handleNormalMode`.

- [ ] **Step 4: Run tests — all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/vim-text-objects.ts vimdao-web/src/engine/__tests__/vim-text-objects.test.ts
git commit -m "feat: add text object resolution (iw/aw/i\"/a\"/i(/a(/i{/a{/i[/a[)"
```

---

### Task 2: Count Prefix

Add a count accumulator to VimState and wire it through the engine dispatcher.

**Files:**
- Modify: `vimdao-web/src/engine/vim-types.ts` — add `countPrefix: number | null`
- Modify: `vimdao-web/src/engine/vim-state.ts` — init `countPrefix: null`
- Modify: `vimdao-web/src/engine/vim-engine.ts` — digit accumulation + count-aware dispatch
- Modify: `vimdao-web/src/engine/__tests__/vim-engine.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `vim-engine.test.ts`:
```typescript
describe('count prefix', () => {
  it('3w moves 3 words forward', () => {
    const s = applyKeysState('one two three four', ['3', 'w'])
    expect(s.cursor.col).toBe(14) // at "four"
  })

  it('5j moves 5 lines down', () => {
    const text = Array(10).fill('line').join('\n')
    const s = applyKeysState(text, ['5', 'j'])
    expect(s.cursor.line).toBe(5)
  })

  it('d2w deletes 2 words', () => {
    expect(applyKeys('one two three', ['d', '2', 'w'])).toBe('three')
  })

  it('3dd deletes 3 lines', () => {
    expect(applyKeys('a\nb\nc\nd\ne', ['3', 'd', 'd'])).toBe('d\ne')
  })

  it('2x deletes 2 chars', () => {
    expect(applyKeys('hello', ['2', 'x'])).toBe('llo')
  })

  it('c3w changes 3 words (cw acts like ce in Vim)', () => {
    expect(applyKeys('one two three four', ['c', '3', 'w', 'X', 'Escape'])).toBe('X four')
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Add `countPrefix` to VimState**

In `vim-types.ts`, add to VimState:
```typescript
countPrefix: number | null
```

In `vim-state.ts`, init to `null`.

- [ ] **Step 4: Implement count accumulation in vim-engine.ts**

In `handleNormalMode`, before all existing dispatch:
```typescript
// Digit accumulation (1-9 start count, 0 appends to existing count)
if ((key >= '1' && key <= '9') || (key === '0' && state.countPrefix !== null)) {
  const digit = parseInt(key)
  const current = state.countPrefix ?? 0
  return { state: { ...state, countPrefix: current * 10 + digit }, handled: true }
}
```

Then modify motion dispatch to repeat N times:
```typescript
const count = state.countPrefix ?? 1
const s = { ...state, countPrefix: null }
// For motions: apply N times
// For dd with count: delete N lines
// For x with count: delete N chars
```

Key changes:
- `trySimpleMotion` result is applied `count` times in a loop
- `executeLineOp` for `dd` deletes `count` lines
- `deleteChar` (`x`) runs `count` times
- Operator-pending: if count was set before operator, store it. If count set after operator (d2w), multiply.

- [ ] **Step 5: Run tests — all pass**

- [ ] **Step 6: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: add count prefix support (3w, d2w, 3dd, 2x)"
```

---

### Task 3: Search (`vim-search.ts`)

Forward search with `/`, next/prev with `n`/`N`, word search with `*`/`#`.

**Files:**
- Create: `vimdao-web/src/engine/vim-search.ts`
- Create: `vimdao-web/src/engine/__tests__/vim-search.test.ts`
- Modify: `vimdao-web/src/engine/vim-types.ts` — add search state
- Modify: `vimdao-web/src/engine/vim-engine.ts` — search mode handling

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { createState } from '../vim-state'
import { searchForward, searchBackward, searchWordUnderCursor } from '../vim-search'

describe('searchForward', () => {
  it('finds pattern after cursor', () => {
    const s = createState('hello world hello')
    const pos = searchForward(s, 'hello')
    // cursor at 0,0 — first match IS at cursor, skip to next
    expect(pos).toEqual({ line: 0, col: 12 })
  })

  it('wraps around', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 8 }
    const pos = searchForward(s, 'hello')
    expect(pos).toEqual({ line: 0, col: 0 })
  })

  it('returns null when not found', () => {
    const s = createState('hello')
    expect(searchForward(s, 'xyz')).toBeNull()
  })
})

describe('searchWordUnderCursor', () => {
  it('finds the word at cursor', () => {
    const s = createState('the content of content is content')
    s.cursor = { line: 0, col: 4 } // on "content"
    const result = searchWordUnderCursor(s)
    expect(result).not.toBeNull()
    expect(result!.pattern).toBe('content')
    expect(result!.nextPos).toEqual({ line: 0, col: 15 }) // second "content"
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Add search state to VimState**

```typescript
// In vim-types.ts, add to VimState:
searchPattern: string | null
searchDirection: 'forward' | 'backward'

// In vim-types.ts, add 'command' to VimMode:
export type VimMode = 'normal' | 'insert' | 'operator-pending' | 'visual' | 'command'

// In vim-state.ts, add to createState:
searchPattern: null,
searchDirection: 'forward' as const,
```

- [ ] **Step 4: Implement vim-search.ts**

Functions:
- `searchForward(state, pattern): CursorPos | null` — find next occurrence after cursor
- `searchBackward(state, pattern): CursorPos | null` — find previous occurrence before cursor
- `searchWordUnderCursor(state): { pattern: string, nextPos: CursorPos } | null` — extract word at cursor, search forward

- [ ] **Step 5: Wire search into vim-engine.ts**

In `handleNormalMode`:
- `/` → enter command mode with `commandBuffer: '/'`, collect chars until Enter
- On Enter: execute search, set `searchPattern`
- `n` → `searchForward(state, state.searchPattern)` → move cursor
- `N` → `searchBackward(state, state.searchPattern)` → move cursor
- `*` → `searchWordUnderCursor(state)` → set pattern + move to next
- `#` → same but backward

For command mode input: add `commandBuffer: string` to VimState. When mode is 'command', chars append to buffer. Escape cancels. Enter executes.

- [ ] **Step 6: Add engine-level tests**

```typescript
describe('search', () => {
  it('/ searches forward', () => {
    const s = applyKeysState('hello world hello', ['/', 'h', 'e', 'l', 'l', 'o', 'Enter'])
    expect(s.cursor.col).toBe(12)
  })
  it('n repeats search (wraps around)', () => {
    const s = applyKeysState('aaa bbb aaa', ['/', 'a', 'a', 'a', 'Enter', 'n'])
    // /aaa from col 0 finds col 8, then n wraps back to col 0
    expect(s.cursor.col).toBe(0)
  })
  it('* searches word under cursor', () => {
    const s = applyKeysState('the content of content', ['w', '*'])
    // cursor was on "content" at col 4, * moves to next "content" at col 15
    expect(s.cursor.col).toBe(15)
  })
})
```

- [ ] **Step 7: Run tests — all pass**

- [ ] **Step 8: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: add search (/, n, N, *, #) to VimEngine"
```

---

### Task 4: Visual Mode

Character-wise (`v`) and line-wise (`V`) visual selection with `d`/`c`/`y` operators.

**Files:**
- Modify: `vimdao-web/src/engine/vim-types.ts` — add visual selection state
- Modify: `vimdao-web/src/engine/vim-engine.ts` — visual mode handler
- Modify: `vimdao-web/src/engine/__tests__/vim-engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('visual mode', () => {
  it('v enters visual mode', () => {
    const s = applyKeysState('hello', ['v'])
    expect(s.mode).toBe('visual')
  })

  it('v + motion selects text', () => {
    const s = applyKeysState('hello world', ['v', 'w'])
    expect(s.visualStart).toEqual({ line: 0, col: 0 })
    expect(s.cursor.col).toBe(6) // moved by w
  })

  it('v + d deletes selected text', () => {
    expect(applyKeys('hello world', ['v', 'e', 'd'])).toBe(' world')
  })

  it('V selects whole line', () => {
    expect(applyKeys('aaa\nbbb\nccc', ['V', 'j', 'd'])).toBe('ccc')
  })

  it('Escape exits visual mode', () => {
    const s = applyKeysState('hello', ['v', 'Escape'])
    expect(s.mode).toBe('normal')
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Add visual state to VimState**

```typescript
// In vim-types.ts:
visualStart: CursorPos | null  // anchor point where visual selection started
visualMode: 'char' | 'line' | null  // character-wise or line-wise
```

- [ ] **Step 4: Implement visual mode in vim-engine.ts**

Add `handleVisualMode(state, key)`:
- Motions move cursor (selection extends from `visualStart` to current cursor)
- `d` → delete from `visualStart` to cursor, return to normal
- `c` → delete + enter insert
- `y` → yank, return to normal
- `Escape` → return to normal, clear selection
- `V` in normal mode → enter line-wise visual

For line-wise: `d`/`c`/`y` operate on full lines from `visualStart.line` to `cursor.line`.

- [ ] **Step 5: Run tests — all pass**

- [ ] **Step 6: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: add visual mode (v, V) with d/c/y operators"
```

---

### Task 5: Command Mode, r{char}, and > Operator

`:w` (submit), `:q` (quit), `:%s/old/new/g` (substitute), `r{char}` (replace), and `>` (indent).

**Files:**
- Modify: `vimdao-web/src/engine/vim-engine.ts`
- Modify: `vimdao-web/src/engine/vim-operations.ts` — add `replaceChar`, `indentLines`
- Modify: `vimdao-web/src/engine/__tests__/vim-engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('r{char} replace', () => {
  it('r replaces char under cursor', () => {
    expect(applyKeys('hello', ['r', 'X'])).toBe('Xello')
  })
  it('r at col 3 replaces that char', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 3 }
    let result = s
    for (const k of ['r', 'X']) result = processKey(result, k).state
    expect(getText(result)).toBe('helXo')
  })
})

describe('> indent', () => {
  it('>G indents from cursor to end', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 1, col: 0 }
    let result = s
    for (const k of ['>', 'G']) result = processKey(result, k).state
    expect(getText(result)).toBe('aaa\n  bbb\n  ccc')
  })
  it('>j indents current and next line', () => {
    expect(applyKeys('aaa\nbbb\nccc', ['>', 'j'])).toBe('  aaa\n  bbb\nccc')
  })
})

describe('command mode', () => {
  it(':w triggers submit (returns special state)', () => {
    const s = applyKeysState('hello', [':', 'w', 'Enter'])
    // :w should set a flag or return to normal mode
    expect(s.mode).toBe('normal')
  })

  it(':%s/old/new/g substitutes', () => {
    const keys = [':', '%', 's', '/', 'h', 'e', '/', 'H', 'E', '/', 'g', 'Enter']
    expect(applyKeys('hello he', keys)).toBe('HEllo HE')
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Implement r{char}**

In `handleNormalMode`:
- `r` → set `pendingKeys: 'r'`, wait for next char
- On next char: replace char at cursor position, record change for dot

- [ ] **Step 4: Implement > operator**

Add `>` to the operator set (alongside d, c, y). In `executeOperatorMotion` and `executeLineOp`:
- `>` + motion: indent lines from cursor.line to target.line by prepending 2 spaces
- `>>`: indent current line

Add `indentLines(state, startLine, endLine)` to `vim-operations.ts`.

- [ ] **Step 5: Implement command mode**

When `:` is pressed in normal mode:
- Set mode to 'command', init `commandBuffer: ':'`
- Chars append to buffer
- `Backspace` removes last char
- `Escape` cancels, return to normal
- `Enter` executes:
  - `:w` → set `lastCommand: 'write'` on state (ChallengeView reads this)
  - `:q` → set `lastCommand: 'quit'`
  - `:%s/pattern/replacement/g` → parse and execute substitute

Add `commandBuffer: string` and `lastCommand: string | null` to VimState.

For `:%s`: parse the command, use `String.replaceAll` for `/g`, `String.replace` for without `/g`. Apply to all lines for `%` range.

- [ ] **Step 6: Run tests — all pass**

- [ ] **Step 7: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: add r{char}, > indent, and command mode (:w, :q, :%s)"
```

---

### Task 6: Wire Text Objects into Engine + Integration

Connect text objects to the operator-pending handler and dispatch daw, ciw, etc.

**Files:**
- Modify: `vimdao-web/src/engine/vim-engine.ts`
- Modify: `vimdao-web/src/engine/__tests__/vim-engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('text objects with operators', () => {
  it('daw deletes a word with space', () => {
    const s = createState('hello world foo')
    s.cursor = { line: 0, col: 7 } // on "world"
    let result = s
    for (const k of ['d', 'a', 'w']) result = processKey(result, k).state
    expect(getText(result)).toBe('hello foo')
  })

  it('ciw changes inner word', () => {
    expect(applyKeys('hello world', ['w', 'c', 'i', 'w', 'X', 'Escape'])).toBe('hello X')
  })

  it('di( deletes inside parens', () => {
    expect(applyKeys('call(arg1, arg2)', ['f', '(', 'l', 'd', 'i', '('])).toBe('call()')
  })

  it('ci" changes inside quotes', () => {
    const s = createState('say "hello" end')
    s.cursor = { line: 0, col: 6 }
    let result = s
    for (const k of ['c', 'i', '"', 'X', 'Escape']) result = processKey(result, k).state
    expect(getText(result)).toBe('say "X" end')
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Wire text objects into handleOperatorPending**

When `handleOperatorPending` receives `'i'` or `'a'`, enter a sub-pending state for the text object character. On the next key (the object type: `w`, `"`, `(`, etc.), resolve via `resolveTextObject` and execute the operator on the resulting range.

- [ ] **Step 4: Run tests — all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: wire text objects into operator dispatch (daw, ciw, di\", etc.)"
```

---

### Task 7: Unskip Practical Vim Tests + Bug Fixes

The final acceptance task. Unskip all 6 tests and fix any remaining issues.

**Files:**
- Modify: `vimdao-web/src/engine/__tests__/practical-vim-tips.test.ts`
- Possibly modify engine files for edge case fixes

- [ ] **Step 1: Unskip tests and fill in missing key sequences**

Change `it.skip(` to `it(` for the 6 skipped tests. Several have empty key arrays `[]` that need correct keystrokes:

- `pv-tip05-001` (`*cwcopy<Esc>n.`): fill keys `['w', '*', 'c', 'w', 'c', 'o', 'p', 'y', 'Escape', 'n', '.']` (w to move to "content" first, then * to search, cw to change word, type "copy", Escape, n for next match, dot to repeat)
- `pv-tip11-001` (`c3wsome more<Esc>`): fill keys from the challenge's hint_commands sequence
- `pv-tip10-001`: re-skip with comment "needs `<C-x>` decrement (not in v1 scope)"

- [ ] **Step 2: Run tests — see which fail**

Run: `cd vimdao-web && npm run test:run`

Analyze each failure:
- `pv-tip01-003`: needs `>G` — should work after Task 5
- `pv-tip05-001`: needs `*` and `n` — should work after Task 3
- `pv-tip09-002`: needs `dw` at end-of-line fix — check if still broken
- `pv-tip09-003`: needs `daw` — should work after Task 6
- `pv-tip10-001`: needs count prefix + yyp — should partly work after Task 2
- `pv-tip11-001`: needs `c3w` — should work after Task 2

- [ ] **Step 3: Fix any remaining failures**

For `pv-tip09-002` (dw at end of line): if `w` returns the current position because there's no next word, `dw` should delete to end of line instead. Fix in `executeOperatorMotion` or `vim-motions.ts`.

For `pv-tip10-001` with `<C-x>`: this is Vim's decrement number command. If too complex, mark as `it.skip` with a comment "needs <C-x> (not in v1 scope)" — this specific challenge requires a feature not listed in the v1 command set.

- [ ] **Step 4: Run tests — maximum passes, document any remaining skips**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "test: unskip Practical Vim challenge tests, fix edge cases"
```

---

## Execution Dependencies

```
Task 1 (text objects) ──────────────────────────→ Task 6 (wire into engine)
Task 2 (count prefix) ──→ Task 5 (commands) ──→ Task 7 (unskip + fix)
Task 3 (search) ────────────────────────────────→ Task 7
Task 4 (visual mode) ──────────────────────────→ Task 7
```

Tasks 1, 2, 3, 4 are independent of each other. Task 5 depends on 2 (count in operators). Task 6 depends on 1 (text object module). Task 7 depends on everything (acceptance).
