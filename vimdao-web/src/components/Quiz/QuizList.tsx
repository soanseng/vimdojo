import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type {
  QuizExercise,
  Challenge,
  LazyVimExerciseSet,
  LazyVimStoryData,
  LazyVimStoryChapter,
  PluginInfo,
  PluginData,
} from '../../types'
import { useProgress } from '../../hooks/useProgress'

function difficultyLabel(level: number): { text: string; className: string } {
  switch (level) {
    case 1: return { text: '入門', className: 'bg-ctp-green/20 text-ctp-green' }
    case 2: return { text: '進階', className: 'bg-ctp-yellow/20 text-ctp-yellow' }
    case 3: return { text: '精通', className: 'bg-ctp-red/20 text-ctp-red' }
    default: return { text: '其他', className: 'bg-ctp-surface1 text-ctp-subtext0' }
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

type ExerciseType = 'all' | 'quiz' | 'engine'

function isQuizExercise(ex: QuizExercise | Challenge): ex is QuizExercise {
  return 'type' in ex && (ex as { type: string }).type === 'quiz'
}

function getExercisePlugin(ex: QuizExercise | Challenge): string {
  if (isQuizExercise(ex)) return ex.plugin
  // For engine exercises, derive plugin from id prefix (e.g., "lv-mini-surround-001")
  const idParts = ex.id.replace(/^lv-/, '').replace(/-\d+$/, '')
  return idParts
}

function getExerciseDifficulty(ex: QuizExercise | Challenge): number {
  return ex.difficulty
}

export default function QuizList() {
  const [exercises, setExercises] = useState<Array<QuizExercise | Challenge>>([])
  const [chapters, setChapters] = useState<LazyVimStoryChapter[]>([])
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterPlugin, setFilterPlugin] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<ExerciseType>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null)
  const [initialPluginSet, setInitialPluginSet] = useState(false)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { progress } = useProgress()

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetch(import.meta.env.BASE_URL + 'data/lazyvim_exercises.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<LazyVimExerciseSet>
        }),
      fetch(import.meta.env.BASE_URL + 'data/lazyvim_story.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<LazyVimStoryData>
        }),
      fetch(import.meta.env.BASE_URL + 'data/lazyvim_plugins.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<PluginData>
        }),
    ])
      .then(([exerciseData, storyData, pluginData]) => {
        if (!Array.isArray(exerciseData?.exercises)) {
          throw new Error('Invalid exercise data format')
        }
        setExercises(exerciseData.exercises)
        setChapters(storyData?.chapters ?? [])
        setPlugins(pluginData?.plugins ?? [])
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })

    return () => { controller.abort() }
  }, [])

  // Set initial plugin filter from URL query params
  useEffect(() => {
    if (initialPluginSet) return
    const pluginsParam = searchParams.get('plugins')
    if (pluginsParam && exercises.length > 0) {
      const requestedPlugins = pluginsParam.split(',')
      // If exactly one plugin requested, set it as filter
      if (requestedPlugins.length === 1 && requestedPlugins[0]) {
        setFilterPlugin(requestedPlugins[0])
      }
      // For multiple plugins, we keep null (show all) but the chapter grouping naturally handles it
      setInitialPluginSet(true)
    }
  }, [searchParams, exercises, initialPluginSet])

  // Get unique plugin IDs from exercises
  const pluginIds = useMemo(() => {
    const ids = new Set<string>()
    for (const ex of exercises) {
      ids.add(getExercisePlugin(ex))
    }
    return [...ids]
  }, [exercises])

  // Filter exercises
  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      if (filterPlugin !== null && getExercisePlugin(ex) !== filterPlugin) return false
      if (filterType === 'quiz' && !isQuizExercise(ex)) return false
      if (filterType === 'engine' && isQuizExercise(ex)) return false
      if (filterDifficulty !== null && getExerciseDifficulty(ex) !== filterDifficulty) return false
      return true
    })
  }, [exercises, filterPlugin, filterType, filterDifficulty])

  // Group filtered exercises by chapter
  const groupedByChapter = useMemo(() => {
    const groups: Array<{ chapter: LazyVimStoryChapter; exercises: Array<QuizExercise | Challenge> }> = []

    for (const chapter of chapters) {
      const chapterPlugins = new Set(chapter.plugins)
      const chapterExercises = filtered.filter(ex => chapterPlugins.has(getExercisePlugin(ex)))
      if (chapterExercises.length > 0) {
        groups.push({ chapter, exercises: chapterExercises })
      }
    }

    // Any exercises not matching any chapter
    const allChapterPlugins = new Set(chapters.flatMap(ch => ch.plugins))
    const uncategorized = filtered.filter(ex => !allChapterPlugins.has(getExercisePlugin(ex)))
    if (uncategorized.length > 0) {
      groups.push({
        chapter: {
          chapter_id: 0,
          title_zh: '其他練習',
          title_en: 'Other Exercises',
          plugins: [],
          intro_story: [],
          outro_story: [],
          boss_intro: [],
          scene_image: '',
          unlock_requires: null,
        },
        exercises: uncategorized,
      })
    }

    return groups
  }, [filtered, chapters])

  const handleCardClick = (ex: QuizExercise | Challenge) => {
    if (isQuizExercise(ex)) {
      navigate(`/quiz/${ex.id}`)
    } else {
      navigate(`/challenge/${ex.id}?source=lazyvim`)
    }
  }

  const getPluginName = (pluginId: string): string => {
    const plugin = plugins.find(p => p.id === pluginId)
    return plugin?.name ?? pluginId
  }

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
          LazyVim 進階修煉 ({filtered.length}/{exercises.length})
        </h2>

        {/* Filters */}
        <div className="space-y-3 mb-8">
          {/* Plugin filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ctp-overlay0 w-16 shrink-0">Plugin:</span>
            <button
              onClick={() => { setFilterPlugin(null) }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filterPlugin === null
                  ? 'bg-ctp-blue text-ctp-base'
                  : 'bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1'
              }`}
            >
              全部
            </button>
            {pluginIds.map(pid => (
              <button
                key={pid}
                onClick={() => { setFilterPlugin(filterPlugin === pid ? null : pid) }}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filterPlugin === pid
                    ? 'bg-ctp-blue text-ctp-base'
                    : `${pluginColor(pid)} hover:opacity-80`
                }`}
              >
                {getPluginName(pid)}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ctp-overlay0 w-16 shrink-0">類型:</span>
            {([
              ['all', '全部'],
              ['quiz', '按鍵測驗'],
              ['engine', '引擎練習'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => { setFilterType(value as ExerciseType) }}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filterType === value
                    ? 'bg-ctp-blue text-ctp-base'
                    : 'bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

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
        </div>

        {/* Chapters */}
        {groupedByChapter.map(({ chapter, exercises: chapterExercises }) => (
          <section key={chapter.chapter_id} className="mb-8">
            <h3 className="text-sm font-semibold text-ctp-subtext0 mb-4 border-b border-ctp-surface0 pb-2">
              {chapter.chapter_id > 0
                ? `第${String(chapter.chapter_id - 100)}章：${chapter.title_zh}`
                : chapter.title_zh}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapterExercises.map(ex => {
                const isQuiz = isQuizExercise(ex)
                const diff = difficultyLabel(getExerciseDifficulty(ex))
                const exPlugin = getExercisePlugin(ex)
                const isCompleted = ex.id in progress.challenges_completed
                return (
                  <div
                    key={ex.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { handleCardClick(ex) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(ex) }}
                    className={`text-left bg-ctp-surface0 rounded-lg p-4 hover:bg-ctp-surface1 transition-colors border cursor-pointer ${
                      isCompleted
                        ? 'border-ctp-green/40 hover:border-ctp-green/60'
                        : 'border-ctp-surface1 hover:border-ctp-blue/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-ctp-text leading-snug flex-1">
                        {ex.title_zh}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCompleted && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ctp-green/20 text-ctp-green">
                            已完成
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pluginColor(exPlugin)}`}>
                        {getPluginName(exPlugin)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isQuiz
                          ? 'bg-ctp-mauve/20 text-ctp-mauve'
                          : 'bg-ctp-teal/20 text-ctp-teal'
                      }`}>
                        {isQuiz ? '測驗' : '練習'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${diff.className}`}>
                        {diff.text}
                      </span>
                      {ex.is_boss && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ctp-red/20 text-ctp-red font-bold">
                          BOSS
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-ctp-overlay0 py-12">
            沒有符合條件的練習題
          </div>
        )}
      </main>
    </div>
  )
}
