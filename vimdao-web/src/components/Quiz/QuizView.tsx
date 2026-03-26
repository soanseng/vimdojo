import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { QuizExercise, LazyVimExerciseSet, PluginInfo, PluginData } from '../../types'
import { useProgress } from '../../hooks/useProgress'
import { addXp, updateStreak } from '../../rpg/progression'
import BossFrame from '../RPG/BossFrame'
import PluginSimulator from './PluginSimulator'
import TelescopeSimulator from './TelescopeSimulator'

function difficultyLabel(level: number): { text: string; stars: string } {
  switch (level) {
    case 1: return { text: '入門', stars: '\u2B50' }
    case 2: return { text: '進階', stars: '\u2B50\u2B50' }
    case 3: return { text: '精通', stars: '\u2B50\u2B50\u2B50' }
    default: return { text: '其他', stars: '' }
  }
}

function pluginColor(pluginId: string): string {
  const colors: Record<string, string> = {
    telescope: 'bg-ctp-blue/20 text-ctp-blue',
    harpoon: 'bg-ctp-red/20 text-ctp-red',
    'neo-tree': 'bg-ctp-green/20 text-ctp-green',
    'mini-surround': 'bg-ctp-mauve/20 text-ctp-mauve',
    'blink-cmp': 'bg-ctp-peach/20 text-ctp-peach',
    obsidian: 'bg-ctp-lavender/20 text-ctp-lavender',
    flash: 'bg-ctp-yellow/20 text-ctp-yellow',
    'which-key': 'bg-ctp-teal/20 text-ctp-teal',
    gitsigns: 'bg-ctp-flamingo/20 text-ctp-flamingo',
    trouble: 'bg-ctp-maroon/20 text-ctp-maroon',
    'todo-comments': 'bg-ctp-sapphire/20 text-ctp-sapphire',
    conform: 'bg-ctp-sky/20 text-ctp-sky',
    noice: 'bg-ctp-pink/20 text-ctp-pink',
    snacks: 'bg-ctp-rosewater/20 text-ctp-rosewater',
  }
  return colors[pluginId] ?? 'bg-ctp-surface1 text-ctp-subtext0'
}

function isQuizExercise(ex: unknown): ex is QuizExercise {
  return typeof ex === 'object' && ex !== null && 'type' in ex && (ex as { type: string }).type === 'quiz'
}

export default function QuizView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { progress, update } = useProgress()

  const [exercise, setExercise] = useState<QuizExercise | null>(null)
  const [allExercises, setAllExercises] = useState<QuizExercise[]>([])
  const [pluginInfo, setPluginInfo] = useState<PluginInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inputKeys, setInputKeys] = useState<string[]>([])
  const [showHint, setShowHint] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)

  const inputRef = useRef<HTMLDivElement>(null)

  // Load exercise and plugin data
  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetch('/data/lazyvim_exercises.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<LazyVimExerciseSet>
        }),
      fetch('/data/lazyvim_plugins.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<PluginData>
        }),
    ])
      .then(([exerciseData, pluginData]) => {
        if (!Array.isArray(exerciseData?.exercises)) {
          throw new Error('Invalid exercise data format')
        }

        const quizExercises = exerciseData.exercises.filter(isQuizExercise)
        setAllExercises(quizExercises)

        const found = quizExercises.find(e => e.id === id)
        if (!found) {
          setError('找不到此測驗題')
        } else {
          setExercise(found)
          const plugin = pluginData?.plugins?.find(p => p.id === found.plugin) ?? null
          setPluginInfo(plugin)
        }
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })

    return () => { controller.abort() }
  }, [id])

  // Reset state when exercise changes
  useEffect(() => {
    setInputKeys([])
    setShowHint(false)
    setSubmitted(false)
    setCorrect(false)
  }, [id])

  // Focus input area on load
  useEffect(() => {
    if (!loading && exercise && !submitted) {
      inputRef.current?.focus()
    }
  }, [loading, exercise, submitted])

  const handleSubmit = useCallback(() => {
    if (!exercise || submitted) return

    const userAnswer = inputKeys.join('')
    const isCorrect = userAnswer === exercise.answer_keys ||
      (exercise.answer_aliases?.includes(userAnswer) ?? false)

    setSubmitted(true)
    setCorrect(isCorrect)

    if (isCorrect) {
      const alreadyCompleted = exercise.id in progress.challenges_completed
      if (!alreadyCompleted) {
        const today = new Date().toISOString().slice(0, 10)

        update(prev => {
          const xpResult = addXp(prev.xp, exercise.xp_reward)
          const streakResult = updateStreak(prev.last_practice_date, today, prev.streak_days)

          return {
            ...prev,
            xp: xpResult.xp,
            level: xpResult.level,
            title: xpResult.title,
            streak_days: streakResult.streak,
            last_practice_date: streakResult.date,
            challenges_completed: {
              ...prev.challenges_completed,
              [exercise.id]: {
                completed_at: today,
                keystrokes: inputKeys.length,
              },
            },
          }
        })
      }
    }
  }, [exercise, inputKeys, submitted, progress.challenges_completed, update])

  const handleQuizKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    if (submitted) return

    if (e.key === 'Backspace') {
      setInputKeys(prev => prev.slice(0, -1))
      return
    }
    if (e.key === 'Enter') {
      handleSubmit()
      return
    }
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

    let keyStr = e.key
    if (e.ctrlKey) keyStr = `<C-${e.key}>`
    else if (e.key === ' ') keyStr = '<Space>'
    else if (e.key === 'Escape') keyStr = '<Esc>'
    else if (e.key === 'Tab') keyStr = '<Tab>'

    setInputKeys(prev => [...prev, keyStr])
  }, [submitted, handleSubmit])

  const handleBack = useCallback(() => {
    navigate('/lazyvim')
  }, [navigate])

  // Find next quiz exercise
  const nextExercise = (() => {
    if (!exercise || allExercises.length === 0) return null
    const currentIdx = allExercises.findIndex(e => e.id === exercise.id)
    if (currentIdx === -1 || currentIdx >= allExercises.length - 1) return null
    return allExercises[currentIdx + 1] ?? null
  })()

  const handleNext = useCallback(() => {
    if (nextExercise) {
      navigate(`/quiz/${nextExercise.id}`)
    }
  }, [nextExercise, navigate])

  const handleRetry = useCallback(() => {
    setInputKeys([])
    setSubmitted(false)
    setCorrect(false)
    setShowHint(false)
    inputRef.current?.focus()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-ctp-base text-ctp-text flex items-center justify-center">
        <span className="text-ctp-subtext0">載入中...</span>
      </div>
    )
  }

  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-ctp-base text-ctp-text flex flex-col items-center justify-center gap-4">
        <span className="text-ctp-red">{error ?? '找不到此測驗題'}</span>
        <button
          onClick={handleBack}
          className="text-sm text-ctp-blue hover:underline"
        >
          返回列表
        </button>
      </div>
    )
  }

  const diff = difficultyLabel(exercise.difficulty)

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      {/* Header */}
      <header className="border-b border-ctp-surface0 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="text-sm text-ctp-blue hover:underline"
        >
          &larr; 返回
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${pluginColor(exercise.plugin)}`}>
            {pluginInfo?.name ?? exercise.plugin}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title area */}
        <div>
          <h1 className="text-xl font-bold text-ctp-text mb-1">
            按鍵測驗
          </h1>
          <p className="text-sm text-ctp-subtext0">
            難度：{diff.text} {diff.stars}
          </p>
        </div>

        {/* Flavor text */}
        {exercise.flavor_zh && (
          <p className="text-sm italic text-ctp-overlay1">
            {exercise.flavor_zh}
          </p>
        )}

        {/* Scenario */}
        <BossFrame isBoss={exercise.is_boss}>
          <div className="bg-ctp-surface0 rounded-lg p-5">
            <h3 className="text-xs font-medium text-ctp-overlay0 mb-2">情境</h3>
            <p className="text-sm text-ctp-text leading-relaxed">
              {exercise.scenario_zh}
            </p>
          </div>
        </BossFrame>

        {/* Plugin simulation — interactive for telescope, static for others */}
        <div className="my-4">
          {exercise.plugin === 'telescope' ? (
            <TelescopeSimulator
              goal="open"
              onComplete={() => {
                // Auto-mark as correct when telescope interaction completes
                setSubmitted(true)
                setCorrect(true)
                const alreadyCompleted = exercise.id in progress.challenges_completed
                if (!alreadyCompleted) {
                  const today = new Date().toISOString().slice(0, 10)
                  update(prev => {
                    const xpResult = addXp(prev.xp, exercise.xp_reward)
                    const streakResult = updateStreak(prev.last_practice_date, today, prev.streak_days)
                    return {
                      ...prev,
                      xp: xpResult.xp, level: xpResult.level, title: xpResult.title,
                      streak_days: streakResult.streak, last_practice_date: streakResult.date,
                      challenges_completed: {
                        ...prev.challenges_completed,
                        [exercise.id]: { completed_at: today, keystrokes: 0 },
                      },
                    }
                  })
                }
              }}
              isActive={!submitted}
            />
          ) : (
            <PluginSimulator plugin={exercise.plugin} scenario={exercise.scenario_zh} isActive={!submitted} />
          )}
        </div>

        {/* Key input area (not shown for interactive telescope) */}
        {!submitted && exercise.plugin !== 'telescope' && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-ctp-subtext1">
              你的答案：
            </label>
            <div
              ref={inputRef}
              tabIndex={0}
              onKeyDown={handleQuizKeyDown}
              className="min-h-[3rem] bg-ctp-mantle border-2 border-ctp-surface1 rounded-lg p-3 flex flex-wrap gap-1.5 items-center cursor-text focus:border-ctp-blue focus:outline-none transition-colors"
            >
              {inputKeys.length === 0 && (
                <span className="text-sm text-ctp-overlay0 italic">
                  按下按鍵輸入答案...
                </span>
              )}
              {inputKeys.map((key, i) => (
                <span
                  key={`${String(i)}-${key}`}
                  className="inline-flex items-center justify-center rounded bg-ctp-surface0 border border-ctp-surface1 px-2 py-1 text-sm font-mono text-ctp-blue font-bold"
                >
                  {key}
                </span>
              ))}
            </div>
            <p className="text-xs text-ctp-overlay0">
              按 Enter 提交 | Backspace 刪除最後一個按鍵
            </p>
          </div>
        )}

        {/* Action buttons (before submit) */}
        {!submitted && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-ctp-blue text-ctp-base rounded font-medium text-sm hover:opacity-90 transition-opacity"
            >
              提交答案
            </button>
            <button
              onClick={() => { setShowHint(prev => !prev) }}
              className="px-4 py-2 bg-ctp-surface1 text-ctp-text rounded text-sm hover:bg-ctp-surface2 transition-colors"
            >
              {showHint ? '隱藏提示' : '顯示提示'}
            </button>
            <button
              onClick={() => {
                setSubmitted(true)
                setCorrect(false)
              }}
              className="px-4 py-2 bg-ctp-surface0 text-ctp-subtext0 rounded text-sm hover:bg-ctp-surface1 transition-colors"
            >
              跳過
            </button>
          </div>
        )}

        {/* Hint */}
        {showHint && !submitted && (
          <div className="text-sm text-ctp-peach bg-ctp-surface0 rounded p-3">
            {exercise.explanation_zh.split('。')[0]}。
          </div>
        )}

        {/* Result section */}
        {submitted && (
          <div className="space-y-5">
            {/* Pass/fail banner */}
            <div
              role="status"
              aria-live="polite"
              className={`rounded-lg p-5 font-medium border ${
                exercise.is_boss ? 'border-2 border-dashed' : ''
              } ${
                correct
                  ? 'bg-ctp-green/10 border-ctp-green/30 text-ctp-green'
                  : 'bg-ctp-red/10 border-ctp-red/30 text-ctp-red'
              }`}
            >
              {exercise.is_boss && (
                <div className="text-xs mb-1 opacity-70">&#9876; BOSS 試煉</div>
              )}
              <div className="text-base">
                {correct ? '正確！' : '未通過'}
              </div>
              {correct && exercise.xp_reward > 0 && (
                <div className="text-ctp-yellow font-bold mt-1">+{exercise.xp_reward} XP</div>
              )}
            </div>

            {/* User answer display */}
            {inputKeys.length > 0 && (
              <div className="bg-ctp-surface0 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-medium text-ctp-subtext1">你的答案</h3>
                <div className="flex flex-wrap gap-1.5">
                  {inputKeys.map((key, i) => (
                    <span
                      key={`${String(i)}-${key}`}
                      className={`inline-flex items-center justify-center rounded border px-2 py-1 text-sm font-mono font-bold ${
                        correct
                          ? 'bg-ctp-green/10 border-ctp-green/30 text-ctp-green'
                          : 'bg-ctp-red/10 border-ctp-red/30 text-ctp-red'
                      }`}
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Correct answer */}
            <div className="bg-ctp-surface0 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-medium text-ctp-subtext1">正確答案</h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center justify-center rounded bg-ctp-base border border-ctp-surface1 px-2 py-1 text-sm font-mono text-ctp-blue font-bold">
                  {exercise.answer_keys}
                </span>
              </div>
              {exercise.answer_aliases && exercise.answer_aliases.length > 0 && (
                <p className="text-xs text-ctp-overlay0 mt-1">
                  其他可接受的答案：{exercise.answer_aliases.join('、')}
                </p>
              )}
            </div>

            {/* Explanation */}
            <div className="bg-ctp-surface0 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-medium text-ctp-subtext1">說明</h3>
              <p className="text-sm text-ctp-text leading-relaxed">
                {exercise.explanation_zh}
              </p>
            </div>

            {/* Plugin info */}
            {pluginInfo && (
              <div className="bg-ctp-surface0 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pluginColor(exercise.plugin)}`}>
                    {pluginInfo.name}
                  </span>
                  <span className="text-xs text-ctp-overlay0">
                    ({pluginInfo.stars} \u2B50)
                  </span>
                </div>
                <p className="text-sm text-ctp-subtext0">
                  {pluginInfo.description_zh}
                </p>
                <a
                  href={pluginInfo.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-ctp-blue hover:underline"
                >
                  {pluginInfo.repo_url}
                </a>
              </div>
            )}

            {/* Action buttons (after submit) */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-ctp-surface1 text-ctp-text rounded text-sm hover:bg-ctp-surface2 transition-colors"
              >
                再試一次
              </button>
              {nextExercise && (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-ctp-blue text-ctp-base rounded font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  下一題
                </button>
              )}
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-ctp-surface0 text-ctp-subtext0 rounded text-sm hover:bg-ctp-surface1 transition-colors"
              >
                返回列表
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
