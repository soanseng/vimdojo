import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet, StoryData, StoryChapter } from '../../types'
import { useProgress } from '../../hooks/useProgress'
import CharacterPanel from './CharacterPanel'
import ChapterMap from './ChapterMap'

export default function HomePage() {
  const [chapters, setChapters] = useState<StoryChapter[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { progress } = useProgress()
  const navigate = useNavigate()

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
    ])
      .then(([storyData, challengeData]) => {
        if (!Array.isArray(storyData?.chapters)) {
          throw new Error('Invalid story data format')
        }
        if (!Array.isArray(challengeData?.challenges)) {
          throw new Error('Invalid challenge data format')
        }
        setChapters(storyData.chapters)
        setChallenges(challengeData.challenges)
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
          <div className="lg:col-span-2">
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
        </div>
      </main>
    </div>
  )
}
