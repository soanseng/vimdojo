import { describe, it, expect } from 'vitest'
import { checkAchievements } from '../achievements'
import type { UserProgress } from '../../types'

const makeProgress = (overrides: Partial<UserProgress> = {}): UserProgress => ({
  challenges_completed: {},
  level: 1, xp: 0, title: '鍵道學徒',
  skill_mastery: { motion: 0, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 },
  achievements: [],
  chapters_unlocked: [1], current_chapter: 1,
  streak_days: 0, last_practice_date: '',
  ...overrides,
})

describe('checkAchievements', () => {
  it('first-clear: completing any challenge', () => {
    const progress = makeProgress({ challenges_completed: { 'pv-tip01-001': { completed_at: '', keystrokes: 5 } } })
    const result = checkAchievements(progress, [], 69)
    expect(result).toContain('first-clear')
  })

  it('one-shot: keystrokes <= hint_commands.length', () => {
    const progress = makeProgress({
      challenges_completed: { 'a': { completed_at: '', keystrokes: 2 } }
    })
    const challenges = [{ id: 'a', hint_commands: ['x', '.'], hint_keystrokes: 'x.', tags: [], source: { chapter: 1 } }]
    const result = checkAchievements(progress, challenges, 69)
    expect(result).toContain('one-shot')
  })

  it('streak-7: 7+ consecutive days', () => {
    const progress = makeProgress({ streak_days: 7 })
    const result = checkAchievements(progress, [], 69)
    expect(result).toContain('streak-7')
  })

  it('all-clear: all challenges completed', () => {
    const completed: Record<string, { completed_at: string; keystrokes: number }> = {}
    for (let i = 1; i <= 69; i++) {
      completed[`c${String(i)}`] = { completed_at: '', keystrokes: 5 }
    }
    const progress = makeProgress({ challenges_completed: completed })
    const result = checkAchievements(progress, [], 69)
    expect(result).toContain('all-clear')
  })

  it('chapter-clear: all challenges in one chapter completed', () => {
    const challenges = [
      { id: 'a', hint_commands: [], tags: [], source: { chapter: 1 } },
      { id: 'b', hint_commands: [], tags: [], source: { chapter: 1 } },
      { id: 'c', hint_commands: [], tags: [], source: { chapter: 2 } },
    ]
    const progress = makeProgress({
      challenges_completed: {
        'a': { completed_at: '', keystrokes: 5 },
        'b': { completed_at: '', keystrokes: 3 },
      },
    })
    const result = checkAchievements(progress, challenges, 3)
    expect(result).toContain('chapter-clear')
  })

  it('dot-master: all challenges with dot tag completed', () => {
    const challenges = [
      { id: 'a', hint_commands: [], tags: ['.', 'x'], source: { chapter: 1 } },
      { id: 'b', hint_commands: [], tags: ['.', 'dd'], source: { chapter: 1 } },
      { id: 'c', hint_commands: [], tags: ['w'], source: { chapter: 1 } },
    ]
    const progress = makeProgress({
      challenges_completed: {
        'a': { completed_at: '', keystrokes: 5 },
        'b': { completed_at: '', keystrokes: 3 },
      },
    })
    const result = checkAchievements(progress, challenges, 3)
    expect(result).toContain('dot-master')
  })

  it('does not return already-earned achievements', () => {
    const progress = makeProgress({
      challenges_completed: { 'a': { completed_at: '', keystrokes: 5 } },
      achievements: ['first-clear'],
    })
    const result = checkAchievements(progress, [], 69)
    expect(result).not.toContain('first-clear')
  })
})
