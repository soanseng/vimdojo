import type { VimState, CursorPos } from './vim-types'

const PAIRS: Record<string, [string, string]> = {
  '(': ['(', ')'], ')': ['(', ')'], 'b': ['(', ')'],
  '[': ['[', ']'], ']': ['[', ']'],
  '{': ['{', '}'], '}': ['{', '}'], 'B': ['{', '}'],
  '<': ['<', '>'], '>': ['<', '>'],
  '"': ['"', '"'],
  "'": ["'", "'"],
  '`': ['`', '`'],
}

export function addSurround(
  state: VimState,
  range: { start: CursorPos; end: CursorPos },
  char: string,
): VimState {
  const [open, close] = PAIRS[char] ?? [char, char]
  const line = state.lines[range.start.line] ?? ''
  // For same-line ranges only (MVP)
  const before = line.slice(0, range.start.col)
  const inner = line.slice(range.start.col, range.end.col)
  const after = line.slice(range.end.col)
  const newLine = before + open + inner + close + after
  const newLines = [...state.lines]
  newLines[range.start.line] = newLine
  return { ...state, lines: newLines }
}

export function deleteSurround(state: VimState, char: string): VimState | null {
  const [open, close] = PAIRS[char] ?? [char, char]
  const line = state.lines[state.cursor.line] ?? ''
  // Find the matching pair on current line containing cursor
  let openIdx = -1
  let closeIdx = -1
  // Search backward for open
  for (let i = state.cursor.col; i >= 0; i--) {
    if (line[i] === open) { openIdx = i; break }
  }
  if (openIdx === -1) return null
  // Search forward for close
  for (let i = Math.max(state.cursor.col, openIdx + 1); i < line.length; i++) {
    if (line[i] === close) { closeIdx = i; break }
  }
  if (closeIdx === -1) return null
  // Remove both chars
  const newLine = line.slice(0, openIdx) + line.slice(openIdx + 1, closeIdx) + line.slice(closeIdx + 1)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = newLine
  return { ...state, lines: newLines, cursor: { ...state.cursor, col: Math.max(0, openIdx) } }
}

export function replaceSurround(state: VimState, oldChar: string, newChar: string): VimState | null {
  const [oldOpen, oldClose] = PAIRS[oldChar] ?? [oldChar, oldChar]
  const [newOpen, newClose] = PAIRS[newChar] ?? [newChar, newChar]
  const line = state.lines[state.cursor.line] ?? ''
  let openIdx = -1
  let closeIdx = -1
  for (let i = state.cursor.col; i >= 0; i--) {
    if (line[i] === oldOpen) { openIdx = i; break }
  }
  if (openIdx === -1) return null
  for (let i = Math.max(state.cursor.col, openIdx + 1); i < line.length; i++) {
    if (line[i] === oldClose) { closeIdx = i; break }
  }
  if (closeIdx === -1) return null
  const chars = [...line]
  chars[openIdx] = newOpen
  chars[closeIdx] = newClose
  const newLines = [...state.lines]
  newLines[state.cursor.line] = chars.join('')
  return { ...state, lines: newLines }
}
