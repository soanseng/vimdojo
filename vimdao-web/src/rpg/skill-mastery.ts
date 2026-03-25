import { SKILL_LINES, MASTERY_PER_CHALLENGE, MASTERY_MAX } from './constants'
import type { SkillLineId } from './constants'

/** Map challenge tags + category to affected skill line IDs. */
export function getAffectedSkills(tags: string[], category: string): SkillLineId[] {
  const skills = new Set<SkillLineId>()

  for (const tag of tags) {
    for (const line of SKILL_LINES) {
      if (line.tags.includes(tag)) {
        skills.add(line.id)
      }
    }
  }

  if (category === 'combo') {
    skills.add('combo')
  }

  return [...skills]
}

/** Return a new mastery record with affected skills incremented, capped at MASTERY_MAX. */
export function updateMastery(
  current: Record<string, number>,
  affectedSkills: string[],
): Record<string, number> {
  const updated = { ...current }
  for (const skill of affectedSkills) {
    updated[skill] = Math.min((updated[skill] ?? 0) + MASTERY_PER_CHALLENGE, MASTERY_MAX)
  }
  return updated
}

/** Return a human-readable mastery label for a mastery value. */
export function getMasteryLabel(value: number): string {
  if (value <= 33) return '初學'
  if (value <= 66) return '進修中'
  return '熟練'
}
