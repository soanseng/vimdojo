import { describe, it, expect } from 'vitest'
import { createState } from '../vim-state'
import * as m from '../vim-motions'

describe('h', () => {
  it('moves left', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    expect(m.h(s)).toEqual({ line: 0, col: 1 })
  })

  it('stops at col 0', () => {
    const s = createState('hello')
    expect(m.h(s)).toEqual({ line: 0, col: 0 })
  })

  it('moves from col 1 to col 0', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 1 }
    expect(m.h(s)).toEqual({ line: 0, col: 0 })
  })

  it('works on second line', () => {
    const s = createState('aa\nbb')
    s.cursor = { line: 1, col: 1 }
    expect(m.h(s)).toEqual({ line: 1, col: 0 })
  })
})

describe('l', () => {
  it('moves right', () => {
    const s = createState('hello')
    expect(m.l(s)).toEqual({ line: 0, col: 1 })
  })

  it('stops at last char in normal mode', () => {
    const s = createState('hi')
    s.cursor = { line: 0, col: 1 }
    expect(m.l(s)).toEqual({ line: 0, col: 1 })
  })

  it('allows moving to end in insert mode', () => {
    const s = createState('hi')
    s.mode = 'insert'
    s.cursor = { line: 0, col: 1 }
    expect(m.l(s)).toEqual({ line: 0, col: 2 })
  })

  it('stays on same col if on empty line', () => {
    const s = createState('')
    expect(m.l(s)).toEqual({ line: 0, col: 0 })
  })

  it('works on single char line in normal mode', () => {
    const s = createState('a')
    expect(m.l(s)).toEqual({ line: 0, col: 0 })
  })
})

describe('j', () => {
  it('moves down', () => {
    const s = createState('aa\nbb')
    expect(m.j(s)).toEqual({ line: 1, col: 0 })
  })

  it('stops at last line', () => {
    const s = createState('only')
    expect(m.j(s)).toEqual({ line: 0, col: 0 })
  })

  it('clamps col when target line is shorter', () => {
    const s = createState('hello\nhi')
    s.cursor = { line: 0, col: 4 }
    expect(m.j(s)).toEqual({ line: 1, col: 1 })
  })

  it('clamps col to 0 on empty target line', () => {
    const s = createState('hello\n\nworld')
    s.cursor = { line: 0, col: 3 }
    expect(m.j(s)).toEqual({ line: 1, col: 0 })
  })

  it('preserves col when target line is same length or longer', () => {
    const s = createState('hi\nhello')
    s.cursor = { line: 0, col: 1 }
    expect(m.j(s)).toEqual({ line: 1, col: 1 })
  })
})

describe('k', () => {
  it('moves up', () => {
    const s = createState('aa\nbb')
    s.cursor = { line: 1, col: 0 }
    expect(m.k(s)).toEqual({ line: 0, col: 0 })
  })

  it('stops at line 0', () => {
    const s = createState('only')
    expect(m.k(s)).toEqual({ line: 0, col: 0 })
  })

  it('clamps col when target line is shorter', () => {
    const s = createState('hi\nhello')
    s.cursor = { line: 1, col: 4 }
    expect(m.k(s)).toEqual({ line: 0, col: 1 })
  })

  it('clamps col to 0 on empty target line', () => {
    const s = createState('\nhello')
    s.cursor = { line: 1, col: 3 }
    expect(m.k(s)).toEqual({ line: 0, col: 0 })
  })
})

describe('w (word forward)', () => {
  it('moves to next word start', () => {
    const s = createState('hello world')
    expect(m.w(s)).toEqual({ line: 0, col: 6 })
  })

  it('wraps to next line', () => {
    const s = createState('hello\nworld')
    s.cursor = { line: 0, col: 4 }
    expect(m.w(s)).toEqual({ line: 1, col: 0 })
  })

  it('skips multiple spaces', () => {
    const s = createState('a   b')
    expect(m.w(s)).toEqual({ line: 0, col: 4 })
  })

  it('treats punctuation as separate word', () => {
    const s = createState('foo.bar')
    expect(m.w(s)).toEqual({ line: 0, col: 3 })
  })

  it('moves from punctuation to word', () => {
    const s = createState('foo.bar')
    s.cursor = { line: 0, col: 3 }
    expect(m.w(s)).toEqual({ line: 0, col: 4 })
  })

  it('stays at end of last line', () => {
    const s = createState('end')
    s.cursor = { line: 0, col: 2 }
    expect(m.w(s)).toEqual({ line: 0, col: 2 })
  })

  it('moves across empty line', () => {
    const s = createState('hello\n\nworld')
    s.cursor = { line: 0, col: 4 }
    expect(m.w(s)).toEqual({ line: 1, col: 0 })
  })

  it('skips from empty line to next word', () => {
    const s = createState('hello\n\nworld')
    s.cursor = { line: 1, col: 0 }
    expect(m.w(s)).toEqual({ line: 2, col: 0 })
  })

  it('handles multiple words on same line', () => {
    const s = createState('one two three')
    s.cursor = { line: 0, col: 4 }
    expect(m.w(s)).toEqual({ line: 0, col: 8 })
  })
})

describe('W (WORD forward)', () => {
  it('moves to next WORD start (whitespace-delimited)', () => {
    const s = createState('hello world')
    expect(m.W(s)).toEqual({ line: 0, col: 6 })
  })

  it('treats punctuation as part of WORD', () => {
    const s = createState('foo.bar baz')
    expect(m.W(s)).toEqual({ line: 0, col: 8 })
  })

  it('wraps to next line', () => {
    const s = createState('hello\nworld')
    s.cursor = { line: 0, col: 4 }
    expect(m.W(s)).toEqual({ line: 1, col: 0 })
  })
})

describe('b (word backward)', () => {
  it('moves to previous word start', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 8 }
    expect(m.b(s)).toEqual({ line: 0, col: 6 })
  })

  it('moves to start of current word when inside', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 8 }
    expect(m.b(s)).toEqual({ line: 0, col: 6 })
  })

  it('stops at start of file', () => {
    const s = createState('hello')
    expect(m.b(s)).toEqual({ line: 0, col: 0 })
  })

  it('wraps to previous line', () => {
    const s = createState('hello\nworld')
    s.cursor = { line: 1, col: 0 }
    expect(m.b(s)).toEqual({ line: 0, col: 0 })
  })

  it('treats punctuation as separate word', () => {
    const s = createState('foo.bar')
    s.cursor = { line: 0, col: 4 }
    expect(m.b(s)).toEqual({ line: 0, col: 3 })
  })

  it('moves from punctuation back to word', () => {
    const s = createState('foo.bar')
    s.cursor = { line: 0, col: 3 }
    expect(m.b(s)).toEqual({ line: 0, col: 0 })
  })

  it('handles multiple spaces', () => {
    const s = createState('a   b')
    s.cursor = { line: 0, col: 4 }
    expect(m.b(s)).toEqual({ line: 0, col: 0 })
  })
})

describe('B (WORD backward)', () => {
  it('moves to previous WORD start', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 8 }
    expect(m.B(s)).toEqual({ line: 0, col: 6 })
  })

  it('treats punctuation as part of WORD', () => {
    const s = createState('foo.bar baz')
    s.cursor = { line: 0, col: 8 }
    expect(m.B(s)).toEqual({ line: 0, col: 0 })
  })

  it('wraps to previous line', () => {
    const s = createState('hello\nworld')
    s.cursor = { line: 1, col: 0 }
    expect(m.B(s)).toEqual({ line: 0, col: 0 })
  })
})

describe('e (word end)', () => {
  it('moves to word end', () => {
    const s = createState('hello world')
    expect(m.e(s)).toEqual({ line: 0, col: 4 })
  })

  it('moves to next word end when already at end', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 4 }
    expect(m.e(s)).toEqual({ line: 0, col: 10 })
  })

  it('handles punctuation as separate word end', () => {
    const s = createState('foo.bar')
    expect(m.e(s)).toEqual({ line: 0, col: 2 })
  })

  it('wraps to next line', () => {
    const s = createState('hi\nworld')
    s.cursor = { line: 0, col: 1 }
    expect(m.e(s)).toEqual({ line: 1, col: 4 })
  })

  it('stays at end of last word in file', () => {
    const s = createState('end')
    s.cursor = { line: 0, col: 2 }
    expect(m.e(s)).toEqual({ line: 0, col: 2 })
  })
})

describe('E (WORD end)', () => {
  it('moves to end of WORD', () => {
    const s = createState('hello world')
    expect(m.E(s)).toEqual({ line: 0, col: 4 })
  })

  it('treats punctuation as part of WORD', () => {
    const s = createState('foo.bar baz')
    expect(m.E(s)).toEqual({ line: 0, col: 6 })
  })

  it('wraps to next line', () => {
    const s = createState('hi\nworld')
    s.cursor = { line: 0, col: 1 }
    expect(m.E(s)).toEqual({ line: 1, col: 4 })
  })
})

describe('zero (0)', () => {
  it('moves to line start', () => {
    const s = createState('  hello')
    s.cursor = { line: 0, col: 4 }
    expect(m.zero(s)).toEqual({ line: 0, col: 0 })
  })

  it('stays at col 0 if already there', () => {
    const s = createState('hello')
    expect(m.zero(s)).toEqual({ line: 0, col: 0 })
  })

  it('works on second line', () => {
    const s = createState('aa\n  bb')
    s.cursor = { line: 1, col: 3 }
    expect(m.zero(s)).toEqual({ line: 1, col: 0 })
  })
})

describe('caret (^)', () => {
  it('moves to first non-space', () => {
    const s = createState('  hello')
    expect(m.caret(s)).toEqual({ line: 0, col: 2 })
  })

  it('handles tabs', () => {
    const s = createState('\thello')
    expect(m.caret(s)).toEqual({ line: 0, col: 1 })
  })

  it('returns col 0 if no leading whitespace', () => {
    const s = createState('hello')
    expect(m.caret(s)).toEqual({ line: 0, col: 0 })
  })

  it('handles all-space line', () => {
    const s = createState('   ')
    expect(m.caret(s)).toEqual({ line: 0, col: 0 })
  })

  it('works on second line', () => {
    const s = createState('aa\n  bb')
    s.cursor = { line: 1, col: 4 }
    expect(m.caret(s)).toEqual({ line: 1, col: 2 })
  })
})

describe('dollar ($)', () => {
  it('moves to end of line', () => {
    const s = createState('hello')
    expect(m.dollar(s)).toEqual({ line: 0, col: 4 })
  })

  it('handles empty line', () => {
    const s = createState('')
    expect(m.dollar(s)).toEqual({ line: 0, col: 0 })
  })

  it('works on second line', () => {
    const s = createState('aa\nhello')
    s.cursor = { line: 1, col: 0 }
    expect(m.dollar(s)).toEqual({ line: 1, col: 4 })
  })

  it('stays at end if already there', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 4 }
    expect(m.dollar(s)).toEqual({ line: 0, col: 4 })
  })
})

describe('f (find forward)', () => {
  it('finds char forward', () => {
    const s = createState('hello')
    expect(m.f(s, 'l')).toEqual({ line: 0, col: 2 })
  })

  it('returns null if not found', () => {
    const s = createState('hello')
    expect(m.f(s, 'z')).toBeNull()
  })

  it('finds from current position (exclusive of cursor)', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    expect(m.f(s, 'l')).toEqual({ line: 0, col: 3 })
  })

  it('does not match char at cursor position', () => {
    const s = createState('aba')
    s.cursor = { line: 0, col: 0 }
    expect(m.f(s, 'a')).toEqual({ line: 0, col: 2 })
  })
})

describe('F (find backward)', () => {
  it('finds char backward', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 4 }
    expect(m.F(s, 'l')).toEqual({ line: 0, col: 3 })
  })

  it('returns null if not found', () => {
    const s = createState('hello')
    expect(m.F(s, 'z')).toBeNull()
  })

  it('finds first occurrence backward', () => {
    const s = createState('abcba')
    s.cursor = { line: 0, col: 4 }
    expect(m.F(s, 'b')).toEqual({ line: 0, col: 3 })
  })
})

describe('t (till forward)', () => {
  it('stops before char', () => {
    const s = createState('hello')
    expect(m.t(s, 'l')).toEqual({ line: 0, col: 1 })
  })

  it('returns null if not found', () => {
    const s = createState('hello')
    expect(m.t(s, 'z')).toBeNull()
  })

  it('returns null if char is immediately next (no room to stop before)', () => {
    const s = createState('ab')
    expect(m.t(s, 'b')).toEqual({ line: 0, col: 0 })
  })
})

describe('T (till backward)', () => {
  it('stops after char', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 4 }
    expect(m.T(s, 'l')).toEqual({ line: 0, col: 4 })
  })

  it('returns null if not found', () => {
    const s = createState('hello')
    expect(m.T(s, 'z')).toBeNull()
  })
})

describe('repeatFind (;)', () => {
  it('repeats last find forward', () => {
    const s = createState('abcabc')
    s.cursor = { line: 0, col: 3 }
    const pos = m.repeatFind(s, { char: 'c', direction: 'forward', type: 'f' })
    expect(pos).toEqual({ line: 0, col: 5 })
  })

  it('repeats last find backward', () => {
    const s = createState('abcabc')
    s.cursor = { line: 0, col: 3 }
    const pos = m.repeatFind(s, { char: 'a', direction: 'backward', type: 'f' })
    expect(pos).toEqual({ line: 0, col: 0 })
  })

  it('repeats last till forward', () => {
    const s = createState('abcabc')
    s.cursor = { line: 0, col: 0 }
    const pos = m.repeatFind(s, { char: 'c', direction: 'forward', type: 't' })
    expect(pos).toEqual({ line: 0, col: 1 })
  })

  it('returns null if no match', () => {
    const s = createState('abc')
    s.cursor = { line: 0, col: 2 }
    const pos = m.repeatFind(s, { char: 'z', direction: 'forward', type: 'f' })
    expect(pos).toBeNull()
  })
})

describe('reverseFind (,)', () => {
  it('reverses a forward find to backward', () => {
    const s = createState('abcabc')
    s.cursor = { line: 0, col: 5 }
    const pos = m.reverseFind(s, { char: 'c', direction: 'forward', type: 'f' })
    expect(pos).toEqual({ line: 0, col: 2 })
  })

  it('reverses a backward find to forward', () => {
    const s = createState('abcabc')
    s.cursor = { line: 0, col: 0 }
    const pos = m.reverseFind(s, { char: 'c', direction: 'backward', type: 'f' })
    expect(pos).toEqual({ line: 0, col: 2 })
  })
})

describe('gg', () => {
  it('goes to start', () => {
    const s = createState('aa\nbb\ncc')
    s.cursor = { line: 2, col: 1 }
    expect(m.gg(s)).toEqual({ line: 0, col: 0 })
  })

  it('stays at start if already there', () => {
    const s = createState('aa\nbb')
    expect(m.gg(s)).toEqual({ line: 0, col: 0 })
  })
})

describe('G', () => {
  it('goes to last line', () => {
    const s = createState('aa\nbb\ncc')
    expect(m.G(s)).toEqual({ line: 2, col: 0 })
  })

  it('stays at last line if already there', () => {
    const s = createState('aa\nbb')
    s.cursor = { line: 1, col: 0 }
    expect(m.G(s)).toEqual({ line: 1, col: 0 })
  })

  it('works with single line', () => {
    const s = createState('only')
    expect(m.G(s)).toEqual({ line: 0, col: 0 })
  })
})
