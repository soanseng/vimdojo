import { useState, useCallback, useRef, useEffect } from 'react'

const ALL_FILES = [
  'src/main.tsx',
  'src/App.tsx',
  'src/engine/vim-engine.ts',
  'src/engine/vim-motions.ts',
  'src/engine/vim-operations.ts',
  'src/engine/vim-types.ts',
  'src/engine/vim-state.ts',
  'src/engine/vim-surround.ts',
  'src/engine/vim-search.ts',
  'src/engine/vim-comment.ts',
  'src/engine/vim-text-objects.ts',
  'src/components/VimEditor/VimEditor.tsx',
  'src/components/Challenge/ChallengeView.tsx',
  'src/components/Challenge/ChallengeList.tsx',
  'src/components/Quiz/QuizView.tsx',
  'src/components/RPG/CharacterPanel.tsx',
  'src/components/RPG/StoryDialog.tsx',
  'src/components/Dashboard/Dashboard.tsx',
  'src/hooks/useVimEditor.ts',
  'src/hooks/useProgress.ts',
  'src/types/index.ts',
  'src/styles/vim-editor.css',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
  'index.html',
  'README.md',
]

interface TelescopeSimulatorProps {
  /** What the exercise wants the user to achieve */
  goal: 'open' | 'select' | 'vsplit' | 'search' | 'navigate'
  /** Callback when the user completes the goal */
  onComplete: () => void
  /** Whether the simulator is active */
  isActive: boolean
}

type TelescopeState = 'closed' | 'open' | 'done'

export default function TelescopeSimulator({ goal: _goal, onComplete, isActive }: TelescopeSimulatorProps) {
  const [telescopeState, setTelescopeState] = useState<TelescopeState>('closed')
  const [searchText, setSearchText] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [openedFile, setOpenedFile] = useState<string | null>(null)
  const [openMethod, setOpenMethod] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter files based on search
  const filtered = searchText
    ? ALL_FILES.filter(f => f.toLowerCase().includes(searchText.toLowerCase()))
    : ALL_FILES

  useEffect(() => {
    containerRef.current?.focus()
  }, [telescopeState])

  // Reset when isActive changes
  useEffect(() => {
    if (!isActive) return
    setTelescopeState('closed')
    setSearchText('')
    setSelectedIdx(0)
    setOpenedFile(null)
    setOpenMethod(null)
  }, [isActive])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isActive) return
    e.preventDefault()
    e.stopPropagation()

    if (telescopeState === 'done') return

    if (telescopeState === 'closed') {
      // Waiting for <Space>ff to open
      // We detect Space key
      if (e.key === ' ') {
        // Start accumulating the combo
        setTelescopeState('open')
        return
      }
      return
    }

    // Telescope is open — handle picker keys
    if (telescopeState === 'open') {
      // Navigation
      if (e.ctrlKey && e.key === 'n') {
        setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1))
        return
      }
      if (e.ctrlKey && e.key === 'p') {
        setSelectedIdx(prev => Math.max(prev - 1, 0))
        return
      }

      // Open file
      if (e.key === 'Enter') {
        const file = filtered[selectedIdx]
        if (file) {
          setOpenedFile(file)
          setOpenMethod('buffer')
          setTelescopeState('done')
          onComplete()
        }
        return
      }

      // Vertical split
      if (e.ctrlKey && e.key === 'v') {
        const file = filtered[selectedIdx]
        if (file) {
          setOpenedFile(file)
          setOpenMethod('vsplit')
          setTelescopeState('done')
          onComplete()
        }
        return
      }

      // Horizontal split
      if (e.ctrlKey && e.key === 'x') {
        const file = filtered[selectedIdx]
        if (file) {
          setOpenedFile(file)
          setOpenMethod('hsplit')
          setTelescopeState('done')
          onComplete()
        }
        return
      }

      // Escape — close telescope
      if (e.key === 'Escape') {
        setTelescopeState('closed')
        setSearchText('')
        setSelectedIdx(0)
        return
      }

      // Backspace — delete last char from search
      if (e.key === 'Backspace') {
        setSearchText(prev => prev.slice(0, -1))
        setSelectedIdx(0)
        return
      }

      // Type character — add to search
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setSearchText(prev => prev + e.key)
        setSelectedIdx(0)
        return
      }
    }
  }, [isActive, telescopeState, filtered, selectedIdx, onComplete])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="outline-none"
    >
      {/* Closed state — mock editor background */}
      {telescopeState === 'closed' && (
        <div className="bg-ctp-base border border-ctp-surface1 rounded-lg overflow-hidden max-w-2xl mx-auto">
          <div className="bg-ctp-mantle px-3 py-1.5 text-xs text-ctp-overlay0 border-b border-ctp-surface1 flex justify-between">
            <span>NORMAL</span>
            <span>vim-engine.ts</span>
          </div>
          <div className="font-mono text-sm p-3 text-ctp-text min-h-[120px]">
            <div className="text-ctp-overlay0">  1 │ <span className="text-ctp-mauve">import</span> <span className="text-ctp-text">{'{ VimState }'}</span> <span className="text-ctp-mauve">from</span> <span className="text-ctp-green">'./vim-types'</span></div>
            <div className="text-ctp-overlay0">  2 │ </div>
            <div className="text-ctp-overlay0">  3 │ <span className="text-ctp-mauve">export function</span> <span className="text-ctp-blue">processKey</span>(state, key) {'{'}</div>
            <div className="text-ctp-overlay0">  4 │   <span className="text-ctp-mauve">return</span> handleNormalMode(state, key)</div>
            <div className="text-ctp-overlay0">  5 │ {'}'}</div>
          </div>
          <div className="bg-ctp-mantle px-3 py-2 border-t border-ctp-surface1 text-center">
            <span className="text-xs text-ctp-yellow animate-pulse">
              按 <kbd className="bg-ctp-surface0 px-1.5 py-0.5 rounded text-ctp-blue font-mono">Space</kbd> 開啟 Telescope
            </span>
          </div>
        </div>
      )}

      {/* Open state — Telescope picker */}
      {telescopeState === 'open' && (
        <div className="max-w-2xl mx-auto">
          {/* Dimmed background */}
          <div className="bg-ctp-base/50 border border-ctp-surface1 rounded-lg overflow-hidden">
            <div className="font-mono text-sm p-3 text-ctp-overlay0/30 min-h-[60px]">
              <div>  1 │ import {'{ VimState }'} from './vim-types'</div>
              <div>  2 │ </div>
            </div>
          </div>

          {/* Telescope floating window */}
          <div className="relative -mt-8 mx-6 bg-ctp-mantle border-2 border-ctp-blue/60 rounded-lg overflow-hidden shadow-2xl shadow-ctp-blue/20 z-10">
            {/* Title */}
            <div className="bg-ctp-surface0 px-3 py-1.5 text-xs border-b border-ctp-surface1 flex justify-between items-center">
              <span className="text-ctp-blue font-medium">Telescope — Find Files</span>
              <span className="text-ctp-overlay0">{filtered.length} / {ALL_FILES.length}</span>
            </div>

            {/* Search input */}
            <div className="px-3 py-2 border-b border-ctp-surface1 bg-ctp-base">
              <div className="flex items-center gap-2">
                <span className="text-ctp-blue text-sm font-bold">❯</span>
                <span className="text-sm text-ctp-text font-mono">
                  {searchText}
                  <span className="border-l-2 border-ctp-green animate-pulse ml-0.5">&nbsp;</span>
                </span>
              </div>
            </div>

            {/* File list */}
            <div className="max-h-[200px] overflow-y-auto">
              {filtered.slice(0, 10).map((file, idx) => {
                const isSelected = idx === selectedIdx
                // Highlight matching chars
                const parts = highlightMatch(file, searchText)
                return (
                  <div
                    key={file}
                    className={`px-3 py-1 font-mono text-sm flex items-center gap-2 ${
                      isSelected
                        ? 'bg-ctp-surface0 text-ctp-blue'
                        : 'text-ctp-text hover:bg-ctp-surface0/50'
                    }`}
                  >
                    {isSelected && <span className="text-ctp-blue text-xs">▸</span>}
                    <span>{parts}</span>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-ctp-overlay0 text-center italic">
                  沒有找到匹配的檔案
                </div>
              )}
            </div>

            {/* Footer with controls */}
            <div className="bg-ctp-surface0 px-3 py-1.5 border-t border-ctp-surface1 flex items-center gap-3 text-xs text-ctp-overlay0">
              <span><kbd className="text-ctp-blue">C-n</kbd>/<kbd className="text-ctp-blue">C-p</kbd> 上下</span>
              <span><kbd className="text-ctp-green">Enter</kbd> 開啟</span>
              <span><kbd className="text-ctp-yellow">C-v</kbd> 垂直分割</span>
              <span><kbd className="text-ctp-red">Esc</kbd> 關閉</span>
            </div>
          </div>
        </div>
      )}

      {/* Done state — file opened */}
      {telescopeState === 'done' && openedFile && (
        <div className="bg-ctp-base border border-ctp-green/50 rounded-lg overflow-hidden max-w-2xl mx-auto shadow-lg shadow-ctp-green/10">
          <div className="bg-ctp-mantle px-3 py-1.5 text-xs border-b border-ctp-surface1 flex justify-between items-center">
            <span className="text-ctp-green font-medium">
              {openMethod === 'vsplit' ? '⬍ 垂直分割開啟' : openMethod === 'hsplit' ? '⬌ 水平分割開啟' : '📄 開啟檔案'}
            </span>
            <span className="text-ctp-blue font-mono">{openedFile}</span>
          </div>
          <div className="p-4 text-center">
            <div className="text-ctp-green text-2xl mb-2">✓</div>
            <div className="text-sm text-ctp-text">
              成功開啟 <span className="font-mono text-ctp-blue">{openedFile}</span>
            </div>
            {openMethod && openMethod !== 'buffer' && (
              <div className="text-xs text-ctp-subtext0 mt-1">
                使用{openMethod === 'vsplit' ? '垂直分割' : '水平分割'}方式開啟
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Highlight matching characters in filename */
function highlightMatch(file: string, search: string): React.ReactNode {
  if (!search) return file

  const lowerFile = file.toLowerCase()
  const lowerSearch = search.toLowerCase()
  const idx = lowerFile.indexOf(lowerSearch)

  if (idx === -1) return file

  return (
    <>
      {file.slice(0, idx)}
      <span className="text-ctp-green font-bold underline">{file.slice(idx, idx + search.length)}</span>
      {file.slice(idx + search.length)}
    </>
  )
}
