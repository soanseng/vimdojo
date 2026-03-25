interface StoryDialogProps {
  paragraphs: string[]
  onDismiss: () => void
  title?: string
}

/** Highlight Vim command references (backtick-wrapped text) with ctp-blue. */
function renderParagraph(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <span key={i} className="font-mono text-ctp-blue">
          {part.slice(1, -1)}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function StoryDialog({ paragraphs, onDismiss, title }: StoryDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="story-dialog max-w-lg w-full mx-4 p-6 space-y-4">
        {title && (
          <h2 className="text-lg font-bold text-ctp-yellow">{title}</h2>
        )}
        <div className="space-y-3 text-ctp-text text-sm leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i}>{renderParagraph(p)}</p>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onDismiss}
            className="rounded px-4 py-1.5 text-sm font-medium bg-ctp-surface0 text-ctp-text hover:bg-ctp-surface1 transition-colors"
          >
            繼續
          </button>
        </div>
      </div>
    </div>
  )
}
