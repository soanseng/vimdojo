import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet, StoryData, StoryChapter, UserProgress, LazyVimExerciseSet, QuizExercise } from '../../types'
import { useProgress } from '../../hooks/useProgress'
import CharacterPanel from '../RPG/CharacterPanel'

function difficultyLabel(level: number): { text: string; className: string } {
  switch (level) {
    case 1: return { text: '入門', className: 'bg-ctp-green/20 text-ctp-green' }
    case 2: return { text: '進階', className: 'bg-ctp-yellow/20 text-ctp-yellow' }
    case 3: return { text: '精通', className: 'bg-ctp-red/20 text-ctp-red' }
    default: return { text: '其他', className: 'bg-ctp-surface1 text-ctp-subtext0' }
  }
}

interface CompletedChallenge {
  challenge: Challenge
  completed_at: string
  keystrokes: number
}

function getRecentlyCompleted(challenges: Challenge[], progress: UserProgress): CompletedChallenge[] {
  const completed: CompletedChallenge[] = []
  for (const [id, info] of Object.entries(progress.challenges_completed)) {
    const challenge = challenges.find(c => c.id === id)
    if (challenge) {
      completed.push({
        challenge,
        completed_at: info.completed_at,
        keystrokes: info.keystrokes,
      })
    }
  }
  completed.sort((a, b) => b.completed_at.localeCompare(a.completed_at))
  return completed.slice(0, 5)
}

interface RecommendableExercise {
  id: string
  title_zh: string
  difficulty: number
  category: string
  hint_commands?: string[]
  source_type: 'practical-vim' | 'lazyvim'
  plugin?: string
}

function toRecommendable(challenge: Challenge): RecommendableExercise {
  return {
    id: challenge.id,
    title_zh: challenge.title_zh,
    difficulty: challenge.difficulty,
    category: challenge.category,
    hint_commands: challenge.hint_commands,
    source_type: 'practical-vim',
  }
}

function quizToRecommendable(quiz: QuizExercise): RecommendableExercise {
  return {
    id: quiz.id,
    title_zh: quiz.title_zh,
    difficulty: quiz.difficulty,
    category: quiz.category,
    source_type: 'lazyvim',
    plugin: quiz.plugin,
  }
}

function getMixedRecommendations(
  challenges: Challenge[],
  lvExercises: Array<QuizExercise | Challenge>,
  progress: UserProgress,
): RecommendableExercise[] {
  const pvItems = challenges.map(toRecommendable)
  const lvItems = lvExercises
    .filter((e): e is QuizExercise => 'type' in e && e.type === 'quiz')
    .map(quizToRecommendable)

  const all = [...pvItems, ...lvItems]
  const incomplete = all.filter(e => !(e.id in progress.challenges_completed))
  if (incomplete.length === 0) return all.slice(0, 3)

  const sorted = [...incomplete].sort((a, b) => a.difficulty - b.difficulty)
  // Take a mix: at most 2 from PV, then fill from LV (or vice versa)
  const pvIncomplete = sorted.filter(e => e.source_type === 'practical-vim')
  const lvIncomplete = sorted.filter(e => e.source_type === 'lazyvim')
  const result: RecommendableExercise[] = []
  result.push(...pvIncomplete.slice(0, 2))
  result.push(...lvIncomplete.slice(0, 2))
  return result.slice(0, 3)
}

export default function Dashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [chapters, setChapters] = useState<StoryChapter[]>([])
  const [lvExercises, setLvExercises] = useState<Array<QuizExercise | Challenge>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { progress } = useProgress()
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetch('/data/practical-vim_challenges.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<ChallengeSet>
        }),
      fetch('/data/story.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<StoryData>
        }),
      fetch('/data/lazyvim_exercises.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<LazyVimExerciseSet>
        }),
    ])
      .then(([challengeData, storyData, lvExData]) => {
        if (!Array.isArray(challengeData?.challenges)) {
          throw new Error('Invalid challenge data format')
        }
        if (!Array.isArray(storyData?.chapters)) {
          throw new Error('Invalid story data format')
        }
        setChallenges(challengeData.challenges)
        setChapters(storyData.chapters)
        setLvExercises(lvExData?.exercises ?? [])
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })

    return () => { controller.abort() }
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

  const totalChallenges = challenges.length
  const completedCount = challenges.filter(c => c.id in progress.challenges_completed).length
  const unlockedChapters = progress.chapters_unlocked.length
  const totalChapters = chapters.length
  const recommendations = getMixedRecommendations(challenges, lvExercises, progress)
  const recentlyCompleted = getRecentlyCompleted(challenges, progress)

  // LazyVim stats
  const lvTotal = lvExercises.length
  const lvCompleted = lvExercises.filter(e => e.id in progress.challenges_completed).length

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar: character panel */}
          <div className="lg:col-span-1">
            <CharacterPanel progress={progress} />
          </div>

          {/* Right main area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress overview */}
            <section>
              <h2 className="text-lg font-semibold text-ctp-subtext1 mb-4">
                進度概覽
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-ctp-mantle p-4 text-center">
                  <div className="text-2xl font-bold text-ctp-blue">
                    {completedCount}/{totalChallenges}
                  </div>
                  <div className="text-xs text-ctp-subtext0 mt-1">
                    Vim 核心修煉
                  </div>
                </div>
                <div className="rounded-lg bg-ctp-mantle p-4 text-center">
                  <div className="text-2xl font-bold text-ctp-mauve">
                    {lvCompleted}/{lvTotal}
                  </div>
                  <div className="text-xs text-ctp-subtext0 mt-1">
                    LazyVim 進度
                  </div>
                </div>
                <div className="rounded-lg bg-ctp-mantle p-4 text-center">
                  <div className="text-2xl font-bold text-ctp-peach">
                    {progress.streak_days} 天
                  </div>
                  <div className="text-xs text-ctp-subtext0 mt-1">
                    連續練習
                  </div>
                </div>
                <div className="rounded-lg bg-ctp-mantle p-4 text-center">
                  <div className="text-2xl font-bold text-ctp-green">
                    {unlockedChapters}/{totalChapters}
                  </div>
                  <div className="text-xs text-ctp-subtext0 mt-1">
                    已解鎖章節
                  </div>
                </div>
              </div>
            </section>

            {/* Recommended challenges */}
            <section>
              <h2 className="text-lg font-semibold text-ctp-subtext1 mb-4">
                今日推薦練習
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.map(rec => {
                  const diff = difficultyLabel(rec.difficulty)
                  const linkPath = rec.source_type === 'lazyvim'
                    ? `/lazyvim?highlight=${encodeURIComponent(rec.id)}`
                    : `/challenge/${rec.id}`
                  return (
                    <div
                      key={rec.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { navigate(linkPath) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(linkPath) }}
                      className="bg-ctp-surface0 rounded-lg p-4 hover:bg-ctp-surface1 transition-colors border border-ctp-surface1 hover:border-ctp-blue/50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-medium text-ctp-text leading-snug flex-1">
                          {rec.title_zh}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          {rec.source_type === 'lazyvim' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-ctp-mauve/20 text-ctp-mauve">
                              LV
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${diff.className}`}>
                            {diff.text}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ctp-overlay0">
                        <span>{rec.category}</span>
                        {rec.plugin && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-ctp-mauve/15 text-ctp-mauve">
                            {rec.plugin}
                          </span>
                        )}
                      </div>
                      {rec.hint_commands && rec.hint_commands.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.hint_commands.slice(0, 3).map((cmd, cmdIdx) => (
                            <span
                              key={`${rec.id}-cmd-${String(cmdIdx)}`}
                              className="text-xs font-mono bg-ctp-base px-1.5 py-0.5 rounded text-ctp-blue"
                            >
                              {cmd}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Recently completed */}
            {recentlyCompleted.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-ctp-subtext1 mb-4">
                  最近完成
                </h2>
                <div className="space-y-2">
                  {recentlyCompleted.map(({ challenge, completed_at, keystrokes }) => (
                    <div
                      key={challenge.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { navigate(`/challenge/${challenge.id}`) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/challenge/${challenge.id}`) }}
                      className="flex items-center justify-between bg-ctp-surface0 rounded-lg px-4 py-3 hover:bg-ctp-surface1 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-ctp-green text-sm">&#10003;</span>
                        <span className="text-sm text-ctp-text">
                          {challenge.title_zh}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-ctp-subtext0">
                        <span>{keystrokes} 鍵</span>
                        <span>{new Date(completed_at).toLocaleDateString('zh-TW')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick links */}
            <section>
              <h2 className="text-lg font-semibold text-ctp-subtext1 mb-4">
                快速連結
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link
                  to="/path"
                  className="rounded-lg bg-ctp-surface0 p-4 text-center hover:bg-ctp-surface1 transition-colors border border-ctp-surface1 hover:border-ctp-blue/50"
                >
                  <div className="text-lg mb-1">&#128739;</div>
                  <div className="text-sm text-ctp-text">修練路徑</div>
                </Link>
                <Link
                  to="/practice"
                  className="rounded-lg bg-ctp-surface0 p-4 text-center hover:bg-ctp-surface1 transition-colors border border-ctp-surface1 hover:border-ctp-blue/50"
                >
                  <div className="text-lg mb-1">&#9889;</div>
                  <div className="text-sm text-ctp-text">自由練習</div>
                </Link>
                <Link
                  to="/commands"
                  className="rounded-lg bg-ctp-surface0 p-4 text-center hover:bg-ctp-surface1 transition-colors border border-ctp-surface1 hover:border-ctp-blue/50"
                >
                  <div className="text-lg mb-1">&#128218;</div>
                  <div className="text-sm text-ctp-text">指令速查</div>
                </Link>
                <Link
                  to="/library"
                  className="rounded-lg bg-ctp-surface0 p-4 text-center hover:bg-ctp-surface1 transition-colors border border-ctp-surface1 hover:border-ctp-blue/50"
                >
                  <div className="text-lg mb-1">&#128218;</div>
                  <div className="text-sm text-ctp-text">書庫</div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
