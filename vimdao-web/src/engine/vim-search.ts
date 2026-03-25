import type { VimState, CursorPos } from './vim-types'

/**
 * Search forward from the character AFTER the cursor, wrapping to the
 * start of the file.  Returns the position of the first match or null.
 */
export function searchForward(state: VimState, pattern: string): CursorPos | null {
  if (pattern.length === 0) return null

  const { lines, cursor } = state
  const totalLines = lines.length
  const startLine = cursor.line
  const startCol = cursor.col + 1

  // Phase 1: search from cursor+1 to end of file
  // Current line from startCol onward
  const curLine = lines[startLine] ?? ''
  const curLineMatch = curLine.indexOf(pattern, startCol)
  if (curLineMatch !== -1) {
    return { line: startLine, col: curLineMatch }
  }
  // Remaining lines after the current line
  for (let i = 1; i < totalLines; i++) {
    const lineIdx = (startLine + i) % totalLines
    const line = lines[lineIdx] ?? ''
    const idx = line.indexOf(pattern)
    if (idx !== -1) {
      return { line: lineIdx, col: idx }
    }
  }

  // Phase 2: wrap — search the current line from col 0 (before cursor)
  const wrapMatch = curLine.indexOf(pattern)
  if (wrapMatch !== -1 && wrapMatch < startCol) {
    return { line: startLine, col: wrapMatch }
  }

  return null
}

/**
 * Search backward from the character BEFORE the cursor, wrapping to the
 * end of the file.  Returns the position of the first match or null.
 */
export function searchBackward(state: VimState, pattern: string): CursorPos | null {
  if (pattern.length === 0) return null

  const { lines, cursor } = state
  const totalLines = lines.length

  // Start searching backward from the character before the cursor
  const startLine = cursor.line
  const searchUpTo = cursor.col - 1

  for (let i = 0; i < totalLines; i++) {
    const lineIdx = ((startLine - i) % totalLines + totalLines) % totalLines
    const line = lines[lineIdx] ?? ''

    if (i === 0) {
      // On the cursor line, only search up to cursor position (exclusive)
      const idx = line.lastIndexOf(pattern, searchUpTo)
      if (idx !== -1) {
        return { line: lineIdx, col: idx }
      }
    } else {
      // On other lines, search the full line from the end
      const idx = line.lastIndexOf(pattern)
      if (idx !== -1) {
        return { line: lineIdx, col: idx }
      }
    }
  }

  return null
}

/**
 * Extract the word under the cursor and find its next occurrence.
 * A "word" is a sequence of \w characters.
 * Returns the pattern (the word) and the position of the next occurrence,
 * or null if the cursor is not on a word character or there is no other occurrence.
 */
export function searchWordUnderCursor(state: VimState): { pattern: string; pos: CursorPos } | null {
  const { lines, cursor } = state
  const line = lines[cursor.line] ?? ''
  const col = cursor.col

  // Check if cursor is on a word character
  const ch = line[col]
  if (!ch || !/\w/.test(ch)) return null

  // Expand to get the full word
  let wordStart = col
  let wordEnd = col

  while (wordStart > 0 && /\w/.test(line[wordStart - 1] ?? '')) {
    wordStart--
  }
  while (wordEnd < line.length - 1 && /\w/.test(line[wordEnd + 1] ?? '')) {
    wordEnd++
  }

  const word = line.slice(wordStart, wordEnd + 1)

  // Search forward for the next occurrence of this word
  const pos = searchForward(state, word)
  if (pos === null) return null

  return { pattern: word, pos }
}
