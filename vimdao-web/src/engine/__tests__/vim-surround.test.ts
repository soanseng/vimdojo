import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { addSurround, deleteSurround, replaceSurround } from '../vim-surround'

describe('addSurround', () => {
  it('wraps range in double quotes', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '"')
    expect(getText(result)).toBe('"hello" world')
  })
  it('wraps in parens', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '(')
    expect(getText(result)).toBe('(hello) world')
  })
  it('wraps in brackets', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '[')
    expect(getText(result)).toBe('[hello] world')
  })
  it('wraps in curly braces', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '{')
    expect(getText(result)).toBe('{hello} world')
  })
  it('wraps in angle brackets', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '<')
    expect(getText(result)).toBe('<hello> world')
  })
  it('wraps in single quotes', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, "'")
    expect(getText(result)).toBe("'hello' world")
  })
  it('wraps in backticks', () => {
    const s = createState('hello world')
    const result = addSurround(s, { start: { line: 0, col: 0 }, end: { line: 0, col: 5 } }, '`')
    expect(getText(result)).toBe('`hello` world')
  })
})

describe('deleteSurround', () => {
  it('removes double quotes', () => {
    const s = createState('"hello" world')
    s.cursor = { line: 0, col: 3 }
    const result = deleteSurround(s, '"')
    expect(result).not.toBeNull()
    expect(getText(result!)).toBe('hello world')
  })
  it('removes parens', () => {
    const s = createState('(hello) world')
    s.cursor = { line: 0, col: 3 }
    const result = deleteSurround(s, '(')
    expect(result).not.toBeNull()
    expect(getText(result!)).toBe('hello world')
  })
  it('removes brackets', () => {
    const s = createState('[hello] world')
    s.cursor = { line: 0, col: 3 }
    const result = deleteSurround(s, '[')
    expect(result).not.toBeNull()
    expect(getText(result!)).toBe('hello world')
  })
  it('returns null if no matching pair', () => {
    const s = createState('hello world')
    const result = deleteSurround(s, '"')
    expect(result).toBeNull()
  })
})

describe('replaceSurround', () => {
  it('replaces quotes with single quotes', () => {
    const s = createState('"hello" world')
    s.cursor = { line: 0, col: 3 }
    const result = replaceSurround(s, '"', "'")
    expect(result).not.toBeNull()
    expect(getText(result!)).toBe("'hello' world")
  })
  it('replaces parens with brackets', () => {
    const s = createState('(hello) world')
    s.cursor = { line: 0, col: 3 }
    const result = replaceSurround(s, '(', '[')
    expect(result).not.toBeNull()
    expect(getText(result!)).toBe('[hello] world')
  })
})
