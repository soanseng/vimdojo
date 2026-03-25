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
  { id: 'combo', name: '組合技', color: 'ctp-red', tags: [] },
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
