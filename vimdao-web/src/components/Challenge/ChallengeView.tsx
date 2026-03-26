import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet, StoryData } from '../../types'
import { useVimEditor } from '../../hooks/useVimEditor'
import { useProgress } from '../../hooks/useProgress'
import { getText } from '../../engine/vim-state'
import { addXp, checkChapterUnlock, updateStreak } from '../../rpg/progression'
import { getAffectedSkills, updateMastery } from '../../rpg/skill-mastery'
import { checkAchievements } from '../../rpg/achievements'
import { ACHIEVEMENTS } from '../../rpg/constants'
import VimEditor from '../VimEditor/VimEditor'
import BossFrame from '../RPG/BossFrame'
import StoryDialog from '../RPG/StoryDialog'
import AchievementToast from '../RPG/AchievementToast'
import ChallengeResult from './ChallengeResult'

type SubmitResult = 'pass' | 'fail' | null

export default function ChallengeView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { progress, update } = useProgress()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult>(null)
  const [showHint, setShowHint] = useState(false)
  const [_leveledUp, setLeveledUp] = useState(false)

  // Story dialog state
  const [bossIntro, setBossIntro] = useState<string[] | null>(null)
  const [showBossIntro, setShowBossIntro] = useState(false)
  const [outroStory, setOutroStory] = useState<string[] | null>(null)
  const [showOutro, setShowOutro] = useState(false)

  // Achievement toast state
  const [toastAchievement, setToastAchievement] = useState<{
    name: string
    description: string
    icon: string
  } | null>(null)
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([])

  // Initialize with empty text; will be reset when challenge loads
  const { state, handleKey, reset } = useVimEditor('')

  // Snapshot keyLog and editor lines at submission time so that the result
  // view keeps displaying them even when the underlying editor state is reset
  // (e.g. by the data-fetching effect re-running after progress changes).
  const [submittedKeyLog, setSubmittedKeyLog] = useState<string[]>([])
  const [submittedLines, setSubmittedLines] = useState<string[]>([])

  const isLazyVim = id?.startsWith('lv-') ?? false

  useEffect(() => {
    const controller = new AbortController()

    const base = import.meta.env.BASE_URL
    const challengeUrl = isLazyVim
      ? base + 'data/lazyvim_exercises.json'
      : base + 'data/practical-vim_challenges.json'

    // Reset result when navigating to a new challenge (BUG-4 fix)
    setResult(null)

    Promise.all([
      fetch(challengeUrl, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json()
        }),
      fetch(import.meta.env.BASE_URL + 'data/story.json', { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
          return res.json() as Promise<StoryData>
        }),
    ])
      .then(([rawData, storyData]) => {
        let exercises: Challenge[]

        if (isLazyVim) {
          // LazyVim exercises — filter to engine type only, cast to Challenge
          const lvData = rawData as { exercises?: Array<{ type?: string } & Record<string, unknown>> }
          exercises = ((lvData.exercises ?? []) as unknown as Challenge[]).filter(
            (e: unknown) => (e as { type?: string }).type === 'engine'
          )
        } else {
          const challengeData = rawData as ChallengeSet
          if (!Array.isArray(challengeData?.challenges)) {
            throw new Error('Invalid challenge data format')
          }
          exercises = challengeData.challenges
        }

        const found = exercises.find(c => c.id === id)
        if (!found) {
          setError('找不到此練習題')
        } else {
          setChallenge(found)
          setAllChallenges(exercises)
          reset(found.initial_text, found.cursor_start)

          // If BOSS challenge and not yet completed, show boss intro from story
          if (found.is_boss && !(found.id in progress.challenges_completed)) {
            const chapter = storyData?.chapters?.find(
              (ch) => ch.chapter_id === found.source.chapter
            )
            if (chapter?.boss_intro && chapter.boss_intro.length > 0) {
              setBossIntro(chapter.boss_intro)
              setShowBossIntro(true)
            }
          }

          // Store outro story for later if BOSS
          if (found.is_boss) {
            const chapter = storyData?.chapters?.find(
              (ch) => ch.chapter_id === found.source.chapter
            )
            if (chapter?.outro_story && chapter.outro_story.length > 0) {
              setOutroStory(chapter.outro_story)
            }
          }
        }
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })

    return () => { controller.abort() }
  }, [id, reset, isLazyVim])

  // Show pending achievements one by one
  useEffect(() => {
    if (pendingAchievements.length === 0 || toastAchievement !== null) return

    const nextId = pendingAchievements[0]!
    const def = ACHIEVEMENTS.find(a => a.id === nextId)
    if (def) {
      setToastAchievement({ name: def.name, description: def.description, icon: def.icon })
    }
    setPendingAchievements(prev => prev.slice(1))
  }, [pendingAchievements, toastAchievement])

  const handleEditorKey = useCallback((key: string) => {
    handleKey(key)
    setResult(null)
  }, [handleKey])

  const handleSubmit = useCallback(() => {
    if (!challenge) return
    const currentText = getText(state)

    // Snapshot keyLog and editor lines BEFORE setting the result, so
    // the result view can display them even if the editor state resets.
    setSubmittedKeyLog([...state.keyLog])
    setSubmittedLines([...state.lines])

    if (currentText === challenge.expected_text) {
      setResult('pass')

      // Only award XP on first completion
      const alreadyCompleted = challenge.id in progress.challenges_completed
      if (!alreadyCompleted) {
        const today = new Date().toISOString().slice(0, 10)

        update(prev => {
          // 1. Award XP
          const xpResult = addXp(prev.xp, challenge.xp_reward)

          // 2. Update skill mastery
          const affectedSkills = getAffectedSkills(challenge.tags, challenge.category)
          const newMastery = updateMastery(prev.skill_mastery, affectedSkills)

          // 3. Update streak
          const streakResult = updateStreak(prev.last_practice_date, today, prev.streak_days)

          // 4. Record completion
          const newCompleted = {
            ...prev.challenges_completed,
            [challenge.id]: {
              completed_at: today,
              keystrokes: state.keyLog.length,
            },
          }

          // 5. Check chapter unlock
          const completedIds = new Set(Object.keys(newCompleted))
          const newChapter = checkChapterUnlock(
            completedIds,
            allChallenges,
            prev.chapters_unlocked,
          )
          const newUnlocked = newChapter !== null
            ? [...prev.chapters_unlocked, newChapter]
            : prev.chapters_unlocked

          // Build intermediate progress for achievement check
          const intermediate = {
            ...prev,
            xp: xpResult.xp,
            level: xpResult.level,
            title: xpResult.title,
            skill_mastery: newMastery,
            streak_days: streakResult.streak,
            last_practice_date: streakResult.date,
            challenges_completed: newCompleted,
            chapters_unlocked: newUnlocked,
          }

          // 6. Check achievements
          const newAchievements = checkAchievements(
            intermediate,
            allChallenges,
            allChallenges.length,
          )
          const allAchievements = newAchievements.length > 0
            ? [...prev.achievements, ...newAchievements]
            : prev.achievements

          // Trigger side effects after state update
          if (xpResult.leveledUp) {
            setLeveledUp(true)
          }
          if (newAchievements.length > 0) {
            setPendingAchievements(newAchievements)
          }

          // Show outro story for BOSS completion
          if (challenge.is_boss && outroStory && outroStory.length > 0) {
            setShowOutro(true)
          }

          return {
            ...intermediate,
            achievements: allAchievements,
          }
        })
      }
    } else {
      setResult('fail')
    }
  }, [state, challenge, progress.challenges_completed, allChallenges, outroStory, update])

  const handleRetry = useCallback(() => {
    if (!challenge) return
    reset(challenge.initial_text, challenge.cursor_start)
    setResult(null)
    setLeveledUp(false)
  }, [challenge, reset])

  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleDismissToast = useCallback(() => {
    setToastAchievement(null)
  }, [])

  // Find next challenge: next in same chapter, or first of next chapter
  const nextChallenge = useMemo(() => {
    if (!challenge || allChallenges.length === 0) return null
    const currentIdx = allChallenges.findIndex(c => c.id === challenge.id)
    if (currentIdx === -1 || currentIdx >= allChallenges.length - 1) return null
    return allChallenges[currentIdx + 1] ?? null
  }, [challenge, allChallenges])

  const handleNext = useCallback(() => {
    if (nextChallenge) {
      navigate(`/challenge/${nextChallenge.id}`)
    }
  }, [nextChallenge, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-ctp-base text-ctp-text flex items-center justify-center">
        <span className="text-ctp-subtext0">載入中...</span>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-ctp-base text-ctp-text flex flex-col items-center justify-center gap-4">
        <span className="text-ctp-red">{error ?? '找不到此練習題'}</span>
        <button
          onClick={handleBack}
          className="text-sm text-ctp-blue hover:underline"
        >
          返回列表
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      {/* Boss intro story dialog */}
      {showBossIntro && bossIntro && (
        <StoryDialog
          title="BOSS 試煉"
          paragraphs={bossIntro}
          onDismiss={() => { setShowBossIntro(false) }}
        />
      )}

      {/* Outro story dialog (after BOSS completion) */}
      {showOutro && outroStory && (
        <StoryDialog
          title="通關"
          paragraphs={outroStory}
          onDismiss={() => { setShowOutro(false) }}
        />
      )}

      {/* Achievement toast */}
      <AchievementToast
        achievement={toastAchievement}
        onDismiss={handleDismissToast}
      />

      <header className="border-b border-ctp-surface0 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="text-sm text-ctp-blue hover:underline"
        >
          返回列表
        </button>
        <span className="text-xs text-ctp-overlay0">
          {isLazyVim
            ? `LazyVim${'plugin' in challenge ? ` \u00B7 ${(challenge as unknown as { plugin: string }).plugin}` : ''}`
            : `Vim 核心 Tip ${String(challenge.source.tip_number)}`
          }
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Title & description (strip hint spoilers from description) */}
        <div>
          <h1 className="text-xl font-bold text-ctp-text mb-2">{challenge.title_zh}</h1>
          <p className="text-sm text-ctp-subtext0 whitespace-pre-wrap">
            {(challenge.description_zh ?? '').replace(/\n?提示按鍵：.*$/m, '').trim() || '將初始文字修改為目標文字。'}
          </p>
        </div>

        {/* Target text preview */}
        <div className="bg-ctp-surface0 rounded-lg p-4">
          <h3 className="text-xs font-medium text-ctp-subtext0 mb-2">目標文字</h3>
          <pre className="text-sm font-mono text-ctp-green whitespace-pre-wrap">{challenge.expected_text}</pre>
        </div>

        {/* Flavor text */}
        {challenge.flavor_zh && (
          <p className="text-sm italic text-ctp-overlay1">
            {challenge.flavor_zh}
          </p>
        )}

        {/* Hint toggle */}
        <div>
          <button
            onClick={() => { setShowHint(prev => !prev) }}
            className="text-xs text-ctp-blue hover:underline"
          >
            {showHint ? '隱藏提示' : '顯示提示'}
          </button>
          {showHint && (
            <div className="mt-2 text-sm text-ctp-peach bg-ctp-surface0 rounded p-3 whitespace-pre-wrap">
              {challenge.hint_text}
            </div>
          )}
        </div>

        {/* Editor wrapped in BossFrame */}
        <BossFrame isBoss={challenge.is_boss}>
          <VimEditor
            state={state}
            onKey={handleEditorKey}
            title={challenge.title_en}
          />
        </BossFrame>

        {/* Actions & result */}
        {result === null && (
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-ctp-blue text-ctp-base rounded font-medium text-sm hover:opacity-90 transition-opacity"
            >
              提交答案
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-ctp-surface1 text-ctp-text rounded text-sm hover:bg-ctp-surface2 transition-colors"
            >
              再練一次
            </button>
            <span className="text-xs text-ctp-overlay0 ml-auto">
              按鍵次數: {state.keyLog.length}
            </span>
          </div>
        )}

        {result !== null && (
          <ChallengeResult
            challenge={challenge}
            keyLog={submittedKeyLog}
            editorLines={submittedLines}
            passed={result === 'pass'}
            onRetry={handleRetry}
            onNext={nextChallenge ? handleNext : null}
          />
        )}
      </main>
    </div>
  )
}
