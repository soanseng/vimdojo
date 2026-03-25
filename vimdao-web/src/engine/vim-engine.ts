import type { VimState, KeyResult, CursorPos, FindParams } from './vim-types'
import { clampCursor } from './vim-state'
import * as motions from './vim-motions'
import * as ops from './vim-operations'

// ---------------------------------------------------------------------------
// Insert-mode key buffer — tracks keys typed during an insert session
// so that the dot command can replay them.
// ---------------------------------------------------------------------------

/** Module-level buffer used while recording an insert sequence. */
let insertKeyBuf: string[] = []
let isRecordingInsert = false
let isDotReplaying = false

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function processKey(state: VimState, key: string): KeyResult {
  const s: VimState = { ...state, keyLog: [...state.keyLog, key] }

  switch (s.mode) {
    case 'insert':
      return handleInsertMode(s, key)
    case 'normal':
      return handleNormalMode(s, key)
    default:
      return { state: s, handled: false }
  }
}

// ---------------------------------------------------------------------------
// Insert mode
// ---------------------------------------------------------------------------

function handleInsertMode(state: VimState, key: string): KeyResult {
  // Track key for dot-command replay
  if (isRecordingInsert) {
    insertKeyBuf.push(key)
  }

  if (key === 'Escape') {
    // Move cursor back one (Vim behaviour) and clamp
    const newCol = Math.max(0, state.cursor.col - 1)
    let s: VimState = {
      ...state,
      mode: 'normal',
      cursor: { line: state.cursor.line, col: newCol },
    }
    s = clampCursor(s)

    // Record insert change for dot command
    if (isRecordingInsert) {
      s = {
        ...s,
        lastChange: { type: 'insert', keys: [...insertKeyBuf] },
      }
      isRecordingInsert = false
      insertKeyBuf = []
    }

    return { state: s, handled: true }
  }

  if (key === 'Backspace') {
    if (state.cursor.col === 0) {
      return { state, handled: true }
    }
    const line = state.lines[state.cursor.line] ?? ''
    const newLine = line.slice(0, state.cursor.col - 1) + line.slice(state.cursor.col)
    const newLines = [...state.lines]
    newLines[state.cursor.line] = newLine
    return {
      state: {
        ...state,
        lines: newLines,
        cursor: { line: state.cursor.line, col: state.cursor.col - 1 },
      },
      handled: true,
    }
  }

  if (key === 'Enter') {
    const line = state.lines[state.cursor.line] ?? ''
    const before = line.slice(0, state.cursor.col)
    const after = line.slice(state.cursor.col)
    const newLines = [...state.lines]
    newLines.splice(state.cursor.line, 1, before, after)
    return {
      state: {
        ...state,
        lines: newLines,
        cursor: { line: state.cursor.line + 1, col: 0 },
      },
      handled: true,
    }
  }

  // Regular character — insert at cursor
  if (key.length === 1) {
    const line = state.lines[state.cursor.line] ?? ''
    const newLine = line.slice(0, state.cursor.col) + key + line.slice(state.cursor.col)
    const newLines = [...state.lines]
    newLines[state.cursor.line] = newLine
    return {
      state: {
        ...state,
        lines: newLines,
        cursor: { line: state.cursor.line, col: state.cursor.col + 1 },
      },
      handled: true,
    }
  }

  return { state, handled: false }
}

// ---------------------------------------------------------------------------
// Normal mode
// ---------------------------------------------------------------------------

function handleNormalMode(state: VimState, key: string): KeyResult {
  // --- Pending 'g' prefix ---
  if (state.pendingKeys === 'g') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'g') {
      const pos = motions.gg(s)
      return { state: { ...s, cursor: pos }, handled: true }
    }
    // Unknown g-combo — ignore
    return { state: s, handled: false }
  }

  // --- Pending find (f/F/t/T waiting for char), possibly with operator ---
  if (state.pendingKeys === 'f' || state.pendingKeys === 'F' ||
      state.pendingKeys === 't' || state.pendingKeys === 'T') {
    if (state.pendingOperator !== null) {
      return handleOperatorFindChar(state, key)
    }
    return handleFindChar(state, key)
  }

  // --- Pending operator (d/c/y waiting for motion or double-press) ---
  if (state.pendingOperator !== null) {
    return handleOperatorPending(state, key)
  }

  // --- Simple motions ---
  const simpleMotion = trySimpleMotion(state, key)
  if (simpleMotion !== null) {
    return { state: { ...state, cursor: simpleMotion }, handled: true }
  }

  // --- g prefix ---
  if (key === 'g') {
    return { state: { ...state, pendingKeys: 'g' }, handled: true }
  }

  // --- G (go to last line) ---
  if (key === 'G') {
    const pos = motions.G(state)
    return { state: { ...state, cursor: pos }, handled: true }
  }

  // --- Find motions (f/F/t/T) ---
  if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
    return { state: { ...state, pendingKeys: key }, handled: true }
  }

  // --- Find repeat ---
  if (key === ';') {
    if (state.lastFind) {
      const pos = motions.repeatFind(state, state.lastFind)
      if (pos) {
        return { state: { ...state, cursor: pos }, handled: true }
      }
    }
    return { state, handled: true }
  }
  if (key === ',') {
    if (state.lastFind) {
      const pos = motions.reverseFind(state, state.lastFind)
      if (pos) {
        return { state: { ...state, cursor: pos }, handled: true }
      }
    }
    return { state, handled: true }
  }

  // --- Operators (d/c/y) ---
  if (key === 'd' || key === 'c' || key === 'y') {
    return {
      state: { ...state, pendingOperator: key },
      handled: true,
    }
  }

  // --- Direct edits ---
  if (key === 'x') {
    const s = ops.deleteChar(state)
    return {
      state: { ...s, lastChange: { type: 'normal', keys: ['x'] } },
      handled: true,
    }
  }

  if (key === 'X') {
    const s = ops.deleteCharBefore(state)
    return {
      state: { ...s, lastChange: { type: 'normal', keys: ['X'] } },
      handled: true,
    }
  }

  if (key === 'D') {
    const s = ops.deleteToEnd(state)
    return {
      state: { ...s, lastChange: { type: 'normal', keys: ['D'] } },
      handled: true,
    }
  }

  if (key === 'C') {
    const s = ops.changeToEnd(state)
    startInsertRecording(['C'])
    return { state: s, handled: true }
  }

  if (key === 'Y') {
    const s = ops.yankLine(state)
    return { state: s, handled: true }
  }

  if (key === 'J') {
    return { state: joinLine(state), handled: true }
  }

  if (key === 'p') {
    const s = ops.putAfter(state)
    return {
      state: { ...s, lastChange: { type: 'normal', keys: ['p'] } },
      handled: true,
    }
  }

  if (key === 'P') {
    const s = ops.putBefore(state)
    return {
      state: { ...s, lastChange: { type: 'normal', keys: ['P'] } },
      handled: true,
    }
  }

  if (key === 'u') {
    const s = ops.undo(state)
    return { state: s, handled: true }
  }

  // --- Insert mode entry ---
  if (key === 'i') {
    startInsertRecording(['i'])
    return {
      state: { ...state, mode: 'insert' },
      handled: true,
    }
  }

  if (key === 'I') {
    const pos = motions.caret(state)
    startInsertRecording(['I'])
    return {
      state: { ...state, mode: 'insert', cursor: pos },
      handled: true,
    }
  }

  if (key === 'a') {
    const col = Math.min(state.cursor.col + 1, (state.lines[state.cursor.line] ?? '').length)
    startInsertRecording(['a'])
    return {
      state: { ...state, mode: 'insert', cursor: { line: state.cursor.line, col } },
      handled: true,
    }
  }

  if (key === 'A') {
    const line = state.lines[state.cursor.line] ?? ''
    startInsertRecording(['A'])
    return {
      state: { ...state, mode: 'insert', cursor: { line: state.cursor.line, col: line.length } },
      handled: true,
    }
  }

  if (key === 'o') {
    const newLines = [...state.lines]
    newLines.splice(state.cursor.line + 1, 0, '')
    const s = pushUndo(state)
    startInsertRecording(['o'])
    return {
      state: {
        ...s,
        lines: newLines,
        mode: 'insert',
        cursor: { line: state.cursor.line + 1, col: 0 },
      },
      handled: true,
    }
  }

  if (key === 'O') {
    const newLines = [...state.lines]
    newLines.splice(state.cursor.line, 0, '')
    const s = pushUndo(state)
    startInsertRecording(['O'])
    return {
      state: {
        ...s,
        lines: newLines,
        mode: 'insert',
        cursor: { line: state.cursor.line, col: 0 },
      },
      handled: true,
    }
  }

  // --- Dot command ---
  if (key === '.') {
    return executeDot(state)
  }

  return { state, handled: false }
}

// ---------------------------------------------------------------------------
// Find char handler
// ---------------------------------------------------------------------------

function handleFindChar(state: VimState, char: string): KeyResult {
  const findKey = state.pendingKeys as 'f' | 'F' | 't' | 'T'
  const s: VimState = { ...state, pendingKeys: '' }

  if (char === 'Escape') {
    return { state: s, handled: true }
  }

  const findFn = findKey === 'f' ? motions.f
    : findKey === 'F' ? motions.F
    : findKey === 't' ? motions.t
    : motions.T

  const pos = findFn(s, char)
  const direction: 'forward' | 'backward' = (findKey === 'f' || findKey === 't') ? 'forward' : 'backward'
  const findType: 'f' | 't' = (findKey === 'f' || findKey === 'F') ? 'f' : 't'
  const findParams: FindParams = { char, direction, type: findType }

  if (pos) {
    return {
      state: { ...s, cursor: pos, lastFind: findParams },
      handled: true,
    }
  }

  return { state: { ...s, lastFind: findParams }, handled: true }
}

function handleOperatorFindChar(state: VimState, char: string): KeyResult {
  const findKey = state.pendingKeys as 'f' | 'F' | 't' | 'T'
  const op = state.pendingOperator!
  const s: VimState = { ...state, pendingKeys: '', pendingOperator: null }

  if (char === 'Escape') {
    return { state: s, handled: true }
  }

  const findFn = findKey === 'f' ? motions.f
    : findKey === 'F' ? motions.F
    : findKey === 't' ? motions.t
    : motions.T

  const pos = findFn(s, char)
  const direction: 'forward' | 'backward' = (findKey === 'f' || findKey === 't') ? 'forward' : 'backward'
  const findType: 'f' | 't' = (findKey === 'f' || findKey === 'F') ? 'f' : 't'
  const findParams: FindParams = { char, direction, type: findType }

  if (pos) {
    const withFind = { ...s, lastFind: findParams }
    // The motion key for recording is the findKey + char
    const changeKeys = [op, findKey, char]
    switch (op) {
      case 'd': {
        const result = ops.deleteToPos(withFind, pos)
        return {
          state: { ...result, lastChange: { type: 'normal', keys: changeKeys } },
          handled: true,
        }
      }
      case 'c': {
        const result = ops.changeToPos(withFind, pos)
        startInsertRecording(changeKeys)
        return { state: result, handled: true }
      }
      case 'y': {
        const result = ops.yankToPos(withFind, pos)
        return { state: result, handled: true }
      }
    }
  }

  return { state: { ...s, lastFind: findParams }, handled: true }
}

// ---------------------------------------------------------------------------
// Operator-pending handler
// ---------------------------------------------------------------------------

function handleOperatorPending(state: VimState, key: string): KeyResult {
  const op = state.pendingOperator!
  const s: VimState = { ...state, pendingOperator: null }

  if (key === 'Escape') {
    return { state: s, handled: true }
  }

  // Double-press: dd, cc, yy
  if (key === op) {
    return executeLineOp(s, op)
  }

  // Find motions as operator targets — need another char
  if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
    return {
      state: { ...s, pendingOperator: op, pendingKeys: key },
      handled: true,
    }
  }

  // Motion key — resolve motion and apply operator
  const motion = resolveMotion(s, key)
  if (motion !== null) {
    return executeOperatorMotion(s, op, key, motion)
  }

  // Unknown — cancel
  return { state: s, handled: false }
}

// ---------------------------------------------------------------------------
// Operator execution
// ---------------------------------------------------------------------------

function executeLineOp(state: VimState, op: string): KeyResult {
  let s: VimState
  const changeKeys = [op, op]

  switch (op) {
    case 'd':
      s = ops.deleteLine(state)
      return {
        state: { ...s, lastChange: { type: 'normal', keys: changeKeys } },
        handled: true,
      }
    case 'c':
      s = ops.changeLine(state)
      startInsertRecording(changeKeys)
      return { state: s, handled: true }
    case 'y':
      s = ops.yankLine(state)
      return { state: s, handled: true }
    default:
      return { state, handled: false }
  }
}

function executeOperatorMotion(
  state: VimState,
  op: string,
  motionKey: string,
  target: CursorPos,
): KeyResult {
  const changeKeys = [op, motionKey]

  switch (op) {
    case 'd': {
      const s = ops.deleteToPos(state, target)
      return {
        state: { ...s, lastChange: { type: 'normal', keys: changeKeys } },
        handled: true,
      }
    }
    case 'c': {
      const s = ops.changeToPos(state, target)
      startInsertRecording(changeKeys)
      return { state: s, handled: true }
    }
    case 'y': {
      const s = ops.yankToPos(state, target)
      return { state: s, handled: true }
    }
    default:
      return { state, handled: false }
  }
}

// ---------------------------------------------------------------------------
// Motion resolution
// ---------------------------------------------------------------------------

function trySimpleMotion(state: VimState, key: string): CursorPos | null {
  switch (key) {
    case 'h': return motions.h(state)
    case 'j': return motions.j(state)
    case 'k': return motions.k(state)
    case 'l': return motions.l(state)
    case 'w': return motions.w(state)
    case 'W': return motions.W(state)
    case 'b': return motions.b(state)
    case 'B': return motions.B(state)
    case 'e': return motions.e(state)
    case 'E': return motions.E(state)
    case '0': return motions.zero(state)
    case '^': return motions.caret(state)
    case '$': return motions.dollar(state)
    default: return null
  }
}

function resolveMotion(state: VimState, key: string): CursorPos | null {
  // Same set of motions as trySimpleMotion
  const pos = trySimpleMotion(state, key)
  if (pos !== null) return pos

  // G goes to last line
  if (key === 'G') return motions.G(state)

  return null
}

// ---------------------------------------------------------------------------
// Dot command
// ---------------------------------------------------------------------------

function executeDot(state: VimState): KeyResult {
  if (!state.lastChange) {
    return { state, handled: true }
  }

  const change = state.lastChange
  isDotReplaying = true

  let s = state
  for (const k of change.keys) {
    const result = processKey(s, k)
    s = result.state
  }

  isDotReplaying = false

  // Restore the original lastChange so dot can be repeated
  s = { ...s, lastChange: change }

  return { state: s, handled: true }
}

// ---------------------------------------------------------------------------
// Insert recording
// ---------------------------------------------------------------------------

function startInsertRecording(entryKeys: string[]): void {
  if (isDotReplaying) return
  isRecordingInsert = true
  insertKeyBuf = [...entryKeys]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pushUndo(state: VimState): VimState {
  return {
    ...state,
    undoStack: [
      ...state.undoStack,
      { lines: state.lines.map(l => l), cursor: { ...state.cursor } },
    ],
  }
}

function joinLine(state: VimState): VimState {
  if (state.cursor.line >= state.lines.length - 1) return state

  const current = state.lines[state.cursor.line] ?? ''
  const next = state.lines[state.cursor.line + 1] ?? ''
  const joined = current + ' ' + next.trimStart()

  const s = pushUndo(state)
  const newLines = [...state.lines]
  newLines.splice(state.cursor.line, 2, joined)

  return {
    ...s,
    lines: newLines,
    cursor: { line: state.cursor.line, col: current.length },
    lastChange: { type: 'normal', keys: ['J'] },
  }
}
