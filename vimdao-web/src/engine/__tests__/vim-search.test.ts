import { describe, it, expect } from 'vitest'
import { createState } from '../vim-state'
import { searchForward, searchBackward, searchWordUnderCursor } from '../vim-search'

describe('searchForward', () => {
  it('finds pattern after cursor', () => {
    const s = createState('hello world hello')
    const pos = searchForward(s, 'hello')
    expect(pos).toEqual({ line: 0, col: 12 }) // skips match at cursor
  })
  it('finds on next line', () => {
    const s = createState('aaa\nbbb\naaa')
    const pos = searchForward(s, 'aaa')
    expect(pos).toEqual({ line: 2, col: 0 }) // wraps past first match
  })
  it('wraps around to start', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 8 }
    const pos = searchForward(s, 'hello')
    expect(pos).toEqual({ line: 0, col: 0 })
  })
  it('returns null when not found', () => {
    const s = createState('hello')
    expect(searchForward(s, 'xyz')).toBeNull()
  })
})

describe('searchBackward', () => {
  it('finds pattern before cursor', () => {
    const s = createState('hello world hello')
    s.cursor = { line: 0, col: 12 }
    const pos = searchBackward(s, 'hello')
    expect(pos).toEqual({ line: 0, col: 0 })
  })
  it('wraps backward', () => {
    const s = createState('aaa\nbbb')
    s.cursor = { line: 0, col: 0 }
    const pos = searchBackward(s, 'bbb')
    expect(pos).toEqual({ line: 1, col: 0 })
  })
})

describe('searchWordUnderCursor', () => {
  it('finds word at cursor and next occurrence', () => {
    const s = createState('the content of content')
    s.cursor = { line: 0, col: 4 }
    const result = searchWordUnderCursor(s)
    expect(result).not.toBeNull()
    expect(result!.pattern).toBe('content')
    expect(result!.pos).toEqual({ line: 0, col: 15 })
  })
  it('returns null on non-word char', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 5 } // on space
    expect(searchWordUnderCursor(s)).toBeNull()
  })
})
