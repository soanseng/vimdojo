# Step 3: Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Vim practice app where users can load challenges from JSON, edit text in a browser-based VimEditor, and verify their result — with the first ~20 Practical Vim tips playable end-to-end.

**Architecture:** VimEngine is pure TypeScript with zero React dependency (testable with Vitest). VimEditor is a React component that wraps VimEngine and renders a terminal-like UI. ChallengeView loads JSON, initializes VimEditor with challenge text, and compares final state to `expected_text`. No backend — all data from static JSON fetched at runtime, progress in localStorage.

**Tech Stack:** React 18+ (TypeScript strict), Vite, TailwindCSS v4, React Router, Vitest. No third-party Vim libraries.

**Language:** All UI text in 繁體中文. Code/variables/commits in English.

**MVP scope (Step 3 only):** Basic motions (hjkl, w, b, 0, $, f, t, ;), basic editing (x, dd, cc, yy, p, u, .), insert mode (i, a, o, A, Escape), operator+motion (dw, cw, yw). NOT in scope: text objects, count prefix, search, visual mode, :%s — those are Step 4.

---

## File Structure

```
vimdao-web/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
├── public/
│   └── data/                          # copied from vimdao-extract output
│       ├── practical-vim_challenges.json
│       └── practical-vim_commands.json
├── src/
│   ├── main.tsx                       # React entrypoint
│   ├── App.tsx                        # Router wrapper
│   ├── engine/
│   │   ├── vim-types.ts               # VimMode, VimState, KeyResult types
│   │   ├── vim-state.ts               # createState, buffer/cursor/mode management, undo stack
│   │   ├── vim-motions.ts             # h,j,k,l,w,b,e,0,^,$,f,t,;,,  — pure functions
│   │   ├── vim-operations.ts          # x,dd,D,cc,C,yy,Y,p,P,u,. — delete/change/yank/put/undo/dot
│   │   ├── vim-engine.ts              # processKey() — main dispatcher, operator-pending state
│   │   └── __tests__/
│   │       ├── vim-motions.test.ts
│   │       ├── vim-operations.test.ts
│   │       └── vim-engine.test.ts
│   ├── components/
│   │   ├── VimEditor/
│   │   │   ├── VimEditor.tsx          # main editor component, captures keyboard
│   │   │   ├── StatusBar.tsx          # mode | filename | line:col | keys
│   │   │   └── KeyLog.tsx            # real-time keystroke display
│   │   └── Challenge/
│   │       ├── ChallengeView.tsx      # single challenge page
│   │       └── ChallengeList.tsx      # list/filter challenges
│   ├── hooks/
│   │   └── useVimEditor.ts            # React hook wrapping VimEngine
│   ├── types/
│   │   └── index.ts                   # Challenge JSON type definitions
│   └── styles/
│       └── vim-editor.css             # editor-specific styles (Catppuccin Mocha)
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `vimdao-web/package.json`
- Create: `vimdao-web/index.html`
- Create: `vimdao-web/vite.config.ts`
- Create: `vimdao-web/tsconfig.json`
- Create: `vimdao-web/tsconfig.node.json`
- Create: `vimdao-web/vitest.config.ts`
- Create: `vimdao-web/src/main.tsx`
- Create: `vimdao-web/src/App.tsx`
- Create: `vimdao-web/public/data/` (copy JSON from vimdao-extract)

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p vimdao-web/src vimdao-web/public/data
cd vimdao-web
npm init -y
```

Then edit `package.json`:

```json
{
  "name": "vimdao-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd vimdao-web
npm install react react-dom react-router-dom
npm install -D typescript @types/react @types/react-dom \
  vite @vitejs/plugin-react \
  vitest @testing-library/react @testing-library/jest-dom jsdom \
  tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Create config files**

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create index.html and entrypoint**

`index.html`:
```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VimDao 鍵道</title>
  </head>
  <body class="bg-ctp-base text-ctp-text">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/vim-editor.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx`:
```tsx
export default function App() {
  return <div className="min-h-screen bg-ctp-base text-ctp-text p-4">
    <h1 className="text-2xl font-bold">VimDao 鍵道</h1>
    <p className="text-ctp-subtext0">互動式 Vim 學習平台</p>
  </div>
}
```

`src/styles/vim-editor.css`:
```css
@import "tailwindcss";

/* Catppuccin Mocha palette as CSS custom properties */
@theme {
  --color-ctp-base: #1e1e2e;
  --color-ctp-mantle: #181825;
  --color-ctp-crust: #11111b;
  --color-ctp-surface0: #313244;
  --color-ctp-surface1: #45475a;
  --color-ctp-surface2: #585b70;
  --color-ctp-overlay0: #6c7086;
  --color-ctp-text: #cdd6f4;
  --color-ctp-subtext0: #a6adc8;
  --color-ctp-subtext1: #bac2de;
  --color-ctp-blue: #89b4fa;
  --color-ctp-green: #a6e3a1;
  --color-ctp-red: #f38ba8;
  --color-ctp-yellow: #f9e2af;
  --color-ctp-peach: #fab387;
  --color-ctp-mauve: #cba6f7;
  --color-ctp-teal: #94e2d5;
  --color-ctp-lavender: #b4befe;
}

/* Editor monospace font stack */
.vim-editor {
  font-family: 'Fira Code', 'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace;
}

body {
  font-family: 'Noto Sans TC', system-ui, sans-serif;
}
```

- [ ] **Step 5: Copy challenge JSON data**

```bash
cp ../vimdao-extract/dist/practical-vim-drew-neil/practical-vim-drew-neil_challenges.json \
   public/data/practical-vim_challenges.json
cp ../vimdao-extract/dist/practical-vim-drew-neil/practical-vim-drew-neil_commands.json \
   public/data/practical-vim_commands.json
```

- [ ] **Step 6: Verify dev server starts**

```bash
cd vimdao-web && npm run dev
```

Expected: Vite dev server starts, page shows "VimDao 鍵道" title.

- [ ] **Step 7: Verify test runner works**

Create a smoke test `src/engine/__tests__/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('smoke test', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add vimdao-web/
git commit -m "feat: scaffold vimdao-web with Vite + React + TailwindCSS + Vitest"
```

---

### Task 2: VimEngine Types and State

The pure-TypeScript engine foundation. Zero React dependency.

**Files:**
- Create: `vimdao-web/src/engine/vim-types.ts`
- Create: `vimdao-web/src/engine/vim-state.ts`

- [ ] **Step 1: Define core types**

`src/engine/vim-types.ts`:
```typescript
export type VimMode = 'normal' | 'insert' | 'operator-pending'

export interface CursorPos {
  line: number
  col: number
}

export interface VimState {
  lines: string[]
  cursor: CursorPos
  mode: VimMode
  register: string         // default yank register content
  undoStack: VimSnapshot[]
  lastChange: RecordedChange | null  // for dot command
  pendingOperator: string | null     // 'd', 'c', 'y' waiting for motion
  pendingKeys: string               // accumulated key sequence display
  keyLog: string[]                   // all keys pressed this session
  lastFind: FindParams | null        // for ; and , repeat
}

export interface FindParams {
  char: string
  direction: 'forward' | 'backward'
  type: 'f' | 't'
}

export interface VimSnapshot {
  lines: string[]
  cursor: CursorPos
}

export interface RecordedChange {
  type: 'normal' | 'insert'
  keys: string[]           // the key sequence that produced this change
}

export interface KeyResult {
  state: VimState
  handled: boolean
}
```

- [ ] **Step 2: Implement state factory**

`src/engine/vim-state.ts`:
```typescript
import type { VimState, VimSnapshot, CursorPos } from './vim-types'

export function createState(text: string, cursor?: CursorPos): VimState {
  const lines = text.split('\n')
  return {
    lines,
    cursor: cursor ?? { line: 0, col: 0 },
    mode: 'normal',
    register: '',
    undoStack: [],
    lastChange: null,
    pendingOperator: null,
    pendingKeys: '',
    keyLog: [],
    lastFind: null,
  }
}

export function getText(state: VimState): string {
  return state.lines.join('\n')
}

export function snapshot(state: VimState): VimSnapshot {
  return {
    lines: state.lines.map(l => l),
    cursor: { ...state.cursor },
  }
}

export function restoreSnapshot(state: VimState, snap: VimSnapshot): VimState {
  return {
    ...state,
    lines: snap.lines.map(l => l),
    cursor: { ...snap.cursor },
  }
}

export function clampCursor(state: VimState): VimState {
  const line = Math.max(0, Math.min(state.cursor.line, state.lines.length - 1))
  const lineLen = state.lines[line]?.length ?? 0
  const maxCol = state.mode === 'insert' ? lineLen : Math.max(0, lineLen - 1)
  const col = Math.max(0, Math.min(state.cursor.col, maxCol))
  return { ...state, cursor: { line, col } }
}

export function currentLine(state: VimState): string {
  return state.lines[state.cursor.line] ?? ''
}

export function charUnderCursor(state: VimState): string {
  return currentLine(state)[state.cursor.col] ?? ''
}
```

- [ ] **Step 3: Write tests for state**

`src/engine/__tests__/vim-state.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createState, getText, clampCursor, snapshot, restoreSnapshot } from '../vim-state'

describe('createState', () => {
  it('splits text into lines', () => {
    const s = createState('hello\nworld')
    expect(s.lines).toEqual(['hello', 'world'])
    expect(s.cursor).toEqual({ line: 0, col: 0 })
    expect(s.mode).toBe('normal')
  })

  it('handles single line', () => {
    const s = createState('hello')
    expect(s.lines).toEqual(['hello'])
  })

  it('handles empty string', () => {
    const s = createState('')
    expect(s.lines).toEqual([''])
  })
})

describe('getText', () => {
  it('joins lines with newlines', () => {
    const s = createState('a\nb\nc')
    expect(getText(s)).toBe('a\nb\nc')
  })
})

describe('clampCursor', () => {
  it('clamps col to line length - 1 in normal mode', () => {
    const s = createState('abc')
    s.cursor = { line: 0, col: 10 }
    const clamped = clampCursor(s)
    expect(clamped.cursor.col).toBe(2) // 'abc' has max col 2
  })

  it('allows col at line length in insert mode', () => {
    const s = createState('abc')
    s.mode = 'insert'
    s.cursor = { line: 0, col: 3 }
    const clamped = clampCursor(s)
    expect(clamped.cursor.col).toBe(3)
  })

  it('clamps negative values to 0', () => {
    const s = createState('abc')
    s.cursor = { line: -1, col: -5 }
    const clamped = clampCursor(s)
    expect(clamped.cursor.line).toBe(0)
    expect(clamped.cursor.col).toBe(0)
  })
})

describe('snapshot/restore', () => {
  it('creates independent copy', () => {
    const s = createState('hello')
    const snap = snapshot(s)
    s.lines[0] = 'changed'
    expect(snap.lines[0]).toBe('hello')
  })
})
```

- [ ] **Step 4: Run tests**

Run: `cd vimdao-web && npm run test:run`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/
git commit -m "feat: add VimEngine types and state management"
```

---

### Task 3: VimEngine Motions

Pure functions: each motion takes VimState + optional char arg, returns new CursorPos.

**Files:**
- Create: `vimdao-web/src/engine/vim-motions.ts`
- Create: `vimdao-web/src/engine/__tests__/vim-motions.test.ts`

- [ ] **Step 1: Write failing tests for basic motions**

`src/engine/__tests__/vim-motions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createState } from '../vim-state'
import * as m from '../vim-motions'

describe('hjkl', () => {
  it('h moves left', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    expect(m.h(s)).toEqual({ line: 0, col: 1 })
  })

  it('h stops at col 0', () => {
    const s = createState('hello')
    expect(m.h(s)).toEqual({ line: 0, col: 0 })
  })

  it('l moves right', () => {
    const s = createState('hello')
    expect(m.l(s)).toEqual({ line: 0, col: 1 })
  })

  it('l stops at last char in normal mode', () => {
    const s = createState('hi')
    s.cursor = { line: 0, col: 1 }
    expect(m.l(s)).toEqual({ line: 0, col: 1 })
  })

  it('j moves down', () => {
    const s = createState('aa\nbb')
    expect(m.j(s)).toEqual({ line: 1, col: 0 })
  })

  it('j stops at last line', () => {
    const s = createState('only')
    expect(m.j(s)).toEqual({ line: 0, col: 0 })
  })

  it('k moves up', () => {
    const s = createState('aa\nbb')
    s.cursor = { line: 1, col: 0 }
    expect(m.k(s)).toEqual({ line: 0, col: 0 })
  })
})

describe('word motions', () => {
  it('w moves to next word start', () => {
    const s = createState('hello world')
    expect(m.w(s)).toEqual({ line: 0, col: 6 })
  })

  it('w wraps to next line', () => {
    const s = createState('hello\nworld')
    s.cursor = { line: 0, col: 4 }
    expect(m.w(s)).toEqual({ line: 1, col: 0 })
  })

  it('b moves to previous word start', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 8 }
    expect(m.b(s)).toEqual({ line: 0, col: 6 })
  })

  it('e moves to word end', () => {
    const s = createState('hello world')
    expect(m.e(s)).toEqual({ line: 0, col: 4 })
  })
})

describe('line motions', () => {
  it('0 moves to line start', () => {
    const s = createState('  hello')
    s.cursor = { line: 0, col: 4 }
    expect(m.zero(s)).toEqual({ line: 0, col: 0 })
  })

  it('^ moves to first non-space', () => {
    const s = createState('  hello')
    expect(m.caret(s)).toEqual({ line: 0, col: 2 })
  })

  it('$ moves to end of line', () => {
    const s = createState('hello')
    expect(m.dollar(s)).toEqual({ line: 0, col: 4 })
  })
})

describe('find motions', () => {
  it('f finds char forward', () => {
    const s = createState('hello')
    expect(m.f(s, 'l')).toEqual({ line: 0, col: 2 })
  })

  it('f returns null if not found', () => {
    const s = createState('hello')
    expect(m.f(s, 'z')).toBeNull()
  })

  it('t stops before char', () => {
    const s = createState('hello')
    expect(m.t(s, 'l')).toEqual({ line: 0, col: 1 })
  })

  it('F finds char backward', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 4 }
    expect(m.F(s, 'l')).toEqual({ line: 0, col: 3 })
  })

  it('; repeats last find', () => {
    const s = createState('abcabc')
    s.cursor = { line: 0, col: 3 } // cursor past first 'c', simulate already found
    const pos = m.repeatFind(s, { char: 'c', direction: 'forward', type: 'f' })
    expect(pos).toEqual({ line: 0, col: 5 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run`
Expected: FAIL — module not found

- [ ] **Step 3: Implement vim-motions.ts**

`src/engine/vim-motions.ts` — implement all motion functions as pure functions taking `VimState` and returning `CursorPos | null`. Key functions:

- `h`, `j`, `k`, `l` — basic directional
- `w`, `W`, `b`, `B`, `e`, `E` — word motions (use regex `\w+` for word boundaries)
- `zero`, `caret`, `dollar` — line position
- `f`, `F`, `t`, `T` — char find within line
- `repeatFind`, `reverseFind` — for `;` and `,`
- `gg`, `G` — file start/end

Each function is a pure function: `(state: VimState, ...args) => CursorPos | null`

When implementing word motions, a "word" is a sequence of `\w` characters or a sequence of non-word non-space characters. Spaces are skipped.

- [ ] **Step 4: Run tests, iterate until all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/vim-motions.ts vimdao-web/src/engine/__tests__/vim-motions.test.ts
git commit -m "feat: add VimEngine motions (hjkl, word, line, find)"
```

---

### Task 4: VimEngine Operations

Delete, change, yank, put, undo, and the critical dot command.

**Files:**
- Create: `vimdao-web/src/engine/vim-operations.ts`
- Create: `vimdao-web/src/engine/__tests__/vim-operations.test.ts`

- [ ] **Step 1: Write failing tests**

`src/engine/__tests__/vim-operations.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import * as ops from '../vim-operations'

describe('x - delete char', () => {
  it('deletes char under cursor', () => {
    const s = createState('hello')
    const result = ops.deleteChar(s)
    expect(getText(result)).toBe('ello')
  })

  it('does nothing on empty line', () => {
    const s = createState('')
    const result = ops.deleteChar(s)
    expect(getText(result)).toBe('')
  })
})

describe('dd - delete line', () => {
  it('deletes current line', () => {
    const s = createState('aaa\nbbb\nccc')
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('bbb\nccc')
    expect(result.register).toBe('aaa\n')
  })

  it('leaves at least one empty line', () => {
    const s = createState('only')
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('')
    expect(result.lines).toEqual([''])
  })
})

describe('p - put', () => {
  it('puts register content after cursor', () => {
    const s = createState('ab')
    s.register = 'XY'
    s.cursor = { line: 0, col: 0 }
    const result = ops.putAfter(s)
    expect(getText(result)).toBe('aXYb')
  })

  it('puts line register below current line', () => {
    const s = createState('aaa\nbbb')
    s.register = 'new\n'
    const result = ops.putAfter(s)
    expect(getText(result)).toBe('aaa\nnew\nbbb')
  })
})

describe('u - undo', () => {
  it('restores previous state', () => {
    const s = createState('hello')
    // Push a snapshot, then modify
    const modified = ops.deleteChar({ ...s, undoStack: [{ lines: ['hello'], cursor: { line: 0, col: 0 } }] })
    const undone = ops.undo(modified)
    expect(getText(undone)).toBe('hello')
  })
})

describe('operator + motion', () => {
  it('dw deletes a word', () => {
    const s = createState('hello world')
    const result = ops.deleteToPos(s, { line: 0, col: 6 })
    expect(getText(result)).toBe('world')
    expect(result.register).toBe('hello ')
  })

  it('cw deletes word and enters insert mode', () => {
    const s = createState('hello world')
    const result = ops.changeToPos(s, { line: 0, col: 6 })
    expect(getText(result)).toBe('world')
    expect(result.mode).toBe('insert')
  })

  it('yw yanks without deleting', () => {
    const s = createState('hello world')
    const result = ops.yankToPos(s, { line: 0, col: 6 })
    expect(getText(result)).toBe('hello world') // unchanged
    expect(result.register).toBe('hello ')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement vim-operations.ts**

Key design: each operation takes `VimState` and returns a new `VimState` (immutable pattern). Operations that modify text must push to `undoStack` first and record the change for dot repeat.

Functions:
- `deleteChar(state)` — `x`
- `deleteCharBefore(state)` — `X`
- `deleteLine(state)` — `dd`
- `deleteToEnd(state)` — `D`
- `changeLine(state)` — `cc`
- `changeToEnd(state)` — `C`
- `yankLine(state)` — `yy`
- `putAfter(state)` — `p`
- `putBefore(state)` — `P`
- `undo(state)` — `u`
- `deleteToPos(state, target)` — `d{motion}` helper
- `changeToPos(state, target)` — `c{motion}` helper
- `yankToPos(state, target)` — `y{motion}` helper

- [ ] **Step 4: Run tests, iterate**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/vim-operations.ts vimdao-web/src/engine/__tests__/vim-operations.test.ts
git commit -m "feat: add VimEngine operations (delete, change, yank, put, undo)"
```

---

### Task 5: VimEngine Main Dispatcher

The `processKey` function that routes keystrokes to motions/operations, handles mode transitions, insert mode text entry, operator-pending state, and dot command.

**Files:**
- Create: `vimdao-web/src/engine/vim-engine.ts`
- Create: `vimdao-web/src/engine/__tests__/vim-engine.test.ts`

- [ ] **Step 1: Write failing tests for the engine dispatcher**

`src/engine/__tests__/vim-engine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { processKey } from '../vim-engine'

function applyKeys(text: string, keys: string[]): string {
  let state = createState(text)
  for (const key of keys) {
    state = processKey(state, key).state
  }
  return getText(state)
}

describe('normal mode motions', () => {
  it('h moves left', () => {
    let s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    s = processKey(s, 'h').state
    expect(s.cursor.col).toBe(1)
  })

  it('w moves to next word', () => {
    let s = createState('hello world')
    s = processKey(s, 'w').state
    expect(s.cursor.col).toBe(6)
  })
})

describe('insert mode', () => {
  it('i enters insert mode', () => {
    let s = createState('hello')
    s = processKey(s, 'i').state
    expect(s.mode).toBe('insert')
  })

  it('typing in insert mode adds text', () => {
    const result = applyKeys('', ['i', 'h', 'i', 'Escape'])
    expect(result).toBe('hi')
  })

  it('A appends at end of line', () => {
    const result = applyKeys('hello', ['A', '!', 'Escape'])
    expect(result).toBe('hello!')
  })

  it('o opens new line below', () => {
    const result = applyKeys('aaa', ['o', 'b', 'b', 'b', 'Escape'])
    expect(result).toBe('aaa\nbbb')
  })
})

describe('editing', () => {
  it('x deletes char', () => {
    expect(applyKeys('hello', ['x'])).toBe('ello')
  })

  it('dd deletes line', () => {
    expect(applyKeys('aaa\nbbb', ['d', 'd'])).toBe('bbb')
  })

  it('dw deletes word', () => {
    expect(applyKeys('hello world', ['d', 'w'])).toBe('world')
  })

  it('p puts yanked text', () => {
    expect(applyKeys('hello world', ['d', 'w', 'p'])).toBe('whello orld')
  })
})

describe('undo', () => {
  it('u undoes last change', () => {
    expect(applyKeys('hello', ['x', 'u'])).toBe('hello')
  })
})

describe('dot command', () => {
  it('. repeats x', () => {
    expect(applyKeys('hello', ['x', '.'])).toBe('llo')
  })

  it('. repeats dd', () => {
    expect(applyKeys('a\nb\nc', ['d', 'd', '.'])).toBe('c')
  })

  it('. repeats dw', () => {
    expect(applyKeys('one two three', ['d', 'w', '.'])).toBe('three')
  })
})

// These are the actual Practical Vim Tip 1 challenges:
describe('Practical Vim Tip 1', () => {
  it('x... deletes first 3 chars', () => {
    expect(applyKeys('Line one\nLine two\nLine three\nLine four',
      ['x', '.', '.']
    )).toBe(' one\nLine two\nLine three\nLine four')
  })

  it('dd. deletes first 2 lines', () => {
    expect(applyKeys('Line one\nLine two\nLine three\nLine four',
      ['d', 'd', '.']
    )).toBe('Line three\nLine four')
  })
})

describe('Practical Vim Tip 2', () => {
  it('A;<Esc>j.j. appends semicolons', () => {
    const result = applyKeys(
      "var foo = 1\nvar bar = 'a'\nvar foobar = foo + bar",
      ['A', ';', 'Escape', 'j', '.', 'j', '.']
    )
    expect(result).toBe("var foo = 1;\nvar bar = 'a';\nvar foobar = foo + bar;")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement vim-engine.ts**

`src/engine/vim-engine.ts` — the main `processKey(state, key)` function:

1. If `mode === 'insert'`: handle typed chars, Escape, Backspace
2. If `pendingOperator` is set (operator-pending): next key is a motion → execute operator+motion
3. Normal mode: dispatch to motion or start operator-pending
4. After any change: record for dot command, push undo

Key detail for dot command: when recording a change, store the full key sequence. When `.` is pressed, replay that sequence through `processKey`.

- [ ] **Step 4: Run tests, iterate until Tip 1 and Tip 2 pass**

This is the critical milestone — if these pass, the engine handles the core Vim editing model correctly.

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/engine/vim-engine.ts vimdao-web/src/engine/__tests__/vim-engine.test.ts
git commit -m "feat: add VimEngine dispatcher with insert mode, operators, undo, dot command"
```

---

### Task 6: TypeScript Types for JSON Data

Define the types matching the challenge JSON format produced by vimdao-extract.

**Files:**
- Create: `vimdao-web/src/types/index.ts`

- [ ] **Step 1: Define types**

```typescript
// src/types/index.ts

export interface Challenge {
  id: string
  source: {
    book: string
    chapter: number
    section: string
    tip_number: number
  }
  title_zh: string
  title_en: string
  description_zh: string
  description_en: string
  category: string
  difficulty: number
  initial_text: string
  expected_text: string
  cursor_start: { line: number; col: number }
  hint_commands: string[]
  hint_text: string
  tags: string[]
  concepts_zh: string[]
  needs_translation?: boolean
}

export interface ChallengeSet {
  source_book: string
  generated_at: string
  challenges: Challenge[]
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd vimdao-web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add vimdao-web/src/types/
git commit -m "feat: add TypeScript types for challenge JSON data"
```

---

### Task 7: VimEditor React Component

The visual editor component with cursor, line numbers, status bar, and key log.

**Files:**
- Create: `vimdao-web/src/hooks/useVimEditor.ts`
- Create: `vimdao-web/src/components/VimEditor/VimEditor.tsx`
- Create: `vimdao-web/src/components/VimEditor/StatusBar.tsx`
- Create: `vimdao-web/src/components/VimEditor/KeyLog.tsx`

- [ ] **Step 1: Create useVimEditor hook**

`src/hooks/useVimEditor.ts`:
```typescript
import { useState, useCallback } from 'react'
import type { VimState } from '../engine/vim-types'
import { createState, getText } from '../engine/vim-state'
import { processKey } from '../engine/vim-engine'

export function useVimEditor(initialText: string, cursorStart?: { line: number; col: number }) {
  const [state, setState] = useState<VimState>(() => createState(initialText, cursorStart))

  const handleKey = useCallback((key: string) => {
    setState(prev => {
      const result = processKey(prev, key)
      return result.state
    })
  }, [])

  const reset = useCallback((text: string, cursor?: { line: number; col: number }) => {
    setState(createState(text, cursor))
  }, [])

  return {
    state,
    text: getText(state),
    handleKey,
    reset,
  }
}
```

- [ ] **Step 2: Create VimEditor component**

`src/components/VimEditor/VimEditor.tsx`:

The component renders:
- A `div` with `tabIndex={0}` and `onKeyDown` handler
- Line numbers in a left gutter
- Text lines with a block cursor (normal) or line cursor (insert)
- StatusBar at the bottom
- KeyLog showing recent keystrokes

Key design:
- All keyboard events captured on the editor div via `onKeyDown`
- Map browser key events to VimEngine keys (e.g., `event.key === 'Escape'` → `'Escape'`)
- Prevent default for all handled keys (no browser shortcuts interfering)
- Auto-focus on mount

- [ ] **Step 3: Create StatusBar component**

Shows: `-- INSERT --` or `NORMAL` | challenge name | `行 N, 列 N` | pending keys

- [ ] **Step 4: Create KeyLog component**

Shows the last ~20 keystrokes as badges: `d → w`, `x`, `.`

- [ ] **Step 5: Test manually**

Update `App.tsx` to render `<VimEditor initialText="hello world\nfoo bar" />` and verify:
- Typing `hjkl` moves cursor
- `i` enters insert mode, typing adds text, `Escape` returns to normal
- `x` deletes character
- `dd` deletes line

- [ ] **Step 6: Commit**

```bash
git add vimdao-web/src/hooks/ vimdao-web/src/components/VimEditor/
git commit -m "feat: add VimEditor component with cursor, status bar, key log"
```

---

### Task 8: ChallengeView and ChallengeList

Load challenges from JSON, display in VimEditor, verify result.

**Files:**
- Create: `vimdao-web/src/components/Challenge/ChallengeView.tsx`
- Create: `vimdao-web/src/components/Challenge/ChallengeList.tsx`
- Modify: `vimdao-web/src/App.tsx` — add routing

- [ ] **Step 1: Create ChallengeList page**

`src/components/Challenge/ChallengeList.tsx`:

- Fetches `practical-vim_challenges.json` on mount
- Displays challenge cards with title_zh, difficulty badge (入門/進階/精通), category
- Click navigates to `/challenge/:id`

- [ ] **Step 2: Create ChallengeView page**

`src/components/Challenge/ChallengeView.tsx`:

- Loads single challenge by ID from the fetched data
- Shows: title_zh, description_zh, hint_text, source info
- Renders VimEditor with `initial_text`
- "提交答案" button (or `:w` in the editor) compares `getText(state)` with `expected_text`
- Shows pass/fail result with keystroke count

- [ ] **Step 3: Add React Router**

Update `App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChallengeList />} />
        <Route path="/challenge/:id" element={<ChallengeView />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Test manually with Tip 1 challenges**

1. Open `/` — should see 69 challenges listed
2. Click on "pv-tip01-001" — should load VimEditor with "Line one\nLine two..."
3. Press `x`, `.`, `.` — text changes
4. Click submit — should show pass/fail

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/components/Challenge/ vimdao-web/src/App.tsx
git commit -m "feat: add ChallengeView and ChallengeList with routing"
```

---

### Task 9: End-to-End Verification

Verify the first few Practical Vim tips are fully playable.

**Files:**
- Create: `vimdao-web/src/engine/__tests__/practical-vim-tips.test.ts`

- [ ] **Step 1: Write E2E engine tests for Tips 1, 2, 5**

These tests simulate the exact keystroke sequences from the book and verify the final text matches `expected_text` from the challenge JSON.

```typescript
import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { processKey } from '../vim-engine'
import challenges from '../../../public/data/practical-vim_challenges.json'

function applyKeys(text: string, keys: string[]): string {
  let state = createState(text)
  for (const key of keys) {
    state = processKey(state, key).state
  }
  return getText(state)
}

describe('Practical Vim challenges - engine verification', () => {
  // Filter to just the first few tips we should be able to handle
  const testable = challenges.challenges.filter(c =>
    c.id.startsWith('pv-tip01') || c.id.startsWith('pv-tip02')
  )

  for (const challenge of testable) {
    it(`${challenge.id}: ${challenge.title_en}`, () => {
      // We can verify initial_text → expected_text mapping exists
      expect(challenge.initial_text).not.toBe(challenge.expected_text)
    })
  }

  // Specific keystroke verification for Tip 1 challenges
  it('pv-tip01-001: x... produces correct output', () => {
    const c = challenges.challenges.find(c => c.id === 'pv-tip01-001')!
    const result = applyKeys(c.initial_text, ['x', '.', '.'])
    expect(result).toBe(c.expected_text)
  })

  it('pv-tip01-002: dd. produces correct output', () => {
    const c = challenges.challenges.find(c => c.id === 'pv-tip01-002')!
    const result = applyKeys(c.initial_text, ['d', 'd', '.'])
    expect(result).toBe(c.expected_text)
  })

  it('pv-tip02-001: A;<Esc>j.j. produces correct output', () => {
    const c = challenges.challenges.find(c => c.id === 'pv-tip02-001')!
    const result = applyKeys(c.initial_text, ['A', ';', 'Escape', 'j', '.', 'j', '.'])
    expect(result).toBe(c.expected_text)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd vimdao-web && npm run test:run`
Expected: All Tip 1 and Tip 2 challenges PASS

- [ ] **Step 3: Fix any failing challenges, iterate**

- [ ] **Step 4: Commit**

```bash
git add vimdao-web/src/engine/__tests__/practical-vim-tips.test.ts
git commit -m "test: add E2E verification for Practical Vim Tips 1-2"
```

---

## Execution Dependencies

```
Task 1 (scaffold) → Task 2 (state) → Task 3 (motions) → Task 4 (operations) → Task 5 (engine)
                                                                                    ↓
Task 6 (types) ──────────────────────────────────────────────────→ Task 7 (VimEditor)
                                                                    ↓
                                                              Task 8 (Challenge UI)
                                                                    ↓
                                                              Task 9 (E2E tests)
```

Tasks 2 and 6 can run in parallel. Tasks 3, 4, 5 are sequential (each builds on prior). Task 7 requires 5+6. Task 8 requires 7. Task 9 requires 8.
