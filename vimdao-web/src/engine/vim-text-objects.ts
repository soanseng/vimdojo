import type { VimState, CursorPos } from './vim-types'

type CharClass = 'word' | 'symbol' | 'space'

function charClass(ch: string): CharClass {
  if (ch === '' || /\s/.test(ch)) return 'space'
  if (/\w/.test(ch)) return 'word'
  return 'symbol'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function resolveTextObject(
  state: VimState,
  modifier: 'i' | 'a',
  obj: string,
): { start: CursorPos; end: CursorPos } | null {
  // Word objects
  if (obj === 'w') return wordObject(state, modifier, false)
  if (obj === 'W') return wordObject(state, modifier, true)

  // Quote objects
  if (obj === '"' || obj === "'" || obj === '`') return quoteObject(state, modifier, obj)

  // Bracket objects (with aliases)
  const bracketPair = resolveBracketPair(obj)
  if (bracketPair) return bracketObject(state, modifier, bracketPair.open, bracketPair.close)

  // Tag object
  if (obj === 't') return tagObject(state, modifier)

  // Paragraph object
  if (obj === 'p') return paragraphObject(state, modifier)

  return null
}

// ---------------------------------------------------------------------------
// Word objects
// ---------------------------------------------------------------------------

function wordObject(
  state: VimState,
  modifier: 'i' | 'a',
  bigWord: boolean,
): { start: CursorPos; end: CursorPos } | null {
  const line = state.lines[state.cursor.line] ?? ''
  const col = state.cursor.col
  if (line.length === 0) return null

  const classify = bigWord
    ? (ch: string): 'nonspace' | 'space' => (/\s/.test(ch) ? 'space' : 'nonspace')
    : (ch: string): CharClass => charClass(ch)

  const curChar = line[col] ?? ''
  const curClass = classify(curChar)

  // Find start of current "word" (run of same class)
  let start = col
  while (start > 0) {
    const prev = line[start - 1] ?? ''
    if (classify(prev) !== curClass) break
    start--
  }

  // Find end of current "word" (exclusive)
  let end = col
  while (end < line.length) {
    const ch = line[end] ?? ''
    if (classify(ch) !== curClass) break
    end++
  }

  if (modifier === 'i') {
    return { start: { line: state.cursor.line, col: start }, end: { line: state.cursor.line, col: end } }
  }

  // "a" word: include trailing whitespace, or leading if no trailing
  // Try trailing whitespace first
  let trailEnd = end
  while (trailEnd < line.length) {
    const ch = line[trailEnd] ?? ''
    if (!(/\s/.test(ch))) break
    trailEnd++
  }

  if (trailEnd > end) {
    // Has trailing whitespace
    return { start: { line: state.cursor.line, col: start }, end: { line: state.cursor.line, col: trailEnd } }
  }

  // No trailing whitespace — try leading whitespace
  let leadStart = start
  while (leadStart > 0) {
    const prev = line[leadStart - 1] ?? ''
    if (!(/\s/.test(prev))) break
    leadStart--
  }

  if (leadStart < start) {
    return { start: { line: state.cursor.line, col: leadStart }, end: { line: state.cursor.line, col: end } }
  }

  // No surrounding whitespace at all
  return { start: { line: state.cursor.line, col: start }, end: { line: state.cursor.line, col: end } }
}

// ---------------------------------------------------------------------------
// Quote objects
// ---------------------------------------------------------------------------

function quoteObject(
  state: VimState,
  modifier: 'i' | 'a',
  quote: string,
): { start: CursorPos; end: CursorPos } | null {
  const line = state.lines[state.cursor.line] ?? ''
  const col = state.cursor.col

  // Find all quote positions on this line
  const positions: number[] = []
  for (let i = 0; i < line.length; i++) {
    if (line[i] === quote) positions.push(i)
  }

  if (positions.length < 2) return null

  // Vim's quote text object logic:
  // 1. If cursor is between a pair of quotes, use that pair
  // 2. If cursor is on a quote, it's the opening quote — pair with the next one
  // We check consecutive pairs and find one that contains the cursor.
  for (let i = 0; i + 1 < positions.length; i++) {
    const open = positions[i]!
    const close = positions[i + 1]!

    if (col >= open && col <= close) {
      if (modifier === 'i') {
        return {
          start: { line: state.cursor.line, col: open + 1 },
          end: { line: state.cursor.line, col: close },
        }
      }
      return {
        start: { line: state.cursor.line, col: open },
        end: { line: state.cursor.line, col: close + 1 },
      }
    }
  }

  // Vim seeks forward: if cursor is before the first pair, use that pair
  if (positions.length >= 2 && col < positions[0]!) {
    const open = positions[0]!
    const close = positions[1]!
    if (modifier === 'i') {
      return {
        start: { line: state.cursor.line, col: open + 1 },
        end: { line: state.cursor.line, col: close },
      }
    }
    return {
      start: { line: state.cursor.line, col: open },
      end: { line: state.cursor.line, col: close + 1 },
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Bracket objects
// ---------------------------------------------------------------------------

interface BracketPair {
  open: string
  close: string
}

function resolveBracketPair(obj: string): BracketPair | null {
  switch (obj) {
    case '(':
    case ')':
    case 'b':
      return { open: '(', close: ')' }
    case '{':
    case '}':
    case 'B':
      return { open: '{', close: '}' }
    case '[':
    case ']':
      return { open: '[', close: ']' }
    case '<':
    case '>':
      return { open: '<', close: '>' }
    default:
      return null
  }
}

function bracketObject(
  state: VimState,
  modifier: 'i' | 'a',
  open: string,
  close: string,
): { start: CursorPos; end: CursorPos } | null {
  // Search backward from cursor to find the matching open bracket
  const openPos = findMatchingOpen(state, open, close)
  if (!openPos) return null

  // Search forward from the open bracket to find the matching close bracket
  const closePos = findMatchingClose(state, open, close, openPos)
  if (!closePos) return null

  if (modifier === 'i') {
    // Inner: content between brackets (exclusive of brackets)
    // Start is the position right after the open bracket
    const startPos = advancePos(state, openPos)
    if (!startPos) return null
    return { start: startPos, end: closePos }
  }

  // "a": include the brackets themselves
  return {
    start: openPos,
    end: advancePos(state, closePos) ?? closePos,
  }
}

function advancePos(state: VimState, pos: CursorPos): CursorPos | null {
  const line = state.lines[pos.line] ?? ''
  if (pos.col + 1 < line.length) {
    return { line: pos.line, col: pos.col + 1 }
  }
  if (pos.line + 1 < state.lines.length) {
    return { line: pos.line + 1, col: 0 }
  }
  // At the very end of the buffer
  return { line: pos.line, col: pos.col + 1 }
}

function findMatchingOpen(
  state: VimState,
  open: string,
  close: string,
): CursorPos | null {
  let depth = 0
  const { line: startLine, col: startCol } = state.cursor

  // Scan backward through lines
  for (let ln = startLine; ln >= 0; ln--) {
    const lineStr = state.lines[ln] ?? ''
    const sc = ln === startLine ? startCol : lineStr.length - 1

    for (let c = sc; c >= 0; c--) {
      const ch = lineStr[c]
      if (ch === close) {
        depth++
      } else if (ch === open) {
        if (depth === 0) {
          return { line: ln, col: c }
        }
        depth--
      }
    }
  }

  return null
}

function findMatchingClose(
  state: VimState,
  open: string,
  close: string,
  openPos: CursorPos,
): CursorPos | null {
  let depth = 0

  // Start scanning from the character after the open bracket
  for (let ln = openPos.line; ln < state.lines.length; ln++) {
    const lineStr = state.lines[ln] ?? ''
    const sc = ln === openPos.line ? openPos.col + 1 : 0

    for (let c = sc; c < lineStr.length; c++) {
      const ch = lineStr[c]
      if (ch === open) {
        depth++
      } else if (ch === close) {
        if (depth === 0) {
          return { line: ln, col: c }
        }
        depth--
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Paragraph object
// ---------------------------------------------------------------------------

function paragraphObject(
  state: VimState,
  modifier: 'i' | 'a',
): { start: CursorPos; end: CursorPos } | null {
  const { lines, cursor } = state
  const isBlank = (ln: number) => ln < 0 || ln >= lines.length || (lines[ln] ?? '').trim() === ''

  // Find start of current paragraph (first non-blank line looking backward)
  let startLine = cursor.line
  // If on blank line, move to next non-blank for paragraph context
  if (isBlank(startLine)) {
    // On a blank line — for 'ip', the inner is just the blank lines
    // For 'ap', include up to next paragraph
    if (modifier === 'i') {
      let blankStart = startLine
      while (blankStart > 0 && isBlank(blankStart - 1)) blankStart--
      let blankEnd = startLine
      while (blankEnd < lines.length - 1 && isBlank(blankEnd + 1)) blankEnd++
      return {
        start: { line: blankStart, col: 0 },
        end: { line: blankEnd + 1, col: 0 },
      }
    }
    return null // ap on blank line is not useful
  }

  while (startLine > 0 && !isBlank(startLine - 1)) {
    startLine--
  }

  // Find end of current paragraph
  let endLine = cursor.line
  while (endLine < lines.length - 1 && !isBlank(endLine + 1)) {
    endLine++
  }

  if (modifier === 'i') {
    // Inner: just the non-blank lines.
    // Return range that covers from start of first line to end of last line
    // Using line+1 col 0 to represent "end of endLine" for multi-line deletion
    if (endLine + 1 < lines.length) {
      return {
        start: { line: startLine, col: 0 },
        end: { line: endLine + 1, col: 0 },
      }
    }
    // At end of buffer
    return {
      start: { line: startLine, col: 0 },
      end: { line: endLine, col: (lines[endLine] ?? '').length },
    }
  }

  // 'a' paragraph: include trailing blank lines
  let trailingEnd = endLine
  while (trailingEnd + 1 < lines.length && isBlank(trailingEnd + 1)) {
    trailingEnd++
  }

  if (trailingEnd > endLine) {
    // Has trailing blank lines
    if (trailingEnd + 1 < lines.length) {
      return {
        start: { line: startLine, col: 0 },
        end: { line: trailingEnd + 1, col: 0 },
      }
    }
    return {
      start: { line: startLine, col: 0 },
      end: { line: trailingEnd, col: (lines[trailingEnd] ?? '').length },
    }
  }

  // No trailing blanks — include leading blank lines
  let leadingStart = startLine
  while (leadingStart > 0 && isBlank(leadingStart - 1)) {
    leadingStart--
  }

  if (leadingStart + 1 < lines.length) {
    return {
      start: { line: leadingStart, col: 0 },
      end: { line: endLine + 1, col: 0 },
    }
  }

  return {
    start: { line: leadingStart, col: 0 },
    end: { line: endLine, col: (lines[endLine] ?? '').length },
  }
}

// ---------------------------------------------------------------------------
// Tag object
// ---------------------------------------------------------------------------

function tagObject(
  state: VimState,
  modifier: 'i' | 'a',
): { start: CursorPos; end: CursorPos } | null {
  // Simplified tag matching:
  // Find '>' before/at cursor position scanning backward (end of opening tag)
  // Find '<' after cursor position scanning forward (start of closing tag)
  // Then find the full opening tag start and closing tag end

  const { line: curLine, col: curCol } = state.cursor

  // Find the '>' at or before cursor — end of opening tag
  let openTagEnd: CursorPos | null = null
  for (let ln = curLine; ln >= 0; ln--) {
    const lineStr = state.lines[ln] ?? ''
    const sc = ln === curLine ? curCol : lineStr.length - 1
    for (let c = sc; c >= 0; c--) {
      if (lineStr[c] === '>') {
        openTagEnd = { line: ln, col: c }
        break
      }
    }
    if (openTagEnd) break
  }

  if (!openTagEnd) return null

  // Find the '<' that starts this opening tag
  let openTagStart: CursorPos | null = null
  for (let c = openTagEnd.col - 1; c >= 0; c--) {
    const lineStr = state.lines[openTagEnd.line] ?? ''
    if (lineStr[c] === '<') {
      openTagStart = { line: openTagEnd.line, col: c }
      break
    }
  }

  // If not found on same line, scan backward
  if (!openTagStart) {
    for (let ln = openTagEnd.line - 1; ln >= 0; ln--) {
      const lineStr = state.lines[ln] ?? ''
      for (let c = lineStr.length - 1; c >= 0; c--) {
        if (lineStr[c] === '<') {
          openTagStart = { line: ln, col: c }
          break
        }
      }
      if (openTagStart) break
    }
  }

  if (!openTagStart) return null

  // Make sure this is an opening tag (not a closing tag like </div>)
  const openLine = state.lines[openTagStart.line] ?? ''
  if (openLine[openTagStart.col + 1] === '/') return null

  // Find the '<' after cursor — start of closing tag
  let closeTagStart: CursorPos | null = null
  for (let ln = curLine; ln < state.lines.length; ln++) {
    const lineStr = state.lines[ln] ?? ''
    const sc = ln === curLine ? curCol + 1 : 0
    for (let c = sc; c < lineStr.length; c++) {
      if (lineStr[c] === '<') {
        closeTagStart = { line: ln, col: c }
        break
      }
    }
    if (closeTagStart) break
  }

  if (!closeTagStart) return null

  // Find the '>' that ends this closing tag
  let closeTagEnd: CursorPos | null = null
  for (let ln = closeTagStart.line; ln < state.lines.length; ln++) {
    const lineStr = state.lines[ln] ?? ''
    const sc = ln === closeTagStart.line ? closeTagStart.col : 0
    for (let c = sc; c < lineStr.length; c++) {
      if (lineStr[c] === '>') {
        closeTagEnd = { line: ln, col: c }
        break
      }
    }
    if (closeTagEnd) break
  }

  if (!closeTagEnd) return null

  // Content is between openTagEnd+1 and closeTagStart
  const contentStart = advancePos(state, openTagEnd)
  if (!contentStart) return null

  if (modifier === 'i') {
    return { start: contentStart, end: closeTagStart }
  }

  // "at" includes both tags
  return {
    start: openTagStart,
    end: { line: closeTagEnd.line, col: closeTagEnd.col + 1 },
  }
}
