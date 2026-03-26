import { useState, useEffect, useMemo } from 'react'
import type { CommandEntry, CommandIndex } from '../../types'

const CATEGORY_LABELS: Record<string, string> = {
  motion: '移動',
  operator: '操作',
  'text-object': '文字物件',
  insert: '插入',
  visual: '視覺',
  command: '命令列',
  other: '其他',
}

const CATEGORY_COLORS: Record<string, string> = {
  motion: 'bg-ctp-blue/20 text-ctp-blue',
  operator: 'bg-ctp-red/20 text-ctp-red',
  'text-object': 'bg-ctp-mauve/20 text-ctp-mauve',
  insert: 'bg-ctp-green/20 text-ctp-green',
  visual: 'bg-ctp-peach/20 text-ctp-peach',
  command: 'bg-ctp-yellow/20 text-ctp-yellow',
  other: 'bg-ctp-surface1 text-ctp-subtext0',
}

const FILTER_CATEGORIES = ['motion', 'operator', 'text-object', 'insert', 'visual', 'other'] as const

export default function CommandRef() {
  const [commands, setCommands] = useState<CommandEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(import.meta.env.BASE_URL + 'data/merged_commands.json', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        return res.json() as Promise<CommandIndex>
      })
      .then(data => {
        if (!Array.isArray(data?.commands)) {
          throw new Error('Invalid command data format')
        }
        setCommands(data.commands)
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })
    return () => { controller.abort() }
  }, [])

  const filtered = useMemo(() => {
    return commands.filter(cmd => {
      if (filterCategory !== null && cmd.category !== filterCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return cmd.command.toLowerCase().includes(q) ||
               cmd.category.toLowerCase().includes(q)
      }
      return true
    })
  }, [commands, filterCategory, searchQuery])

  if (loading) {
    return (
      <div className="min-h-screen bg-ctp-base text-ctp-text flex items-center justify-center">
        <span className="text-ctp-subtext0">載入中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ctp-base text-ctp-text flex items-center justify-center">
        <span className="text-ctp-red">錯誤: {error}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-ctp-subtext1 mb-6">
          指令速查 ({filtered.length}/{commands.length})
        </h2>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ctp-overlay0 w-16 shrink-0">類型:</span>
            <button
              onClick={() => { setFilterCategory(null) }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filterCategory === null
                  ? 'bg-ctp-blue text-ctp-base'
                  : 'bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1'
              }`}
            >
              全部
            </button>
            {FILTER_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setFilterCategory(filterCategory === cat ? null : cat) }}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filterCategory === cat
                    ? 'bg-ctp-blue text-ctp-base'
                    : `${CATEGORY_COLORS[cat] ?? 'bg-ctp-surface0 text-ctp-subtext0'} hover:opacity-80`
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="搜尋指令..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value) }}
            className="w-full max-w-sm bg-ctp-surface0 border border-ctp-surface1 rounded px-3 py-1.5 text-sm text-ctp-text placeholder-ctp-overlay0 outline-none focus:border-ctp-blue transition-colors"
          />
        </div>

        {/* Command grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(cmd => {
            const colorClass = CATEGORY_COLORS[cmd.category] ?? CATEGORY_COLORS['other']!
            const label = CATEGORY_LABELS[cmd.category] ?? cmd.category
            return (
              <div
                key={`${cmd.command}-${cmd.category}`}
                className="bg-ctp-surface0 rounded-lg p-4 border border-ctp-surface1"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-base font-mono text-ctp-blue font-bold">
                    {cmd.command}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}>
                    {label}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-ctp-overlay0 mb-2">
                  <span>出現 {cmd.frequency} 次</span>
                  <span>章節: {cmd.chapters.slice(0, 5).join(', ')}{cmd.chapters.length > 5 ? '...' : ''}</span>
                </div>

                {cmd.context_examples && cmd.context_examples.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {cmd.context_examples.slice(0, 2).map((ex, i) => (
                      <p
                        key={i}
                        className="text-xs text-ctp-subtext0 bg-ctp-base rounded px-2 py-1 font-mono truncate"
                      >
                        {ex}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-ctp-overlay0 py-12">
            沒有符合條件的指令
          </div>
        )}
      </main>
    </div>
  )
}
