import type { VimState } from './vim-types'

export function toggleLineComment(state: VimState, startLine: number, endLine: number): VimState {
  return toggleRangeComment(state, startLine, endLine)
}

export function toggleRangeComment(state: VimState, startLine: number, endLine: number): VimState {
  const newLines = [...state.lines]
  const end = Math.min(endLine, newLines.length - 1)

  // Check if ALL lines in range are commented (to decide comment vs uncomment)
  let allCommented = true
  for (let i = startLine; i <= end; i++) {
    const line = newLines[i] ?? ''
    const trimmed = line.trimStart()
    if (trimmed.length > 0 && !trimmed.startsWith('//')) {
      allCommented = false
      break
    }
  }

  for (let i = startLine; i <= end; i++) {
    const line = newLines[i] ?? ''
    if (allCommented) {
      // Uncomment: remove // (and optional space after)
      newLines[i] = line.replace(/^(\s*)\/\/ ?/, '$1')
    } else {
      // Comment: add // after leading whitespace
      const indent = line.match(/^(\s*)/)?.[0] ?? ''
      const content = line.slice(indent.length)
      newLines[i] = indent + '// ' + content
    }
  }

  return { ...state, lines: newLines }
}
