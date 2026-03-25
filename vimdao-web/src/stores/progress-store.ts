import type { UserProgress } from '../types'

const STORAGE_KEY = 'vimdao-progress'

const DEFAULT_PROGRESS: UserProgress = {
  challenges_completed: {},
  level: 1,
  xp: 0,
  title: '鍵道學徒',
  skill_mastery: { motion: 0, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 },
  achievements: [],
  chapters_unlocked: [1],
  current_chapter: 1,
  streak_days: 0,
  last_practice_date: '',
}

export function loadProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PROGRESS, skill_mastery: { ...DEFAULT_PROGRESS.skill_mastery } }
    const parsed = JSON.parse(raw) as Partial<UserProgress>
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      skill_mastery: { ...DEFAULT_PROGRESS.skill_mastery, ...(parsed.skill_mastery ?? {}) },
    }
  } catch {
    return { ...DEFAULT_PROGRESS, skill_mastery: { ...DEFAULT_PROGRESS.skill_mastery } }
  }
}

export function saveProgress(progress: UserProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY)
}
