import type { VimState, CursorPos, FindParams } from './vim-types'
import { currentLine } from './vim-state'

// Character classification for word motions
type CharClass = 'word' | 'symbol' | 'space'

interface ScanEntry {
  line: number
  col: number
  ch: string
}

function charClass(ch: string): CharClass {
  if (ch === '' || /\s/.test(ch)) return 'space'
  if (/\w/.test(ch)) return 'word'
  return 'symbol'
}

function lineMaxCol(state: VimState, lineIdx: number): number {
  const lineStr = state.lines[lineIdx]
  const len = lineStr !== undefined ? lineStr.length : 0
  if (len === 0) return 0
  return state.mode === 'insert' ? len : len - 1
}

function getEntry(chars: ScanEntry[], idx: number): ScanEntry | undefined {
  return chars[idx]
}

// --- Basic motions (hjkl) ---

export function h(state: VimState): CursorPos {
  return {
    line: state.cursor.line,
    col: Math.max(0, state.cursor.col - 1),
  }
}

export function j(state: VimState): CursorPos {
  const newLine = Math.min(state.cursor.line + 1, state.lines.length - 1)
  return {
    line: newLine,
    col: Math.min(state.cursor.col, lineMaxCol(state, newLine)),
  }
}

export function k(state: VimState): CursorPos {
  const newLine = Math.max(0, state.cursor.line - 1)
  return {
    line: newLine,
    col: Math.min(state.cursor.col, lineMaxCol(state, newLine)),
  }
}

export function l(state: VimState): CursorPos {
  return {
    line: state.cursor.line,
    col: Math.min(state.cursor.col + 1, lineMaxCol(state, state.cursor.line)),
  }
}

// --- Word motions ---

// Flatten all lines into a single stream of (line, col) positions
// for forward scanning from a given position.
function forwardScan(
  state: VimState,
  startLine: number,
  startCol: number,
): ScanEntry[] {
  const result: ScanEntry[] = []
  for (let ln = startLine; ln < state.lines.length; ln++) {
    const lineStr = state.lines[ln]
    if (lineStr === undefined) continue
    const sc = ln === startLine ? startCol : 0
    if (lineStr.length === 0 && ln !== startLine) {
      // represent empty line as a special entry
      result.push({ line: ln, col: 0, ch: '\n' })
      continue
    }
    for (let c = sc; c < lineStr.length; c++) {
      const ch = lineStr[c]
      if (ch !== undefined) {
        result.push({ line: ln, col: c, ch })
      }
    }
    // Add a newline marker between lines (not after the last line)
    if (ln < state.lines.length - 1) {
      result.push({ line: ln, col: lineStr.length, ch: '\n' })
    }
  }
  return result
}

export function w(state: VimState): CursorPos {
  const { line, col } = state.cursor
  const chars = forwardScan(state, line, col)
  const first = getEntry(chars, 0)

  if (chars.length <= 1 || !first) {
    return { line, col }
  }

  // Start from position 1 (skip cursor position)
  let i = 1
  const startClass = charClass(first.ch)

  // Phase 1: Skip rest of current word (same char class)
  if (startClass !== 'space') {
    let entry = getEntry(chars, i)
    while (i < chars.length && entry && entry.ch !== '\n' && charClass(entry.ch) === startClass) {
      i++
      entry = getEntry(chars, i)
    }
  }

  // Phase 2: Skip whitespace/newlines
  let entry = getEntry(chars, i)
  while (i < chars.length && entry && (entry.ch === '\n' || charClass(entry.ch) === 'space')) {
    const next = getEntry(chars, i + 1)
    // An empty line is a word boundary
    if (entry.ch === '\n' && next && next.ch === '\n') {
      return { line: next.line, col: 0 }
    }
    if (entry.ch === '\n' && next && next.line !== entry.line) {
      const nextLineStr = state.lines[next.line]
      if (nextLineStr !== undefined && nextLineStr.length === 0) {
        return { line: next.line, col: 0 }
      }
    }
    i++
    entry = getEntry(chars, i)
  }

  if (i >= chars.length || !entry) {
    return { line, col }
  }

  return { line: entry.line, col: entry.col }
}

export function W(state: VimState): CursorPos {
  const { line, col } = state.cursor
  const chars = forwardScan(state, line, col)
  const first = getEntry(chars, 0)

  if (chars.length <= 1 || !first) {
    return { line, col }
  }

  let i = 1

  // Phase 1: skip non-space chars (current WORD)
  if (charClass(first.ch) !== 'space' && first.ch !== '\n') {
    let entry = getEntry(chars, i)
    while (i < chars.length && entry && entry.ch !== '\n' && charClass(entry.ch) !== 'space') {
      i++
      entry = getEntry(chars, i)
    }
  }

  // Phase 2: skip whitespace/newlines
  let entry = getEntry(chars, i)
  while (i < chars.length && entry && (entry.ch === '\n' || charClass(entry.ch) === 'space')) {
    const next = getEntry(chars, i + 1)
    if (entry.ch === '\n' && next) {
      const nextLineStr = state.lines[next.line]
      if (nextLineStr !== undefined && nextLineStr.length === 0) {
        return { line: next.line, col: 0 }
      }
    }
    i++
    entry = getEntry(chars, i)
  }

  if (i >= chars.length || !entry) {
    return { line, col }
  }

  return { line: entry.line, col: entry.col }
}

function backwardScan(
  state: VimState,
  startLine: number,
  startCol: number,
): ScanEntry[] {
  const result: ScanEntry[] = []
  for (let ln = startLine; ln >= 0; ln--) {
    const lineStr = state.lines[ln]
    if (lineStr === undefined) continue
    const sc = ln === startLine ? startCol : lineStr.length - 1
    if (lineStr.length === 0) {
      result.push({ line: ln, col: 0, ch: '\n' })
      continue
    }
    for (let c = sc; c >= 0; c--) {
      const ch = lineStr[c]
      if (ch !== undefined) {
        result.push({ line: ln, col: c, ch })
      }
    }
    // Add newline marker between lines
    if (ln > 0) {
      result.push({ line: ln, col: -1, ch: '\n' })
    }
  }
  return result
}

export function b(state: VimState): CursorPos {
  const chars = backwardScan(state, state.cursor.line, state.cursor.col)

  if (chars.length <= 1) {
    return { line: 0, col: 0 }
  }

  let i = 1

  // Phase 1: skip whitespace/newlines
  let entry = getEntry(chars, i)
  while (i < chars.length && entry && (entry.ch === '\n' || charClass(entry.ch) === 'space')) {
    i++
    entry = getEntry(chars, i)
  }

  if (i >= chars.length || !entry) {
    return { line: 0, col: 0 }
  }

  // Phase 2: skip same char class (the word we landed in)
  const wordClass = charClass(entry.ch)
  let next = getEntry(chars, i + 1)
  while (i + 1 < chars.length && next && next.ch !== '\n' && charClass(next.ch) === wordClass) {
    i++
    next = getEntry(chars, i + 1)
  }

  const result = getEntry(chars, i)
  if (!result) return { line: 0, col: 0 }
  return { line: result.line, col: result.col }
}

export function B(state: VimState): CursorPos {
  const chars = backwardScan(state, state.cursor.line, state.cursor.col)

  if (chars.length <= 1) {
    return { line: 0, col: 0 }
  }

  let i = 1

  // Phase 1: skip whitespace/newlines
  let entry = getEntry(chars, i)
  while (i < chars.length && entry && (entry.ch === '\n' || charClass(entry.ch) === 'space')) {
    i++
    entry = getEntry(chars, i)
  }

  if (i >= chars.length || !entry) {
    return { line: 0, col: 0 }
  }

  // Phase 2: skip non-space chars (WORD)
  let next = getEntry(chars, i + 1)
  while (i + 1 < chars.length && next && next.ch !== '\n' && charClass(next.ch) !== 'space') {
    i++
    next = getEntry(chars, i + 1)
  }

  const result = getEntry(chars, i)
  if (!result) return { line: 0, col: 0 }
  return { line: result.line, col: result.col }
}

export function e(state: VimState): CursorPos {
  const { line, col } = state.cursor
  const chars = forwardScan(state, line, col)

  if (chars.length <= 1) {
    return { line, col }
  }

  let i = 1

  // Phase 1: skip whitespace/newlines
  let entry = getEntry(chars, i)
  while (i < chars.length && entry && (entry.ch === '\n' || charClass(entry.ch) === 'space')) {
    i++
    entry = getEntry(chars, i)
  }

  if (i >= chars.length || !entry) {
    return { line, col }
  }

  // Phase 2: advance through same char class to find end
  const wordClass = charClass(entry.ch)
  let next = getEntry(chars, i + 1)
  while (i + 1 < chars.length && next && next.ch !== '\n' && charClass(next.ch) === wordClass) {
    i++
    next = getEntry(chars, i + 1)
  }

  const result = getEntry(chars, i)
  if (!result) return { line, col }
  return { line: result.line, col: result.col }
}

export function E(state: VimState): CursorPos {
  const { line, col } = state.cursor
  const chars = forwardScan(state, line, col)

  if (chars.length <= 1) {
    return { line, col }
  }

  let i = 1

  // Phase 1: skip whitespace/newlines
  let entry = getEntry(chars, i)
  while (i < chars.length && entry && (entry.ch === '\n' || charClass(entry.ch) === 'space')) {
    i++
    entry = getEntry(chars, i)
  }

  if (i >= chars.length || !entry) {
    return { line, col }
  }

  // Phase 2: advance through non-space chars to find WORD end
  let next = getEntry(chars, i + 1)
  while (i + 1 < chars.length && next && next.ch !== '\n' && charClass(next.ch) !== 'space') {
    i++
    next = getEntry(chars, i + 1)
  }

  const result = getEntry(chars, i)
  if (!result) return { line, col }
  return { line: result.line, col: result.col }
}

// --- Line position motions ---

export function zero(state: VimState): CursorPos {
  return { line: state.cursor.line, col: 0 }
}

export function caret(state: VimState): CursorPos {
  const line = currentLine(state)
  const match = line.match(/\S/)
  if (!match || match.index === undefined) {
    // All whitespace or empty line - go to col 0
    return { line: state.cursor.line, col: 0 }
  }
  return { line: state.cursor.line, col: match.index }
}

export function dollar(state: VimState): CursorPos {
  const line = currentLine(state)
  return {
    line: state.cursor.line,
    col: Math.max(0, line.length - 1),
  }
}

// --- Find motions ---

export function f(state: VimState, char: string): CursorPos | null {
  const line = currentLine(state)
  const idx = line.indexOf(char, state.cursor.col + 1)
  if (idx === -1) return null
  return { line: state.cursor.line, col: idx }
}

export function F(state: VimState, char: string): CursorPos | null {
  const line = currentLine(state)
  const idx = line.lastIndexOf(char, state.cursor.col - 1)
  if (idx === -1) return null
  return { line: state.cursor.line, col: idx }
}

export function t(state: VimState, char: string): CursorPos | null {
  const pos = f(state, char)
  if (pos === null) return null
  return { line: pos.line, col: pos.col - 1 }
}

export function T(state: VimState, char: string): CursorPos | null {
  const pos = F(state, char)
  if (pos === null) return null
  return { line: pos.line, col: pos.col + 1 }
}

export function repeatFind(state: VimState, params: FindParams): CursorPos | null {
  if (params.direction === 'forward') {
    const pos = f(state, params.char)
    if (pos === null) return null
    if (params.type === 't') {
      return { line: pos.line, col: pos.col - 1 }
    }
    return pos
  } else {
    const pos = F(state, params.char)
    if (pos === null) return null
    if (params.type === 't') {
      return { line: pos.line, col: pos.col + 1 }
    }
    return pos
  }
}

export function reverseFind(state: VimState, params: FindParams): CursorPos | null {
  const reversed: FindParams = {
    ...params,
    direction: params.direction === 'forward' ? 'backward' : 'forward',
  }
  return repeatFind(state, reversed)
}

// --- Paragraph motions ---

export function paragraphBackward(state: VimState): CursorPos {
  // Vim { motion: move to the previous blank line.
  // If on non-blank lines, skip upward until we hit a blank line.
  // If on blank lines, skip blanks then skip non-blanks to find the prev blank.
  let line = state.cursor.line - 1
  const curLineContent = state.lines[state.cursor.line]?.trim() ?? ''

  if (curLineContent === '') {
    // Currently on a blank line — skip blanks first, then non-blanks
    while (line >= 0 && (state.lines[line]?.trim() ?? '') === '') {
      line--
    }
    while (line >= 0 && (state.lines[line]?.trim() ?? '') !== '') {
      line--
    }
  } else {
    // Currently on a non-blank line — find previous blank line
    while (line >= 0 && (state.lines[line]?.trim() ?? '') !== '') {
      line--
    }
  }
  return { line: Math.max(0, line), col: 0 }
}

export function paragraphForward(state: VimState): CursorPos {
  // Vim } motion: move to the line after the next block of text.
  // If on non-blank lines, skip until we hit a blank line.
  // If on blank lines, skip blanks then skip non-blanks to find the next blank.
  let line = state.cursor.line + 1
  const curLineContent = state.lines[state.cursor.line]?.trim() ?? ''

  if (curLineContent === '') {
    // Currently on a blank line — skip blanks first, then non-blanks
    while (line < state.lines.length && (state.lines[line]?.trim() ?? '') === '') {
      line++
    }
    while (line < state.lines.length && (state.lines[line]?.trim() ?? '') !== '') {
      line++
    }
  } else {
    // Currently on a non-blank line — find next blank line
    while (line < state.lines.length && (state.lines[line]?.trim() ?? '') !== '') {
      line++
    }
  }
  return { line: Math.min(state.lines.length - 1, line), col: 0 }
}

// --- File position motions ---

export function gg(_state: VimState): CursorPos {
  return { line: 0, col: 0 }
}

export function G(state: VimState): CursorPos {
  return { line: state.lines.length - 1, col: 0 }
}
