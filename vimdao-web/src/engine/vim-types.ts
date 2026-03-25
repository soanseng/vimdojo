export type VimMode = 'normal' | 'insert' | 'operator-pending'

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
