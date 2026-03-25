import { useEffect } from 'react'

interface AchievementToastProps {
  achievement: { name: string; description: string; icon: string } | null
  onDismiss: () => void
}

export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    if (!achievement) return

    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [achievement, onDismiss])

  if (!achievement) return null

  return (
    <div className="achievement-toast fixed top-4 right-4 z-50 rounded-lg bg-ctp-surface0 p-4 shadow-lg max-w-xs">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{achievement.icon}</span>
        <div>
          <p className="text-sm font-bold text-ctp-yellow">{achievement.name}</p>
          <p className="text-xs text-ctp-subtext0">{achievement.description}</p>
        </div>
      </div>
    </div>
  )
}
