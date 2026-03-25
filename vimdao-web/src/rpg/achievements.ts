import type { UserProgress } from '../types'

interface ChallengeInfo {
  id: string
  hint_commands: string[]
  hint_keystrokes?: string
  tags: string[]
  source: { chapter: number }
}

export function checkAchievements(
  progress: UserProgress,
  challenges: ChallengeInfo[],
  totalChallenges: number,
): string[] {
  const earned = new Set(progress.achievements)
  const newAchievements: string[] = []
  const completedIds = Object.keys(progress.challenges_completed)

  function award(id: string) {
    if (!earned.has(id)) newAchievements.push(id)
  }

  // first-clear
  if (completedIds.length > 0) award('first-clear')

  // all-clear
  if (completedIds.length >= totalChallenges) award('all-clear')

  // streak-7
  if (progress.streak_days >= 7) award('streak-7')

  // one-shot
  for (const c of challenges) {
    const record = progress.challenges_completed[c.id]
    if (record && c.hint_keystrokes && record.keystrokes <= c.hint_keystrokes.length) {
      award('one-shot')
      break
    }
  }

  // chapter-clear
  const byChapter = new Map<number, string[]>()
  for (const c of challenges) {
    const list = byChapter.get(c.source.chapter) ?? []
    list.push(c.id)
    byChapter.set(c.source.chapter, list)
  }
  for (const [, ids] of byChapter) {
    if (ids.every(id => completedIds.includes(id))) {
      award('chapter-clear')
      break
    }
  }

  // dot-master
  const dotChallenges = challenges.filter(c => c.tags?.includes('.'))
  if (dotChallenges.length > 0 && dotChallenges.every(c => completedIds.includes(c.id))) {
    award('dot-master')
  }

  return newAchievements
}
