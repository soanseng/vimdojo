import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { processKey } from '../vim-engine'

function applyKeys(text: string, keys: string[]): string {
  let state = createState(text)
  for (const key of keys) {
    state = processKey(state, key).state
  }
  return getText(state)
}

function applyKeysState(text: string, keys: string[]) {
  let state = createState(text)
  for (const key of keys) {
    state = processKey(state, key).state
  }
  return state
}

describe('normal mode motions', () => {
  it('h moves left', () => {
    let s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    s = processKey(s, 'h').state
    expect(s.cursor.col).toBe(1)
  })
  it('w moves to next word', () => {
    let s = createState('hello world')
    s = processKey(s, 'w').state
    expect(s.cursor.col).toBe(6)
  })
  it('$ moves to end of line', () => {
    let s = createState('hello')
    s = processKey(s, '$').state
    expect(s.cursor.col).toBe(4)
  })
})

describe('insert mode', () => {
  it('i enters insert mode', () => {
    const s = applyKeysState('hello', ['i'])
    expect(s.mode).toBe('insert')
  })
  it('typing in insert mode adds text', () => {
    expect(applyKeys('', ['i', 'h', 'i', 'Escape'])).toBe('hi')
  })
  it('A appends at end of line', () => {
    expect(applyKeys('hello', ['A', '!', 'Escape'])).toBe('hello!')
  })
  it('o opens new line below', () => {
    expect(applyKeys('aaa', ['o', 'b', 'b', 'b', 'Escape'])).toBe('aaa\nbbb')
  })
  it('O opens new line above', () => {
    expect(applyKeys('bbb', ['O', 'a', 'a', 'a', 'Escape'])).toBe('aaa\nbbb')
  })
  it('I inserts at first non-space', () => {
    expect(applyKeys('  hello', ['I', 'X', 'Escape'])).toBe('  Xhello')
  })
  it('Backspace deletes char before cursor', () => {
    expect(applyKeys('', ['i', 'a', 'b', 'c', 'Backspace', 'Escape'])).toBe('ab')
  })
  it('Enter splits line', () => {
    expect(applyKeys('hello', ['A', 'Enter', 'w', 'o', 'r', 'l', 'd', 'Escape'])).toBe('hello\nworld')
  })
})

describe('editing commands', () => {
  it('x deletes char', () => {
    expect(applyKeys('hello', ['x'])).toBe('ello')
  })
  it('dd deletes line', () => {
    expect(applyKeys('aaa\nbbb', ['d', 'd'])).toBe('bbb')
  })
  it('D deletes to end of line', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 5 }
    let result = s
    for (const key of ['D']) {
      result = processKey(result, key).state
    }
    expect(getText(result)).toBe('hello')
  })
  it('dw deletes word', () => {
    expect(applyKeys('hello world', ['d', 'w'])).toBe('world')
  })
  it('p puts yanked text', () => {
    expect(applyKeys('hello world', ['d', 'w', 'p'])).toBe('whello orld')
  })
  it('cc changes entire line', () => {
    const result = applyKeys('hello', ['c', 'c', 'n', 'e', 'w', 'Escape'])
    expect(result).toBe('new')
  })
  it('C changes to end of line', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 5 }
    let result = s
    for (const key of ['C', '!', 'Escape']) {
      result = processKey(result, key).state
    }
    expect(getText(result)).toBe('hello!')
  })
})

describe('undo', () => {
  it('u undoes last change', () => {
    expect(applyKeys('hello', ['x', 'u'])).toBe('hello')
  })
  it('u undoes multiple changes', () => {
    expect(applyKeys('hello', ['x', 'x', 'u', 'u'])).toBe('hello')
  })
})

describe('find motions', () => {
  it('f finds char', () => {
    const s = applyKeysState('hello', ['f', 'l'])
    expect(s.cursor.col).toBe(2)
  })
  it('; repeats find', () => {
    const s = applyKeysState('abcabc', ['f', 'c', ';'])
    expect(s.cursor.col).toBe(5)
  })
  it(', reverses find', () => {
    const s = applyKeysState('abcabc', ['f', 'c', ';', ','])
    expect(s.cursor.col).toBe(2)
  })
})

describe('gg and G', () => {
  it('gg goes to file start', () => {
    const s = createState('aa\nbb\ncc')
    s.cursor = { line: 2, col: 0 }
    const result = processKey(processKey(s, 'g').state, 'g').state
    expect(result.cursor).toEqual({ line: 0, col: 0 })
  })
  it('G goes to last line', () => {
    const s = applyKeysState('aa\nbb\ncc', ['G'])
    expect(s.cursor.line).toBe(2)
  })
})

describe('dot command', () => {
  it('. repeats x', () => {
    expect(applyKeys('hello', ['x', '.'])).toBe('llo')
  })
  it('. repeats dd', () => {
    expect(applyKeys('a\nb\nc', ['d', 'd', '.'])).toBe('c')
  })
  it('. repeats dw', () => {
    expect(applyKeys('one two three', ['d', 'w', '.'])).toBe('three')
  })
  it('. repeats insert change', () => {
    expect(applyKeys('foo\nbar', ['A', ';', 'Escape', 'j', '.'])).toBe('foo;\nbar;')
  })
})

// CRITICAL: These are the actual Practical Vim challenges
describe('Practical Vim Tip 1', () => {
  it('x... deletes first 3 chars', () => {
    expect(applyKeys(
      'Line one\nLine two\nLine three\nLine four',
      ['x', '.', '.', '.']
    )).toBe(' one\nLine two\nLine three\nLine four')
  })

  it('dd. deletes first 2 lines', () => {
    expect(applyKeys(
      'Line one\nLine two\nLine three\nLine four',
      ['d', 'd', '.']
    )).toBe('Line three\nLine four')
  })
})

describe('Practical Vim Tip 2', () => {
  it('A;<Esc>j.j. appends semicolons', () => {
    expect(applyKeys(
      "var foo = 1\nvar bar = 'a'\nvar foobar = foo + bar",
      ['A', ';', 'Escape', 'j', '.', 'j', '.']
    )).toBe("var foo = 1;\nvar bar = 'a';\nvar foobar = foo + bar;")
  })
})
