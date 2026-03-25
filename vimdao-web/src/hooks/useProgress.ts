import { useState, useCallback } from 'react'
import { loadProgress, saveProgress } from '../stores/progress-store'
import type { UserProgress } from '../types'

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(loadProgress)

  const update = useCallback((updater: (prev: UserProgress) => UserProgress) => {
    setProgress(prev => {
      const next = updater(prev)
      saveProgress(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const fresh = loadProgress()
    setProgress(fresh)
  }, [])

  return { progress, update, reset }
}
