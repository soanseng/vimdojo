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
