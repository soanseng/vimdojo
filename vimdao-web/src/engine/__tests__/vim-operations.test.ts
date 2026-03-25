import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import * as ops from '../vim-operations'

describe('x - deleteChar', () => {
  it('deletes char under cursor', () => {
    const s = createState('hello')
    const result = ops.deleteChar(s)
    expect(getText(result)).toBe('ello')
    expect(result.register).toBe('h')
  })

  it('does nothing on empty line', () => {
    const s = createState('')
    const result = ops.deleteChar(s)
    expect(getText(result)).toBe('')
    expect(result.register).toBe('')
  })

  it('clamps cursor after delete at end', () => {
    const s = createState('ab')
    s.cursor = { line: 0, col: 1 }
    const result = ops.deleteChar(s)
    expect(getText(result)).toBe('a')
    expect(result.cursor.col).toBe(0)
  })

  it('deletes char in middle of line', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    const result = ops.deleteChar(s)
    expect(getText(result)).toBe('helo')
    expect(result.register).toBe('l')
    expect(result.cursor.col).toBe(2)
  })

  it('pushes to undo stack when deleting', () => {
    const s = createState('hello')
    const result = ops.deleteChar(s)
    expect(result.undoStack.length).toBe(1)
    expect(result.undoStack[0]!.lines).toEqual(['hello'])
  })

  it('does not push to undo stack on empty line', () => {
    const s = createState('')
    const result = ops.deleteChar(s)
    expect(result.undoStack.length).toBe(0)
  })

  it('handles multiline - deletes on second line', () => {
    const s = createState('aaa\nbbb')
    s.cursor = { line: 1, col: 0 }
    const result = ops.deleteChar(s)
    expect(getText(result)).toBe('aaa\nbb')
    expect(result.register).toBe('b')
  })
})

describe('X - deleteCharBefore', () => {
  it('deletes char before cursor', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 2 }
    const result = ops.deleteCharBefore(s)
    expect(getText(result)).toBe('hllo')
    expect(result.register).toBe('e')
    expect(result.cursor.col).toBe(1)
  })

  it('does nothing at col 0', () => {
    const s = createState('hello')
    const result = ops.deleteCharBefore(s)
    expect(getText(result)).toBe('hello')
  })

  it('does nothing on empty line', () => {
    const s = createState('')
    const result = ops.deleteCharBefore(s)
    expect(getText(result)).toBe('')
  })

  it('pushes to undo stack when deleting', () => {
    const s = createState('hello')
    s.cursor = { line: 0, col: 1 }
    const result = ops.deleteCharBefore(s)
    expect(result.undoStack.length).toBe(1)
  })

  it('does not push to undo stack when no-op', () => {
    const s = createState('hello')
    const result = ops.deleteCharBefore(s)
    expect(result.undoStack.length).toBe(0)
  })
})

describe('dd - deleteLine', () => {
  it('deletes first line', () => {
    const s = createState('aaa\nbbb\nccc')
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('bbb\nccc')
    expect(result.register).toBe('aaa\n')
  })

  it('deletes middle line', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 1, col: 0 }
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('aaa\nccc')
  })

  it('deletes last line', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 2, col: 0 }
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('aaa\nbbb')
    expect(result.cursor.line).toBe(1)
  })

  it('leaves at least one empty line', () => {
    const s = createState('only')
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('')
    expect(result.lines).toEqual([''])
    expect(result.register).toBe('only\n')
  })

  it('cursor moves to first non-space of next line', () => {
    const s = createState('aaa\n  bbb\nccc')
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('  bbb\nccc')
    expect(result.cursor.col).toBe(2)
  })

  it('pushes to undo stack', () => {
    const s = createState('aaa\nbbb')
    const result = ops.deleteLine(s)
    expect(result.undoStack.length).toBe(1)
  })

  it('cursor line clamps when deleting last line', () => {
    const s = createState('aaa\nbbb')
    s.cursor = { line: 1, col: 0 }
    const result = ops.deleteLine(s)
    expect(getText(result)).toBe('aaa')
    expect(result.cursor.line).toBe(0)
  })
})

describe('D - deleteToEnd', () => {
  it('deletes from cursor to end of line', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 5 }
    const result = ops.deleteToEnd(s)
    expect(getText(result)).toBe('hello')
    expect(result.register).toBe(' world')
  })

  it('deletes entire line content from col 0', () => {
    const s = createState('hello')
    const result = ops.deleteToEnd(s)
    expect(getText(result)).toBe('')
    expect(result.register).toBe('hello')
  })

  it('does nothing on empty line', () => {
    const s = createState('')
    const result = ops.deleteToEnd(s)
    expect(getText(result)).toBe('')
  })

  it('pushes to undo stack', () => {
    const s = createState('hello')
    const result = ops.deleteToEnd(s)
    expect(result.undoStack.length).toBe(1)
  })

  it('clamps cursor after delete', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 5 }
    const result = ops.deleteToEnd(s)
    expect(result.cursor.col).toBe(4) // last char of "hello"
  })
})

describe('cc - changeLine', () => {
  it('clears line and enters insert mode', () => {
    const s = createState('hello')
    const result = ops.changeLine(s)
    expect(getText(result)).toBe('')
    expect(result.mode).toBe('insert')
    expect(result.register).toBe('hello')
  })

  it('clears specific line in multiline', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 1, col: 2 }
    const result = ops.changeLine(s)
    expect(getText(result)).toBe('aaa\n\nccc')
    expect(result.mode).toBe('insert')
    expect(result.register).toBe('bbb')
  })

  it('keeps the line (just empties it)', () => {
    const s = createState('aaa\nbbb')
    const result = ops.changeLine(s)
    expect(result.lines.length).toBe(2)
    expect(result.lines[0]).toBe('')
  })

  it('cursor moves to col 0', () => {
    const s = createState('  hello')
    const result = ops.changeLine(s)
    expect(result.cursor.col).toBe(0)
  })

  it('pushes to undo stack', () => {
    const s = createState('hello')
    const result = ops.changeLine(s)
    expect(result.undoStack.length).toBe(1)
  })
})

describe('C - changeToEnd', () => {
  it('deletes from cursor to end and enters insert', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 5 }
    const result = ops.changeToEnd(s)
    expect(getText(result)).toBe('hello')
    expect(result.mode).toBe('insert')
    expect(result.register).toBe(' world')
  })

  it('on empty line enters insert', () => {
    const s = createState('')
    const result = ops.changeToEnd(s)
    expect(getText(result)).toBe('')
    expect(result.mode).toBe('insert')
  })

  it('pushes to undo stack when text exists', () => {
    const s = createState('hello')
    const result = ops.changeToEnd(s)
    expect(result.undoStack.length).toBe(1)
  })
})

describe('yy - yankLine', () => {
  it('copies line to register with trailing newline', () => {
    const s = createState('hello\nworld')
    const result = ops.yankLine(s)
    expect(result.register).toBe('hello\n')
    expect(getText(result)).toBe('hello\nworld')
  })

  it('copies single line', () => {
    const s = createState('hello')
    const result = ops.yankLine(s)
    expect(result.register).toBe('hello\n')
    expect(getText(result)).toBe('hello')
  })

  it('does not modify text', () => {
    const s = createState('aaa\nbbb\nccc')
    s.cursor = { line: 1, col: 0 }
    const result = ops.yankLine(s)
    expect(getText(result)).toBe('aaa\nbbb\nccc')
    expect(result.register).toBe('bbb\n')
  })

  it('does not push to undo stack', () => {
    const s = createState('hello')
    const result = ops.yankLine(s)
    expect(result.undoStack.length).toBe(0)
  })
})

describe('p - putAfter', () => {
  it('puts char register after cursor', () => {
    const s = createState('ab')
    s.register = 'XY'
    s.cursor = { line: 0, col: 0 }
    const result = ops.putAfter(s)
    expect(getText(result)).toBe('aXYb')
  })

  it('puts line register below current line', () => {
    const s = createState('aaa\nbbb')
    s.register = 'new\n'
    const result = ops.putAfter(s)
    expect(getText(result)).toBe('aaa\nnew\nbbb')
  })

  it('puts line register below last line', () => {
    const s = createState('aaa')
    s.register = 'new\n'
    const result = ops.putAfter(s)
    expect(getText(result)).toBe('aaa\nnew')
  })

  it('does nothing with empty register', () => {
    const s = createState('hello')
    const result = ops.putAfter(s)
    expect(getText(result)).toBe('hello')
  })

  it('pushes to undo stack', () => {
    const s = createState('hello')
    s.register = 'X'
    const result = ops.putAfter(s)
    expect(result.undoStack.length).toBe(1)
  })

  it('cursor on pasted char text', () => {
    const s = createState('ab')
    s.register = 'XY'
    s.cursor = { line: 0, col: 0 }
    const result = ops.putAfter(s)
    // cursor should be at end of pasted text
    expect(result.cursor.col).toBe(2)
  })

  it('cursor on pasted line', () => {
    const s = createState('aaa\nbbb')
    s.register = 'new\n'
    const result = ops.putAfter(s)
    expect(result.cursor.line).toBe(1)
  })

  it('puts char at end of line', () => {
    const s = createState('ab')
    s.register = 'X'
    s.cursor = { line: 0, col: 1 }
    const result = ops.putAfter(s)
    expect(getText(result)).toBe('abX')
  })
})

describe('P - putBefore', () => {
  it('puts char register at cursor position', () => {
    const s = createState('ab')
    s.register = 'XY'
    s.cursor = { line: 0, col: 1 }
    const result = ops.putBefore(s)
    expect(getText(result)).toBe('aXYb')
  })

  it('puts line register above current line', () => {
    const s = createState('aaa\nbbb')
    s.register = 'new\n'
    s.cursor = { line: 1, col: 0 }
    const result = ops.putBefore(s)
    expect(getText(result)).toBe('aaa\nnew\nbbb')
  })

  it('puts line register above first line', () => {
    const s = createState('aaa')
    s.register = 'new\n'
    const result = ops.putBefore(s)
    expect(getText(result)).toBe('new\naaa')
  })

  it('does nothing with empty register', () => {
    const s = createState('hello')
    const result = ops.putBefore(s)
    expect(getText(result)).toBe('hello')
  })

  it('pushes to undo stack', () => {
    const s = createState('hello')
    s.register = 'X'
    const result = ops.putBefore(s)
    expect(result.undoStack.length).toBe(1)
  })
})

describe('u - undo', () => {
  it('restores previous state', () => {
    const s = createState('hello')
    const modified = ops.deleteChar({
      ...s,
      undoStack: [{ lines: ['hello'], cursor: { line: 0, col: 0 } }],
    })
    const undone = ops.undo(modified)
    expect(getText(undone)).toBe('hello')
  })

  it('does nothing with empty stack', () => {
    const s = createState('hello')
    const result = ops.undo(s)
    expect(getText(result)).toBe('hello')
  })

  it('pops from undo stack', () => {
    const s = createState('modified')
    s.undoStack = [
      { lines: ['original'], cursor: { line: 0, col: 0 } },
      { lines: ['step1'], cursor: { line: 0, col: 0 } },
    ]
    const result = ops.undo(s)
    expect(getText(result)).toBe('step1')
    expect(result.undoStack.length).toBe(1)
  })

  it('multiple undos restore through history', () => {
    const s = createState('c')
    s.undoStack = [
      { lines: ['a'], cursor: { line: 0, col: 0 } },
      { lines: ['b'], cursor: { line: 0, col: 0 } },
    ]
    const u1 = ops.undo(s)
    expect(getText(u1)).toBe('b')
    const u2 = ops.undo(u1)
    expect(getText(u2)).toBe('a')
    const u3 = ops.undo(u2)
    expect(getText(u3)).toBe('a') // no more undo
  })
})

describe('deleteToPos - operator+motion', () => {
  it('deletes from cursor to target on same line', () => {
    const s = createState('hello world')
    const result = ops.deleteToPos(s, { line: 0, col: 6 })
    expect(getText(result)).toBe('world')
    expect(result.register).toBe('hello ')
  })

  it('deletes backward when target is before cursor', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 6 }
    const result = ops.deleteToPos(s, { line: 0, col: 0 })
    expect(getText(result)).toBe('world')
    expect(result.register).toBe('hello ')
    expect(result.cursor.col).toBe(0)
  })

  it('deletes across lines', () => {
    const s = createState('aaa\nbbb\nccc')
    const result = ops.deleteToPos(s, { line: 1, col: 1 })
    expect(getText(result)).toBe('bb\nccc')
    expect(result.register).toBe('aaa\nb')
  })

  it('pushes to undo stack', () => {
    const s = createState('hello')
    const result = ops.deleteToPos(s, { line: 0, col: 3 })
    expect(result.undoStack.length).toBe(1)
  })

  it('handles same position (no-op)', () => {
    const s = createState('hello')
    const result = ops.deleteToPos(s, { line: 0, col: 0 })
    expect(getText(result)).toBe('hello')
  })
})

describe('changeToPos - operator+motion', () => {
  it('deletes and enters insert mode', () => {
    const s = createState('hello world')
    const result = ops.changeToPos(s, { line: 0, col: 6 })
    expect(getText(result)).toBe('world')
    expect(result.mode).toBe('insert')
    expect(result.register).toBe('hello ')
  })

  it('handles backward target', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 6 }
    const result = ops.changeToPos(s, { line: 0, col: 0 })
    expect(getText(result)).toBe('world')
    expect(result.mode).toBe('insert')
  })
})

describe('yankToPos - operator+motion', () => {
  it('copies without deleting', () => {
    const s = createState('hello world')
    const result = ops.yankToPos(s, { line: 0, col: 6 })
    expect(getText(result)).toBe('hello world')
    expect(result.register).toBe('hello ')
  })

  it('copies backward range', () => {
    const s = createState('hello world')
    s.cursor = { line: 0, col: 6 }
    const result = ops.yankToPos(s, { line: 0, col: 0 })
    expect(getText(result)).toBe('hello world')
    expect(result.register).toBe('hello ')
  })

  it('copies across lines', () => {
    const s = createState('aaa\nbbb\nccc')
    const result = ops.yankToPos(s, { line: 1, col: 1 })
    expect(getText(result)).toBe('aaa\nbbb\nccc')
    expect(result.register).toBe('aaa\nb')
  })

  it('does not push to undo stack', () => {
    const s = createState('hello')
    const result = ops.yankToPos(s, { line: 0, col: 3 })
    expect(result.undoStack.length).toBe(0)
  })
})
