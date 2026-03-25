import type { VimState, CursorPos } from './vim-types'
import { clampCursor, restoreSnapshot } from './vim-state'

function withUndo(state: VimState): VimState {
  return {
    ...state,
    undoStack: [
      ...state.undoStack,
      { lines: state.lines.map(l => l), cursor: { ...state.cursor } },
    ],
  }
}

function firstNonSpace(line: string): number {
  const match = line.match(/\S/)
  return match ? match.index! : 0
}

function lineAt(state: VimState, idx: number): string {
  return state.lines[idx] ?? ''
}

// --- Single char operations ---

export function deleteChar(state: VimState): VimState {
  const line = lineAt(state, state.cursor.line)
  if (line.length === 0) return state

  const col = state.cursor.col
  const deleted = line[col] ?? ''
  const newLine = line.slice(0, col) + line.slice(col + 1)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = newLine

  const s = withUndo(state)
  return clampCursor({
    ...s,
    lines: newLines,
    register: deleted,
  })
}

export function deleteCharBefore(state: VimState): VimState {
  const col = state.cursor.col
  if (col === 0) return state

  const line = lineAt(state, state.cursor.line)
  const deleted = line[col - 1] ?? ''
  const newLine = line.slice(0, col - 1) + line.slice(col)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = newLine

  const s = withUndo(state)
  return clampCursor({
    ...s,
    lines: newLines,
    cursor: { line: state.cursor.line, col: col - 1 },
    register: deleted,
  })
}

// --- Line operations ---

export function deleteLine(state: VimState): VimState {
  const lineIdx = state.cursor.line
  const deleted = lineAt(state, lineIdx)
  const s = withUndo(state)

  if (state.lines.length === 1) {
    return {
      ...s,
      lines: [''],
      cursor: { line: 0, col: 0 },
      register: deleted + '\n',
    }
  }

  const newLines = [...state.lines]
  newLines.splice(lineIdx, 1)

  const newLineIdx = Math.min(lineIdx, newLines.length - 1)
  const newCol = firstNonSpace(newLines[newLineIdx] ?? '')

  return {
    ...s,
    lines: newLines,
    cursor: { line: newLineIdx, col: newCol },
    register: deleted + '\n',
  }
}

export function deleteToEnd(state: VimState): VimState {
  const line = lineAt(state, state.cursor.line)
  const col = state.cursor.col
  if (line.length === 0) return state

  const deleted = line.slice(col)
  const newLine = line.slice(0, col)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = newLine

  const s = withUndo(state)
  return clampCursor({
    ...s,
    lines: newLines,
    register: deleted,
  })
}

export function changeLine(state: VimState): VimState {
  const line = lineAt(state, state.cursor.line)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = ''

  const s = withUndo(state)
  return {
    ...s,
    lines: newLines,
    cursor: { line: state.cursor.line, col: 0 },
    mode: 'insert',
    register: line,
  }
}

export function changeToEnd(state: VimState): VimState {
  const line = lineAt(state, state.cursor.line)
  const col = state.cursor.col
  const deleted = line.slice(col)
  const newLine = line.slice(0, col)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = newLine

  if (deleted.length > 0) {
    const s = withUndo(state)
    return {
      ...s,
      lines: newLines,
      cursor: { line: state.cursor.line, col },
      mode: 'insert',
      register: deleted,
    }
  }

  return {
    ...state,
    mode: 'insert',
  }
}

export function yankLine(state: VimState): VimState {
  const line = lineAt(state, state.cursor.line)
  return {
    ...state,
    register: line + '\n',
  }
}

// --- Put operations ---

export function putAfter(state: VimState): VimState {
  if (state.register === '') return state

  const s = withUndo(state)

  if (state.register.endsWith('\n')) {
    const content = state.register.slice(0, -1)
    const newLines = [...state.lines]
    newLines.splice(state.cursor.line + 1, 0, content)
    return {
      ...s,
      lines: newLines,
      cursor: { line: state.cursor.line + 1, col: firstNonSpace(content) },
    }
  }

  const line = lineAt(state, state.cursor.line)
  const col = state.cursor.col
  const newLine = line.slice(0, col + 1) + state.register + line.slice(col + 1)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = newLine

  return clampCursor({
    ...s,
    lines: newLines,
    cursor: { line: state.cursor.line, col: col + state.register.length },
  })
}

export function putBefore(state: VimState): VimState {
  if (state.register === '') return state

  const s = withUndo(state)

  if (state.register.endsWith('\n')) {
    const content = state.register.slice(0, -1)
    const newLines = [...state.lines]
    newLines.splice(state.cursor.line, 0, content)
    return {
      ...s,
      lines: newLines,
      cursor: { line: state.cursor.line, col: firstNonSpace(content) },
    }
  }

  const line = lineAt(state, state.cursor.line)
  const col = state.cursor.col
  const newLine = line.slice(0, col) + state.register + line.slice(col)
  const newLines = [...state.lines]
  newLines[state.cursor.line] = newLine

  return clampCursor({
    ...s,
    lines: newLines,
    cursor: { line: state.cursor.line, col: col + state.register.length - 1 },
  })
}

// --- Undo ---

export function undo(state: VimState): VimState {
  if (state.undoStack.length === 0) return state

  const stack = [...state.undoStack]
  const snap = stack.pop()!
  return restoreSnapshot({ ...state, undoStack: stack }, snap)
}

// --- Operator+motion helpers ---

function orderPositions(
  a: CursorPos,
  b: CursorPos,
): { start: CursorPos; end: CursorPos } {
  if (a.line < b.line || (a.line === b.line && a.col <= b.col)) {
    return { start: a, end: b }
  }
  return { start: b, end: a }
}

function lineFrom(lines: string[], idx: number): string {
  return lines[idx] ?? ''
}

function extractText(lines: string[], start: CursorPos, end: CursorPos): string {
  if (start.line === end.line) {
    return lineFrom(lines, start.line).slice(start.col, end.col)
  }

  const parts: string[] = []
  parts.push(lineFrom(lines, start.line).slice(start.col))
  for (let i = start.line + 1; i < end.line; i++) {
    parts.push(lineFrom(lines, i))
  }
  parts.push(lineFrom(lines, end.line).slice(0, end.col))
  return parts.join('\n')
}

function deleteRange(
  lines: string[],
  start: CursorPos,
  end: CursorPos,
): string[] {
  if (start.line === end.line) {
    const line = lineFrom(lines, start.line)
    const newLine = line.slice(0, start.col) + line.slice(end.col)
    const result = [...lines]
    result[start.line] = newLine
    return result
  }

  const firstPart = lineFrom(lines, start.line).slice(0, start.col)
  const lastPart = lineFrom(lines, end.line).slice(end.col)
  const merged = firstPart + lastPart

  const result = [...lines]
  result.splice(start.line, end.line - start.line + 1, merged)
  return result
}

export function deleteToPos(state: VimState, target: CursorPos): VimState {
  const { start, end } = orderPositions(state.cursor, target)

  if (start.line === end.line && start.col === end.col) return state

  const text = extractText(state.lines, start, end)
  const newLines = deleteRange(state.lines, start, end)

  const s = withUndo(state)
  return clampCursor({
    ...s,
    lines: newLines,
    cursor: { line: start.line, col: start.col },
    register: text,
  })
}

export function changeToPos(state: VimState, target: CursorPos): VimState {
  const { start, end } = orderPositions(state.cursor, target)

  if (start.line === end.line && start.col === end.col) {
    return { ...state, mode: 'insert' }
  }

  const text = extractText(state.lines, start, end)
  const newLines = deleteRange(state.lines, start, end)

  const s = withUndo(state)
  return {
    ...s,
    lines: newLines,
    cursor: { line: start.line, col: start.col },
    mode: 'insert',
    register: text,
  }
}

export function yankToPos(state: VimState, target: CursorPos): VimState {
  const { start, end } = orderPositions(state.cursor, target)

  if (start.line === end.line && start.col === end.col) return state

  const text = extractText(state.lines, start, end)
  return {
    ...state,
    register: text,
  }
}
