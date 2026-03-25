import { describe, it, expect } from 'vitest'
import { createState, getText, clampCursor, snapshot } from '../vim-state'

describe('createState', () => {
  it('splits text into lines', () => {
    const s = createState('hello\nworld')
    expect(s.lines).toEqual(['hello', 'world'])
    expect(s.cursor).toEqual({ line: 0, col: 0 })
    expect(s.mode).toBe('normal')
  })

  it('handles single line', () => {
    const s = createState('hello')
    expect(s.lines).toEqual(['hello'])
  })

  it('handles empty string', () => {
    const s = createState('')
    expect(s.lines).toEqual([''])
  })

  it('accepts initial cursor position', () => {
    const s = createState('hello\nworld', { line: 1, col: 3 })
    expect(s.cursor).toEqual({ line: 1, col: 3 })
  })
})

describe('getText', () => {
  it('joins lines with newlines', () => {
    const s = createState('a\nb\nc')
    expect(getText(s)).toBe('a\nb\nc')
  })
})

describe('clampCursor', () => {
  it('clamps col to line length - 1 in normal mode', () => {
    const s = createState('abc')
    s.cursor = { line: 0, col: 10 }
    const clamped = clampCursor(s)
    expect(clamped.cursor.col).toBe(2)
  })

  it('allows col at line length in insert mode', () => {
    const s = createState('abc')
    s.mode = 'insert'
    s.cursor = { line: 0, col: 3 }
    const clamped = clampCursor(s)
    expect(clamped.cursor.col).toBe(3)
  })

  it('clamps negative values to 0', () => {
    const s = createState('abc')
    s.cursor = { line: -1, col: -5 }
    const clamped = clampCursor(s)
    expect(clamped.cursor.line).toBe(0)
    expect(clamped.cursor.col).toBe(0)
  })
})

describe('snapshot', () => {
  it('creates independent copy', () => {
    const s = createState('hello')
    const snap = snapshot(s)
    s.lines[0] = 'changed'
    expect(snap.lines[0]).toBe('hello')
  })
})
