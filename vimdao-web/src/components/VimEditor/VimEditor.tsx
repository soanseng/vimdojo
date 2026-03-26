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
    // Ignore IME composition events (e.g., Chinese input method active)
    if (e.nativeEvent.isComposing) return
    if (IGNORED_KEYS.has(e.key)) return
    // Skip unidentified/dead keys from IME
    if (e.key === 'Dead' || e.key === 'Process' || e.key === 'Unidentified') return

    e.preventDefault()

    // Handle Ctrl combos (Ctrl-a, Ctrl-x, etc.)
    if (e.ctrlKey && e.key.length === 1) {
      onKey(`Control-${e.key}`)
      return
    }

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
          <div className="flex-1 py-2 pl-3 whitespace-pre">
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
        {/* Surround / operator pending indicators */}
        {state.pendingKeys.startsWith('gs') && (
          <div className="absolute top-2 right-2 text-xs bg-ctp-green/20 text-ctp-green px-2 py-1 rounded">
            {state.pendingKeys === 'gs' && '\u74B0\u7E5E\uFF1A\u9078\u64C7 a(\u52A0) d(\u522A) r(\u63DB)'}
            {state.pendingKeys === 'gsa' && '\u74B0\u7E5E\u65B0\u589E\uFF1A\u9078\u64C7\u6587\u5B57\u7269\u4EF6 (iw, i", i(...)'}
            {state.pendingKeys.startsWith('gsai') && '\u74B0\u7E5E\u65B0\u589E\uFF1A\u8F38\u5165\u74B0\u7E5E\u7B26\u865F (" \' ( [ { <)'}
            {state.pendingKeys === 'gsd' && '\u74B0\u7E5E\u522A\u9664\uFF1A\u8F38\u5165\u8981\u522A\u9664\u7684\u7B26\u865F'}
            {state.pendingKeys === 'gsr' && '\u74B0\u7E5E\u66FF\u63DB\uFF1A\u8F38\u5165\u820A\u7B26\u865F'}
            {state.pendingKeys.length === 4 && state.pendingKeys.startsWith('gsr') && '\u74B0\u7E5E\u66FF\u63DB\uFF1A\u8F38\u5165\u65B0\u7B26\u865F'}
          </div>
        )}
        {state.pendingKeys === 'gc' && (
          <div className="absolute top-2 right-2 text-xs bg-ctp-yellow/20 text-ctp-yellow px-2 py-1 rounded">
            {'\u8A3B\u89E3\uFF1A\u6309 c \u5207\u63DB\u7576\u524D\u884C\uFF0C\u6216\u6309\u79FB\u52D5\u9375\u9078\u7BC4\u570D'}
          </div>
        )}
        {(state.pendingKeys === '[' || state.pendingKeys === ']') && (
          <div className="absolute top-2 right-2 text-xs bg-ctp-peach/20 text-ctp-peach px-2 py-1 rounded">
            {'\u6309 e \u79FB\u52D5\u884C'}
          </div>
        )}
        {state.pendingOperator && !state.pendingKeys.startsWith('gs') && state.pendingKeys !== 'gc' && state.pendingKeys !== '[' && state.pendingKeys !== ']' && (
          <div className="absolute top-2 right-2 text-xs bg-ctp-blue/20 text-ctp-blue px-2 py-1 rounded">
            {'\u64CD\u4F5C\u7B26'} {state.pendingOperator}{'\uFF1A\u8F38\u5165\u79FB\u52D5\u6216\u6587\u5B57\u7269\u4EF6'}
          </div>
        )}
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
          <span className="border-l-2 border-ctp-green animate-pulse">{'\u00A0'}</span>
        )
      }
      return (
        <span className="bg-ctp-blue text-ctp-crust">{'\u00A0'}</span>
      )
    }
    return <span>{'\u00A0'}</span>
  }

  const chars: React.ReactNode[] = []

  // In insert mode, if cursor is at position 0 on this line, show line cursor before first char
  if (isCursorLine && state.mode === 'insert' && cursorCol === 0) {
    chars.push(
      <span key="cursor-insert" className="border-l-2 border-ctp-green animate-pulse" />
    )
  }

  // Determine highlight range: either explicit highlightRange or visual mode selection
  let hr = state.highlightRange
  if (!hr && state.mode === 'visual' && state.visualStart) {
    // Build range from visual selection
    const vs = state.visualStart
    const cur = state.cursor
    if (state.visualMode === 'char') {
      const startBefore = vs.line < cur.line || (vs.line === cur.line && vs.col <= cur.col)
      hr = startBefore
        ? { start: vs, end: { line: cur.line, col: cur.col + 1 } }
        : { start: cur, end: { line: vs.line, col: vs.col + 1 } }
    } else if (state.visualMode === 'line') {
      const startLine = Math.min(vs.line, cur.line)
      const endLine = Math.max(vs.line, cur.line)
      hr = { start: { line: startLine, col: 0 }, end: { line: endLine, col: 99999 } }
    }
  }

  // Check if this line intersects the highlight range
  const isHighlightLine = hr !== null && lineIdx >= hr.start.line && lineIdx <= hr.end.line
  const hlStartCol = hr && lineIdx === hr.start.line ? hr.start.col : 0
  const hlEndCol = hr && lineIdx === hr.end.line ? hr.end.col : line.length

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!

    // Check if this char is in the highlight range
    const inHighlight = isHighlightLine && i >= hlStartCol && i < hlEndCol

    if (isCursorLine && i === cursorCol) {
      if (state.mode === 'insert') {
        chars.push(
          <span key={i} className="border-l-2 border-ctp-green animate-pulse">{ch}</span>
        )
      } else {
        chars.push(
          <span key={i} className={`font-bold ${inHighlight ? 'bg-ctp-yellow text-ctp-crust' : 'bg-ctp-blue text-ctp-crust'}`}>{ch}</span>
        )
      }
    } else if (inHighlight) {
      chars.push(
        <span key={i} className="bg-ctp-yellow/40 text-ctp-yellow">{ch}</span>
      )
    } else {
      chars.push(<span key={i}>{ch}</span>)
    }
  }

  // Insert mode cursor at end of line
  if (isCursorLine && state.mode === 'insert' && cursorCol >= line.length) {
    chars.push(
      <span key="cursor-end" className="border-l-2 border-ctp-green animate-pulse">{'\u00A0'}</span>
    )
  }

  return <>{chars}</>
}
