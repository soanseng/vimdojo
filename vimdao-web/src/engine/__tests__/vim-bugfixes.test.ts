/**
 * TDD tests for VimEngine bug fixes identified in the audit.
 * Each describe block targets one specific bug.
 */
import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { processKey } from '../vim-engine'
import type { CursorPos } from '../vim-types'

function applyKeys(text: string, keys: string[], cursor?: CursorPos): string {
  let state = createState(text, cursor)
  for (const key of keys) {
    state = processKey(state, key).state
  }
  return getText(state)
}

function applyKeysState(text: string, keys: string[], cursor?: CursorPos) {
  let state = createState(text, cursor)
  for (const key of keys) {
    state = processKey(state, key).state
  }
  return state
}

// ---------------------------------------------------------------------------
// BUG-E1: t/T motions should be inclusive with operators
// ---------------------------------------------------------------------------

describe('BUG-E1: t/T inclusive with operators', () => {
  it('dt. deletes from cursor through char before period', () => {
    // "I've been expecting you, Mister Bond."
    // f, moves to comma (col 23), dt. should delete ", Mister Bond"
    const result = applyKeys(
      "I've been expecting you, Mister Bond.",
      ['f', ',', 'd', 't', '.'],
    )
    expect(result).toBe("I've been expecting you.")
  })

  it('dt; deletes from cursor through char before semicolon', () => {
    const result = applyKeys(
      'let x = foo(bar);',
      ['f', '(', 'd', 't', ')'],
    )
    expect(result).toBe('let x = foo);')
  })

  it('ct) changes from cursor till before closing paren', () => {
    const result = applyKeys(
      'call(old_arg)',
      ['f', '(', 'l', 'c', 't', ')', 'n', 'e', 'w', 'Escape'],
    )
    expect(result).toBe('call(new)')
  })

  it('dT, deletes backward till after comma', () => {
    const result = applyKeys(
      'a, b, c',
      ['$', 'd', 'T', ','],
      { line: 0, col: 6 },
    )
    expect(result).toBe('a, b,c')
  })
})

// ---------------------------------------------------------------------------
// BUG-E2: U/u in visual mode (uppercase/lowercase)
// ---------------------------------------------------------------------------

describe('BUG-E2: U/u in visual mode', () => {
  it('vitU uppercases inside tag', () => {
    const result = applyKeys(
      '<a href="#">one</a>',
      ['v', 'i', 't', 'U'],
      { line: 0, col: 12 },
    )
    expect(result).toBe('<a href="#">ONE</a>')
  })

  it('veu uppercases then lowercases a word', () => {
    const result = applyKeys(
      'Hello World',
      ['v', 'e', 'U'],
    )
    expect(result).toBe('HELLO World')
  })

  it('VU uppercases entire line', () => {
    const result = applyKeys(
      'hello world\nsecond line',
      ['V', 'U'],
    )
    expect(result).toBe('HELLO WORLD\nsecond line')
  })

  it('veu lowercases selected text', () => {
    const result = applyKeys(
      'HELLO WORLD',
      ['v', 'e', 'u'],
    )
    expect(result).toBe('hello WORLD')
  })

  it('Vu lowercases entire line', () => {
    const result = applyKeys(
      'HELLO WORLD\nSECOND LINE',
      ['V', 'u'],
    )
    expect(result).toBe('hello world\nSECOND LINE')
  })
})

// ---------------------------------------------------------------------------
// BUG-E3: Visual line indent (Vj>)
// ---------------------------------------------------------------------------

describe('BUG-E3: visual line indent', () => {
  it('Vj> indents two lines', () => {
    const result = applyKeys(
      'line one\nline two\nline three',
      ['V', 'j', '>'],
    )
    expect(result).toBe('  line one\n  line two\nline three')
  })

  it('Vj< dedents two lines', () => {
    const result = applyKeys(
      '  line one\n  line two\nline three',
      ['V', 'j', '<'],
    )
    expect(result).toBe('line one\nline two\nline three')
  })

  it('VG> indents to end of file', () => {
    const result = applyKeys(
      'a\nb\nc',
      ['V', 'G', '>'],
    )
    expect(result).toBe('  a\n  b\n  c')
  })
})

// ---------------------------------------------------------------------------
// BUG-E4: Dot repeat for visual indent
// ---------------------------------------------------------------------------

describe('BUG-E4: dot repeat for visual indent', () => {
  it('Vj>. double indents via dot', () => {
    const result = applyKeys(
      'print a,\na, b = b, a+b',
      ['V', 'j', '>', '.'],
    )
    expect(result).toBe('    print a,\n    a, b = b, a+b')
  })

  it('>Gj.j. produces incremental indentation', () => {
    const result = applyKeys(
      'Line one\nLine two\nLine three\nLine four',
      ['>', 'G', 'j', '.', 'j', '.'],
      { line: 1, col: 0 },
    )
    // Line 1 indented once (by >G from line 1)
    // Lines 2-3 indented again (by . from line 2)
    // Line 3 indented again (by . from line 3)
    expect(result).toBe('Line one\n  Line two\n    Line three\n      Line four')
  })
})

// ---------------------------------------------------------------------------
// BUG-E5: ci" seeks forward to next quote pair
// ---------------------------------------------------------------------------

describe('BUG-E5: ci" forward seek', () => {
  it('ci" from before quotes finds next quote pair', () => {
    const result = applyKeys(
      'say "hello" world',
      ['c', 'i', '"', 'b', 'y', 'e', 'Escape'],
      { line: 0, col: 0 },
    )
    expect(result).toBe('say "bye" world')
  })

  it('ci" still works when cursor is inside quotes', () => {
    const result = applyKeys(
      'say "hello" world',
      ['c', 'i', '"', 'b', 'y', 'e', 'Escape'],
      { line: 0, col: 6 },
    )
    expect(result).toBe('say "bye" world')
  })

  it("ci' seeks forward to single quotes", () => {
    const result = applyKeys(
      "x = 'old'",
      ['c', 'i', "'", 'n', 'e', 'w', 'Escape'],
      { line: 0, col: 0 },
    )
    expect(result).toBe("x = 'new'")
  })
})

// ---------------------------------------------------------------------------
// BUG-E6: Visual mode paste (p replaces selection)
// ---------------------------------------------------------------------------

describe('BUG-E6: visual mode paste', () => {
  it('yiw then visual select and p replaces selection', () => {
    // yiw yanks "collection", navigate to "somethingInTheWay", visual select, paste
    const result = applyKeys(
      'collection = getCollection();\nprocess(somethingInTheWay, target);',
      ['y', 'i', 'w', 'j', 'w', 'w', 'v', 'e', 'p'],
      { line: 0, col: 0 },
    )
    expect(result).toBe('collection = getCollection();\nprocess(collection, target);')
  })

  it('yy then vp replaces selected chars with line content', () => {
    // Simple case: yank a word, visual select another, paste
    const result = applyKeys(
      'foo bar baz',
      ['y', 'i', 'w', 'w', 'w', 'v', 'e', 'p'],
    )
    expect(result).toBe('foo bar foo')
  })

  it('p in visual line mode replaces lines', () => {
    // dd deletes line 0, moves to line 1 (old line 2), Vp replaces it
    const result = applyKeys(
      'first\nsecond\nthird',
      ['y', 'y', 'j', 'V', 'p'],
    )
    expect(result).toBe('first\nfirst\nthird')
  })
})

// ---------------------------------------------------------------------------
// BUG-E7: Paragraph text objects (ap/ip)
// ---------------------------------------------------------------------------

describe('BUG-E7: paragraph text objects', () => {
  it('yap yanks a paragraph', () => {
    const state = applyKeysState(
      'line1\nline2\n\nline4\nline5',
      ['y', 'a', 'p'],
      { line: 0, col: 0 },
    )
    // Paragraph is lines 0-1 plus the blank line separator
    expect(state.register).toContain('line1')
    expect(state.register).toContain('line2')
  })

  it('yap + P duplicates a paragraph above', () => {
    const result = applyKeys(
      '<table>\n\n  <tr>\n    <td>A</td>\n  </tr>\n\n</table>',
      ['y', 'a', 'p', 'P'],
      { line: 2, col: 0 },
    )
    expect(result).toBe(
      '<table>\n\n  <tr>\n    <td>A</td>\n  </tr>\n\n  <tr>\n    <td>A</td>\n  </tr>\n\n</table>',
    )
  })

  it('dip deletes inner paragraph', () => {
    const result = applyKeys(
      'header\n\nfirst\nsecond\n\nfooter',
      ['d', 'i', 'p'],
      { line: 2, col: 0 },
    )
    expect(result).toBe('header\n\n\nfooter')
  })

  it('dap deletes paragraph including trailing blank line', () => {
    const result = applyKeys(
      'header\n\nfirst\nsecond\n\nfooter',
      ['d', 'a', 'p'],
      { line: 2, col: 0 },
    )
    expect(result).toBe('header\n\nfooter')
  })
})

// ---------------------------------------------------------------------------
// BUG-E8: d/pattern<CR> — operator with search motion
// ---------------------------------------------------------------------------

describe('BUG-E8: operator with search motion', () => {
  it('d/gets<CR> deletes from cursor to search match', () => {
    const result = applyKeys(
      'This phrase takes time but\neventually gets to the point.',
      ['d', '/', 'g', 'e', 't', 's', 'Enter'],
      { line: 0, col: 12 },
    )
    expect(result).toBe('This phrase gets to the point.')
  })

  it('c/world<CR> changes from cursor to search match', () => {
    const result = applyKeys(
      'hello cruel world',
      ['c', '/', 'w', 'o', 'r', 'l', 'd', 'Enter', 'Escape'],
      { line: 0, col: 6 },
    )
    expect(result).toBe('hello world')
  })

  it('y/end<CR>p yanks to search match and pastes', () => {
    const state = applyKeysState(
      'start middle end',
      ['y', '/', 'e', 'n', 'd', 'Enter'],
      { line: 0, col: 0 },
    )
    expect(state.register).toBe('start middle ')
  })
})

// ---------------------------------------------------------------------------
// BUG-E9: /lang<CR> search + e + a + insert
// ---------------------------------------------------------------------------

describe('BUG-E9: search then append at end of match', () => {
  it('/lang<CR>eauage<Esc> appends to first match', () => {
    const result = applyKeys(
      'Aim to learn a new programming lang each year.\nWhich lang did you pick up.',
      ['/', 'l', 'a', 'n', 'g', 'Enter',
       'e', 'a', 'u', 'a', 'g', 'e', 'Escape'],
      { line: 0, col: 0 },
    )
    expect(result).toBe(
      'Aim to learn a new programming language each year.\nWhich lang did you pick up.',
    )
  })

  it('d/pattern<CR> cross-line works', () => {
    const result = applyKeys(
      'start middle\nmore text end',
      ['d', '/', 'e', 'n', 'd', 'Enter'],
      { line: 0, col: 6 },
    )
    expect(result).toBe('start end')
  })
})

// ---------------------------------------------------------------------------
// BUG-E10: cit when cursor is inside opening tag attributes
// ---------------------------------------------------------------------------

describe('BUG-E10: cit from inside tag attributes', () => {
  it('ci"#<Esc>citclick here<Esc> full combo', () => {
    const result = applyKeys(
      "'<a href=\"{url}\">{title}</a>'",
      ['c', 'i', '"', '#', 'Escape',
       'c', 'i', 't', 'c', 'l', 'i', 'c', 'k', ' ', 'h', 'e', 'r', 'e', 'Escape'],
      { line: 0, col: 0 },
    )
    expect(result).toBe("'<a href=\"#\">click here</a>'")
  })

  it('cit works when cursor is on tag attribute char', () => {
    const result = applyKeys(
      '<div class="box">content</div>',
      ['c', 'i', 't', 'n', 'e', 'w', 'Escape'],
      { line: 0, col: 8 },  // on 's' in "class"
    )
    expect(result).toBe('<div class="box">new</div>')
  })

  it('cit works when cursor is on > of opening tag', () => {
    const result = applyKeys(
      '<p>hello</p>',
      ['c', 'i', 't', 'b', 'y', 'e', 'Escape'],
      { line: 0, col: 3 },  // cursor right after > (on 'h')
    )
    expect(result).toBe('<p>bye</p>')
  })
})

// ---------------------------------------------------------------------------
// BUG-E11: Visual line delete should accumulate register
// ---------------------------------------------------------------------------

describe('BUG-E11: Vjjd accumulates all deleted lines in register', () => {
  it('Vjjd puts all 3 lines in register', () => {
    const state = applyKeysState(
      'line0\nline1\nline2\nline3',
      ['V', 'j', 'j', 'd'],
      { line: 0, col: 0 },
    )
    expect(state.register).toBe('line0\nline1\nline2\n')
    expect(getText(state)).toBe('line3')
  })

  it('Vjjdjjp swaps sections correctly', () => {
    const result = applyKeys(
      'Shopping list\n    Hardware Store\n        Buy nails\n        Buy new hammer\n    Beauty Parlor\n        Buy nail polish remover\n        Buy nails',
      ['V', 'j', 'j', 'd', 'j', 'j', 'p'],
      { line: 1, col: 0 },
    )
    expect(result).toBe(
      'Shopping list\n    Beauty Parlor\n        Buy nail polish remover\n        Buy nails\n    Hardware Store\n        Buy nails\n        Buy new hammer',
    )
  })
})

// ---------------------------------------------------------------------------
// BUG-E12: >i{ indent with text object
// ---------------------------------------------------------------------------

describe('BUG-E12: indent with text objects', () => {
  it('>i{ indents inside braces', () => {
    const result = applyKeys(
      'html {\n  margin: 0;\n  padding: 0;\n}',
      ['>', 'i', '{'],
      { line: 1, col: 0 },
    )
    expect(result).toBe('html {\n    margin: 0;\n    padding: 0;\n}')
  })

  it('<i{ dedents inside braces', () => {
    const result = applyKeys(
      'html {\n    margin: 0;\n    padding: 0;\n}',
      ['<', 'i', '{'],
      { line: 1, col: 0 },
    )
    expect(result).toBe('html {\n  margin: 0;\n  padding: 0;\n}')
  })
})

// ---------------------------------------------------------------------------
// FEAT-1: gU/gu operators (uppercase/lowercase with motion)
// ---------------------------------------------------------------------------

describe('FEAT-1: gU/gu operators', () => {
  it('gUw uppercases a word', () => {
    const result = applyKeys('hello world', ['g', 'U', 'w'])
    expect(result).toBe('HELLO world')
  })

  it('gUU uppercases entire line', () => {
    const result = applyKeys('hello world\nsecond', ['g', 'U', 'U'])
    expect(result).toBe('HELLO WORLD\nsecond')
  })

  it('guw lowercases a word', () => {
    const result = applyKeys('HELLO WORLD', ['g', 'u', 'w'])
    expect(result).toBe('hello WORLD')
  })

  it('guu lowercases entire line', () => {
    const result = applyKeys('HELLO WORLD\nSECOND', ['g', 'u', 'u'])
    expect(result).toBe('hello world\nSECOND')
  })

  it('gUiw uppercases inner word', () => {
    const result = applyKeys(
      'say hello please',
      ['g', 'U', 'i', 'w'],
      { line: 0, col: 4 },
    )
    expect(result).toBe('say HELLO please')
  })

  it('gUit uppercases inside tag', () => {
    const result = applyKeys(
      '<a href="#">one</a>',
      ['g', 'U', 'i', 't'],
      { line: 0, col: 12 },
    )
    expect(result).toBe('<a href="#">ONE</a>')
  })

  it('gU$ uppercases to end of line', () => {
    const result = applyKeys(
      'hello world',
      ['g', 'U', '$'],
      { line: 0, col: 6 },
    )
    expect(result).toBe('hello WORLD')
  })
})

// ---------------------------------------------------------------------------
// FEAT-2: Replace mode (R)
// ---------------------------------------------------------------------------

describe('FEAT-2: replace mode', () => {
  it('R replaces characters one by one', () => {
    const result = applyKeys(
      'hello world',
      ['R', 'H', 'E', 'L', 'Escape'],
    )
    expect(result).toBe('HELlo world')
  })

  it('R at end of line extends the line', () => {
    const result = applyKeys(
      'hi',
      ['R', 'H', 'E', 'L', 'L', 'O', 'Escape'],
    )
    expect(result).toBe('HELLO')
  })

  it('f.R,b<Esc> replaces chars at found position', () => {
    const result = applyKeys(
      'one.two.three',
      ['f', '.', 'R', ',', 'b', 'Escape'],
    )
    expect(result).toBe('one,bwo.three')
  })

  it('Escape from replace mode returns to normal', () => {
    const state = applyKeysState(
      'hello',
      ['R', 'X', 'Escape'],
    )
    expect(state.mode).toBe('normal')
    expect(getText(state)).toBe('Xello')
  })
})

// ---------------------------------------------------------------------------
// FEAT-3: gv (reselect last visual selection)
// ---------------------------------------------------------------------------

describe('FEAT-3: gv reselect visual', () => {
  it('gv reselects after visual yank', () => {
    const state = applyKeysState(
      'hello world',
      ['v', 'e', 'y', 'g', 'v'],
    )
    expect(state.mode).toBe('visual')
    expect(state.visualStart).toEqual({ line: 0, col: 0 })
    expect(state.cursor.col).toBe(4) // end of "hello"
  })

  it('gv after Vjy reselects visual lines', () => {
    const state = applyKeysState(
      'line1\nline2\nline3',
      ['V', 'j', 'y', 'g', 'v'],
    )
    expect(state.mode).toBe('visual')
    expect(state.visualMode).toBe('line')
  })
})

// ---------------------------------------------------------------------------
// Macros (q record / @ playback)
// ---------------------------------------------------------------------------

describe('macros', () => {
  it('qa records and q stops', () => {
    const state = applyKeysState('hello', ['q', 'a', 'x', 'q'])
    expect(state.macroRegisters?.a).toEqual(['x'])
    expect(getText(state)).toBe('ello')
  })

  it('@a plays recorded macro', () => {
    const result = applyKeys('hello world',
      ['q', 'a', 'x', 'q', '@', 'a'])
    expect(result).toBe('llo world')
  })

  it('3@a repeats macro 3 times', () => {
    const result = applyKeys('abcdef',
      ['q', 'a', 'x', 'q', '3', '@', 'a'])
    expect(result).toBe('ef')
  })

  it('@@ repeats last played macro', () => {
    const result = applyKeys('abcdef',
      ['q', 'a', 'x', 'q', '@', 'a', '@', '@'])
    expect(result).toBe('def')
  })

  it('qa A;<Esc>Ivar <Esc> q records complex macro', () => {
    const result = applyKeys('foo = 1\nbar = a\nfoobar = foo + bar',
      ['q', 'a', 'A', ';', 'Escape', 'I', 'v', 'a', 'r', ' ', 'Escape', 'q'])
    expect(result).toBe('var foo = 1;\nbar = a\nfoobar = foo + bar')
  })

  it('j@a applies macro to next line', () => {
    let state = createState('foo = 1\nbar = a\nfoobar = foo + bar')
    // Record macro that adds "var " at start and ";" at end
    for (const k of ['q', 'a', 'A', ';', 'Escape', 'I', 'v', 'a', 'r', ' ', 'Escape', 'q']) {
      state = processKey(state, k).state
    }
    // Line 0 is already transformed by the recording
    expect(getText(state)).toBe('var foo = 1;\nbar = a\nfoobar = foo + bar')
    // Play on lines 1 and 2
    for (const k of ['j', '@', 'a', 'j', '@', 'a']) {
      state = processKey(state, k).state
    }
    expect(getText(state)).toBe('var foo = 1;\nvar bar = a;\nvar foobar = foo + bar;')
  })

  it('macro recording indicator is set during recording', () => {
    let state = createState('hello')
    state = processKey(state, 'q').state
    state = processKey(state, 'a').state
    expect(state.macroRecording).toBe('a')
    state = processKey(state, 'x').state
    expect(state.macroRecording).toBe('a')
    state = processKey(state, 'q').state
    expect(state.macroRecording).toBeNull()
  })

  it('empty macro does nothing on playback', () => {
    const result = applyKeys('hello',
      ['q', 'a', 'q', '@', 'a'])
    expect(result).toBe('hello')
  })

  it('macro with j motion across lines', () => {
    const result = applyKeys('aaa\nbbb\nccc',
      ['q', 'a', 'x', 'j', 'q', '2', '@', 'a'])
    // qa: x deletes 'a', j goes to line 1. q stops.
    // 2@a: first replay: x on 'b' at col 0 line 1, j to line 2
    //       second replay: x on 'c' at col 0 line 2, j (no more lines, stays)
    expect(result).toBe('aa\nbb\ncc')
  })
})

// ---------------------------------------------------------------------------
// Control-r in insert mode (register paste)
// ---------------------------------------------------------------------------

describe('Control-r in insert mode', () => {
  it('pastes unnamed register with Control-r "', () => {
    // yiw yanks "hello" into unnamed register, then i<C-r>" pastes it
    const result = applyKeys(
      'hello world',
      ['y', 'i', 'w', 'w', 'i', 'Control-r', '"', 'Escape'],
    )
    expect(result).toBe('hello helloworld')
  })

  it('pastes register 0 (last yank = unnamed register)', () => {
    const result = applyKeys(
      'hello world',
      ['y', 'i', 'w', 'w', 'i', 'Control-r', '0', 'Escape'],
    )
    expect(result).toBe('hello helloworld')
  })

  it('yiw then ciw<C-r>0 pastes yanked text', () => {
    const result = applyKeys(
      'collection = getCollection();\nprocess(somethingInTheWay, target);',
      ['y', 'i', 'w',  // yank "collection"
       'j', 'w', 'w',  // navigate to "somethingInTheWay"
       'c', 'i', 'w',  // change inner word
       'Control-r', '0',     // paste register 0
       'Escape'],
      { line: 0, col: 0 },
    )
    expect(result).toBe('collection = getCollection();\nprocess(collection, target);')
  })

  it('C-r with Escape cancels register paste', () => {
    const result = applyKeys(
      'hello',
      ['i', 'Control-r', 'Escape'],
    )
    // Should return to normal mode without pasting
    expect(result).toBe('hello')
  })

  it('macro keys recorded include Control-r sequence', () => {
    // Record a macro that yanks word, goes to end, enters insert and pastes
    const state = applyKeysState('abc def',
      ['y', 'i', 'w', '$', 'q', 'a', 'a', ' ', 'Control-r', '"', 'Escape', 'q'])
    expect(state.macroRegisters?.a).toEqual(['a', ' ', 'Control-r', '"', 'Escape'])
    expect(getText(state)).toBe('abc def abc')
  })
})

// ---------------------------------------------------------------------------
// FEAT-4: gn motion (search match text object)
// ---------------------------------------------------------------------------

describe('FEAT-4: gn motion', () => {
  it('gUgn uppercases next search match', () => {
    const state = createState('class XhtmlDocument < XmlDocument; end', { line: 0, col: 0 })
    state.searchPattern = 'Xhtml'
    let s = state
    for (const k of ['g', 'U', 'g', 'n']) s = processKey(s, k).state
    expect(getText(s)).toBe('class XHTMLDocument < XmlDocument; end')
  })
})

// ---------------------------------------------------------------------------
// FEAT-5: % bracket match motion
// ---------------------------------------------------------------------------

describe('FEAT-5: % bracket match', () => {
  it('% jumps from ( to matching )', () => {
    const s = createState('foo(bar(baz))')
    s.cursor = { line: 0, col: 3 }
    const r = processKey(s, '%').state
    expect(r.cursor.col).toBe(12)
  })
  it('% jumps from ) back to matching (', () => {
    const s = createState('foo(bar)')
    s.cursor = { line: 0, col: 7 }
    const r = processKey(s, '%').state
    expect(r.cursor.col).toBe(3)
  })
  it('d% deletes from cursor to matching bracket', () => {
    const result = applyKeys('cities = %w{London Berlin}', ['d', '%'], { line: 0, col: 11 })
    expect(result).toBe('cities = %w')
  })
})

// ---------------------------------------------------------------------------
// FEAT-6: marks (m{a-z} to set, `{a-z} to jump)
// ---------------------------------------------------------------------------

describe('FEAT-6: marks', () => {
  it('ma sets mark, `a jumps back', () => {
    let s = createState('line1\nline2\nline3')
    s = processKey(s, 'm').state
    s = processKey(s, 'a').state  // set mark 'a' at 0,0
    s.cursor = { line: 2, col: 0 }  // move manually
    s = processKey(s, '`').state
    s = processKey(s, 'a').state  // jump to mark 'a'
    expect(s.cursor).toEqual({ line: 0, col: 0 })
  })
})

// ---------------------------------------------------------------------------
// FEAT-7: S in visual mode (surround selection)
// ---------------------------------------------------------------------------

describe('FEAT-7: visual surround S', () => {
  it('veeS" wraps selected text in quotes', () => {
    const result = applyKeys(
      'hello world',
      ['v', 'e', 'e', 'S', '"'],
    )
    expect(result).toBe('"hello world"')
  })

  it('vitS( wraps tag content in parens', () => {
    const result = applyKeys(
      '<p>hello</p>',
      ['v', 'i', 't', 'S', '('],
      { line: 0, col: 3 },
    )
    expect(result).toBe('<p>(hello)</p>')
  })

  it('VS" wraps entire line in quotes', () => {
    const result = applyKeys(
      'hello world\nsecond',
      ['V', 'S', '"'],
    )
    expect(result).toBe('"hello world"\nsecond')
  })
})

// ---------------------------------------------------------------------------
// FEAT-8: Expression register <C-r>=
// ---------------------------------------------------------------------------

describe('FEAT-8: expression register', () => {
  it('A<C-r>=6*35<CR> appends calculation result', () => {
    const result = applyKeys(
      'Total: ',
      ['A', 'Control-r', '=', '6', '*', '3', '5', 'Enter', 'Escape'],
    )
    expect(result).toBe('Total: 210')
  })

  it('<C-r>=10+20<CR> in insert mode', () => {
    const result = applyKeys(
      'sum = ',
      ['A', 'Control-r', '=', '1', '0', '+', '2', '0', 'Enter', 'Escape'],
    )
    expect(result).toBe('sum = 30')
  })

  it('<C-r>=100-25<CR> subtraction', () => {
    const result = applyKeys(
      'x = ',
      ['A', 'Control-r', '=', '1', '0', '0', '-', '2', '5', 'Enter', 'Escape'],
    )
    expect(result).toBe('x = 75')
  })
})

// ---------------------------------------------------------------------------
// FEAT-9: Visual block mode (<C-v>)
// ---------------------------------------------------------------------------

describe('FEAT-9: visual block mode', () => {
  it('<C-v>jjx deletes a column', () => {
    const result = applyKeys(
      'abc\ndef\nghi',
      ['Control-v', 'j', 'j', 'x'],
    )
    expect(result).toBe('bc\nef\nhi')
  })

  it('<C-v>jjlx deletes 2-wide column', () => {
    const result = applyKeys(
      'abcde\nfghij\nklmno',
      ['Control-v', 'j', 'j', 'l', 'x'],
    )
    expect(result).toBe('cde\nhij\nmno')
  })

  it('<C-v>jjI// <Esc> prepends to lines', () => {
    const result = applyKeys(
      'line1\nline2\nline3',
      ['Control-v', 'j', 'j', 'I', '/', '/', ' ', 'Escape'],
    )
    expect(result).toBe('// line1\n// line2\n// line3')
  })

  it('<C-v>jj$A;<Esc> appends to lines', () => {
    const result = applyKeys(
      'var a = 1\nvar b = 2\nvar c = 3',
      ['Control-v', 'j', 'j', '$', 'A', ';', 'Escape'],
    )
    expect(result).toBe('var a = 1;\nvar b = 2;\nvar c = 3;')
  })

  it('<C-v>jjr* replaces block with char', () => {
    const result = applyKeys(
      'abcde\nfghij\nklmno',
      ['Control-v', 'j', 'j', 'r', '*'],
      { line: 0, col: 2 },
    )
    expect(result).toBe('ab*de\nfg*ij\nkl*no')
  })
})
