export type VimMode = 'normal' | 'insert' | 'replace' | 'operator-pending' | 'visual' | 'command'

export interface CursorPos {
  line: number
  col: number
}

export interface VimState {
  lines: string[]
  cursor: CursorPos
  mode: VimMode
  register: string
  undoStack: VimSnapshot[]
  lastChange: RecordedChange | null
  pendingOperator: string | null
  pendingKeys: string
  keyLog: string[]
  lastFind: FindParams | null
  insertKeyBuf: string[]       // tracks keys typed during insert for dot replay
  isRecordingInsert: boolean   // true while recording an insert session
  isDotReplaying: boolean      // true during dot command replay (prevents re-recording)
  countPrefix: number | null   // accumulated count prefix (e.g. 3 in 3w, 12 in 12j)
  operatorCount: number | null  // count before operator (e.g. 2 in 2d3w -> total 6)
  searchPattern: string | null
  searchDirection: 'forward' | 'backward'
  commandBuffer: string         // for / and : command input
  visualStart: CursorPos | null  // anchor point where selection started
  visualMode: 'char' | 'line' | null  // character-wise or line-wise
  lastCommand: string | null      // last ex-command result (e.g. 'write', 'quit')
  highlightRange: { start: CursorPos; end: CursorPos } | null  // visual highlight for pending operations (surround, etc.)
  lastVisualStart: CursorPos | null   // saved visual selection for gv
  lastVisualEnd: CursorPos | null
  lastVisualMode: 'char' | 'line' | null
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
  keys: string[]
}

export interface KeyResult {
  state: VimState
  handled: boolean
}
