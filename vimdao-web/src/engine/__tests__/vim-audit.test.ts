/**
 * VimEngine audit — bulk keystroke verification against challenge data.
 */
import { describe, it, expect } from 'vitest'
import { createState, getText } from '../vim-state'
import { processKey } from '../vim-engine'
import type { CursorPos } from '../vim-types'
import challengeData from '../../../public/data/practical-vim_challenges.json'

const challenges = challengeData.challenges

function parseKeystrokes(raw: string): string[] {
  const keys: string[] = []
  let i = 0
  while (i < raw.length) {
    if (raw[i] === '<') {
      const end = raw.indexOf('>', i)
      if (end !== -1) {
        const token = raw.slice(i + 1, end)
        if (token === 'Esc') keys.push('Escape')
        else if (token === 'CR') keys.push('Enter')
        else if (token === 'C-r') keys.push('Control-r')
        else if (token === 'C-x') keys.push('Control-x')
        else if (token === 'C-a') keys.push('Control-a')
        else keys.push(`<${token}>`)
        i = end + 1
        continue
      }
    }
    keys.push(raw[i])
    i++
  }
  return keys
}

function applyKeys(text: string, keys: string[], cursor?: CursorPos): string {
  let state = createState(text, cursor)
  for (const key of keys) {
    state = processKey(state, key).state
  }
  return getText(state)
}

function isTestable(ks: string): boolean {
  if (!ks || ks.trim() === '') return false
  // Still unsupported:
  if (ks.includes('<C-v>')) return false           // visual block mode
  if (ks.includes('<C-]>')) return false           // tag jump
  if (ks.includes('<C-x><C-')) return false        // insert completion
  if (ks.includes('<C-r>=')) return false           // expression register
  if (ks.includes('{start}')) return false          // complex workflow description
  if (/vee?S/.test(ks)) return false               // visual surround (S)
  return true
}

describe('VimEngine Audit', () => {
  it('no out-of-bounds cursor_start', () => {
    const oob: string[] = []
    for (const c of challenges) {
      const lines = c.initial_text.split('\n')
      if (c.cursor_start.line >= lines.length) {
        oob.push(`${c.id}: line ${c.cursor_start.line} >= ${lines.length} lines`)
      }
    }
    expect(oob).toEqual([])
  })

  const testable = challenges.filter(c => isTestable(c.hint_keystrokes))
  const results = { pass: [] as string[], fail: [] as string[] }

  for (const c of testable) {
    it(`${c.id}`, () => {
      const keys = parseKeystrokes(c.hint_keystrokes)
      const actual = applyKeys(c.initial_text, keys, c.cursor_start)
      if (actual === c.expected_text) {
        results.pass.push(c.id)
      } else {
        results.fail.push(c.id)
        const aL = actual.split('\n'), eL = c.expected_text.split('\n')
        for (let i = 0; i < Math.max(aL.length, eL.length); i++) {
          if (aL[i] !== eL[i]) console.log(`  L${i}: got=${JSON.stringify(aL[i])} exp=${JSON.stringify(eL[i])}`)
        }
      }
    })
  }

  it('SUMMARY', () => {
    console.log(`\n=== AUDIT: PASS ${results.pass.length} | FAIL ${results.fail.length} | TESTABLE ${testable.length} | TOTAL ${challenges.length} ===`)
    if (results.pass.length > 0) console.log('PASS:', results.pass.join(', '))
    if (results.fail.length > 0) console.log('FAIL:', results.fail.join(', '))
  })
})
