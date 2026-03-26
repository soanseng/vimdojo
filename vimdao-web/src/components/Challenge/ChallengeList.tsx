import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet } from '../../types'
import { useProgress } from '../../hooks/useProgress'

function difficultyLabel(level: number): { text: string; className: string } {
  switch (level) {
    case 1: return { text: '入門', className: 'bg-ctp-green/20 text-ctp-green' }
    case 2: return { text: '進階', className: 'bg-ctp-yellow/20 text-ctp-yellow' }
    case 3: return { text: '精通', className: 'bg-ctp-red/20 text-ctp-red' }
    default: return { text: '其他', className: 'bg-ctp-surface1 text-ctp-subtext0' }
  }
}

const CATEGORIES = ['combo', 'motion', 'insert', 'operator', 'other'] as const

export default function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { progress } = useProgress()

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/practical-vim_challenges.json', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        return res.json() as Promise<ChallengeSet>
      })
      .then(data => {
        if (!Array.isArray(data?.challenges)) {
          throw new Error('Invalid challenge data format')
        }
        setChallenges(data.challenges)
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
    return challenges.filter(c => {
      if (filterDifficulty !== null && c.difficulty !== filterDifficulty) return false
      if (filterCategory !== null && c.category !== filterCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return c.title_zh.toLowerCase().includes(q) ||
               c.title_en.toLowerCase().includes(q) ||
               (c.tags ?? []).some(t => t.includes(q))
      }
      return true
    })
  }, [challenges, filterDifficulty, filterCategory, searchQuery])

  const handleRandomChallenge = useCallback(() => {
    const incomplete = filtered.filter(c => !(c.id in progress.challenges_completed))
    if (incomplete.length === 0) return
    const randomIdx = Math.floor(Math.random() * incomplete.length)
    const chosen = incomplete[randomIdx]
    if (chosen) {
      navigate(`/challenge/${chosen.id}`)
    }
  }, [filtered, progress.challenges_completed, navigate])

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
          自由練習 ({filtered.length}/{challenges.length})
        </h2>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {/* Difficulty filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ctp-overlay0 w-16 shrink-0">難度:</span>
            <button
              onClick={() => { setFilterDifficulty(null) }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filterDifficulty === null
                  ? 'bg-ctp-blue text-ctp-base'
                  : 'bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1'
              }`}
            >
              全部
            </button>
            {([1, 2, 3] as const).map(level => {
              const label = difficultyLabel(level)
              return (
                <button
                  key={level}
                  onClick={() => { setFilterDifficulty(filterDifficulty === level ? null : level) }}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    filterDifficulty === level
                      ? 'bg-ctp-blue text-ctp-base'
                      : `${label.className} hover:opacity-80`
                  }`}
                >
                  {label.text}
                </button>
              )
            })}
          </div>

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
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setFilterCategory(filterCategory === cat ? null : cat) }}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filterCategory === cat
                    ? 'bg-ctp-blue text-ctp-base'
                    : 'bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search + random */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="搜尋練習..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value) }}
              className="flex-1 max-w-sm bg-ctp-surface0 border border-ctp-surface1 rounded px-3 py-1.5 text-sm text-ctp-text placeholder-ctp-overlay0 outline-none focus:border-ctp-blue transition-colors"
            />
            <button
              onClick={handleRandomChallenge}
              className="text-xs px-3 py-1.5 bg-ctp-mauve text-ctp-base rounded hover:opacity-90 transition-opacity"
            >
              隨機挑戰
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(challenge => {
            const diff = difficultyLabel(challenge.difficulty)
            const isCompleted = challenge.id in progress.challenges_completed
            return (
              <div
                key={challenge.id}
                role="button"
                tabIndex={0}
                onClick={() => { navigate(`/challenge/${challenge.id}`) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/challenge/${challenge.id}`) }}
                className={`text-left bg-ctp-surface0 rounded-lg p-4 hover:bg-ctp-surface1 transition-colors border cursor-pointer ${
                  isCompleted
                    ? 'border-ctp-green/40 hover:border-ctp-green/60'
                    : 'border-ctp-surface1 hover:border-ctp-blue/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-ctp-text leading-snug flex-1">
                    {challenge.title_zh}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCompleted && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ctp-green/20 text-ctp-green">
                        已完成
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${diff.className}`}>
                      {diff.text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-ctp-overlay0">
                  <span>{challenge.category}</span>
                  <span>Tip {String(challenge.source.tip_number)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(challenge.hint_commands ?? []).slice(0, 4).map((cmd, cmdIdx) => (
                    <span
                      key={`${challenge.id}-cmd-${String(cmdIdx)}`}
                      className="text-xs font-mono bg-ctp-base px-1.5 py-0.5 rounded text-ctp-blue"
                    >
                      {cmd}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-ctp-overlay0 py-12">
            沒有符合條件的練習題
          </div>
        )}
      </main>
    </div>
  )
}
