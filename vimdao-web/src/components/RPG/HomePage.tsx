import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet, StoryData, StoryChapter, LazyVimStoryData, LazyVimStoryChapter, LazyVimExerciseSet, QuizExercise } from '../../types'
import { useProgress } from '../../hooks/useProgress'
import CharacterPanel from './CharacterPanel'
import ChapterMap from './ChapterMap'

export default function HomePage() {
  const [chapters, setChapters] = useState<StoryChapter[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [lvChapters, setLvChapters] = useState<LazyVimStoryChapter[]>([])
  const [lvExercises, setLvExercises] = useState<Array<QuizExercise | Challenge>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { progress } = useProgress()
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetch(import.meta.env.BASE_URL + 'data/story.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<StoryData>
        }),
      fetch(import.meta.env.BASE_URL + 'data/practical-vim_challenges.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<ChallengeSet>
        }),
      fetch(import.meta.env.BASE_URL + 'data/lazyvim_story.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<LazyVimStoryData>
        }),
      fetch(import.meta.env.BASE_URL + 'data/lazyvim_exercises.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<LazyVimExerciseSet>
        }),
    ])
      .then(([storyData, challengeData, lvStoryData, lvExData]) => {
        if (!Array.isArray(storyData?.chapters)) {
          throw new Error('Invalid story data format')
        }
        if (!Array.isArray(challengeData?.challenges)) {
          throw new Error('Invalid challenge data format')
        }
        setChapters(storyData.chapters)
        setChallenges(challengeData.challenges)
        setLvChapters(lvStoryData?.chapters ?? [])
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

  const handleSelectChapter = (chapterId: number) => {
    // Navigate to the first incomplete challenge in this chapter
    const chapterChallenges = challenges.filter(c => c.source.chapter === chapterId)
    const firstIncomplete = chapterChallenges.find(
      c => !(c.id in progress.challenges_completed)
    )
    if (firstIncomplete) {
      navigate(`/challenge/${firstIncomplete.id}`)
    } else if (chapterChallenges.length > 0) {
      // All completed — go to the first one for replay
      navigate(`/challenge/${chapterChallenges[0]!.id}`)
    }
  }

  const handleSelectLvChapter = (chapter: LazyVimStoryChapter) => {
    const pluginParam = chapter.plugins.join(',')
    navigate(`/lazyvim?plugins=${encodeURIComponent(pluginParam)}`)
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: character panel */}
          <div className="lg:col-span-1">
            <CharacterPanel progress={progress} />
          </div>

          {/* Main: chapter map */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-ctp-subtext1 mb-4">
                修練路徑
              </h2>
              <ChapterMap
                chapters={chapters}
                unlockedChapters={progress.chapters_unlocked}
                completedChallenges={progress.challenges_completed}
                allChallenges={challenges}
                onSelectChapter={handleSelectChapter}
              />
            </div>

            {/* LazyVim path */}
            {lvChapters.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-ctp-mauve mb-4">
                  LazyVim 進階修煉
                </h2>
                <div className="space-y-3">
                  {lvChapters.map(chapter => {
                    const chapterExercises = lvExercises.filter(e => {
                      if ('plugin' in e) {
                        return chapter.plugins.includes(e.plugin)
                      }
                      return false
                    })
                    const completedCount = chapterExercises.filter(
                      e => e.id in progress.challenges_completed
                    ).length

                    return (
                      <button
                        key={chapter.chapter_id}
                        onClick={() => { handleSelectLvChapter(chapter) }}
                        className="pixel-border w-full text-left rounded-lg p-4 bg-ctp-mantle hover:bg-ctp-surface0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-ctp-text">
                              {chapter.title_zh}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {chapter.plugins.map(plugin => (
                                <span
                                  key={plugin}
                                  className="text-xs px-1.5 py-0.5 rounded bg-ctp-mauve/20 text-ctp-mauve"
                                >
                                  {plugin}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-ctp-subtext0">
                            {completedCount}/{chapterExercises.length} 練習完成
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
