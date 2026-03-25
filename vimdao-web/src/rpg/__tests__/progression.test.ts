import { describe, it, expect } from 'vitest'
import { calculateLevel, getTitle, getTitleColor, xpForNextLevel, addXp, checkChapterUnlock, updateStreak } from '../progression'

describe('calculateLevel', () => {
  it('0 XP = level 1', () => expect(calculateLevel(0)).toBe(1))
  it('99 XP = level 1', () => expect(calculateLevel(99)).toBe(1))
  it('100 XP = level 2', () => expect(calculateLevel(100)).toBe(2))
  it('250 XP = level 3', () => expect(calculateLevel(250)).toBe(3))
  it('1200 XP = level 12 (max)', () => expect(calculateLevel(1200)).toBe(12))
  it('9999 XP = still level 12', () => expect(calculateLevel(9999)).toBe(12))
})

describe('getTitle', () => {
  it('level 1 = 鍵道學徒', () => expect(getTitle(1)).toBe('鍵道學徒'))
  it('level 5 = 終端行者', () => expect(getTitle(5)).toBe('終端行者'))
  it('level 12 = 鍵道宗師', () => expect(getTitle(12)).toBe('鍵道宗師'))
})

describe('getTitleColor', () => {
  it('level 1 returns subtext0 color', () => expect(getTitleColor(1)).toBe('ctp-subtext0'))
  it('level 12 returns red color', () => expect(getTitleColor(12)).toBe('ctp-red'))
})

describe('xpForNextLevel', () => {
  it('at 0 XP, need 100 for next level', () => {
    const info = xpForNextLevel(0)
    expect(info.current).toBe(0)
    expect(info.needed).toBe(100)
    expect(info.progress).toBe(0)
  })
  it('at 150 XP, 50 into level 2', () => {
    const info = xpForNextLevel(150)
    expect(info.current).toBe(50)
    expect(info.progress).toBe(0.5)
  })
  it('at max level, progress = 1', () => {
    const info = xpForNextLevel(1200)
    expect(info.progress).toBe(1)
  })
})

describe('addXp', () => {
  it('adds XP and recalculates level', () => {
    const result = addXp(0, 150)
    expect(result.xp).toBe(150)
    expect(result.level).toBe(2)
    expect(result.title).toBe('鍵道學徒')
  })
  it('detects level up', () => {
    const result = addXp(90, 20)
    expect(result.leveledUp).toBe(true)
    expect(result.level).toBe(2)
  })
  it('no level up', () => {
    const result = addXp(0, 10)
    expect(result.leveledUp).toBe(false)
  })
  it('caps at max level', () => {
    const result = addXp(0, 99999)
    expect(result.level).toBe(12)
  })
})

describe('checkChapterUnlock', () => {
  const challenges = [
    { id: 'a', source: { chapter: 1 } },
    { id: 'b', source: { chapter: 1 } },
    { id: 'c', source: { chapter: 2 } },
  ]

  it('returns null when chapter not fully completed', () => {
    expect(checkChapterUnlock(new Set(['a']), challenges, [1])).toBeNull()
  })
  it('returns next chapter when current is fully completed', () => {
    expect(checkChapterUnlock(new Set(['a', 'b']), challenges, [1])).toBe(2)
  })
  it('returns null when next chapter already unlocked', () => {
    expect(checkChapterUnlock(new Set(['a', 'b']), challenges, [1, 2])).toBeNull()
  })
})

describe('updateStreak', () => {
  it('same day = no change', () => {
    expect(updateStreak('2026-03-25', '2026-03-25', 5)).toEqual({ streak: 5, date: '2026-03-25' })
  })
  it('next day = increment', () => {
    expect(updateStreak('2026-03-24', '2026-03-25', 5)).toEqual({ streak: 6, date: '2026-03-25' })
  })
  it('gap = reset to 1', () => {
    expect(updateStreak('2026-03-20', '2026-03-25', 5)).toEqual({ streak: 1, date: '2026-03-25' })
  })
  it('empty lastDate = start at 1', () => {
    expect(updateStreak('', '2026-03-25', 0)).toEqual({ streak: 1, date: '2026-03-25' })
  })
})
