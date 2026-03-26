import type { VimState, KeyResult, CursorPos, FindParams } from './vim-types'
import { clampCursor } from './vim-state'
import * as motions from './vim-motions'
import * as ops from './vim-operations'
import { searchForward, searchBackward, searchWordUnderCursor } from './vim-search'
import { resolveTextObject } from './vim-text-objects'
import { addSurround, deleteSurround, replaceSurround } from './vim-surround'
import { toggleLineComment, toggleRangeComment } from './vim-comment'

// ---------------------------------------------------------------------------
// Inclusive motions — these include the character at the target position
// when used with operators (d, c, y).
// ---------------------------------------------------------------------------

const INCLUSIVE_MOTIONS = new Set(['e', 'E', 'f', 'F', 't', 'T', 'l', '$', 'G', 'gg', '%'])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function processKey(state: VimState, key: string): KeyResult {
  // Don't add replayed keys (from dot command) to the user-visible keyLog
  let s: VimState = state.isDotReplaying
    ? state
    : { ...state, keyLog: [...state.keyLog, key] }

  // Record key for macro (if recording and not during dot/macro replay)
  if (s.macroRecording && !s.isDotReplaying) {
    // q in normal mode with no pending state stops recording
    if (key === 'q' && s.mode === 'normal' && s.pendingKeys === '' && s.pendingOperator === null) {
      return {
        state: {
          ...s,
          macroRegisters: { ...s.macroRegisters, [s.macroRecording]: [...s.macroBuf] },
          macroRecording: null,
          macroBuf: [],
        },
        handled: true,
      }
    }
    s = { ...s, macroBuf: [...s.macroBuf, key] }
  }

  switch (s.mode) {
    case 'insert':
      return handleInsertMode(s, key)
    case 'replace':
      return handleReplaceMode(s, key)
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

  // Control-r — paste register in insert mode
  if (key === 'Control-r' || key === 'C-r') {
    return { state: { ...s, pendingKeys: 'C-r' }, handled: true }
  }
  if (s.pendingKeys === 'C-r') {
    const cleared: VimState = { ...s, pendingKeys: '' }
    if (key === 'Escape') {
      return { state: { ...cleared, mode: 'normal' }, handled: true }
    }
    // Get register content: '"' = unnamed, '0' = last yank, 'a'-'z' = named
    let content = ''
    if (key === '"') {
      content = cleared.register
    } else if (key === '0') {
      content = cleared.registers['0'] ?? cleared.register
    } else if (key >= 'a' && key <= 'z') {
      content = cleared.registers[key] ?? ''
    }
    if (content) {
      // Insert register content at cursor position
      const line = cleared.lines[cleared.cursor.line] ?? ''
      const col = cleared.cursor.col
      const newLines = [...cleared.lines]
      // Handle multi-line register content
      const regLines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n')
      const firstRegLine = regLines[0] ?? ''
      if (regLines.length === 1) {
        newLines[cleared.cursor.line] = line.slice(0, col) + firstRegLine + line.slice(col)
        return {
          state: { ...cleared, lines: newLines, cursor: { line: cleared.cursor.line, col: col + firstRegLine.length } },
          handled: true,
        }
      }
      // Multi-line paste in insert mode
      const before = line.slice(0, col)
      const after = line.slice(col)
      const lastRegLine = regLines[regLines.length - 1] ?? ''
      newLines.splice(cleared.cursor.line, 1, before + firstRegLine, ...regLines.slice(1, -1), lastRegLine + after)
      return {
        state: {
          ...cleared,
          lines: newLines,
          cursor: { line: cleared.cursor.line + regLines.length - 1, col: lastRegLine.length },
        },
        handled: true,
      }
    }
    return { state: cleared, handled: true }
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
// Replace mode
// ---------------------------------------------------------------------------

function handleReplaceMode(state: VimState, key: string): KeyResult {
  let s = state
  if (state.isRecordingInsert) {
    s = { ...s, insertKeyBuf: [...s.insertKeyBuf, key] }
  }

  if (key === 'Escape') {
    const newCol = Math.max(0, s.cursor.col - 1)
    let result: VimState = { ...s, mode: 'normal', cursor: { line: s.cursor.line, col: newCol } }
    result = clampCursor(result)
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

  // Replace character at cursor, advance cursor
  if (key.length === 1) {
    const line = s.lines[s.cursor.line] ?? ''
    const col = s.cursor.col
    const newLines = [...s.lines]
    if (col < line.length) {
      // Replace existing character
      newLines[s.cursor.line] = line.slice(0, col) + key + line.slice(col + 1)
    } else {
      // At or past end of line — append
      newLines[s.cursor.line] = line + key
    }
    return {
      state: { ...s, lines: newLines, cursor: { line: s.cursor.line, col: col + 1 } },
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
    if (key === 'c') {
      return { state: { ...s, pendingKeys: 'gc' }, handled: true }
    }
    if (key === 's') {
      return { state: { ...s, pendingKeys: 'gs' }, handled: true }
    }
    if (key === 'U') {
      return { state: { ...s, pendingOperator: 'gU', pendingKeys: '' }, handled: true }
    }
    if (key === 'u') {
      return { state: { ...s, pendingOperator: 'gu', pendingKeys: '' }, handled: true }
    }
    // gn — search match text object
    if (key === 'n') {
      if (!s.searchPattern) return { state: s, handled: true }
      const pattern = s.searchPattern
      // Find match at or after cursor (searchForward starts from cursor+1,
      // so first check if the match starts at the cursor position itself)
      const line = s.lines[s.cursor.line] ?? ''
      let matchPos: CursorPos | null = null
      if (line.indexOf(pattern, s.cursor.col) === s.cursor.col) {
        matchPos = { line: s.cursor.line, col: s.cursor.col }
      } else {
        matchPos = searchForward(s, pattern)
      }
      if (!matchPos) return { state: s, handled: true }
      const matchEnd: CursorPos = { line: matchPos.line, col: matchPos.col + pattern.length - 1 }

      if (s.pendingOperator) {
        const op = s.pendingOperator
        const opState: VimState = { ...s, pendingOperator: null, cursor: matchPos }
        const targetExcl: CursorPos = { line: matchPos.line, col: matchPos.col + pattern.length }
        const changeKeys = op.length > 1 ? [...op.split(''), 'g', 'n'] : [op, 'g', 'n']
        switch (op) {
          case 'd': {
            const result = ops.deleteToPos(opState, targetExcl)
            return { state: { ...result, lastChange: { type: 'normal', keys: changeKeys } }, handled: true }
          }
          case 'c': {
            const result = ops.changeToPos(opState, targetExcl)
            return { state: startInsertRecording(result, changeKeys), handled: true }
          }
          case 'y': {
            const result = ops.yankToPos(opState, targetExcl)
            return { state: result, handled: true }
          }
          case 'gU':
          case 'gu': {
            const toUpper = op === 'gU'
            const withUndo = pushUndo(s)
            const newLines = [...withUndo.lines]
            const matchLine = newLines[matchPos.line] ?? ''
            const seg = matchLine.slice(matchPos.col, matchPos.col + pattern.length)
            newLines[matchPos.line] = matchLine.slice(0, matchPos.col)
              + (toUpper ? seg.toUpperCase() : seg.toLowerCase())
              + matchLine.slice(matchPos.col + pattern.length)
            return {
              state: {
                ...withUndo,
                lines: newLines,
                pendingOperator: null,
                cursor: matchPos,
                lastChange: { type: 'normal', keys: changeKeys },
              },
              handled: true,
            }
          }
          default:
            return { state: { ...s, pendingOperator: null }, handled: true }
        }
      }
      // No pending operator — enter visual mode selecting the match
      return {
        state: {
          ...s,
          mode: 'visual',
          visualMode: 'char',
          visualStart: { ...matchPos },
          cursor: { ...matchEnd },
        },
        handled: true,
      }
    }
    // gv — reselect last visual selection
    if (key === 'v') {
      if (s.lastVisualStart && s.lastVisualEnd) {
        return {
          state: {
            ...s,
            mode: 'visual',
            visualStart: { ...s.lastVisualStart },
            visualMode: s.lastVisualMode ?? 'char',
            cursor: { ...s.lastVisualEnd },
          },
          handled: true,
        }
      }
      return { state: s, handled: true }
    }
    // gn — select/operate on next search match
    if (key === 'n' || key === 'N') {
      const searchFn = key === 'n' ? searchForward : searchBackward
      if (s.searchPattern && s.pendingOperator) {
        const op = s.pendingOperator
        const pos = searchFn(s, s.searchPattern)
        if (pos) {
          const matchEnd = { line: pos.line, col: pos.col + s.searchPattern.length }
          const withOp: VimState = { ...s, pendingOperator: null, cursor: pos }
          switch (op) {
            case 'gU': {
              const wu = pushUndo(withOp)
              const nl = [...wu.lines]
              const line = nl[pos.line] ?? ''
              nl[pos.line] = line.slice(0, pos.col) + line.slice(pos.col, matchEnd.col).toUpperCase() + line.slice(matchEnd.col)
              return { state: { ...wu, lines: nl, lastChange: { type: 'normal', keys: ['g', 'U', 'g', 'n'] } }, handled: true }
            }
            case 'gu': {
              const wu = pushUndo(withOp)
              const nl = [...wu.lines]
              const line = nl[pos.line] ?? ''
              nl[pos.line] = line.slice(0, pos.col) + line.slice(pos.col, matchEnd.col).toLowerCase() + line.slice(matchEnd.col)
              return { state: { ...wu, lines: nl, lastChange: { type: 'normal', keys: ['g', 'u', 'g', 'n'] } }, handled: true }
            }
            case 'c': {
              const result = ops.changeToPos(pushUndo(withOp), matchEnd)
              return { state: startInsertRecording(result, ['c', 'g', 'n']), handled: true }
            }
            case 'd': {
              const result = ops.deleteToPos(pushUndo(withOp), matchEnd)
              return { state: { ...result, lastChange: { type: 'normal', keys: ['d', 'g', 'n'] } }, handled: true }
            }
          }
        }
        return { state: { ...s, pendingOperator: null }, handled: true }
      }
      if (s.searchPattern) {
        const pos = searchFn(s, s.searchPattern)
        if (pos) {
          return {
            state: { ...s, mode: 'visual', visualStart: pos, visualMode: 'char',
              cursor: { line: pos.line, col: pos.col + s.searchPattern.length - 1 } },
            handled: true,
          }
        }
      }
      return { state: s, handled: true }
    }
    // Unknown g-combo — ignore
    return { state: s, handled: false }
  }

  // --- Pending gc (comment toggle) ---
  if (state.pendingKeys === 'gc') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'c') {
      // gcc — toggle comment on current line
      const result = toggleLineComment(pushUndo(s), s.cursor.line, s.cursor.line)
      return {
        state: { ...result, lastChange: { type: 'normal', keys: ['g', 'c', 'c'] } },
        handled: true,
      }
    }
    if (key === 'Escape') {
      return { state: s, handled: true }
    }
    // gc + motion — resolve motion, comment range
    const motion = resolveMotion(s, key)
    if (motion) {
      const startLine = Math.min(s.cursor.line, motion.line)
      const endLine = Math.max(s.cursor.line, motion.line)
      const result = toggleRangeComment(pushUndo(s), startLine, endLine)
      return {
        state: { ...result, lastChange: { type: 'normal', keys: ['g', 'c', key] } },
        handled: true,
      }
    }
    return { state: s, handled: false }
  }

  // --- Pending gs (surround) ---
  if (state.pendingKeys === 'gs') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'a') {
      return { state: { ...s, pendingKeys: 'gsa' }, handled: true }
    }
    if (key === 'd') {
      return { state: { ...s, pendingKeys: 'gsd' }, handled: true }
    }
    if (key === 'r') {
      return { state: { ...s, pendingKeys: 'gsr' }, handled: true }
    }
    return { state: s, handled: false }
  }

  // --- gsa: waiting for text object modifier (i/a) ---
  if (state.pendingKeys === 'gsa') {
    if (key === 'i' || key === 'a') {
      return { state: { ...state, pendingKeys: 'gsa' + key }, handled: true }
    }
    return { state: { ...state, pendingKeys: '' }, handled: false }
  }

  // --- gsai/gsaa: waiting for text object type (w, ", (, etc.) ---
  if (state.pendingKeys === 'gsai' || state.pendingKeys === 'gsaa') {
    // Resolve the text object range now to highlight it while waiting for surround char
    const modifier = state.pendingKeys[3] as 'i' | 'a'
    const range = resolveTextObject(state, modifier, key)
    return {
      state: {
        ...state,
        pendingKeys: state.pendingKeys + key,
        highlightRange: range,
      },
      handled: true,
    }
  }

  // --- gsaiX or gsaaX: waiting for surround character ---
  if (state.pendingKeys.length === 5 &&
      (state.pendingKeys.startsWith('gsai') || state.pendingKeys.startsWith('gsaa'))) {
    const modifier = state.pendingKeys[3] as 'i' | 'a'
    const objChar = state.pendingKeys[4]!
    const surroundChar = key
    const s: VimState = { ...state, pendingKeys: '', highlightRange: null }
    const range = resolveTextObject(s, modifier, objChar)
    if (range) {
      const withUndo = pushUndo(s)
      const result = addSurround(withUndo, range, surroundChar)
      return {
        state: {
          ...result,
          highlightRange: null,
          lastChange: { type: 'normal', keys: ['g', 's', 'a', modifier, objChar, surroundChar] },
        },
        handled: true,
      }
    }
    return { state: s, handled: true }
  }

  // --- gsd: waiting for char to delete surrounding ---
  if (state.pendingKeys === 'gsd') {
    const s: VimState = { ...state, pendingKeys: '' }
    const result = deleteSurround(s, key)
    if (result) {
      const withUndo = pushUndo(s)
      const deleted = deleteSurround(withUndo, key)
      return {
        state: {
          ...deleted!,
          lastChange: { type: 'normal', keys: ['g', 's', 'd', key] },
        },
        handled: true,
      }
    }
    return { state: s, handled: true }
  }

  // --- gsr: waiting for old char ---
  if (state.pendingKeys === 'gsr') {
    return { state: { ...state, pendingKeys: 'gsr' + key }, handled: true }
  }

  // --- gsrX: waiting for new char ---
  if (state.pendingKeys.length === 4 && state.pendingKeys.startsWith('gsr')) {
    const oldChar = state.pendingKeys[3]!
    const s: VimState = { ...state, pendingKeys: '' }
    const result = replaceSurround(s, oldChar, key)
    if (result) {
      const withUndo = pushUndo(s)
      const replaced = replaceSurround(withUndo, oldChar, key)
      return {
        state: {
          ...replaced!,
          lastChange: { type: 'normal', keys: ['g', 's', 'r', oldChar, key] },
        },
        handled: true,
      }
    }
    return { state: s, handled: true }
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

  // --- Pending [ (bracket prefix) ---
  if (state.pendingKeys === '[') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'e') {
      // [e — move current line UP
      if (s.cursor.line === 0) return { state: s, handled: true }
      const withUndo = pushUndo(s)
      const newLines = [...withUndo.lines]
      const currentLine = newLines[s.cursor.line]!
      newLines.splice(s.cursor.line, 1)
      newLines.splice(s.cursor.line - 1, 0, currentLine)
      return {
        state: {
          ...withUndo,
          lines: newLines,
          cursor: { line: s.cursor.line - 1, col: s.cursor.col },
          lastChange: { type: 'normal', keys: ['[', 'e'] },
        },
        handled: true,
      }
    }
    if (key === 'Escape') return { state: s, handled: true }
    return { state: s, handled: false }
  }

  // --- Pending ] (bracket prefix) ---
  if (state.pendingKeys === ']') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'e') {
      // ]e — move current line DOWN
      if (s.cursor.line >= s.lines.length - 1) return { state: s, handled: true }
      const withUndo = pushUndo(s)
      const newLines = [...withUndo.lines]
      const currentLine = newLines[s.cursor.line]!
      newLines.splice(s.cursor.line, 1)
      newLines.splice(s.cursor.line + 1, 0, currentLine)
      return {
        state: {
          ...withUndo,
          lines: newLines,
          cursor: { line: s.cursor.line + 1, col: s.cursor.col },
          lastChange: { type: 'normal', keys: [']', 'e'] },
        },
        handled: true,
      }
    }
    if (key === 'Escape') return { state: s, handled: true }
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

  // --- Pending " (register prefix) ---
  if (state.pendingKeys === '"') {
    const s: VimState = { ...state, pendingKeys: '', pendingRegister: key }
    return { state: s, handled: true }
  }

  // --- Pending q (macro record start) ---
  if (state.pendingKeys === 'q') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key >= 'a' && key <= 'z') {
      return { state: { ...s, macroRecording: key, macroBuf: [] }, handled: true }
    }
    return { state: s, handled: false }
  }

  // --- Pending @ (macro playback) ---
  if (state.pendingKeys === '@') {
    const s: VimState = { ...state, pendingKeys: '' }
    const regKey = key === '@' ? (s.lastMacroRegister ?? '') : key
    const macro = s.macroRegisters[regKey]
    if (macro && macro.length > 0) {
      const count = s.countPrefix ?? 1
      let current: VimState = { ...s, countPrefix: null, lastMacroRegister: regKey, isDotReplaying: true }
      for (let c = 0; c < count; c++) {
        for (const k of macro) {
          current = processKey(current, k).state
        }
      }
      return { state: { ...current, isDotReplaying: false }, handled: true }
    }
    return { state: { ...s, countPrefix: null }, handled: true }
  }

  // --- Pending m (set mark) ---
  if (state.pendingKeys === 'm') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key >= 'a' && key <= 'z') {
      return { state: { ...s, marks: { ...s.marks, [key]: { ...s.cursor } } }, handled: true }
    }
    return { state: s, handled: false }
  }

  // --- Pending ` (jump to mark) ---
  if (state.pendingKeys === '`') {
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === '`') {
      // `` — jump to position before last jump
      if (s.lastJumpPos) {
        const saved = { ...s.cursor }
        return { state: { ...s, cursor: s.lastJumpPos, lastJumpPos: saved }, handled: true }
      }
      return { state: s, handled: true }
    }
    if (key >= 'a' && key <= 'z') {
      const mark = s.marks[key]
      if (mark) {
        return { state: { ...s, cursor: mark, lastJumpPos: { ...s.cursor } }, handled: true }
      }
    }
    return { state: s, handled: false }
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

  // --- ~ toggle case of char under cursor ---
  if (key === '~') {
    const line = state.lines[state.cursor.line] ?? ''
    const ch = line[state.cursor.col]
    if (ch) {
      const toggled = ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()
      const newLines = [...state.lines]
      newLines[state.cursor.line] = line.slice(0, state.cursor.col) + toggled + line.slice(state.cursor.col + 1)
      const newCol = Math.min(state.cursor.col + 1, (newLines[state.cursor.line] ?? '').length - 1)
      return {
        state: { ...pushUndo(state), lines: newLines, cursor: { line: state.cursor.line, col: newCol }, lastChange: { type: 'normal', keys: ['~'] } },
        handled: true,
      }
    }
    return { state, handled: true }
  }

  // --- [ and ] prefix ---
  if (key === '[' || key === ']') {
    return { state: { ...state, pendingKeys: key }, handled: true }
  }

  // --- Ctrl-a / Ctrl-x (increment / decrement number) ---
  if (key === 'Control-a' || key === 'Control-x') {
    const line = state.lines[state.cursor.line] ?? ''
    // Find number at or after cursor
    const after = line.slice(state.cursor.col)
    const match = after.match(/\d+/)
    if (!match || match.index === undefined) return { state, handled: true }

    const numStart = state.cursor.col + match.index
    const numStr = match[0]
    const num = parseInt(numStr, 10)
    const count = state.countPrefix ?? 1
    const newNum = key === 'Control-a' ? num + count : num - count
    const newNumStr = String(newNum)

    const withUndo = pushUndo(state)
    const newLine = line.slice(0, numStart) + newNumStr + line.slice(numStart + numStr.length)
    const newLines = [...withUndo.lines]
    newLines[state.cursor.line] = newLine

    return {
      state: {
        ...withUndo,
        lines: newLines,
        cursor: { line: state.cursor.line, col: numStart + newNumStr.length - 1 },
        countPrefix: null,
        lastChange: { type: 'normal', keys: [key] },
      },
      handled: true,
    }
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

  // --- Replace mode ---
  if (key === 'R') {
    const s = pushUndo(state)
    return {
      state: { ...s, mode: 'replace', isRecordingInsert: true, insertKeyBuf: ['R'] },
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

  // --- Register prefix (") ---
  if (key === '"') {
    return { state: { ...state, pendingKeys: '"' }, handled: true }
  }

  // --- Macro record (q) ---
  if (key === 'q' && !state.macroRecording) {
    return { state: { ...state, pendingKeys: 'q' }, handled: true }
  }

  // --- Macro playback (@) ---
  if (key === '@') {
    return { state: { ...state, pendingKeys: '@' }, handled: true }
  }

  // --- Set mark (m) ---
  if (key === 'm') {
    return { state: { ...state, pendingKeys: 'm' }, handled: true }
  }

  // --- Jump to mark (`) ---
  if (key === '`') {
    return { state: { ...state, pendingKeys: '`' }, handled: true }
  }

  // --- % bracket match ---
  if (key === '%') {
    const pos = matchBracket(state)
    if (pos) {
      return { state: { ...state, cursor: pos, countPrefix: null, lastJumpPos: { ...state.cursor } }, handled: true }
    }
    return { state, handled: true }
  }

  return { state, handled: false }
}

// ---------------------------------------------------------------------------
// Bracket match (%)
// ---------------------------------------------------------------------------

function matchBracket(state: VimState): CursorPos | null {
  const line = state.lines[state.cursor.line] ?? ''
  const ch = line[state.cursor.col]
  const pairs: Record<string, string> = { '(': ')', ')': '(', '{': '}', '}': '{', '[': ']', ']': '[', '<': '>', '>': '<' }
  const match = pairs[ch ?? '']
  if (!ch || !match) return null

  const isOpen = '({[<'.includes(ch)
  if (isOpen) {
    // Scan forward
    let depth = 0
    for (let ln = state.cursor.line; ln < state.lines.length; ln++) {
      const lineStr = state.lines[ln] ?? ''
      const sc = ln === state.cursor.line ? state.cursor.col + 1 : 0
      for (let c = sc; c < lineStr.length; c++) {
        if (lineStr[c] === ch) depth++
        else if (lineStr[c] === match) {
          if (depth === 0) return { line: ln, col: c }
          depth--
        }
      }
    }
  } else {
    // Scan backward
    let depth = 0
    for (let ln = state.cursor.line; ln >= 0; ln--) {
      const lineStr = state.lines[ln] ?? ''
      const sc = ln === state.cursor.line ? state.cursor.col - 1 : lineStr.length - 1
      for (let c = sc; c >= 0; c--) {
        if (lineStr[c] === ch) depth++
        else if (lineStr[c] === match) {
          if (depth === 0) return { line: ln, col: c }
          depth--
        }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Visual mode
// ---------------------------------------------------------------------------

function handleVisualMode(state: VimState, key: string): KeyResult {
  // Escape — exit visual, clear selection (save for gv)
  if (key === 'Escape') {
    return {
      state: {
        ...state,
        mode: 'normal',
        visualStart: null,
        visualMode: null,
        lastVisualStart: state.visualStart,
        lastVisualEnd: state.cursor,
        lastVisualMode: state.visualMode,
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
          lastVisualStart: state.visualStart,
          lastVisualEnd: state.cursor,
          lastVisualMode: state.visualMode,
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
          lastVisualStart: state.visualStart,
          lastVisualEnd: state.cursor,
          lastVisualMode: state.visualMode,
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

  // Pending text object (vi/va + object key)
  if (state.pendingKeys === 'vi' || state.pendingKeys === 'va') {
    const modifier = state.pendingKeys === 'vi' ? 'i' : 'a' as 'i' | 'a'
    const s: VimState = { ...state, pendingKeys: '' }
    if (key === 'Escape') return { state: s, handled: true }
    const range = resolveTextObject(s, modifier, key)
    if (range) {
      // Extend visual selection: anchor becomes range start, cursor becomes range end - 1
      const endCol = Math.max(0, range.end.col - 1)
      return {
        state: {
          ...s,
          visualStart: range.start,
          cursor: { line: range.end.line, col: endCol },
        },
        handled: true,
      }
    }
    return { state: s, handled: false }
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

  // Text object modifiers (i/a) — extend visual selection to text object
  if (key === 'i' || key === 'a') {
    return { state: { ...state, pendingKeys: 'v' + key }, handled: true }
  }

  // Operators: d, c, y
  if (key === 'd' || key === 'c' || key === 'y') {
    return executeVisualOperator(state, key)
  }

  // Indent/dedent in visual mode
  if (key === '>' || key === '<') {
    return executeVisualIndent(state, key)
  }

  // U/u — uppercase/lowercase in visual mode
  if (key === 'U' || key === 'u') {
    return executeVisualCase(state, key)
  }

  // p — paste replacing selection
  if (key === 'p') {
    return executeVisualPaste(state)
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
    lastVisualStart: state.visualStart,
    lastVisualEnd: state.cursor,
    lastVisualMode: state.visualMode,
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
          registers: { ...state.registers, '0': text },
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
    lastVisualStart: state.visualStart,
    lastVisualEnd: state.cursor,
    lastVisualMode: state.visualMode,
  }

  switch (op) {
    case 'd': {
      // Yank all lines first (deleteLine overwrites register each call)
      const yankedLines = state.lines.slice(startLine, endLine + 1)
      const register = yankedLines.join('\n') + '\n'
      let s: VimState = { ...state, ...exitVisual, cursor: { line: startLine, col: 0 } }
      const lineCount = endLine - startLine + 1
      for (let i = 0; i < lineCount; i++) {
        s = ops.deleteLine(s)
      }
      return {
        state: { ...s, register, lastChange: null },
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
      const yankText = yankedLines.join('\n') + '\n'
      return {
        state: {
          ...state,
          ...exitVisual,
          register: yankText,
          registers: { ...state.registers, '0': yankText },
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
// Visual indent
// ---------------------------------------------------------------------------

function executeVisualIndent(state: VimState, key: string): KeyResult {
  const anchor = state.visualStart!
  const cursor = state.cursor
  const startLine = Math.min(anchor.line, cursor.line)
  const endLine = Math.max(anchor.line, cursor.line)

  // For character-wise visual, still indent full lines
  const exitVisual = {
    mode: 'normal' as const,
    visualStart: null,
    visualMode: null,
    lastVisualStart: state.visualStart,
    lastVisualEnd: state.cursor,
    lastVisualMode: state.visualMode,
  }

  const s = pushUndo({ ...state, ...exitVisual })
  const newLines = [...s.lines]
  const end = Math.min(endLine, newLines.length - 1)
  const direction = key === '>' ? 'indent' : 'dedent'

  for (let i = startLine; i <= end; i++) {
    const line = newLines[i] ?? ''
    if (direction === 'indent') {
      newLines[i] = '  ' + line
    } else {
      newLines[i] = line.replace(/^  /, '')
    }
  }

  const lineCount = end - startLine + 1
  // Record as normal-mode equivalent (e.g. >j for 2 lines, >2j for 3 lines)
  const motionKeys: string[] = lineCount > 2
    ? [key, String(lineCount - 1), 'j']
    : lineCount === 2
      ? [key, 'j']
      : [key, key]
  return {
    state: {
      ...s,
      lines: newLines,
      cursor: { line: startLine, col: 0 },
      lastChange: { type: 'normal' as const, keys: motionKeys },
    },
    handled: true,
  }
}

// ---------------------------------------------------------------------------
// Visual case (U/u)
// ---------------------------------------------------------------------------

function executeVisualCase(state: VimState, key: string): KeyResult {
  const anchor = state.visualStart!
  const cursor = state.cursor
  const toUpper = key === 'U'

  const exitVisual = {
    mode: 'normal' as const,
    visualStart: null,
    visualMode: null,
    lastVisualStart: state.visualStart,
    lastVisualEnd: state.cursor,
    lastVisualMode: state.visualMode,
  }

  const s = pushUndo({ ...state, ...exitVisual })

  if (state.visualMode === 'line') {
    const startLine = Math.min(anchor.line, cursor.line)
    const endLine = Math.max(anchor.line, cursor.line)
    const newLines = [...s.lines]
    for (let i = startLine; i <= endLine; i++) {
      newLines[i] = toUpper ? (newLines[i] ?? '').toUpperCase() : (newLines[i] ?? '').toLowerCase()
    }
    return {
      state: { ...s, lines: newLines, cursor: { line: startLine, col: 0 } },
      handled: true,
    }
  }

  // Character-wise visual
  const before = anchor.line < cursor.line
    || (anchor.line === cursor.line && anchor.col <= cursor.col)
  const start = before ? anchor : cursor
  const end = before ? cursor : anchor

  const newLines = [...s.lines]

  if (start.line === end.line) {
    const line = newLines[start.line] ?? ''
    const segment = line.slice(start.col, end.col + 1)
    const transformed = toUpper ? segment.toUpperCase() : segment.toLowerCase()
    newLines[start.line] = line.slice(0, start.col) + transformed + line.slice(end.col + 1)
  } else {
    // Multi-line char-wise
    const firstLine = newLines[start.line] ?? ''
    const firstSeg = firstLine.slice(start.col)
    newLines[start.line] = firstLine.slice(0, start.col) + (toUpper ? firstSeg.toUpperCase() : firstSeg.toLowerCase())

    for (let i = start.line + 1; i < end.line; i++) {
      newLines[i] = toUpper ? (newLines[i] ?? '').toUpperCase() : (newLines[i] ?? '').toLowerCase()
    }

    const lastLine = newLines[end.line] ?? ''
    const lastSeg = lastLine.slice(0, end.col + 1)
    newLines[end.line] = (toUpper ? lastSeg.toUpperCase() : lastSeg.toLowerCase()) + lastLine.slice(end.col + 1)
  }

  return {
    state: { ...s, lines: newLines, cursor: start },
    handled: true,
  }
}

// ---------------------------------------------------------------------------
// Visual paste
// ---------------------------------------------------------------------------

function executeVisualPaste(state: VimState): KeyResult {
  if (!state.register) return { state, handled: false }

  const anchor = state.visualStart!
  const cursor = state.cursor

  const exitVisual = {
    mode: 'normal' as const,
    visualStart: null,
    visualMode: null,
    lastVisualStart: state.visualStart,
    lastVisualEnd: state.cursor,
    lastVisualMode: state.visualMode,
  }

  const s = pushUndo({ ...state, ...exitVisual })

  if (state.visualMode === 'line') {
    const startLine = Math.min(anchor.line, cursor.line)
    const endLine = Math.max(anchor.line, cursor.line)
    const newLines = [...s.lines]
    const pasteLines = s.register.endsWith('\n')
      ? s.register.slice(0, -1).split('\n')
      : [s.register]
    newLines.splice(startLine, endLine - startLine + 1, ...pasteLines)
    return {
      state: { ...s, lines: newLines, cursor: { line: startLine, col: 0 } },
      handled: true,
    }
  }

  // Character-wise: replace selected text with register content
  const before = anchor.line < cursor.line
    || (anchor.line === cursor.line && anchor.col <= cursor.col)
  const start = before ? anchor : cursor
  const end = before ? cursor : anchor

  // Save register content before delete (delete overwrites register)
  const pasteText = s.register

  // Delete selected text
  const newLines = [...s.lines]
  const endExcl: CursorPos = { line: end.line, col: end.col + 1 }
  const positioned = { ...s, cursor: start, lines: newLines }
  const afterDelete = ops.deleteToPos(positioned, endExcl)

  // Insert saved register content at the start of the deleted range
  const insertLine = start.line
  const insertCol = start.col
  const line = afterDelete.lines[insertLine] ?? ''
  const insertText = pasteText
  const finalLines = [...afterDelete.lines]
  finalLines[insertLine] = line.slice(0, insertCol) + insertText + line.slice(insertCol)

  return {
    state: {
      ...afterDelete,
      lines: finalLines,
      cursor: { line: insertLine, col: insertCol + insertText.length - 1 },
    },
    handled: true,
  }
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

      // If an operator is pending (d/pattern, c/pattern, y/pattern),
      // apply the operator from original cursor to search result
      if (state.pendingOperator && pos) {
        const op = state.pendingOperator
        const s: VimState = {
          ...state,
          mode: 'normal',
          commandBuffer: '',
          searchPattern: pattern,
          searchDirection: 'forward',
          pendingOperator: null,
        }
        const changeKeys = [op, '/', ...pattern.split(''), 'Enter']
        switch (op) {
          case 'd': {
            const result = ops.deleteToPos(s, pos)
            return {
              state: { ...result, lastChange: { type: 'normal', keys: changeKeys } },
              handled: true,
            }
          }
          case 'c': {
            const result = ops.changeToPos(s, pos)
            return { state: startInsertRecording(result, changeKeys), handled: true }
          }
          case 'y': {
            const result = ops.yankToPos(s, pos)
            return { state: result, handled: true }
          }
        }
      }

      return {
        state: {
          ...state,
          mode: 'normal',
          commandBuffer: '',
          searchPattern: pattern,
          searchDirection: 'forward',
          pendingOperator: null,
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

    // Forward find motions (f/t) are inclusive — include the char at target
    let adjustedPos = pos
    if (direction === 'forward' && pos.line === withFind.cursor.line) {
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

    // Split multi-char operators (gU, gu) into individual keys for dot replay
    const changeKeys = op.length > 1 ? [...op.split(''), modifier, key] : [op, modifier, key]

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
      case '>':
      case '<': {
        const startLine = range.start.line
        const endLine = range.end.line > range.start.line && range.end.col === 0
          ? range.end.line - 1  // exclusive end on next line means endLine is previous
          : range.end.line
        const result = executeIndent(
          s, startLine, endLine,
          op === '>' ? 'indent' : 'dedent',
        )
        return { ...result, state: { ...result.state, lastChange: { type: 'normal', keys: changeKeys } } }
      }
      case 'gU':
      case 'gu': {
        const toUpper = op === 'gU'
        const withUndo = pushUndo(s)
        const newLines = [...withUndo.lines]
        // Apply case change to the range covered by the text object
        if (range.start.line === range.end.line) {
          const line = newLines[range.start.line] ?? ''
          const seg = line.slice(range.start.col, range.end.col)
          newLines[range.start.line] = line.slice(0, range.start.col)
            + (toUpper ? seg.toUpperCase() : seg.toLowerCase())
            + line.slice(range.end.col)
        } else {
          for (let i = range.start.line; i <= range.end.line; i++) {
            newLines[i] = toUpper ? (newLines[i] ?? '').toUpperCase() : (newLines[i] ?? '').toLowerCase()
          }
        }
        return {
          state: { ...withUndo, lines: newLines, cursor: range.start, lastChange: { type: 'normal', keys: changeKeys } },
          handled: true,
        }
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

  // gUU / guu — uppercase/lowercase entire line
  if ((op === 'gU' && key === 'U') || (op === 'gu' && key === 'u')) {
    const toUpper = op === 'gU'
    const withUndo = pushUndo({ ...s, countPrefix: null, operatorCount: null, pendingOperator: null })
    const newLines = [...withUndo.lines]
    const ln = withUndo.cursor.line
    newLines[ln] = toUpper ? (newLines[ln] ?? '').toUpperCase() : (newLines[ln] ?? '').toLowerCase()
    return {
      state: { ...withUndo, lines: newLines, lastChange: { type: 'normal', keys: ['g', key, key] } },
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

  // Search as operator motion — d/pattern<CR>, c/pattern<CR>, y/pattern<CR>
  if (key === '/') {
    return {
      state: { ...state, mode: 'command', commandBuffer: '/', pendingOperator: op },
      handled: true,
    }
  }

  // g prefix in operator-pending — for gn/gg motions
  if (key === 'g') {
    return { state: { ...state, pendingKeys: 'g' }, handled: true }
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
        const yankText = yankedLines.join('\n') + '\n'
        s = { ...s, register: yankText, registers: { ...s.registers, '0': yankText } }
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
  // Split multi-char operators (gU, gu) into individual keys for dot replay
  const opKeys = op.length > 1 ? op.split('') : [op]
  const changeKeys = count > 1
    ? [String(count), ...opKeys, motionKey]
    : [...opKeys, motionKey]

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
    case 'gU':
    case 'gu': {
      const toUpper = op === 'gU'
      const withUndo = pushUndo(state)
      const start = state.cursor
      const end = adjustedTarget
      const newLines = [...withUndo.lines]
      if (start.line === end.line) {
        const line = newLines[start.line] ?? ''
        const s = Math.min(start.col, end.col)
        const e = Math.max(start.col, end.col)
        const segment = line.slice(s, e)
        newLines[start.line] = line.slice(0, s) + (toUpper ? segment.toUpperCase() : segment.toLowerCase()) + line.slice(e)
      } else {
        const startLn = Math.min(start.line, end.line)
        const endLn = Math.max(start.line, end.line)
        for (let i = startLn; i <= endLn; i++) {
          newLines[i] = toUpper ? (newLines[i] ?? '').toUpperCase() : (newLines[i] ?? '').toLowerCase()
        }
      }
      return {
        state: { ...withUndo, lines: newLines, lastChange: { type: 'normal', keys: ['g', op === 'gU' ? 'U' : 'u', motionKey] } },
        handled: true,
      }
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

  // % bracket match
  if (key === '%') return matchBracket(state)

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
