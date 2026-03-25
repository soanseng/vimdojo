# RPG System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cyberpunk-wuxia RPG layer to VimDao — XP, levels, titles, skill mastery lines, achievements, chapter-gated story progression, and BOSS challenges — making Vim practice feel like a martial arts cultivation journey.

**Architecture:** Two layers of changes: (1) Go side — extend challenge generator to add `flavor_zh`, `is_boss`, `xp_reward` fields, and create a hand-authored `story.json`; (2) React side — progression store in localStorage, RPG UI components (character panel, story dialogs, chapter map), and integration into existing ChallengeView/ChallengeList. The RPG logic is a pure TypeScript module (`rpg/`) with no React dependency, testable with Vitest. The UI components consume it via hooks.

**Tech Stack:** Go (vimdao-extract), React 18 + TypeScript strict + TailwindCSS v4 + Vitest (vimdao-web). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-25-rpg-system-design.md`

---

## File Structure

```
vimdao-extract/
├── challenge/
│   ├── types.go             # (modify) Add FlavorZh, IsBoss, XpReward fields
│   └── generator.go         # (modify) Add BOSS detection + RPG field population

vimdao-web/
├── public/
│   ├── data/
│   │   ├── practical-vim_challenges.json  # (regenerate) With new RPG fields
│   │   └── story.json                     # (create) Hand-authored chapter stories
│   └── images/rpg/                        # (create) Placeholder pixel art
├── src/
│   ├── types/
│   │   └── index.ts          # (modify) Add RPG fields to Challenge, add StoryChapter, UserProgress
│   ├── rpg/
│   │   ├── progression.ts    # XP, level, title calculation — pure functions
│   │   ├── skill-mastery.ts  # Tag → skill line mapping, mastery calculation
│   │   ├── achievements.ts   # Achievement definitions and check logic
│   │   ├── constants.ts      # XP values, level thresholds, title table, skill line definitions
│   │   └── __tests__/
│   │       ├── progression.test.ts
│   │       ├── skill-mastery.test.ts
│   │       └── achievements.test.ts
│   ├── stores/
│   │   └── progress-store.ts # localStorage read/write with migration
│   ├── hooks/
│   │   ├── useVimEditor.ts   # (existing, no change)
│   │   └── useProgress.ts    # React hook wrapping progress-store
│   ├── components/
│   │   ├── RPG/
│   │   │   ├── CharacterPanel.tsx   # Level, XP bar, title, skill lines
│   │   │   ├── StoryDialog.tsx      # Chapter intro/outro text display
│   │   │   ├── ChapterMap.tsx       # Linear chapter progression with lock state
│   │   │   ├── AchievementToast.tsx  # Achievement unlock notification
│   │   │   └── BossFrame.tsx        # Glowing border wrapper for BOSS challenges
│   │   ├── Challenge/
│   │   │   ├── ChallengeView.tsx    # (modify) Integrate RPG: XP award, boss frame, story
│   │   │   └── ChallengeList.tsx    # (modify) Show chapter map instead of flat grid
│   │   └── Layout/
│   │       └── Navbar.tsx           # (create) Top nav with character level/title
│   ├── styles/
│   │   ├── vim-editor.css    # (existing, no change)
│   │   └── rpg-ui.css        # (create) Pixel-style borders, glow effects, XP bar
│   └── App.tsx               # (modify) / → ChapterMap, /practice → ChallengeList, add Navbar
```

---

### Task 1: Go — Extend Challenge Types and Generator

Add `flavor_zh`, `is_boss`, `xp_reward` to the Challenge struct. Auto-detect BOSS (last challenge per chapter). Regenerate JSON.

**Files:**
- Modify: `vimdao-extract/challenge/types.go`
- Modify: `vimdao-extract/challenge/generator.go`
- Test: `vimdao-extract/challenge/generator_test.go`

- [ ] **Step 1: Write failing test for BOSS detection**

Add to `vimdao-extract/challenge/generator_test.go`:
```go
func TestBossDetection(t *testing.T) {
	book := &extract.ExtractedBook{
		BookTitle: "Test",
		Chapters: []extract.Chapter{
			{
				ChapterID: 1,
				Title:     "Ch1",
				Sections: []extract.Section{
					{SectionID: "1.1", TipNumber: 1, Title: "Tip 1",
						CodeBlocks: []extract.CodeBlock{{Before: "a", After: "b", Keystrokes: "x"}}},
					{SectionID: "1.2", TipNumber: 2, Title: "Tip 2",
						CodeBlocks: []extract.CodeBlock{{Before: "c", After: "d", Keystrokes: "dd"}}},
				},
			},
		},
	}
	cs := Generate(book, "practical-vim")
	if len(cs.Challenges) != 2 {
		t.Fatalf("expected 2, got %d", len(cs.Challenges))
	}
	if cs.Challenges[0].IsBoss {
		t.Error("first challenge should not be boss")
	}
	if !cs.Challenges[1].IsBoss {
		t.Error("last challenge in chapter should be boss")
	}
	if cs.Challenges[0].XpReward != 15 {
		t.Errorf("regular XP: got %d, want 15", cs.Challenges[0].XpReward)
	}
	if cs.Challenges[1].XpReward != 80 {
		t.Errorf("boss XP: got %d, want 80", cs.Challenges[1].XpReward)
	}
}
```

- [ ] **Step 2: Run test — verify it fails** (IsBoss, XpReward fields don't exist)

Run: `cd vimdao-extract && go test ./challenge/ -run TestBoss -v`

- [ ] **Step 3: Add fields to types.go**

Add to `Challenge` struct:
```go
FlavorZh  string `json:"flavor_zh,omitempty"`  // populated in a future pass (hand-authored)
IsBoss    bool   `json:"is_boss"`
XpReward  int    `json:"xp_reward"`
```

Note: `FlavorZh` is left empty for now (`omitempty` omits it from JSON). It will be populated in a future task by adding a hand-authored mapping file. The UI should gracefully handle missing `flavor_zh`.

- [ ] **Step 4: Implement BOSS detection in generator.go**

In `Generate()`, after building all challenges, do a second pass to mark the last challenge per chapter as BOSS:

```go
// After generating all challenges, mark BOSS (last per chapter)
lastByChapter := make(map[int]int) // chapter -> index of last challenge
for i, c := range cs.Challenges {
    lastByChapter[c.Source.Chapter] = i
}
for _, idx := range lastByChapter {
    cs.Challenges[idx].IsBoss = true
    cs.Challenges[idx].XpReward = 80
}
// Set regular XP for non-boss
for i := range cs.Challenges {
    if !cs.Challenges[i].IsBoss {
        cs.Challenges[i].XpReward = 15
    }
}
```

- [ ] **Step 5: Run tests — all pass**

Run: `cd vimdao-extract && go test -race ./...`

- [ ] **Step 6: Regenerate challenge JSON**

```bash
cd vimdao-extract
go build -o ./vimdao-extract .
./vimdao-extract generate "../resources/Practical Vim - Drew Neil.epub"
cp dist/practical-vim-drew-neil/practical-vim-drew-neil_challenges.json \
   ../vimdao-web/public/data/practical-vim_challenges.json
```

- [ ] **Step 7: Commit**

```bash
git add vimdao-extract/challenge/ vimdao-web/public/data/practical-vim_challenges.json
git commit -m "feat: add is_boss and xp_reward fields to challenge generator"
```

---

### Task 2: Create story.json

Hand-authored story content for all 13 chapters.

**Files:**
- Create: `vimdao-web/public/data/story.json`

- [ ] **Step 1: Write the complete story.json**

Create `vimdao-web/public/data/story.json` with all 13 chapters. Each chapter has:
- `chapter_id`: matching the Practical Vim chapter number
- `title_zh`: RPG name from the spec table
- `title_en`: original book title
- `intro_story`: array of 2-3 strings (chapter opening narrative)
- `outro_story`: array of 1-2 strings (chapter completion text)
- `boss_intro`: array of 2-3 strings (BOSS challenge dialogue)
- `scene_image`: filename (placeholder, will be created later)
- `unlock_requires`: null for Ch1, previous chapter_id for others

The narrative tone should be cyberpunk-wuxia: martial arts cultivation terms + digital world setting. 繁體中文. Occasional humor.

- [ ] **Step 2: Validate JSON is parseable**

```bash
cd vimdao-web && python3 -c "import json; json.load(open('public/data/story.json')); print('valid')"
```

- [ ] **Step 3: Commit**

```bash
git add vimdao-web/public/data/story.json
git commit -m "feat: add story.json with chapter narratives for RPG system"
```

---

### Task 3: RPG Constants and Types

Pure TypeScript definitions shared across the RPG system.

**Files:**
- Create: `vimdao-web/src/rpg/constants.ts`
- Modify: `vimdao-web/src/types/index.ts`

- [ ] **Step 1: Add RPG types to types/index.ts**

Add to existing file:
```typescript
// RPG extensions on Challenge
export interface Challenge {
  // ... existing fields ...
  flavor_zh?: string
  is_boss: boolean
  xp_reward: number
}

export interface StoryChapter {
  chapter_id: number
  title_zh: string
  title_en: string
  intro_story: string[]
  outro_story: string[]
  boss_intro: string[]
  scene_image: string
  unlock_requires: number | null
}

export interface StoryData {
  chapters: StoryChapter[]
}

export interface UserProgress {
  challenges_completed: Record<string, {
    completed_at: string
    keystrokes: number
  }>
  level: number
  xp: number
  title: string
  skill_mastery: Record<string, number>
  achievements: string[]
  chapters_unlocked: number[]
  current_chapter: number
  streak_days: number
  last_practice_date: string
}
```

- [ ] **Step 2: Create rpg/constants.ts**

```typescript
export const XP_PER_LEVEL = 100
export const MAX_LEVEL = 12
export const XP_REGULAR = 15
export const XP_BOSS = 80
export const MASTERY_PER_CHALLENGE = 10
export const MASTERY_MAX = 100

export const TITLES: Array<{ minLevel: number; maxLevel: number; title: string; color: string }> = [
  { minLevel: 1, maxLevel: 2, title: '鍵道學徒', color: 'ctp-subtext0' },
  { minLevel: 3, maxLevel: 4, title: '見習劍客', color: 'ctp-green' },
  { minLevel: 5, maxLevel: 6, title: '終端行者', color: 'ctp-blue' },
  { minLevel: 7, maxLevel: 8, title: '指令術師', color: 'ctp-yellow' },
  { minLevel: 9, maxLevel: 10, title: '鍵道達人', color: 'ctp-mauve' },
  { minLevel: 11, maxLevel: 12, title: '鍵道宗師', color: 'ctp-red' },
]

export type SkillLineId = 'motion' | 'editing' | 'insert' | 'combo' | 'search' | 'repeat'

export const SKILL_LINES: Array<{ id: SkillLineId; name: string; color: string; tags: string[] }> = [
  { id: 'motion', name: '移動之術', color: 'ctp-blue',
    tags: ['h','j','k','l','w','W','b','B','e','E','0','^','$','f','F','t','T',';',',','gg','G'] },
  { id: 'editing', name: '編輯之力', color: 'ctp-green',
    tags: ['d','c','y','x','X','dd','cc','yy','D','C','Y','p','P'] },
  { id: 'insert', name: '插入之術', color: 'ctp-yellow',
    tags: ['i','I','a','A','o','O','s','S','R'] },
  { id: 'combo', name: '組合技', color: 'ctp-red', tags: [] },  // uses category === 'combo'
  { id: 'search', name: '搜尋之眼', color: 'ctp-teal',
    tags: ['/','n','N','*','#'] },
  { id: 'repeat', name: '重複之道', color: 'ctp-peach',
    tags: ['.','u','q','@'] },
]

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-clear', name: '初入鍵道', description: '完成第一道練習', icon: '🎋' },
  { id: 'dot-master', name: '重複之力', description: '完成所有 dot command 練習', icon: '🔄' },
  { id: 'one-shot', name: '一擊必殺', description: '用最少按鍵完成一道練習', icon: '⚡' },
  { id: 'streak-7', name: '連續修煉', description: '連續 7 天練習', icon: '🔥' },
  { id: 'chapter-clear', name: '全章通關', description: '完成任一章節所有練習', icon: '🏯' },
  { id: 'all-clear', name: '鍵道大成', description: '完成所有 69 道練習', icon: '🐉' },
]
```

- [ ] **Step 3: Verify compilation**

Run: `cd vimdao-web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add vimdao-web/src/rpg/constants.ts vimdao-web/src/types/index.ts
git commit -m "feat: add RPG constants, types, and skill line definitions"
```

---

### Task 4: RPG Progression Logic (TDD)

Pure functions for XP → level → title calculation.

**Files:**
- Create: `vimdao-web/src/rpg/progression.ts`
- Create: `vimdao-web/src/rpg/__tests__/progression.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateLevel, getTitle, getTitleColor, addXp } from '../progression'

describe('calculateLevel', () => {
  it('0 XP = level 1', () => expect(calculateLevel(0)).toBe(1))
  it('99 XP = level 1', () => expect(calculateLevel(99)).toBe(1))
  it('100 XP = level 2', () => expect(calculateLevel(100)).toBe(2))
  it('250 XP = level 3', () => expect(calculateLevel(250)).toBe(3))
  it('1200 XP = level 12 (max)', () => expect(calculateLevel(1200)).toBe(12))
  it('9999 XP = still level 12', () => expect(calculateLevel(9999)).toBe(12))
})

describe('getTitle', () => {
  it('level 1 = 鍵道學徒', () => expect(getTitle(1)).toBe('鍵道學徒'))
  it('level 5 = 終端行者', () => expect(getTitle(5)).toBe('終端行者'))
  it('level 12 = 鍵道宗師', () => expect(getTitle(12)).toBe('鍵道宗師'))
})

describe('addXp', () => {
  it('adds XP and recalculates level', () => {
    const result = addXp(0, 150)
    expect(result.xp).toBe(150)
    expect(result.level).toBe(2)
    expect(result.title).toBe('鍵道學徒')
  })
  it('levels up from 1 to 3', () => {
    const result = addXp(90, 120) // 90+120=210 → level 3
    expect(result.level).toBe(3)
    expect(result.title).toBe('見習劍客')
  })
  it('caps at max level', () => {
    const result = addXp(0, 99999)
    expect(result.level).toBe(12)
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Implement progression.ts**

```typescript
import { XP_PER_LEVEL, MAX_LEVEL, TITLES } from './constants'

export function calculateLevel(xp: number): number {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  return Math.min(level, MAX_LEVEL)
}

export function getTitle(level: number): string {
  const entry = TITLES.find(t => level >= t.minLevel && level <= t.maxLevel)
  return entry?.title ?? '鍵道學徒'
}

export function getTitleColor(level: number): string {
  const entry = TITLES.find(t => level >= t.minLevel && level <= t.maxLevel)
  return entry?.color ?? 'ctp-subtext0'
}

export function xpForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = calculateLevel(xp)
  if (level >= MAX_LEVEL) return { current: 0, needed: 0, progress: 1 }
  const currentLevelStart = (level - 1) * XP_PER_LEVEL
  const current = xp - currentLevelStart
  return { current, needed: XP_PER_LEVEL, progress: current / XP_PER_LEVEL }
}

export function addXp(currentXp: number, gained: number): { xp: number; level: number; title: string; leveledUp: boolean } {
  const oldLevel = calculateLevel(currentXp)
  const newXp = currentXp + gained
  const newLevel = calculateLevel(newXp)
  return {
    xp: newXp,
    level: newLevel,
    title: getTitle(newLevel),
    leveledUp: newLevel > oldLevel,
  }
}

// Chapter unlock: check if all challenges in a chapter are completed
export function checkChapterUnlock(
  completedIds: Set<string>,
  allChallenges: Array<{ id: string; source: { chapter: number } }>,
  currentUnlocked: number[],
): number | null {
  // Find chapters where ALL challenges are completed
  const byChapter = new Map<number, string[]>()
  for (const c of allChallenges) {
    const list = byChapter.get(c.source.chapter) ?? []
    list.push(c.id)
    byChapter.set(c.source.chapter, list)
  }

  // Find the highest fully-completed chapter
  const sortedChapters = [...byChapter.keys()].sort((a, b) => a - b)
  for (const ch of sortedChapters) {
    const ids = byChapter.get(ch)!
    const allDone = ids.every(id => completedIds.has(id))
    if (allDone) {
      // Find the next chapter in sequence
      const idx = sortedChapters.indexOf(ch)
      const nextCh = sortedChapters[idx + 1]
      if (nextCh !== undefined && !currentUnlocked.includes(nextCh)) {
        return nextCh // newly unlocked chapter
      }
    }
  }
  return null
}

// Streak tracking: call on each practice session
export function updateStreak(lastDate: string, currentDate: string, currentStreak: number): { streak: number; date: string } {
  if (lastDate === currentDate) {
    return { streak: currentStreak, date: currentDate } // same day, no change
  }
  // Check if lastDate was yesterday
  const last = new Date(lastDate)
  const curr = new Date(currentDate)
  const diffMs = curr.getTime() - last.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    return { streak: currentStreak + 1, date: currentDate }
  }
  return { streak: 1, date: currentDate } // streak broken, restart
}
```

Also add tests for chapter unlock and streak:

```typescript
describe('checkChapterUnlock', () => {
  const challenges = [
    { id: 'a', source: { chapter: 1 } },
    { id: 'b', source: { chapter: 1 } },
    { id: 'c', source: { chapter: 2 } },
  ]

  it('returns null when chapter not fully completed', () => {
    expect(checkChapterUnlock(new Set(['a']), challenges, [1])).toBeNull()
  })

  it('returns next chapter when current is fully completed', () => {
    expect(checkChapterUnlock(new Set(['a', 'b']), challenges, [1])).toBe(2)
  })

  it('returns null when next chapter already unlocked', () => {
    expect(checkChapterUnlock(new Set(['a', 'b']), challenges, [1, 2])).toBeNull()
  })
})

describe('updateStreak', () => {
  it('same day = no change', () => {
    expect(updateStreak('2026-03-25', '2026-03-25', 5)).toEqual({ streak: 5, date: '2026-03-25' })
  })
  it('next day = increment', () => {
    expect(updateStreak('2026-03-24', '2026-03-25', 5)).toEqual({ streak: 6, date: '2026-03-25' })
  })
  it('gap = reset to 1', () => {
    expect(updateStreak('2026-03-20', '2026-03-25', 5)).toEqual({ streak: 1, date: '2026-03-25' })
  })
  it('empty lastDate = start at 1', () => {
    expect(updateStreak('', '2026-03-25', 0)).toEqual({ streak: 1, date: '2026-03-25' })
  })
})
```

- [ ] **Step 4: Run tests — all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/rpg/progression.ts vimdao-web/src/rpg/__tests__/progression.test.ts
git commit -m "feat: add RPG progression logic (XP, level, title, chapter unlock, streak)"
```

---

### Task 5: Skill Mastery Logic (TDD)

Map challenge tags to skill lines, calculate mastery.

**Files:**
- Create: `vimdao-web/src/rpg/skill-mastery.ts`
- Create: `vimdao-web/src/rpg/__tests__/skill-mastery.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { getAffectedSkills, updateMastery, getMasteryLabel } from '../skill-mastery'

describe('getAffectedSkills', () => {
  it('motion tags map to motion skill', () => {
    expect(getAffectedSkills(['w', 'b'], 'other')).toContain('motion')
  })
  it('combo category maps to combo skill', () => {
    expect(getAffectedSkills(['d', 'w'], 'combo')).toContain('combo')
  })
  it('dot maps to repeat skill', () => {
    expect(getAffectedSkills(['.'], 'other')).toContain('repeat')
  })
  it('returns multiple skills for mixed tags', () => {
    const skills = getAffectedSkills(['d', 'w', '.'], 'combo')
    expect(skills).toContain('editing')
    expect(skills).toContain('motion')
    expect(skills).toContain('repeat')
    expect(skills).toContain('combo')
  })
})

describe('updateMastery', () => {
  it('adds 10 to affected skills', () => {
    const mastery = { motion: 0, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 }
    const updated = updateMastery(mastery, ['motion', 'editing'])
    expect(updated.motion).toBe(10)
    expect(updated.editing).toBe(10)
    expect(updated.insert).toBe(0)
  })
  it('caps at 100', () => {
    const mastery = { motion: 95, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 }
    const updated = updateMastery(mastery, ['motion'])
    expect(updated.motion).toBe(100)
  })
})

describe('getMasteryLabel', () => {
  it('0-33 = 初學', () => expect(getMasteryLabel(20)).toBe('初學'))
  it('34-66 = 進修中', () => expect(getMasteryLabel(50)).toBe('進修中'))
  it('67-100 = 熟練', () => expect(getMasteryLabel(80)).toBe('熟練'))
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Implement skill-mastery.ts**

- [ ] **Step 4: Run tests — all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/rpg/skill-mastery.ts vimdao-web/src/rpg/__tests__/skill-mastery.test.ts
git commit -m "feat: add skill mastery logic (tag mapping, level calculation)"
```

---

### Task 6: Achievement Logic (TDD)

Check conditions for unlocking achievements.

**Files:**
- Create: `vimdao-web/src/rpg/achievements.ts`
- Create: `vimdao-web/src/rpg/__tests__/achievements.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { checkAchievements } from '../achievements'
import type { UserProgress, Challenge } from '../../types'

const makeProgress = (overrides: Partial<UserProgress> = {}): UserProgress => ({
  challenges_completed: {},
  level: 1, xp: 0, title: '鍵道學徒',
  skill_mastery: {}, achievements: [],
  chapters_unlocked: [1], current_chapter: 1,
  streak_days: 0, last_practice_date: '',
  ...overrides,
})

describe('checkAchievements', () => {
  it('first-clear: completing any challenge', () => {
    const progress = makeProgress({ challenges_completed: { 'pv-tip01-001': { completed_at: '', keystrokes: 5 } } })
    const newAchievements = checkAchievements(progress, [], 69)
    expect(newAchievements).toContain('first-clear')
  })

  it('one-shot: keystrokes <= hint_commands.length', () => {
    const progress = makeProgress({
      challenges_completed: { 'pv-tip01-001': { completed_at: '', keystrokes: 2 } }
    })
    const challenges: Pick<Challenge, 'id' | 'hint_commands'>[] = [
      { id: 'pv-tip01-001', hint_commands: ['x', '.'] }
    ]
    const newAchievements = checkAchievements(progress, challenges, 69)
    expect(newAchievements).toContain('one-shot')
  })

  it('streak-7: 7 consecutive days', () => {
    const progress = makeProgress({ streak_days: 7 })
    const newAchievements = checkAchievements(progress, [], 69)
    expect(newAchievements).toContain('streak-7')
  })

  it('all-clear: all 69 completed', () => {
    const completed: Record<string, { completed_at: string; keystrokes: number }> = {}
    for (let i = 1; i <= 69; i++) {
      completed[`pv-tip${String(i).padStart(2,'0')}-001`] = { completed_at: '', keystrokes: 5 }
    }
    const progress = makeProgress({ challenges_completed: completed })
    const newAchievements = checkAchievements(progress, [], 69)
    expect(newAchievements).toContain('all-clear')
  })

  it('chapter-clear: all challenges in one chapter completed', () => {
    const challenges: Pick<Challenge, 'id' | 'hint_commands' | 'source'>[] = [
      { id: 'a', hint_commands: [], source: { book: 'pv', chapter: 1, section: '1.1', tip_number: 1 } },
      { id: 'b', hint_commands: [], source: { book: 'pv', chapter: 1, section: '1.2', tip_number: 2 } },
    ]
    const progress = makeProgress({
      challenges_completed: {
        'a': { completed_at: '', keystrokes: 5 },
        'b': { completed_at: '', keystrokes: 3 },
      },
    })
    const newAchievements = checkAchievements(progress, challenges, 69)
    expect(newAchievements).toContain('chapter-clear')
  })

  it('dot-master: all challenges with dot tag completed', () => {
    const challenges: Pick<Challenge, 'id' | 'hint_commands' | 'tags'>[] = [
      { id: 'a', hint_commands: [], tags: ['.', 'x'] },
      { id: 'b', hint_commands: [], tags: ['.', 'dd'] },
      { id: 'c', hint_commands: [], tags: ['w'] }, // no dot
    ]
    const progress = makeProgress({
      challenges_completed: {
        'a': { completed_at: '', keystrokes: 5 },
        'b': { completed_at: '', keystrokes: 3 },
      },
    })
    const newAchievements = checkAchievements(progress, challenges, 69)
    expect(newAchievements).toContain('dot-master')
  })

  it('does not return already-earned achievements', () => {
    const progress = makeProgress({
      challenges_completed: { 'pv-tip01-001': { completed_at: '', keystrokes: 5 } },
      achievements: ['first-clear'],
    })
    const newAchievements = checkAchievements(progress, [], 69)
    expect(newAchievements).not.toContain('first-clear')
  })
})
```

- [ ] **Step 2: Run — verify fails**

- [ ] **Step 3: Implement achievements.ts**

- [ ] **Step 4: Run tests — all pass**

- [ ] **Step 5: Commit**

```bash
git add vimdao-web/src/rpg/achievements.ts vimdao-web/src/rpg/__tests__/achievements.test.ts
git commit -m "feat: add achievement checking logic"
```

---

### Task 7: Progress Store (localStorage)

Read/write UserProgress to localStorage with migration for old data.

**Files:**
- Create: `vimdao-web/src/stores/progress-store.ts`
- Create: `vimdao-web/src/hooks/useProgress.ts`

- [ ] **Step 1: Implement progress-store.ts**

```typescript
import type { UserProgress } from '../types'

const STORAGE_KEY = 'vimdao-progress'

const DEFAULT_PROGRESS: UserProgress = {
  challenges_completed: {},
  level: 1, xp: 0, title: '鍵道學徒',
  skill_mastery: { motion: 0, editing: 0, insert: 0, combo: 0, search: 0, repeat: 0 },
  achievements: [],
  chapters_unlocked: [1],
  current_chapter: 1,
  streak_days: 0,
  last_practice_date: '',
}

export function loadProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const parsed = JSON.parse(raw) as Partial<UserProgress>
    // Migrate: fill missing RPG fields with defaults
    return { ...DEFAULT_PROGRESS, ...parsed }
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

export function saveProgress(progress: UserProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 2: Implement useProgress.ts hook**

```typescript
import { useState, useCallback } from 'react'
import { loadProgress, saveProgress } from '../stores/progress-store'
import type { UserProgress } from '../types'

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(loadProgress)

  const update = useCallback((updater: (prev: UserProgress) => UserProgress) => {
    setProgress(prev => {
      const next = updater(prev)
      saveProgress(next)
      return next
    })
  }, [])

  return { progress, update }
}
```

- [ ] **Step 3: Verify compilation**

- [ ] **Step 4: Commit**

```bash
git add vimdao-web/src/stores/ vimdao-web/src/hooks/useProgress.ts
git commit -m "feat: add progress store with localStorage persistence"
```

---

### Task 8: RPG UI Components

Character panel, story dialog, chapter map, boss frame, achievement toast.

**Files:**
- Create: `vimdao-web/src/components/RPG/CharacterPanel.tsx`
- Create: `vimdao-web/src/components/RPG/StoryDialog.tsx`
- Create: `vimdao-web/src/components/RPG/ChapterMap.tsx`
- Create: `vimdao-web/src/components/RPG/AchievementToast.tsx`
- Create: `vimdao-web/src/components/RPG/BossFrame.tsx`
- Create: `vimdao-web/src/styles/rpg-ui.css`

- [ ] **Step 1: Create rpg-ui.css**

Pixel-style borders, glow effects, XP bar gradients. All using Catppuccin colors from the `@theme` defined in `vim-editor.css`. Import this from `main.tsx`.

Key classes:
- `.boss-frame` — red glow border with box-shadow
- `.xp-bar` — gradient fill bar
- `.skill-bar` — slim progress bar
- `.pixel-border` — 2px solid retro-style border
- `.story-dialog` — dark background with left border accent
- `.achievement-toast` — slide-in animation from top-right

- [ ] **Step 2: Create CharacterPanel.tsx**

Shows: pixel character placeholder, level badge, title, XP bar with current/needed, 6 skill mastery bars. Uses `UserProgress` from `useProgress`. This is a sidebar/header component.

- [ ] **Step 3: Create StoryDialog.tsx**

Props: `paragraphs: string[]`, `onDismiss: () => void`. Renders paragraphs one at a time with a "繼續" button. Highlights `<span>` for Vim commands (ctp-blue) and concepts (ctp-green) in the text.

- [ ] **Step 4: Create ChapterMap.tsx**

Shows the 13 chapters in a vertical list. Each chapter card shows: RPG title, original title, challenge count, lock/unlock state, completion percentage. Locked chapters are dimmed. Clicking an unlocked chapter navigates to its first challenge.

- [ ] **Step 5: Create BossFrame.tsx**

Simple wrapper component. Props: `children`, `isBoss: boolean`. If `isBoss`, wraps children in a div with `.boss-frame` class (red glow border). Otherwise renders children directly.

- [ ] **Step 6: Create AchievementToast.tsx**

Props: `achievement: AchievementDef | null`, `onDismiss: () => void`. Shows a toast notification in the top-right with the achievement icon, name, and description. Auto-dismisses after 3 seconds.

- [ ] **Step 7: Verify compilation**

Run: `cd vimdao-web && npx tsc --noEmit && npm run build`

- [ ] **Step 8: Commit**

```bash
git add vimdao-web/src/components/RPG/ vimdao-web/src/styles/rpg-ui.css vimdao-web/src/main.tsx
git commit -m "feat: add RPG UI components (character panel, story, chapter map, boss frame)"
```

---

### Task 9: Integration — Wire RPG into Existing Pages

Connect RPG progression to ChallengeView (XP award on completion, boss frame) and replace ChallengeList with chapter-based navigation.

**Files:**
- Modify: `vimdao-web/src/components/Challenge/ChallengeView.tsx`
- Modify: `vimdao-web/src/components/Challenge/ChallengeList.tsx`
- Modify: `vimdao-web/src/App.tsx`
- Create: `vimdao-web/src/components/Layout/Navbar.tsx`

- [ ] **Step 1: Create Navbar.tsx**

Top navigation bar showing: "VimDao 鍵道" logo/title, character level + title badge (from useProgress), nav links (修練路徑, 自由練習).

- [ ] **Step 2: Update App.tsx**

Add routes:
- `/` → ChapterMap (RPG story progression)
- `/practice` → ChallengeList (free practice, no chapter lock)
- `/challenge/:id` → ChallengeView
- Wrap with Navbar

- [ ] **Step 3: Update ChallengeView.tsx**

On challenge completion (pass):
1. Call `addXp(progress.xp, challenge.xp_reward)` to get new XP/level
2. Update `skill_mastery` via `updateMastery()` with challenge tags
3. Update `challenges_completed` record
4. Check achievements via `checkAchievements()`
5. If new achievements, show `AchievementToast`
6. If `leveledUp`, show level-up text
7. Save progress
8. If BOSS challenge, show story outro

Add `BossFrame` wrapper around VimEditor when `challenge.is_boss`.

Show `flavor_zh` text above the editor when available.

If challenge is a BOSS and not yet started, show `StoryDialog` with `boss_intro` first.

- [ ] **Step 4: Update ChallengeList.tsx**

Transform into a free-practice view: keep the grid of all 69 challenges, but add the difficulty/category filters. This is the `/practice` route — no chapter locking.

- [ ] **Step 5: Verify everything works end-to-end**

```bash
cd vimdao-web && npx tsc --noEmit && npm run test:run && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add vimdao-web/src/
git commit -m "feat: integrate RPG system into challenge flow and navigation"
```

---

## Execution Dependencies

```
Task 1 (Go generator) ──→ Task 2 (story.json) ──┐
                                                  │
Task 3 (constants/types) ──→ Task 4 (progression) ──→ Task 7 (store) ──→ Task 9 (integration)
                         ──→ Task 5 (skill mastery) ─┘                    ↑
                         ──→ Task 6 (achievements) ──┘                    │
                                                                          │
                              Task 8 (RPG UI components) ─────────────────┘
```

Tasks 1-2 (Go side) are independent of Tasks 3-6 (TypeScript logic). Tasks 4, 5, 6 can run in parallel after Task 3. Task 7 requires 4-6. Task 8 can run in parallel with 4-7. Task 9 requires everything.
