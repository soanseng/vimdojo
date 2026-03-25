import { useState, useCallback } from 'react'
import type { VimState } from '../engine/vim-types'
import { createState, getText } from '../engine/vim-state'
import { processKey } from '../engine/vim-engine'

export function useVimEditor(initialText: string, cursorStart?: { line: number; col: number }) {
  const [state, setState] = useState<VimState>(() => createState(initialText, cursorStart))

  const handleKey = useCallback((key: string) => {
    setState(prev => processKey(prev, key).state)
  }, [])

  const reset = useCallback((text: string, cursor?: { line: number; col: number }) => {
    setState(createState(text, cursor))
  }, [])

  return { state, text: getText(state), handleKey, reset }
}
