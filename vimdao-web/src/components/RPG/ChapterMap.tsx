import type { StoryChapter, Challenge } from '../../types'

interface ChapterMapProps {
  chapters: StoryChapter[]
  unlockedChapters: number[]
  completedChallenges: Record<string, unknown>
  allChallenges: Challenge[]
  onSelectChapter: (chapterId: number) => void
}

export default function ChapterMap({
  chapters,
  unlockedChapters,
  completedChallenges,
  allChallenges,
  onSelectChapter,
}: ChapterMapProps) {
  const unlockedSet = new Set(unlockedChapters)

  return (
    <div className="space-y-3">
      {chapters.map((chapter) => {
        const isUnlocked = unlockedSet.has(chapter.chapter_id)
        const chapterChallenges = allChallenges.filter(
          (c) => c.source.chapter === chapter.chapter_id
        )
        const completedCount = chapterChallenges.filter(
          (c) => c.id in completedChallenges
        ).length
        const totalCount = chapterChallenges.length
        const isComplete = totalCount > 0 && completedCount === totalCount

        return (
          <button
            key={chapter.chapter_id}
            disabled={!isUnlocked}
            onClick={() => onSelectChapter(chapter.chapter_id)}
            className={`pixel-border w-full text-left rounded-lg p-4 transition-colors ${
              !isUnlocked
                ? 'opacity-40 cursor-not-allowed bg-ctp-crust'
                : isComplete
                  ? 'border-ctp-green bg-ctp-mantle hover:bg-ctp-surface0'
                  : 'bg-ctp-mantle hover:bg-ctp-surface0'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {!isUnlocked && <span>&#128274;</span>}
                  {isComplete && (
                    <span className="text-ctp-green">&#10003;</span>
                  )}
                  <span className="text-sm font-bold text-ctp-text">
                    {chapter.title_zh}
                  </span>
                </div>
                <span className="text-xs text-ctp-subtext0">
                  {chapter.title_en}
                </span>
              </div>
              {totalCount > 0 && (
                <span className="text-xs text-ctp-subtext0">
                  {completedCount}/{totalCount} 練習完成
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
