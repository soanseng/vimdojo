import type { Challenge } from '../../types'

interface ChallengeResultProps {
  challenge: Challenge
  keyLog: string[]
  passed: boolean
  onRetry: () => void
  onNext: (() => void) | null
}

function formatKey(key: string): string {
  switch (key) {
    case 'Escape': return '\u238B'
    case 'Enter': return '\u23CE'
    case 'Backspace': return '\u232B'
    case ' ': return '\u2423'
    default: return key
  }
}

export default function ChallengeResult({
  challenge,
  keyLog,
  passed,
  onRetry,
  onNext,
}: ChallengeResultProps) {
  return (
    <div className="space-y-4">
      {/* Pass/Fail banner */}
      <div
        role="status"
        aria-live="polite"
        className={`rounded-lg p-5 font-medium ${
          challenge.is_boss ? 'border-2 border-dashed' : ''
        } ${
          passed
            ? `bg-ctp-green/10 border-ctp-green/30 text-ctp-green ${challenge.is_boss ? 'border-ctp-green' : 'border'}`
            : `bg-ctp-red/10 border-ctp-red/30 text-ctp-red ${challenge.is_boss ? 'border-ctp-red' : 'border'}`
        }`}
      >
        {challenge.is_boss && (
          <div className="text-xs mb-1 opacity-70">&#9876; BOSS 試煉</div>
        )}
        <div className="text-base">
          {passed ? '通過 — 答案正確！' : '未通過 — 文字內容與預期不符'}
        </div>
        {passed && challenge.xp_reward > 0 && (
          <div className="text-ctp-yellow font-bold mt-1">+{challenge.xp_reward} XP</div>
        )}
      </div>

      {/* Keystroke comparison */}
      <div className="bg-ctp-surface0 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-ctp-subtext1">按鍵比較</h3>
        <p className="text-sm text-ctp-text">
          你用了 <span className="font-mono text-ctp-blue font-bold">{keyLog.length}</span> 次按鍵
          （書中建議 <span className="font-mono text-ctp-green font-bold">{challenge.hint_commands.length}</span> 次）
        </p>
      </div>

      {/* Key replay */}
      <div className="bg-ctp-surface0 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-ctp-subtext1">按鍵回放</h3>
        <div className="flex flex-wrap gap-1">
          {keyLog.map((key, i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center rounded bg-ctp-base px-1.5 py-0.5 text-xs font-mono text-ctp-text shrink-0"
            >
              {formatKey(key)}
            </span>
          ))}
          {keyLog.length === 0 && (
            <span className="text-xs text-ctp-overlay0 italic">尚無按鍵紀錄</span>
          )}
        </div>
      </div>

      {/* Book solution */}
      <div className="bg-ctp-surface0 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-ctp-subtext1">書中解法</h3>
        <div className="flex flex-wrap gap-1 mb-2">
          {challenge.hint_commands.map((cmd, i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center rounded bg-ctp-base px-2 py-1 text-sm font-mono text-ctp-blue font-bold shrink-0"
            >
              {cmd}
            </span>
          ))}
        </div>
        {challenge.hint_text && (
          <p className="text-sm text-ctp-subtext0 whitespace-pre-wrap">
            {challenge.hint_text}
          </p>
        )}
      </div>

      {/* Expected text (on failure) */}
      {!passed && (
        <div className="space-y-2">
          <h3 className="text-xs text-ctp-overlay0">預期結果:</h3>
          <pre className="text-sm bg-ctp-surface0 rounded p-3 text-ctp-green font-mono whitespace-pre-wrap">
            {challenge.expected_text}
          </pre>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-ctp-surface1 text-ctp-text rounded text-sm hover:bg-ctp-surface2 transition-colors"
        >
          再練一次
        </button>
        {onNext && (
          <button
            onClick={onNext}
            className="px-4 py-2 bg-ctp-blue text-ctp-base rounded font-medium text-sm hover:opacity-90 transition-opacity"
          >
            下一題
          </button>
        )}
        <a
          href="/"
          className="px-4 py-2 bg-ctp-surface0 text-ctp-subtext0 rounded text-sm hover:bg-ctp-surface1 transition-colors"
        >
          返回道場
        </a>
      </div>
    </div>
  )
}
