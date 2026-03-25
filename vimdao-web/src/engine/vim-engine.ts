import type { VimState, KeyResult, CursorPos, FindParams } from './vim-types'
import { clampCursor } from './vim-state'
import * as motions from './vim-motions'
import * as ops from './vim-operations'
import { searchForward, searchBackward, searchWordUnderCursor } from './vim-search'
import { resolveTextObject } from './vim-text-objects'

// ---------------------------------------------------------------------------
// Inclusive motions — these include the character at the target position
// when used with operators (d, c, y).
// ---------------------------------------------------------------------------

const INCLUSIVE_MOTIONS = new Set(['e', 'E', 'f', 'F', 'l', '$', 'G', 'gg'])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function processKey(state: VimState, key: string): KeyResult {
  // Don't add replayed keys (from dot command) to the user-visible keyLog
  const s: VimState = state.isDotReplaying
    ? state
    : { ...state, keyLog: [...state.keyLog, key] }

  switch (s.mode) {
    case 'insert':
      return handleInsertMode(s, key)
    case 'normal':
      return handleNormalMode(s, key)
    case 'visual':
      return handleVisualMode(s, key)
    case 'command':
      return handleCommandMode(s, key)
    default:
      return { state: s, handled: false }
  }
}

// ---------------------------------------------------------------------------
// Insert mode
// ---------------------------------------------------------------------------

function handleInsertMode(state: VimState, key: string): KeyResult {
  // Track key for dot-command replay (immutable — build new buffer)
  let s = state
  if (state.isRecordingInsert) {
    s = { ...s, insertKeyBuf: [...s.insertKeyBuf, key] }
  }

  if (key === 'Escape') {
    // Move cursor back one (Vim behaviour) and clamp
    const newCol = Math.max(0, s.cursor.col - 1)
    let result: VimState = {
      ...s,
      mode: 'normal',
      cursor: { line: s.cursor.line, col: newCol },
    }
    result = clampCursor(result)

    // Record insert change for dot command
    if (s.isRecordingInsert) {
      result = {
        ...result,
        lastChange: { type: 'insert', keys: [...s.insertKeyBuf] },
        isRecordingInsert: false,
        insertKeyBuf: [],
      }
    }

    return { state: result, handled: true }
  }

  if (key === 'Backspace') {
    if (s.cursor.col === 0) {
      return { state: s, handled: true }
    }
    const line = s.lines[s.cursor.line] ?? ''
    const newLine = line.slice(0, s.cursor.col - 1) + line.slice(s.cursor.col)
    const newLines = [...s.lines]
    newLines[s.cursor.line] = newLine
    return {
      state: {
        ...s,
        lines: newLines,
        cursor: { line: s.cursor.line, col: s.cursor.col - 1 },
      },
      handled: true,
    }
  }

  if (key === 'Enter') {
    const line = s.lines[s.cursor.line] ?? ''
    const before = line.slice(0, s.cursor.col)
    const after = line.slice(s.cursor.col)
    const newLines = [...s.lines]
    newLines.splice(s.cursor.line, 1, before, after)
    return {
      state: {
        ...s,
        lines: newLines,
        cursor: { line: s.cursor.line + 1, col: 0 },
      },
      handled: true,
    }
  }

  // Regular character — insert at cursor
  if (key.length === 1) {
    const line = s.lines[s.cursor.line] ?? ''
    const newLine = line.slice(0, s.cursor.col) + key + line.slice(s.cursor.col)
    const newLines = [...s.lines]
    newLines[s.cursor.line] = newLine
    return {
      state: {
        ...s,
        lines: newLines,
        cursor: { line: s.cursor.line, col: s.cursor.col + 1 },
      },
      handled: true,
    }
  }

  return { state: s, handled: false }
}

// ---------------------------------------------------------------------------
// Normal mode
// ---------------------------------------------------------------------------

function handleNormalMode(state: VimState, key: string): KeyResult {
  // --- Pending 'g' prefix ---
  if (state.pendingKeys === 'g') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'g') {
      const count = s.countPrefix ?? 1
      const pos = count === 1 ? motions.gg(s) : { line: Math.min(count - 1, s.lines.length - 1), col: 0 }
      return { state: { ...s, cursor: pos, countPrefix: null }, handled: true }
    }
    // Unknown g-combo — ignore
    return { state: s, handled: false }
  }

  // --- Pending r{char} — replace character under cursor ---
  if (state.pendingKeys === 'r') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'Escape') return { state: s, handled: true }
    if (key.length !== 1) return { state: s, handled: false }
    // Replace char
    const line = s.lines[s.cursor.line] ?? ''
    if (s.cursor.col >= line.length) return { state: s, handled: true }
    const newLine = line.slice(0, s.cursor.col) + key + line.slice(s.cursor.col + 1)
    const newLines = [...s.lines]
    newLines[s.cursor.line] = newLine
    const withUndo = pushUndo(s)
    return {
      state: { ...withUndo, lines: newLines, lastChange: { type: 'normal', keys: ['r', key] } },
      handled: true,
    }
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

  // --- Digit accumulation: 1-9 starts count, 0 extends existing count ---
  if ((key >= '1' && key <= '9') || (key === '0' && state.countPrefix !== null)) {
    const digit = parseInt(key, 10)
    const current = state.countPrefix ?? 0
    return { state: { ...state, countPrefix: current * 10 + digit }, handled: true }
  }

  // --- Simple motions (with count support) ---
  const simpleMotion = trySimpleMotion(state, key)
  if (simpleMotion !== null) {
    const count = state.countPrefix ?? 1
    const s: VimState = { ...state, countPrefix: null }
    let cursor = s.cursor
    for (let i = 0; i < count; i++) {
      const nextPos = trySimpleMotion({ ...s, cursor }, key)
      if (nextPos) cursor = nextPos
      else break
    }
    return { state: { ...s, cursor }, handled: true }
  }

  // --- g prefix ---
  if (key === 'g') {
    return { state: { ...state, pendingKeys: 'g' }, handled: true }
  }

  // --- G (go to last line, or Nth line with count) ---
  if (key === 'G') {
    const count = state.countPrefix
    const pos = count !== null
      ? { line: Math.min(count - 1, state.lines.length - 1), col: 0 }
      : motions.G(state)
    return { state: { ...state, cursor: pos, countPrefix: null }, handled: true }
  }

  // --- r{char} — replace character under cursor ---
  if (key === 'r') {
    return { state: { ...state, pendingKeys: 'r' }, handled: true }
  }

  // --- Find motions (f/F/t/T) ---
  if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
    return { state: { ...state, pendingKeys: key }, handled: true }
  }

  // --- Find repeat ---
  if (key === ';') {
    const count = state.countPrefix ?? 1
    const s: VimState = { ...state, countPrefix: null }
    if (s.lastFind) {
      let cursor = s.cursor
      for (let i = 0; i < count; i++) {
        const pos = motions.repeatFind({ ...s, cursor }, s.lastFind)
        if (pos) cursor = pos
        else break
      }
      return { state: { ...s, cursor }, handled: true }
    }
    return { state: s, handled: true }
  }
  if (key === ',') {
    const count = state.countPrefix ?? 1
    const s: VimState = { ...state, countPrefix: null }
    if (s.lastFind) {
      let cursor = s.cursor
      for (let i = 0; i < count; i++) {
        const pos = motions.reverseFind({ ...s, cursor }, s.lastFind)
        if (pos) cursor = pos
        else break
      }
      return { state: { ...s, cursor }, handled: true }
    }
    return { state: s, handled: true }
  }

  // --- Visual mode entry ---
  if (key === 'v') {
    return {
      state: {
        ...state,
        mode: 'visual',
        visualMode: 'char',
        visualStart: { ...state.cursor },
        countPrefix: null,
      },
      handled: true,
    }
  }
  if (key === 'V') {
    return {
      state: {
        ...state,
        mode: 'visual',
        visualMode: 'line',
        visualStart: { ...state.cursor },
        countPrefix: null,
      },
      handled: true,
    }
  }

  // --- Operators (d/c/y/>/< ) — transfer count to operator ---
  if (key === 'd' || key === 'c' || key === 'y' || key === '>' || key === '<') {
    return {
      state: { ...state, pendingOperator: key, operatorCount: state.countPrefix, countPrefix: null },
      handled: true,
    }
  }

  // --- Direct edits ---
  if (key === 's') {
    const s = ops.deleteChar(state)
    return { state: startInsertRecording({ ...s, mode: 'insert', countPrefix: null }, ['s']), handled: true }
  }

  if (key === 'x') {
    const count = state.countPrefix ?? 1
    let s = { ...state, countPrefix: null } as VimState
    for (let i = 0; i < count; i++) {
      const line = s.lines[s.cursor.line] ?? ''
      if (line.length === 0 || s.cursor.col >= line.length) break
      s = ops.deleteChar(s)
    }
    return {
      state: { ...s, lastChange: { type: 'normal', keys: count > 1 ? [String(count), 'x'] : ['x'] } },
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
    return { state: startInsertRecording(s, ['C']), handled: true }
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
    return {
      state: startInsertRecording({ ...state, mode: 'insert' }, ['i']),
      handled: true,
    }
  }

  if (key === 'I') {
    const pos = motions.caret(state)
    return {
      state: startInsertRecording({ ...state, mode: 'insert', cursor: pos }, ['I']),
      handled: true,
    }
  }

  if (key === 'a') {
    const col = Math.min(state.cursor.col + 1, (state.lines[state.cursor.line] ?? '').length)
    return {
      state: startInsertRecording({ ...state, mode: 'insert', cursor: { line: state.cursor.line, col } }, ['a']),
      handled: true,
    }
  }

  if (key === 'A') {
    const line = state.lines[state.cursor.line] ?? ''
    return {
      state: startInsertRecording({ ...state, mode: 'insert', cursor: { line: state.cursor.line, col: line.length } }, ['A']),
      handled: true,
    }
  }

  if (key === 'o') {
    const newLines = [...state.lines]
    newLines.splice(state.cursor.line + 1, 0, '')
    const s = pushUndo(state)
    return {
      state: startInsertRecording({
        ...s,
        lines: newLines,
        mode: 'insert',
        cursor: { line: state.cursor.line + 1, col: 0 },
      }, ['o']),
      handled: true,
    }
  }

  if (key === 'O') {
    const newLines = [...state.lines]
    newLines.splice(state.cursor.line, 0, '')
    const s = pushUndo(state)
    return {
      state: startInsertRecording({
        ...s,
        lines: newLines,
        mode: 'insert',
        cursor: { line: state.cursor.line, col: 0 },
      }, ['O']),
      handled: true,
    }
  }

  // --- Dot command ---
  if (key === '.') {
    return executeDot(state)
  }

  // --- Search ---
  if (key === '/') {
    return { state: { ...state, mode: 'command', commandBuffer: '/' }, handled: true }
  }

  // --- Command mode (:) ---
  if (key === ':') {
    return { state: { ...state, mode: 'command', commandBuffer: ':' }, handled: true }
  }

  if (key === 'n') {
    if (state.searchPattern) {
      const count = state.countPrefix ?? 1
      let cursor = state.cursor
      const searchFn = state.searchDirection === 'forward' ? searchForward : searchBackward
      for (let i = 0; i < count; i++) {
        const pos = searchFn({ ...state, cursor }, state.searchPattern)
        if (pos) cursor = pos
        else break
      }
      return { state: { ...state, cursor, countPrefix: null }, handled: true }
    }
    return { state, handled: true }
  }

  if (key === 'N') {
    if (state.searchPattern) {
      const count = state.countPrefix ?? 1
      let cursor = state.cursor
      const searchFn = state.searchDirection === 'forward' ? searchBackward : searchForward
      for (let i = 0; i < count; i++) {
        const pos = searchFn({ ...state, cursor }, state.searchPattern)
        if (pos) cursor = pos
        else break
      }
      return { state: { ...state, cursor, countPrefix: null }, handled: true }
    }
    return { state, handled: true }
  }

  if (key === '*') {
    const result = searchWordUnderCursor(state)
    if (result) {
      return {
        state: {
          ...state,
          cursor: result.pos,
          searchPattern: result.pattern,
          searchDirection: 'forward',
          countPrefix: null,
        },
        handled: true,
      }
    }
    return { state, handled: true }
  }

  if (key === '#') {
    const { lines, cursor } = state
    const line = lines[cursor.line] ?? ''
    const col = cursor.col
    const ch = line[col]
    if (ch && /\w/.test(ch)) {
      let wordStart = col
      let wordEnd = col
      while (wordStart > 0 && /\w/.test(line[wordStart - 1] ?? '')) wordStart--
      while (wordEnd < line.length - 1 && /\w/.test(line[wordEnd + 1] ?? '')) wordEnd++
      const word = line.slice(wordStart, wordEnd + 1)
      const pos = searchBackward(state, word, true)
      if (pos) {
        return {
          state: {
            ...state,
            cursor: pos,
            searchPattern: word,
            searchDirection: 'backward',
            countPrefix: null,
          },
          handled: true,
        }
      }
    }
    return { state, handled: true }
  }

  return { state, handled: false }
}

// ---------------------------------------------------------------------------
// Visual mode
// ---------------------------------------------------------------------------

function handleVisualMode(state: VimState, key: string): KeyResult {
  // Escape — exit visual, clear selection
  if (key === 'Escape') {
    return {
      state: {
        ...state,
        mode: 'normal',
        visualStart: null,
        visualMode: null,
      },
      handled: true,
    }
  }

  // v toggles: if char visual, exit; if line visual, switch to char
  if (key === 'v') {
    if (state.visualMode === 'char') {
      return {
        state: {
          ...state,
          mode: 'normal',
          visualStart: null,
          visualMode: null,
        },
        handled: true,
      }
    }
    // line -> char
    return {
      state: { ...state, visualMode: 'char' },
      handled: true,
    }
  }

  // V toggles: if line visual, exit; if char visual, switch to line
  if (key === 'V') {
    if (state.visualMode === 'line') {
      return {
        state: {
          ...state,
          mode: 'normal',
          visualStart: null,
          visualMode: null,
        },
        handled: true,
      }
    }
    // char -> line
    return {
      state: { ...state, visualMode: 'line' },
      handled: true,
    }
  }

  // Handle pending g prefix in visual mode
  if (state.pendingKeys === 'g') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'g') {
      const pos = motions.gg(s)
      return {
        state: { ...s, cursor: pos },
        handled: true,
      }
    }
    // Unknown g-combo — ignore
    return { state: s, handled: false }
  }

  // Pending find (f/F/t/T waiting for char)
  if (state.pendingKeys === 'f' || state.pendingKeys === 'F' ||
      state.pendingKeys === 't' || state.pendingKeys === 'T') {
    return handleVisualFindChar(state, key)
  }

  // Motions — move cursor, selection extends from visualStart to cursor
  const motionPos = trySimpleMotion(state, key)
    ?? resolveMotion(state, key)
  if (motionPos !== null) {
    return {
      state: { ...state, cursor: motionPos },
      handled: true,
    }
  }

  // g prefix for gg
  if (key === 'g') {
    return { state: { ...state, pendingKeys: 'g' }, handled: true }
  }

  // G motion
  if (key === 'G') {
    const pos = motions.G(state)
    return {
      state: { ...state, cursor: pos },
      handled: true,
    }
  }

  // Find motions (f/F/t/T)
  if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
    return { state: { ...state, pendingKeys: key }, handled: true }
  }

  // Operators: d, c, y
  if (key === 'd' || key === 'c' || key === 'y') {
    return executeVisualOperator(state, key)
  }

  return { state, handled: false }
}

function handleVisualFindChar(state: VimState, char: string): KeyResult {
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

function executeVisualOperator(state: VimState, op: string): KeyResult {
  const anchor = state.visualStart!
  const cursor = state.cursor

  if (state.visualMode === 'line') {
    return executeVisualLineOperator(state, op, anchor, cursor)
  }

  // Character-wise visual
  return executeVisualCharOperator(state, op, anchor, cursor)
}

function executeVisualCharOperator(
  state: VimState,
  op: string,
  anchor: CursorPos,
  cursor: CursorPos,
): KeyResult {
  // Normalize start/end — selection is inclusive
  const before = anchor.line < cursor.line
    || (anchor.line === cursor.line && anchor.col <= cursor.col)
  const start = before ? anchor : cursor
  const end = before ? cursor : anchor

  // The end position is inclusive — for delete/yank we need end+1 col
  const endExclusive: CursorPos = { line: end.line, col: end.col + 1 }

  const exitVisual = {
    mode: 'normal' as const,
    visualStart: null,
    visualMode: null,
  }

  switch (op) {
    case 'd': {
      const s = ops.deleteToPos(
        { ...state, cursor: start, ...exitVisual },
        endExclusive,
      )
      return {
        state: { ...s, lastChange: null },
        handled: true,
      }
    }
    case 'c': {
      const s = ops.changeToPos(
        { ...state, cursor: start, ...exitVisual },
        endExclusive,
      )
      return {
        state: s,
        handled: true,
      }
    }
    case 'y': {
      // Yank without deleting
      const lines = state.lines
      const text = extractVisualText(lines, start, endExclusive)
      return {
        state: {
          ...state,
          ...exitVisual,
          register: text,
          cursor: start,
        },
        handled: true,
      }
    }
    default:
      return { state, handled: false }
  }
}

function executeVisualLineOperator(
  state: VimState,
  op: string,
  anchor: CursorPos,
  cursor: CursorPos,
): KeyResult {
  const startLine = Math.min(anchor.line, cursor.line)
  const endLine = Math.max(anchor.line, cursor.line)

  const exitVisual = {
    mode: 'normal' as const,
    visualStart: null,
    visualMode: null,
  }

  switch (op) {
    case 'd': {
      let s: VimState = { ...state, ...exitVisual, cursor: { line: startLine, col: 0 } }
      // Delete lines from endLine down to startLine
      const lineCount = endLine - startLine + 1
      for (let i = 0; i < lineCount; i++) {
        s = ops.deleteLine(s)
      }
      return {
        state: { ...s, lastChange: null },
        handled: true,
      }
    }
    case 'c': {
      let s: VimState = { ...state, ...exitVisual, cursor: { line: startLine, col: 0 } }
      const lineCount = endLine - startLine + 1
      for (let i = 1; i < lineCount; i++) {
        s = ops.deleteLine(s)
      }
      s = ops.changeLine(s)
      return { state: s, handled: true }
    }
    case 'y': {
      const yankedLines = state.lines.slice(startLine, endLine + 1)
      return {
        state: {
          ...state,
          ...exitVisual,
          register: yankedLines.join('\n') + '\n',
          cursor: { line: startLine, col: 0 },
        },
        handled: true,
      }
    }
    default:
      return { state, handled: false }
  }
}

function extractVisualText(lines: string[], start: CursorPos, endExcl: CursorPos): string {
  if (start.line === endExcl.line) {
    return (lines[start.line] ?? '').slice(start.col, endExcl.col)
  }
  const parts: string[] = []
  parts.push((lines[start.line] ?? '').slice(start.col))
  for (let i = start.line + 1; i < endExcl.line; i++) {
    parts.push(lines[i] ?? '')
  }
  parts.push((lines[endExcl.line] ?? '').slice(0, endExcl.col))
  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// Command mode (/ search, : commands)
// ---------------------------------------------------------------------------

function handleCommandMode(state: VimState, key: string): KeyResult {
  if (key === 'Escape') {
    return {
      state: { ...state, mode: 'normal', commandBuffer: '' },
      handled: true,
    }
  }

  if (key === 'Backspace') {
    if (state.commandBuffer.length <= 1) {
      // Only the prefix char remains — cancel
      return {
        state: { ...state, mode: 'normal', commandBuffer: '' },
        handled: true,
      }
    }
    return {
      state: { ...state, commandBuffer: state.commandBuffer.slice(0, -1) },
      handled: true,
    }
  }

  if (key === 'Enter') {
    const buf = state.commandBuffer
    if (buf.startsWith('/')) {
      const pattern = buf.slice(1)
      if (pattern.length === 0) {
        return {
          state: { ...state, mode: 'normal', commandBuffer: '' },
          handled: true,
        }
      }
      const pos = searchForward(state, pattern)
      return {
        state: {
          ...state,
          mode: 'normal',
          commandBuffer: '',
          searchPattern: pattern,
          searchDirection: 'forward',
          cursor: pos ?? state.cursor,
        },
        handled: true,
      }
    }
    // Ex-commands (: prefix)
    if (buf.startsWith(':')) {
      const cmd = buf.slice(1)
      return executeExCommand({ ...state, mode: 'normal', commandBuffer: '' }, cmd)
    }

    // Unknown prefix — just return to normal
    return {
      state: { ...state, mode: 'normal', commandBuffer: '' },
      handled: true,
    }
  }

  // Regular character — append to buffer
  if (key.length === 1) {
    return {
      state: { ...state, commandBuffer: state.commandBuffer + key },
      handled: true,
    }
  }

  return { state, handled: false }
}

// ---------------------------------------------------------------------------
// Ex-command execution
// ---------------------------------------------------------------------------

function executeExCommand(state: VimState, cmd: string): KeyResult {
  // :w — set lastCommand for ChallengeView to detect
  if (cmd === 'w') {
    return { state: { ...state, lastCommand: 'write' }, handled: true }
  }
  // :q
  if (cmd === 'q') {
    return { state: { ...state, lastCommand: 'quit' }, handled: true }
  }
  // :wq
  if (cmd === 'wq') {
    return { state: { ...state, lastCommand: 'wq' }, handled: true }
  }
  // :%s/pattern/replacement/g
  const subMatch = cmd.match(/^%s\/(.+?)\/(.+?)\/(g?)$/)
  if (subMatch) {
    const [, pattern, replacement, globalFlag] = subMatch
    const s = pushUndo(state)
    const newLines = s.lines.map(line => {
      if (globalFlag === 'g') {
        return line.split(pattern!).join(replacement!)
      }
      return line.replace(pattern!, replacement!)
    })
    return {
      state: { ...s, lines: newLines, lastChange: { type: 'normal', keys: [':'] } },
      handled: true,
    }
  }
  // Unknown command — just return to normal
  return { state, handled: true }
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

    // Find motions (f/F) are inclusive — include the char at target
    const isInclusive = findType === 'f'
    let adjustedPos = pos
    if (isInclusive && pos.line === withFind.cursor.line) {
      adjustedPos = { ...pos, col: pos.col + 1 }
    }

    switch (op) {
      case 'd': {
        const result = ops.deleteToPos(withFind, adjustedPos)
        return {
          state: { ...result, lastChange: { type: 'normal', keys: changeKeys } },
          handled: true,
        }
      }
      case 'c': {
        const result = ops.changeToPos(withFind, adjustedPos)
        return { state: startInsertRecording(result, changeKeys), handled: true }
      }
      case 'y': {
        const result = ops.yankToPos(withFind, adjustedPos)
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
  // Text object completion: pendingOperator='d', pendingKeys='i', key='w' → diw
  if (state.pendingKeys === 'i' || state.pendingKeys === 'a') {
    const modifier = state.pendingKeys as 'i' | 'a'
    const op = state.pendingOperator!
    const s: VimState = { ...state, pendingKeys: '', pendingOperator: null, countPrefix: null, operatorCount: null }

    if (key === 'Escape') return { state: s, handled: true }

    const range = resolveTextObject(s, modifier, key)
    if (!range) return { state: s, handled: true }

    const changeKeys = [op, modifier, key]

    switch (op) {
      case 'd': {
        const positioned = { ...s, cursor: range.start }
        const result = ops.deleteToPos(positioned, range.end)
        return { state: { ...result, lastChange: { type: 'normal', keys: changeKeys } }, handled: true }
      }
      case 'c': {
        const positioned = { ...s, cursor: range.start }
        const result = ops.changeToPos(positioned, range.end)
        return { state: startInsertRecording(result, changeKeys), handled: true }
      }
      case 'y': {
        const positioned = { ...s, cursor: range.start }
        const result = ops.yankToPos(positioned, range.end)
        return { state: result, handled: true }
      }
      default:
        return { state: s, handled: true }
    }
  }

  const op = state.pendingOperator!
  const s: VimState = { ...state, pendingOperator: null }

  if (key === 'Escape') {
    return { state: { ...s, countPrefix: null, operatorCount: null }, handled: true }
  }

  // Digit accumulation within operator-pending (e.g. d3w)
  if ((key >= '1' && key <= '9') || (key === '0' && state.countPrefix !== null)) {
    const digit = parseInt(key, 10)
    const current = state.countPrefix ?? 0
    return {
      state: { ...state, countPrefix: current * 10 + digit },
      handled: true,
    }
  }

  // Double-press: dd, cc, yy, >>, <<
  if (key === op) {
    const opCount = s.operatorCount ?? 1
    const motionCount = s.countPrefix ?? 1
    const totalCount = opCount * motionCount
    if (op === '>' || op === '<') {
      return executeIndent(
        { ...s, countPrefix: null, operatorCount: null, pendingOperator: null },
        s.cursor.line,
        s.cursor.line + totalCount - 1,
        op === '>' ? 'indent' : 'dedent',
      )
    }
    return executeLineOp({ ...s, countPrefix: null, operatorCount: null }, op, totalCount)
  }

  // Find motions as operator targets — need another char
  if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
    return {
      state: { ...s, pendingOperator: op, pendingKeys: key },
      handled: true,
    }
  }

  // Text object modifier — wait for next key (the object type)
  if (key === 'i' || key === 'a') {
    return {
      state: { ...state, pendingKeys: key },
      handled: true,
    }
  }

  // Motion key — resolve motion and apply operator with count
  const motion = resolveMotion(s, key)
  if (motion !== null) {
    const opCount = s.operatorCount ?? 1
    const motionCount = s.countPrefix ?? 1
    const totalCount = opCount * motionCount
    // Apply motion totalCount times
    let cursor = s.cursor
    // cw acts like ce (Vim special case) — but only when cursor is in the
    // *middle* of a word (next char is still a word char).  When cursor is at
    // the end of a word (next char is space/EOL) we keep w semantics so that
    // c3w from a one-letter word like "a" changes exactly 3 words.
    let effectiveKey = key
    if (op === 'c' && (key === 'w' || key === 'W')) {
      const curLine = s.lines[cursor.line] ?? ''
      const nextCh = curLine[cursor.col + 1] ?? ''
      const atEndOfWord = nextCh === '' || /\s/.test(nextCh)
      if (!atEndOfWord) {
        effectiveKey = key === 'w' ? 'e' : 'E'
      }
    }
    for (let i = 0; i < totalCount; i++) {
      const nextPos = trySimpleMotion({ ...s, cursor }, effectiveKey) ?? resolveMotion({ ...s, cursor }, effectiveKey)
      if (nextPos) cursor = nextPos
      else break
    }
    return executeOperatorMotion({ ...s, countPrefix: null, operatorCount: null }, op, effectiveKey, cursor, totalCount)
  }

  // Unknown — cancel
  return { state: { ...s, countPrefix: null, operatorCount: null }, handled: false }
}

// ---------------------------------------------------------------------------
// Operator execution
// ---------------------------------------------------------------------------

function executeLineOp(state: VimState, op: string, count: number = 1): KeyResult {
  const changeKeys = count > 1 ? [String(count), op, op] : [op, op]

  switch (op) {
    case 'd': {
      let s = state
      for (let i = 0; i < count; i++) {
        s = ops.deleteLine(s)
      }
      return {
        state: { ...s, lastChange: { type: 'normal', keys: changeKeys } },
        handled: true,
      }
    }
    case 'c': {
      // For count > 1, delete extra lines first, then change the remaining line
      let s = state
      for (let i = 1; i < count; i++) {
        s = ops.deleteLine(s)
      }
      s = ops.changeLine(s)
      return { state: startInsertRecording(s, changeKeys), handled: true }
    }
    case 'y': {
      // For count > 1, yank count lines
      let s = state
      if (count > 1) {
        const startLine = s.cursor.line
        const endLine = Math.min(startLine + count - 1, s.lines.length - 1)
        const yankedLines = s.lines.slice(startLine, endLine + 1)
        s = { ...s, register: yankedLines.join('\n') + '\n' }
      } else {
        s = ops.yankLine(s)
      }
      return { state: s, handled: true }
    }
    default:
      return { state, handled: false }
  }
}

function executeOperatorMotion(
  state: VimState,
  op: string,
  motionKey: string,
  target: CursorPos,
  count: number = 1,
): KeyResult {
  const changeKeys = count > 1
    ? [String(count), op, motionKey]
    : [op, motionKey]

  // Adjust target for inclusive motions (include the char at target position)
  let adjustedTarget = target
  if (INCLUSIVE_MOTIONS.has(motionKey) && target.line === state.cursor.line) {
    adjustedTarget = { ...target, col: target.col + 1 }
  }

  // Special case: dw at end of line — if w returns current pos, delete to end of line
  if (motionKey === 'w' && target.line === state.cursor.line && target.col === state.cursor.col) {
    const lineLen = (state.lines[state.cursor.line] ?? '').length
    adjustedTarget = { line: state.cursor.line, col: lineLen }
  }

  switch (op) {
    case 'd': {
      const s = ops.deleteToPos(state, adjustedTarget)
      return {
        state: { ...s, lastChange: { type: 'normal', keys: changeKeys } },
        handled: true,
      }
    }
    case 'c': {
      const s = ops.changeToPos(state, adjustedTarget)
      return { state: startInsertRecording(s, changeKeys), handled: true }
    }
    case 'y': {
      const s = ops.yankToPos(state, adjustedTarget)
      return { state: s, handled: true }
    }
    case '>': {
      const result = executeIndent(
        state,
        Math.min(state.cursor.line, adjustedTarget.line),
        Math.max(state.cursor.line, adjustedTarget.line),
        'indent',
      )
      // Override lastChange to record the motion key (e.g. >G), not >>
      return { ...result, state: { ...result.state, lastChange: { type: 'normal', keys: changeKeys } } }
    }
    case '<': {
      const result = executeIndent(
        state,
        Math.min(state.cursor.line, adjustedTarget.line),
        Math.max(state.cursor.line, adjustedTarget.line),
        'dedent',
      )
      return { ...result, state: { ...result.state, lastChange: { type: 'normal', keys: changeKeys } } }
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
    case '{': return motions.paragraphBackward(state)
    case '}': return motions.paragraphForward(state)
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
// Indent / dedent
// ---------------------------------------------------------------------------

function executeIndent(
  state: VimState,
  startLine: number,
  endLine: number,
  direction: 'indent' | 'dedent',
): KeyResult {
  const s = pushUndo(state)
  const newLines = [...s.lines]
  const end = Math.min(endLine, newLines.length - 1)
  for (let i = startLine; i <= end; i++) {
    const line = newLines[i] ?? ''
    if (direction === 'indent') {
      newLines[i] = '  ' + line // 2-space indent
    } else {
      newLines[i] = line.replace(/^  /, '') // remove up to 2 leading spaces
    }
  }
  return {
    state: {
      ...s,
      lines: newLines,
      pendingOperator: null,
      lastChange: { type: 'normal', keys: direction === 'indent' ? ['>', '>'] : ['<', '<'] },
    },
    handled: true,
  }
}

// ---------------------------------------------------------------------------
// Dot command
// ---------------------------------------------------------------------------

function executeDot(state: VimState): KeyResult {
  if (!state.lastChange) {
    return { state, handled: true }
  }

  const change = state.lastChange
  let s: VimState = { ...state, isDotReplaying: true }

  for (const k of change.keys) {
    const result = processKey(s, k)
    s = result.state
  }

  // Restore the original lastChange so dot can be repeated, and stop replaying
  s = { ...s, lastChange: change, isDotReplaying: false }

  return { state: s, handled: true }
}

// ---------------------------------------------------------------------------
// Insert recording
// ---------------------------------------------------------------------------

function startInsertRecording(state: VimState, entryKeys: string[]): VimState {
  if (state.isDotReplaying) return state
  return { ...state, isRecordingInsert: true, insertKeyBuf: [...entryKeys] }
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
