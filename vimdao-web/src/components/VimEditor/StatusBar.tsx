import type { VimState } from '../../engine/vim-types'

interface StatusBarProps {
  state: VimState
  title?: string
}

export default function StatusBar({ state, title }: StatusBarProps) {
  const modeLabel = state.mode === 'insert' ? '-- 插入 --' : ''
  const line = state.cursor.line + 1
  const col = state.cursor.col + 1
  const pending = state.pendingOperator
    ? state.pendingOperator + state.pendingKeys
    : state.pendingKeys

  return (
    <div className="flex items-center justify-between bg-ctp-mantle px-3 py-1 text-xs text-ctp-subtext0">
      <span className="min-w-[100px] font-bold text-ctp-green">{modeLabel}</span>
      <span className="text-ctp-subtext1">{title ?? ''}</span>
      <span className="flex items-center gap-4">
        {pending && (
          <span className="text-ctp-yellow font-mono">{pending}</span>
        )}
        <span>行 {line}, 列 {col}</span>
      </span>
    </div>
  )
}
