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
