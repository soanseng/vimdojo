import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet, StoryData, StoryChapter, KeybindingEntry } from '../../types'

export default function Library() {
  const navigate = useNavigate()
  const [chapters, setChapters] = useState<StoryChapter[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [keybindings, setKeybindings] = useState<KeybindingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)
  const [expandedKbCategory, setExpandedKbCategory] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetch('/data/story.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<StoryData>
        }),
      fetch('/data/practical-vim_challenges.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<ChallengeSet>
        }),
      fetch('/data/lazyvim_keybindings.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<KeybindingEntry[]>
        }),
    ])
      .then(([storyData, challengeData, kbData]) => {
        setChapters(storyData?.chapters ?? [])
        setChallenges(challengeData?.challenges ?? [])
        setKeybindings(kbData ?? [])
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })

    return () => { controller.abort() }
  }, [])

  // Group challenges by chapter
  const challengesByChapter = useMemo(() => {
    const map = new Map<number, Challenge[]>()
    for (const c of challenges) {
      const ch = c.source.chapter
      const list = map.get(ch) ?? []
      list.push(c)
      map.set(ch, list)
    }
    return map
  }, [challenges])

  // Group keybindings by category
  const kbByCategory = useMemo(() => {
    const map = new Map<string, KeybindingEntry[]>()
    for (const kb of keybindings) {
      const list = map.get(kb.category) ?? []
      list.push(kb)
      map.set(kb.category, list)
    }
    return map
  }, [keybindings])

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
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <h2 className="text-lg font-semibold text-ctp-subtext1">書庫</h2>

        {/* Practical Vim */}
        <section>
          <h3 className="text-base font-bold text-ctp-blue mb-1">
            Practical Vim, 2nd Edition
          </h3>
          <p className="text-xs text-ctp-overlay0 mb-4">Drew Neil &middot; {challenges.length} 道練習題</p>

          <div className="space-y-2">
            {chapters.map(ch => {
              const chChallenges = challengesByChapter.get(ch.chapter_id) ?? []
              const isExpanded = expandedChapter === ch.chapter_id
              return (
                <div key={ch.chapter_id} className="bg-ctp-surface0 rounded-lg border border-ctp-surface1">
                  <button
                    onClick={() => { setExpandedChapter(isExpanded ? null : ch.chapter_id) }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-ctp-surface1/50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ctp-overlay0 w-8">Ch.{ch.chapter_id}</span>
                      <div>
                        <span className="text-sm font-medium text-ctp-text">{ch.title_zh}</span>
                        <span className="text-xs text-ctp-overlay0 ml-2">{ch.title_en}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ctp-overlay0">
                        {chChallenges.length} 題
                      </span>
                      <span className="text-xs text-ctp-overlay0">
                        {isExpanded ? '\u25B2' : '\u25BC'}
                      </span>
                    </div>
                  </button>

                  {isExpanded && chChallenges.length > 0 && (
                    <div className="border-t border-ctp-surface1 px-4 py-2 space-y-1">
                      {chChallenges.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { navigate(`/challenge/${c.id}`) }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-ctp-surface1 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ctp-overlay0">Tip {c.source.tip_number}</span>
                            <span className="text-sm text-ctp-text">{c.title_zh}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.is_boss && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-ctp-red/20 text-ctp-red">BOSS</span>
                            )}
                            <span className="text-xs text-ctp-overlay0">{c.category}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isExpanded && chChallenges.length === 0 && (
                    <div className="border-t border-ctp-surface1 px-4 py-3">
                      <span className="text-xs text-ctp-overlay0 italic">此章尚無練習題</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* LazyVim */}
        <section>
          <h3 className="text-base font-bold text-ctp-mauve mb-1">
            LazyVim for Ambitious Developers
          </h3>
          <p className="text-xs text-ctp-overlay0 mb-4">
            Dusty Phillips &middot; {keybindings.length} 個快捷鍵 &middot; {kbByCategory.size} 個分類
          </p>

          <div className="space-y-2">
            {Array.from(kbByCategory.entries()).map(([category, kbs]) => {
              const isExpanded = expandedKbCategory === category
              return (
                <div key={category} className="bg-ctp-surface0 rounded-lg border border-ctp-surface1">
                  <button
                    onClick={() => { setExpandedKbCategory(isExpanded ? null : category) }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-ctp-surface1/50 transition-colors rounded-lg"
                  >
                    <span className="text-sm font-medium text-ctp-text">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ctp-overlay0">{kbs.length} 個</span>
                      <span className="text-xs text-ctp-overlay0">
                        {isExpanded ? '\u25B2' : '\u25BC'}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-ctp-surface1 px-4 py-2 space-y-1">
                      {kbs.map((kb, idx) => (
                        <div
                          key={`${kb.keys}-${String(idx)}`}
                          className="px-3 py-2 rounded flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-ctp-blue font-bold min-w-[80px]">
                              {kb.keys}
                            </span>
                            {kb.description_en && (
                              <span className="text-xs text-ctp-subtext0 truncate max-w-md">
                                {kb.description_en.slice(0, 100)}{kb.description_en.length > 100 ? '...' : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {kb.plugin && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-ctp-yellow/20 text-ctp-yellow">
                                {kb.plugin}
                              </span>
                            )}
                            <span className="text-xs text-ctp-overlay0">Ch.{kb.chapter}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
