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
    insertKeyBuf: [],
    isRecordingInsert: false,
    isDotReplaying: false,
    countPrefix: null,
    operatorCount: null,
    searchPattern: null,
    searchDirection: 'forward' as const,
    commandBuffer: '',
    visualStart: null,
    visualMode: null,
    lastCommand: null,
    highlightRange: null,
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
