import { useRef, useEffect, useCallback } from 'react'
import type { VimState } from '../../engine/vim-types'
import StatusBar from './StatusBar'
import KeyLog from './KeyLog'

interface VimEditorProps {
  state: VimState
  onKey: (key: string) => void
  title?: string
  showKeyLog?: boolean
}

const IGNORED_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'Tab',
  'CapsLock', 'NumLock', 'ScrollLock',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Insert', 'Delete', 'Home', 'End',
  'PageUp', 'PageDown',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ContextMenu', 'PrintScreen', 'Pause',
])

export default function VimEditor({ state, onKey, title, showKeyLog = true }: VimEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    editorRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (IGNORED_KEYS.has(e.key)) return

    e.preventDefault()
    onKey(e.key)
  }, [onKey])

  return (
    <div className="vim-editor flex flex-col rounded-lg overflow-hidden border border-ctp-surface1">
      <div
        ref={editorRef}
        tabIndex={0}
        role="application"
        aria-label={title ?? 'Vim 編輯器'}
        onKeyDown={handleKeyDown}
        className="relative bg-ctp-base text-ctp-text outline-none flex-1 min-h-[200px] overflow-auto"
      >
        <div className="flex">
          {/* Line numbers gutter */}
          <div aria-hidden="true" className="bg-ctp-mantle text-ctp-overlay0 text-right select-none py-2 pr-3 pl-2">
            {state.lines.map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>
          {/* Editor content */}
          <div className="flex-1 py-2 pl-3">
            {state.lines.map((line, lineIdx) => (
              <div
                key={lineIdx}
                className={`leading-6 ${lineIdx === state.cursor.line ? 'bg-ctp-surface0/30' : ''}`}
              >
                {renderLine(line, lineIdx, state)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <StatusBar state={state} title={title} />
      {showKeyLog && <KeyLog keys={state.keyLog} />}
    </div>
  )
}

function renderLine(line: string, lineIdx: number, state: VimState) {
  const isCursorLine = lineIdx === state.cursor.line
  const cursorCol = state.cursor.col

  if (line.length === 0) {
    // Empty line — show cursor if on this line
    if (isCursorLine) {
      if (state.mode === 'insert') {
        return (
          <span className="border-l-2 border-ctp-blue">{'\u00A0'}</span>
        )
      }
      return (
        <span className="bg-ctp-blue/80 text-ctp-base">{'\u00A0'}</span>
      )
    }
    return <span>{'\u00A0'}</span>
  }

  const chars: React.ReactNode[] = []

  // In insert mode, if cursor is at position 0 on this line, show line cursor before first char
  if (isCursorLine && state.mode === 'insert' && cursorCol === 0) {
    chars.push(
      <span key="cursor-insert" className="border-l-2 border-ctp-blue" />
    )
  }

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (isCursorLine && i === cursorCol) {
      if (state.mode === 'insert') {
        chars.push(
          <span key={i} className="border-l-2 border-ctp-blue">{ch}</span>
        )
      } else {
        chars.push(
          <span key={i} className="bg-ctp-blue/80 text-ctp-base">{ch}</span>
        )
      }
    } else {
      chars.push(<span key={i}>{ch}</span>)
    }
  }

  // Insert mode cursor at end of line
  if (isCursorLine && state.mode === 'insert' && cursorCol >= line.length) {
    chars.push(
      <span key="cursor-end" className="border-l-2 border-ctp-blue">{'\u00A0'}</span>
    )
  }

  return <>{chars}</>
}
