interface KeyLogProps {
  keys: string[]
  maxDisplay?: number
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

export default function KeyLog({ keys, maxDisplay = 20 }: KeyLogProps) {
  const displayed = keys.slice(-maxDisplay)

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 bg-ctp-crust">
      <span className="text-xs text-ctp-overlay0 mr-2 shrink-0">按鍵:</span>
      {displayed.map((key, i) => (
        <span
          key={keys.length - maxDisplay + i}
          className="inline-flex items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 text-xs font-mono text-ctp-text shrink-0"
        >
          {formatKey(key)}
        </span>
      ))}
      {displayed.length === 0 && (
        <span className="text-xs text-ctp-overlay0 italic">尚無按鍵紀錄</span>
      )}
    </div>
  )
}
