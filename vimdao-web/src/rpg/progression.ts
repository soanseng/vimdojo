import { XP_PER_LEVEL, MAX_LEVEL, TITLES } from './constants'

/** Calculate level from total XP. Level 1 at 0 XP, capped at MAX_LEVEL. */
export function calculateLevel(xp: number): number {
  return Math.min(Math.floor(xp / XP_PER_LEVEL) + 1, MAX_LEVEL)
}

/** Get the title string for a given level. */
export function getTitle(level: number): string {
  const entry = TITLES.find(t => level >= t.minLevel && level <= t.maxLevel)
  if (!entry) return TITLES[0]!.title
  return entry.title
}

/** Get the Catppuccin color class for a given level. */
export function getTitleColor(level: number): string {
  const entry = TITLES.find(t => level >= t.minLevel && level <= t.maxLevel)
  if (!entry) return TITLES[0]!.color
  return entry.color
}

/** Calculate XP progress within the current level. */
export function xpForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = calculateLevel(xp)
  if (level >= MAX_LEVEL) {
    return { current: XP_PER_LEVEL, needed: XP_PER_LEVEL, progress: 1 }
  }
  const currentInLevel = xp % XP_PER_LEVEL
  return {
    current: currentInLevel,
    needed: XP_PER_LEVEL,
    progress: currentInLevel / XP_PER_LEVEL,
  }
}

/** Add XP and return new state with level-up detection. */
export function addXp(
  currentXp: number,
  gained: number,
): { xp: number; level: number; title: string; leveledUp: boolean } {
  const oldLevel = calculateLevel(currentXp)
  const newXp = currentXp + gained
  const newLevel = calculateLevel(newXp)
  return {
    xp: newXp,
    level: newLevel,
    title: getTitle(newLevel),
    leveledUp: newLevel > oldLevel,
  }
}

/** Check if completing challenges unlocks a new chapter. Returns next chapter number or null. */
export function checkChapterUnlock(
  completedIds: Set<string>,
  allChallenges: Array<{ id: string; source: { chapter: number } }>,
  currentUnlocked: number[],
): number | null {
  // Find the highest unlocked chapter
  const unlockedSet = new Set(currentUnlocked)

  for (const chapter of currentUnlocked) {
    // Get all challenges in this chapter
    const chapterChallenges = allChallenges.filter(c => c.source.chapter === chapter)
    // Check if all are completed
    const allCompleted = chapterChallenges.every(c => completedIds.has(c.id))
    if (allCompleted) {
      const nextChapter = chapter + 1
      // Check if next chapter exists in challenges and isn't already unlocked
      const nextExists = allChallenges.some(c => c.source.chapter === nextChapter)
      if (nextExists && !unlockedSet.has(nextChapter)) {
        return nextChapter
      }
    }
  }

  return null
}

/** Update daily streak. Returns new streak count and date. */
export function updateStreak(
  lastDate: string,
  currentDate: string,
  currentStreak: number,
): { streak: number; date: string } {
  if (!lastDate) {
    return { streak: 1, date: currentDate }
  }
  if (lastDate === currentDate) {
    return { streak: currentStreak, date: currentDate }
  }

  const last = new Date(lastDate)
  const current = new Date(currentDate)
  const diffMs = current.getTime() - last.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    return { streak: currentStreak + 1, date: currentDate }
  }

  return { streak: 1, date: currentDate }
}
