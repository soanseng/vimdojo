import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { toggleLineComment, toggleRangeComment } from '../vim-comment'

describe('toggleLineComment', () => {
  it('comments a line', () => {
    const s = createState('hello world')
    const result = toggleLineComment(s, 0, 0)
    expect(getText(result)).toBe('// hello world')
  })
  it('uncomments a commented line', () => {
    const s = createState('// hello world')
    const result = toggleLineComment(s, 0, 0)
    expect(getText(result)).toBe('hello world')
  })
  it('handles // with no space', () => {
    const s = createState('//hello')
    const result = toggleLineComment(s, 0, 0)
    expect(getText(result)).toBe('hello')
  })
  it('comments multiple lines', () => {
    const s = createState('aaa\nbbb\nccc')
    const result = toggleRangeComment(s, 0, 1)
    expect(getText(result)).toBe('// aaa\n// bbb\nccc')
  })
  it('uncomments multiple lines', () => {
    const s = createState('// aaa\n// bbb\nccc')
    const result = toggleRangeComment(s, 0, 1)
    expect(getText(result)).toBe('aaa\nbbb\nccc')
  })
  it('preserves indentation when commenting', () => {
    const s = createState('  hello')
    const result = toggleLineComment(s, 0, 0)
    expect(getText(result)).toBe('  // hello')
  })
})
