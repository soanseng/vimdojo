import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet } from '../../types'

function difficultyLabel(level: number): { text: string; className: string } {
  switch (level) {
    case 1: return { text: '入門', className: 'bg-ctp-green/20 text-ctp-green' }
    case 2: return { text: '進階', className: 'bg-ctp-yellow/20 text-ctp-yellow' }
    case 3: return { text: '精通', className: 'bg-ctp-red/20 text-ctp-red' }
    default: return { text: '其他', className: 'bg-ctp-surface1 text-ctp-subtext0' }
  }
}

export default function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/data/practical-vim_challenges.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        return res.json() as Promise<ChallengeSet>
      })
      .then(data => {
        setChallenges(data.challenges)
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })
  }, [])

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
      <header className="border-b border-ctp-surface0 px-6 py-4">
        <h1 className="text-2xl font-bold text-ctp-text">VimDao 鍵道</h1>
        <p className="text-sm text-ctp-subtext0 mt-1">互動式 Vim 學習平台</p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-ctp-subtext1 mb-6">
          練習題目 ({challenges.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map(challenge => {
            const diff = difficultyLabel(challenge.difficulty)
            return (
              <button
                key={challenge.id}
                onClick={() => { navigate(`/challenge/${challenge.id}`) }}
                className="text-left bg-ctp-surface0 rounded-lg p-4 hover:bg-ctp-surface1 transition-colors border border-ctp-surface1 hover:border-ctp-blue/50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-ctp-text leading-snug flex-1">
                    {challenge.title_zh}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${diff.className}`}>
                    {diff.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ctp-overlay0">
                  <span>{challenge.category}</span>
                  <span>Tip {String(challenge.source.tip_number)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {challenge.hint_commands.slice(0, 4).map(cmd => (
                    <span
                      key={cmd}
                      className="text-xs font-mono bg-ctp-base px-1.5 py-0.5 rounded text-ctp-blue"
                    >
                      {cmd}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
