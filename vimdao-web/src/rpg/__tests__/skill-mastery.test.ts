import { describe, it, expect } from 'vitest'
import { getAffectedSkills, updateMastery, getMasteryLabel } from '../skill-mastery'

describe('getAffectedSkills', () => {
  it('motion tags map to motion skill', () => {
    expect(getAffectedSkills(['w', 'b'], 'other')).toContain('motion')
  })
  it('combo category maps to combo skill', () => {
    expect(getAffectedSkills(['d', 'w'], 'combo')).toContain('combo')
  })
  it('dot maps to repeat skill', () => {
    expect(getAffectedSkills(['.'], 'other')).toContain('repeat')
  })
  it('returns multiple skills for mixed tags', () => {
    const skills = getAffectedSkills(['d', 'w', '.'], 'combo')
    expect(skills).toContain('editing')
    expect(skills).toContain('motion')
    expect(skills).toContain('repeat')
    expect(skills).toContain('combo')
  })
  it('returns empty for unknown tags', () => {
    expect(getAffectedSkills(['zzz'], 'other')).toEqual([])
  })
  it('deduplicates skills', () => {
    const skills = getAffectedSkills(['w', 'W', 'b'], 'other')
    const motionCount = skills.filter(s => s === 'motion').length
    expect(motionCount).toBe(1)
  })
})

describe('updateMastery', () => {
  it('adds 10 to affected skills', () => {
    const mastery = { motion: 0, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 }
    const updated = updateMastery(mastery, ['motion', 'editing'])
    expect(updated.motion).toBe(10)
    expect(updated.editing).toBe(10)
    expect(updated.insert).toBe(0)
  })
  it('caps at 100', () => {
    const mastery = { motion: 95, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 }
    const updated = updateMastery(mastery, ['motion'])
    expect(updated.motion).toBe(100)
  })
  it('does not mutate input', () => {
    const mastery = { motion: 50, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 }
    updateMastery(mastery, ['motion'])
    expect(mastery.motion).toBe(50)
  })
})

describe('getMasteryLabel', () => {
  it('0-33 = 初學', () => expect(getMasteryLabel(20)).toBe('初學'))
  it('34-66 = 進修中', () => expect(getMasteryLabel(50)).toBe('進修中'))
  it('67-100 = 熟練', () => expect(getMasteryLabel(80)).toBe('熟練'))
  it('0 = 初學', () => expect(getMasteryLabel(0)).toBe('初學'))
  it('100 = 熟練', () => expect(getMasteryLabel(100)).toBe('熟練'))
})
