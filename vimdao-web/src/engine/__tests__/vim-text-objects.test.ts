import { describe, it, expect } from 'vitest'
import { createState } from '../vim-state'
import { resolveTextObject } from '../vim-text-objects'

describe('word objects', () => {
  it('iw selects inner word', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 1 }
    const r = resolveTextObject(s, 'i', 'w')
    expect(r).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 5 } })
  })

  it('aw selects word with trailing space', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 1 }
    const r = resolveTextObject(s, 'a', 'w')
    expect(r).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 6 } })
  })

  it('aw on last word includes leading space', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 8 }
    const r = resolveTextObject(s, 'a', 'w')
    // last word: include leading space instead
    expect(r!.start.col).toBe(5)
    expect(r!.end.col).toBe(11)
  })

  it('iw on whitespace selects the whitespace', () => {
    const s = createState('hello   world')
    s.cursor = { line: 0, col: 6 }
    const r = resolveTextObject(s, 'i', 'w')
    expect(r).toEqual({ start: { line: 0, col: 5 }, end: { line: 0, col: 8 } })
  })

  it('iw on symbol chars selects symbol run', () => {
    const s = createState('foo+=bar')
    s.cursor = { line: 0, col: 3 }
    const r = resolveTextObject(s, 'i', 'w')
    expect(r).toEqual({ start: { line: 0, col: 3 }, end: { line: 0, col: 5 } })
  })

  it('iW selects inner WORD (whitespace-delimited)', () => {
    const s = createState('foo+=bar baz')
    s.cursor = { line: 0, col: 3 }
    const r = resolveTextObject(s, 'i', 'W')
    expect(r).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 8 } })
  })

  it('aW selects WORD with trailing space', () => {
    const s = createState('foo+=bar baz')
    s.cursor = { line: 0, col: 3 }
    const r = resolveTextObject(s, 'a', 'W')
    expect(r).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 9 } })
  })

  it('iw on single word line', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    const r = resolveTextObject(s, 'i', 'w')
    expect(r).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 5 } })
  })

  it('aw on single word line (no trailing space)', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    const r = resolveTextObject(s, 'a', 'w')
    // No trailing or leading space — just the word
    expect(r).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 5 } })
  })
})

describe('quote objects', () => {
  it('i" selects inside double quotes', () => {
    const s = createState('say "hello" please')
    s.cursor = { line: 0, col: 6 }
    const r = resolveTextObject(s, 'i', '"')
    expect(r).toEqual({ start: { line: 0, col: 5 }, end: { line: 0, col: 10 } })
  })

  it('a" includes the quotes', () => {
    const s = createState('say "hello" please')
    s.cursor = { line: 0, col: 6 }
    const r = resolveTextObject(s, 'a', '"')
    expect(r).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 11 } })
  })

  it("i' works for single quotes", () => {
    const s = createState("it's 'fine' ok")
    s.cursor = { line: 0, col: 7 }
    const r = resolveTextObject(s, 'i', "'")
    expect(r).toEqual({ start: { line: 0, col: 6 }, end: { line: 0, col: 10 } })
  })

  it('returns null when no quotes found', () => {
    const s = createState('no quotes here')
    const r = resolveTextObject(s, 'i', '"')
    expect(r).toBeNull()
  })

  it('i` works for backticks', () => {
    const s = createState('use `code` here')
    s.cursor = { line: 0, col: 6 }
    const r = resolveTextObject(s, 'i', '`')
    expect(r).toEqual({ start: { line: 0, col: 5 }, end: { line: 0, col: 9 } })
  })

  it('a` includes backticks', () => {
    const s = createState('use `code` here')
    s.cursor = { line: 0, col: 6 }
    const r = resolveTextObject(s, 'a', '`')
    expect(r).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 10 } })
  })

  it('returns null when cursor is outside quotes', () => {
    const s = createState('say "hello" please')
    s.cursor = { line: 0, col: 0 }
    const r = resolveTextObject(s, 'i', '"')
    expect(r).toBeNull()
  })

  it('handles empty quotes', () => {
    const s = createState('say "" please')
    s.cursor = { line: 0, col: 4 } // on opening quote
    // Vim considers cursor on opening quote as inside for quote objects
    const r = resolveTextObject(s, 'i', '"')
    // Empty content between quotes at col 4 and col 5
    expect(r).toEqual({ start: { line: 0, col: 5 }, end: { line: 0, col: 5 } })
  })
})

describe('bracket objects', () => {
  it('i( selects inside parens', () => {
    const s = createState('call(arg1, arg2)')
    s.cursor = { line: 0, col: 8 }
    const r = resolveTextObject(s, 'i', '(')
    expect(r).toEqual({ start: { line: 0, col: 5 }, end: { line: 0, col: 15 } })
  })

  it('a( includes parens', () => {
    const s = createState('call(arg1, arg2)')
    s.cursor = { line: 0, col: 8 }
    const r = resolveTextObject(s, 'a', '(')
    expect(r).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 16 } })
  })

  it(') is alias for (', () => {
    const s = createState('(hello)')
    s.cursor = { line: 0, col: 3 }
    expect(resolveTextObject(s, 'i', ')')).toEqual(resolveTextObject(s, 'i', '('))
  })

  it('b is alias for (', () => {
    const s = createState('(hello)')
    s.cursor = { line: 0, col: 3 }
    expect(resolveTextObject(s, 'i', 'b')).toEqual(resolveTextObject(s, 'i', '('))
  })

  it('i{ selects inside braces', () => {
    const s = createState('if (x) { return y }')
    s.cursor = { line: 0, col: 12 }
    const r = resolveTextObject(s, 'i', '{')
    // i{ includes all content between { and } (cols 8-17), end is exclusive
    expect(r).toEqual({ start: { line: 0, col: 8 }, end: { line: 0, col: 18 } })
  })

  it('} is alias for {', () => {
    const s = createState('{ hello }')
    s.cursor = { line: 0, col: 3 }
    expect(resolveTextObject(s, 'i', '}')).toEqual(resolveTextObject(s, 'i', '{'))
  })

  it('B is alias for {', () => {
    const s = createState('{ hello }')
    s.cursor = { line: 0, col: 3 }
    expect(resolveTextObject(s, 'i', 'B')).toEqual(resolveTextObject(s, 'i', '{'))
  })

  it('i[ selects inside brackets', () => {
    const s = createState('arr[0]')
    s.cursor = { line: 0, col: 4 }
    const r = resolveTextObject(s, 'i', '[')
    expect(r).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 5 } })
  })

  it('] is alias for [', () => {
    const s = createState('[hello]')
    s.cursor = { line: 0, col: 3 }
    expect(resolveTextObject(s, 'i', ']')).toEqual(resolveTextObject(s, 'i', '['))
  })

  it('i< selects inside angle brackets', () => {
    const s = createState('<div>')
    s.cursor = { line: 0, col: 2 }
    const r = resolveTextObject(s, 'i', '<')
    expect(r).toEqual({ start: { line: 0, col: 1 }, end: { line: 0, col: 4 } })
  })

  it('> is alias for <', () => {
    const s = createState('<hello>')
    s.cursor = { line: 0, col: 3 }
    expect(resolveTextObject(s, 'i', '>')).toEqual(resolveTextObject(s, 'i', '<'))
  })

  it('a< includes angle brackets', () => {
    const s = createState('<div>')
    s.cursor = { line: 0, col: 2 }
    const r = resolveTextObject(s, 'a', '<')
    expect(r).toEqual({ start: { line: 0, col: 0 }, end: { line: 0, col: 5 } })
  })

  it('handles nested brackets', () => {
    const s = createState('f(g(x))')
    s.cursor = { line: 0, col: 4 } // inside inner (x)
    const r = resolveTextObject(s, 'i', '(')
    expect(r).toEqual({ start: { line: 0, col: 4 }, end: { line: 0, col: 5 } })
  })

  it('handles nested brackets - outer', () => {
    const s = createState('f(g(x))')
    s.cursor = { line: 0, col: 2 } // on 'g', inside outer parens
    const r = resolveTextObject(s, 'i', '(')
    expect(r).toEqual({ start: { line: 0, col: 2 }, end: { line: 0, col: 6 } })
  })

  it('returns null when no matching pair', () => {
    const s = createState('no parens')
    expect(resolveTextObject(s, 'i', '(')).toBeNull()
  })

  it('multiline brackets', () => {
    const s = createState('func(\n  arg1,\n  arg2\n)')
    s.cursor = { line: 1, col: 3 }
    const r = resolveTextObject(s, 'i', '(')
    expect(r).not.toBeNull()
    // Content starts at next line after '(' since '(' is last char on its line
    expect(r!.start).toEqual({ line: 1, col: 0 })
    expect(r!.end).toEqual({ line: 3, col: 0 })
  })
})

describe('tag objects', () => {
  it('it selects inside tags', () => {
    const s = createState('<div>hello</div>')
    s.cursor = { line: 0, col: 7 }
    const r = resolveTextObject(s, 'i', 't')
    expect(r).not.toBeNull()
    expect(r!.start).toEqual({ line: 0, col: 5 })
    expect(r!.end).toEqual({ line: 0, col: 10 })
  })

  it('at includes the tags', () => {
    const s = createState('<div>hello</div>')
    s.cursor = { line: 0, col: 7 }
    const r = resolveTextObject(s, 'a', 't')
    expect(r).not.toBeNull()
    expect(r!.start).toEqual({ line: 0, col: 0 })
    expect(r!.end).toEqual({ line: 0, col: 16 })
  })

  it('returns null when no tags found', () => {
    const s = createState('no tags here')
    s.cursor = { line: 0, col: 3 }
    const r = resolveTextObject(s, 'i', 't')
    expect(r).toBeNull()
  })
})
