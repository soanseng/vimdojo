import { SKILL_LINES } from '../../rpg/constants'
import { getTitleColor, xpForNextLevel } from '../../rpg/progression'
import { getMasteryLabel } from '../../rpg/skill-mastery'
import type { UserProgress } from '../../types'

interface CharacterPanelProps {
  progress: UserProgress
}

export default function CharacterPanel({ progress }: CharacterPanelProps) {
  const titleColor = getTitleColor(progress.level)
  const xpInfo = xpForNextLevel(progress.xp)

  return (
    <div className="rounded-lg bg-ctp-mantle p-4 space-y-4">
      {/* Level & Title */}
      <div className="flex items-center gap-3">
        <span
          className={`text-2xl font-bold text-${titleColor}`}
        >
          Lv.{progress.level}
        </span>
        <span className={`text-lg text-${titleColor}`}>
          {progress.title}
        </span>
      </div>

      {/* XP Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-ctp-subtext0">
          <span>EXP</span>
          <span>{xpInfo.current} / {xpInfo.needed}</span>
        </div>
        <div className="h-2 w-full rounded bg-ctp-surface0">
          <div
            className="xp-bar-fill"
            style={{ width: `${Math.round(xpInfo.progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Skill Mastery */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ctp-subtext1">技能精通</h3>
        {SKILL_LINES.map((skill) => {
          const value = progress.skill_mastery[skill.id] ?? 0
          const label = getMasteryLabel(value)
          return (
            <div key={skill.id} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className={`text-${skill.color}`}>{skill.name}</span>
                <span className="text-ctp-subtext0">
                  {value} — {label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded bg-ctp-surface0">
                <div
                  className={`h-full rounded bg-${skill.color}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
