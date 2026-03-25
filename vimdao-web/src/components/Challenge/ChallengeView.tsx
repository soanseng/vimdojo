import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Challenge, ChallengeSet } from '../../types'
import { useVimEditor } from '../../hooks/useVimEditor'
import { getText } from '../../engine/vim-state'
import VimEditor from '../VimEditor/VimEditor'

type SubmitResult = 'pass' | 'fail' | null

export default function ChallengeView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult>(null)
  const [showHint, setShowHint] = useState(false)

  // Initialize with empty text; will be reset when challenge loads
  const { state, handleKey, reset } = useVimEditor('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/practical-vim_challenges.json', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        return res.json() as Promise<ChallengeSet>
      })
      .then(data => {
        if (!Array.isArray(data?.challenges)) {
          throw new Error('Invalid challenge data format')
        }
        const found = data.challenges.find(c => c.id === id)
        if (!found) {
          setError('找不到此練習題')
        } else {
          setChallenge(found)
          reset(found.initial_text, found.cursor_start)
        }
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : '載入失敗')
        setLoading(false)
      })
    return () => { controller.abort() }
  }, [id, reset])

  const handleEditorKey = useCallback((key: string) => {
    handleKey(key)
    setResult(null)
  }, [handleKey])

  const handleSubmit = useCallback(() => {
    if (!challenge) return
    const currentText = getText(state)
    if (currentText === challenge.expected_text) {
      setResult('pass')
    } else {
      setResult('fail')
    }
  }, [state, challenge])

  const handleRetry = useCallback(() => {
    if (!challenge) return
    reset(challenge.initial_text, challenge.cursor_start)
    setResult(null)
  }, [challenge, reset])

  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

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
      <header className="border-b border-ctp-surface0 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="text-sm text-ctp-blue hover:underline"
        >
          返回列表
        </button>
        <span className="text-xs text-ctp-overlay0">
          Practical Vim Tip {String(challenge.source.tip_number)}
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Title & description */}
        <div>
          <h1 className="text-xl font-bold text-ctp-text mb-2">{challenge.title_zh}</h1>
          <p className="text-sm text-ctp-subtext0 whitespace-pre-wrap">{challenge.description_zh}</p>
        </div>

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

        {/* Editor */}
        <VimEditor
          state={state}
          onKey={handleEditorKey}
          title={challenge.title_en}
        />

        {/* Actions & result */}
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

        {result === 'pass' && (
          <div role="status" aria-live="polite" className="bg-ctp-green/10 border border-ctp-green/30 rounded-lg p-4 text-ctp-green font-medium">
            通過 — 答案正確！共 {state.keyLog.length} 次按鍵
          </div>
        )}
        {result === 'fail' && (
          <div role="status" aria-live="polite" className="bg-ctp-red/10 border border-ctp-red/30 rounded-lg p-4 text-ctp-red font-medium">
            未通過 — 文字內容與預期不符，請再試一次
          </div>
        )}

        {/* Expected text (shown after failure) */}
        {result === 'fail' && (
          <div className="space-y-2">
            <h3 className="text-xs text-ctp-overlay0">預期結果:</h3>
            <pre className="text-sm bg-ctp-surface0 rounded p-3 text-ctp-green font-mono whitespace-pre-wrap">
              {challenge.expected_text}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
