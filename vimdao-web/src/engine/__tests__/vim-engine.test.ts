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
  it('. repeats d2w (deletes 2 words again)', () => {
    expect(applyKeys('one two three four five six', ['d', '2', 'w', '.'])).toBe('five six')
  })
  it('. repeats 3dd', () => {
    expect(applyKeys('a\nb\nc\nd\ne\nf\ng', ['3', 'd', 'd', '.'])).toBe('g')
  })
})

describe('inclusive motions with operators', () => {
  it('de deletes to end of word inclusively', () => {
    expect(applyKeys('hello world', ['d', 'e'])).toBe(' world')
  })

  it('d$ deletes to end of line inclusively', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 5 }
    let result = s
    for (const key of ['d', '$']) {
      result = processKey(result, key).state
    }
    expect(getText(result)).toBe('hello')
  })

  it('df deletes through found char inclusively', () => {
    expect(applyKeys('abcdef', ['d', 'f', 'd'])).toBe('ef')
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

describe('paragraph motions', () => {
  it('} moves to next blank line', () => {
    const s = createState('aaa\nbbb\n\nccc\nddd')
    const result = processKey(s, '}').state
    expect(result.cursor).toEqual({ line: 2, col: 0 })
  })
  it('{ moves to previous blank line', () => {
    const s = createState('aaa\nbbb\n\nccc\nddd')
    s.cursor = { line: 4, col: 0 }
    const result = processKey(s, '{').state
    expect(result.cursor).toEqual({ line: 2, col: 0 })
  })
  it('} at last paragraph goes to end of file', () => {
    const s = createState('aaa\nbbb\nccc')
    const result = processKey(s, '}').state
    expect(result.cursor).toEqual({ line: 2, col: 0 })
  })
  it('{ at first paragraph goes to start of file', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 2, col: 0 }
    const result = processKey(s, '{').state
    expect(result.cursor).toEqual({ line: 0, col: 0 })
  })
  it('} skips consecutive blank lines', () => {
    const s = createState('aaa\n\n\nbbb')
    const result = processKey(s, '}').state
    // Should land on the first blank line
    expect(result.cursor).toEqual({ line: 1, col: 0 })
  })
})

describe('s command', () => {
  it('s deletes char and enters insert mode', () => {
    const result = applyKeys('hello', ['s', 'H', 'Escape'])
    expect(result).toBe('Hello')
  })
  it('s on empty line enters insert mode', () => {
    const s = applyKeysState('', ['s'])
    expect(s.mode).toBe('insert')
  })
  it('. repeats s command', () => {
    const result = applyKeys('abc', ['s', 'X', 'Escape', 'l', '.'])
    expect(result).toBe('XXc')
  })
})

describe('search', () => {
  it('/ searches forward on Enter', () => {
    const s = applyKeysState('hello world hello', ['/', 'h', 'e', 'l', 'l', 'o', 'Enter'])
    expect(s.cursor.col).toBe(12)
    expect(s.searchPattern).toBe('hello')
  })
  it('n repeats search (wraps)', () => {
    const s = applyKeysState('aaa bbb aaa', ['/', 'a', 'a', 'a', 'Enter', 'n'])
    expect(s.cursor.col).toBe(0) // wraps back
  })
  it('N reverses search direction', () => {
    const s = applyKeysState('hello world hello', ['/', 'h', 'e', 'l', 'l', 'o', 'Enter', 'N'])
    expect(s.cursor.col).toBe(0) // searches backward from col 12
  })
  it('* searches word under cursor', () => {
    const s = applyKeysState('the content of content', ['w', '*'])
    expect(s.cursor.col).toBe(15)
  })
  it('# searches word under cursor backward', () => {
    // Cursor starts at col 0 ("content"), move to col 11 via motions (2w)
    const s = applyKeysState('content of content', ['2', 'w', '#'])
    expect(s.cursor.col).toBe(0)
    expect(s.searchDirection).toBe('backward')
  })
  it('Escape cancels search', () => {
    const s = applyKeysState('hello', ['/', 'h', 'Escape'])
    expect(s.mode).toBe('normal')
    expect(s.cursor.col).toBe(0) // didn't move
  })
  it('search mode shows in state', () => {
    const s = applyKeysState('hello', ['/', 'h'])
    expect(s.mode).toBe('command')
    expect(s.commandBuffer).toBe('/h')
  })
  it('Backspace removes char from search buffer', () => {
    const s = applyKeysState('hello', ['/', 'h', 'e', 'Backspace'])
    expect(s.commandBuffer).toBe('/h')
  })
  it('Backspace on empty search pattern cancels', () => {
    const s = applyKeysState('hello', ['/', 'Backspace'])
    expect(s.mode).toBe('normal')
  })
})

describe('count prefix', () => {
  it('3w moves 3 words forward', () => {
    const s = applyKeysState('one two three four', ['3', 'w'])
    expect(s.cursor.col).toBe(14)
  })

  it('5j moves 5 lines down', () => {
    const text = Array(10).fill('line').join('\n')
    const s = applyKeysState(text, ['5', 'j'])
    expect(s.cursor.line).toBe(5)
  })

  it('2l moves 2 right', () => {
    const s = applyKeysState('hello', ['2', 'l'])
    expect(s.cursor.col).toBe(2)
  })

  it('d2w deletes 2 words', () => {
    expect(applyKeys('one two three', ['d', '2', 'w'])).toBe('three')
  })

  it('3dd deletes 3 lines', () => {
    expect(applyKeys('a\nb\nc\nd\ne', ['3', 'd', 'd'])).toBe('d\ne')
  })

  it('2x deletes 2 chars', () => {
    expect(applyKeys('hello', ['2', 'x'])).toBe('llo')
  })

  it('c3w changes 3 words (cw acts like ce)', () => {
    expect(applyKeys('one two three four', ['c', '3', 'w', 'X', 'Escape'])).toBe('X four')
  })

  it('0 without count prefix goes to column 0', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 3 }
    const result = processKey(s, '0')
    expect(result.state.cursor.col).toBe(0)
  })

  it('10l moves 10 right (multi-digit count)', () => {
    const s = applyKeysState('a'.repeat(20), ['1', '0', 'l'])
    expect(s.cursor.col).toBe(10)
  })

  it('count is cleared after motion', () => {
    const s = applyKeysState('hello world', ['2', 'l'])
    expect(s.countPrefix).toBeNull()
  })

  it('2d3w deletes 6 words (operator count * motion count)', () => {
    expect(applyKeys('a b c d e f g', ['2', 'd', '3', 'w'])).toBe('g')
  })
})

describe('visual mode', () => {
  it('v enters char visual mode', () => {
    const s = applyKeysState('hello', ['v'])
    expect(s.mode).toBe('visual')
    expect(s.visualMode).toBe('char')
    expect(s.visualStart).toEqual({ line: 0, col: 0 })
  })

  it('v + e + d deletes selection', () => {
    expect(applyKeys('hello world', ['v', 'e', 'd'])).toBe(' world')
  })

  it('v + w + d deletes to next word', () => {
    expect(applyKeys('hello world foo', ['v', 'w', 'd'])).toBe('orld foo')
  })

  it('v + $ + d deletes to end of line', () => {
    expect(applyKeys('hello world', ['v', '$', 'd'])).toBe('')
  })

  it('V selects whole line', () => {
    const s = applyKeysState('aaa\nbbb', ['V'])
    expect(s.mode).toBe('visual')
    expect(s.visualMode).toBe('line')
  })

  it('V + j + d deletes 2 lines', () => {
    expect(applyKeys('aaa\nbbb\nccc', ['V', 'j', 'd'])).toBe('ccc')
  })

  it('V + d deletes current line', () => {
    expect(applyKeys('aaa\nbbb\nccc', ['V', 'd'])).toBe('bbb\nccc')
  })

  it('v + y yanks selection without deleting', () => {
    const s = applyKeysState('hello world', ['v', 'e', 'y'])
    expect(s.mode).toBe('normal')
    expect(s.register).toBe('hello')
  })

  it('v + c deletes and enters insert', () => {
    expect(applyKeys('hello world', ['v', 'e', 'c', 'X', 'Escape'])).toBe('X world')
  })

  it('Escape exits visual mode', () => {
    const s = applyKeysState('hello', ['v', 'l', 'l', 'Escape'])
    expect(s.mode).toBe('normal')
    expect(s.visualStart).toBeNull()
    expect(s.visualMode).toBeNull()
  })

  it('visual mode with j extends selection down', () => {
    // v at (0,0), j to (1,0), d deletes from (0,0) to (1,0) inclusive = "aaa\nb"
    expect(applyKeys('aaa\nbbb\nccc', ['v', 'j', 'd'])).toBe('bb\nccc')
  })
})

describe('r{char} replace', () => {
  it('r replaces char under cursor', () => {
    expect(applyKeys('hello', ['r', 'X'])).toBe('Xello')
  })
  it('r at col 3', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 3 }
    let result = s
    for (const k of ['r', 'X']) result = processKey(result, k).state
    expect(getText(result)).toBe('helXo')
  })
  it('r is repeatable with dot', () => {
    expect(applyKeys('abc', ['r', 'X', 'l', '.'])).toBe('XXc')
  })
  it('r + Escape cancels', () => {
    expect(applyKeys('hello', ['r', 'Escape'])).toBe('hello')
  })
})

describe('> indent', () => {
  it('>> indents current line', () => {
    expect(applyKeys('hello', ['>', '>'])).toBe('  hello')
  })
  it('>j indents 2 lines', () => {
    expect(applyKeys('aaa\nbbb\nccc', ['>', 'j'])).toBe('  aaa\n  bbb\nccc')
  })
  it('>G indents to end of file', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 1, col: 0 }
    let result = s
    for (const k of ['>', 'G']) result = processKey(result, k).state
    expect(getText(result)).toBe('aaa\n  bbb\n  ccc')
  })
  it('<< dedents current line', () => {
    expect(applyKeys('  hello', ['<', '<'])).toBe('hello')
  })
})

describe('text objects with operators', () => {
  it('daw deletes a word with space', () => {
    const s = createState('hello world foo')
    s.cursor = { line: 0, col: 7 }
    let result = s
    for (const k of ['d', 'a', 'w']) result = processKey(result, k).state
    expect(getText(result)).toBe('hello foo')
  })

  it('diw deletes inner word', () => {
    const s = createState('hello world foo')
    s.cursor = { line: 0, col: 7 }
    let result = s
    for (const k of ['d', 'i', 'w']) result = processKey(result, k).state
    expect(getText(result)).toBe('hello  foo')
  })

  it('ciw changes inner word', () => {
    expect(applyKeys('hello world', ['w', 'c', 'i', 'w', 'X', 'Escape'])).toBe('hello X')
  })

  it('di( deletes inside parens', () => {
    const s = createState('call(arg1, arg2)')
    s.cursor = { line: 0, col: 6 }
    let result = s
    for (const k of ['d', 'i', '(']) result = processKey(result, k).state
    expect(getText(result)).toBe('call()')
  })

  it('ci" changes inside quotes', () => {
    const s = createState('say "hello" end')
    s.cursor = { line: 0, col: 6 }
    let result = s
    for (const k of ['c', 'i', '"', 'X', 'Escape']) result = processKey(result, k).state
    expect(getText(result)).toBe('say "X" end')
  })

  it('da( deletes including parens', () => {
    const s = createState('call(args)')
    s.cursor = { line: 0, col: 6 }
    let result = s
    for (const k of ['d', 'a', '(']) result = processKey(result, k).state
    expect(getText(result)).toBe('call')
  })

  it('yi{ yanks inside braces', () => {
    const s = createState('{ hello }')
    s.cursor = { line: 0, col: 4 }
    let result = s
    for (const k of ['y', 'i', '{']) result = processKey(result, k).state
    expect(getText(result)).toBe('{ hello }') // unchanged
    expect(result.register).toBe(' hello ')
  })

  it('daw is repeatable with dot', () => {
    const s = createState('one two three')
    let result = s
    for (const k of ['d', 'a', 'w', '.']) result = processKey(result, k).state
    expect(getText(result)).toBe('three')
  })
})

describe('command mode', () => {
  it(':w sets lastCommand to write', () => {
    const s = applyKeysState('hello', [':', 'w', 'Enter'])
    expect(s.mode).toBe('normal')
    expect(s.lastCommand).toBe('write')
  })
  it(':q sets lastCommand to quit', () => {
    const s = applyKeysState('hello', [':', 'q', 'Enter'])
    expect(s.lastCommand).toBe('quit')
  })
  it(':%s/old/new/g substitutes globally', () => {
    const keys = ':%s/he/HE/g'.split('').concat(['Enter'])
    expect(applyKeys('hello he', keys)).toBe('HEllo HE')
  })
  it(':%s without /g replaces first per line', () => {
    const keys = ':%s/aa/XX/'.split('').concat(['Enter'])
    expect(applyKeys('aa bb aa', keys)).toBe('XX bb aa')
  })
  it('Escape exits command mode', () => {
    const s = applyKeysState('hello', [':', 'w', 'Escape'])
    expect(s.mode).toBe('normal')
  })
})

describe('surround via engine', () => {
  it('gsaiw" wraps word in quotes', () => {
    expect(applyKeys('hello world', ['g', 's', 'a', 'i', 'w', '"'])).toBe('"hello" world')
  })
  it('gsd" removes quotes', () => {
    const s = createState('"hello" world')
    s.cursor = { line: 0, col: 3 }
    let result = s
    for (const k of ['g', 's', 'd', '"']) result = processKey(result, k).state
    expect(getText(result)).toBe('hello world')
  })
  it('gsr"\' replaces quotes', () => {
    const s = createState('"hello" world')
    s.cursor = { line: 0, col: 3 }
    let result = s
    for (const k of ['g', 's', 'r', '"', "'"]) result = processKey(result, k).state
    expect(getText(result)).toBe("'hello' world")
  })
  it('gsaiw( wraps in parens', () => {
    expect(applyKeys('hello world', ['g', 's', 'a', 'i', 'w', '('])).toBe('(hello) world')
  })
})

describe('gcc comment toggle', () => {
  it('gcc comments current line', () => {
    expect(applyKeys('hello', ['g', 'c', 'c'])).toBe('// hello')
  })
  it('gcc uncomments', () => {
    expect(applyKeys('// hello', ['g', 'c', 'c'])).toBe('hello')
  })
  it('gcj comments 2 lines', () => {
    expect(applyKeys('aaa\nbbb\nccc', ['g', 'c', 'j'])).toBe('// aaa\n// bbb\nccc')
  })
})

describe('[e ]e line move', () => {
  it(']e moves line down', () => {
    expect(applyKeys('aaa\nbbb\nccc', [']', 'e'])).toBe('bbb\naaa\nccc')
  })
  it('[e moves line up from line 1', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 1, col: 0 }
    let result = s
    for (const k of ['[', 'e']) result = processKey(result, k).state
    expect(getText(result)).toBe('bbb\naaa\nccc')
  })
  it('[e at line 0 does nothing', () => {
    expect(applyKeys('aaa\nbbb', ['[', 'e'])).toBe('aaa\nbbb')
  })
  it(']e at last line does nothing', () => {
    const s = createState('aaa\nbbb')
    s.cursor = { line: 1, col: 0 }
    let result = s
    for (const k of [']', 'e']) result = processKey(result, k).state
    expect(getText(result)).toBe('aaa\nbbb')
  })
})

describe('Ctrl-a / Ctrl-x', () => {
  it('Control-a increments number', () => {
    const s = createState('count = 5')
    s.cursor = { line: 0, col: 8 }
    const result = processKey(s, 'Control-a').state
    expect(getText(result)).toBe('count = 6')
  })
  it('Control-x decrements number', () => {
    const s = createState('count = 5')
    s.cursor = { line: 0, col: 8 }
    const result = processKey(s, 'Control-x').state
    expect(getText(result)).toBe('count = 4')
  })
  it('Control-a finds next number on line', () => {
    const s = createState('val = abc 42 end')
    s.cursor = { line: 0, col: 0 }
    const result = processKey(s, 'Control-a').state
    expect(getText(result)).toBe('val = abc 43 end')
  })
  it('Control-x decrements to negative', () => {
    const s = createState('x = 0')
    s.cursor = { line: 0, col: 4 }
    const result = processKey(s, 'Control-x').state
    expect(getText(result)).toBe('x = -1')
  })
})
