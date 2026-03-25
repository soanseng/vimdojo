export interface Challenge {
  id: string
  source: {
    book: string
    chapter: number
    section: string
    tip_number: number
  }
  title_zh: string
  title_en: string
  description_zh: string
  description_en: string
  category: string
  difficulty: number
  initial_text: string
  expected_text: string
  cursor_start: { line: number; col: number }
  hint_commands: string[]
  hint_text: string
  tags: string[]
  concepts_zh: string[]
  needs_translation?: boolean
  flavor_zh?: string
  is_boss: boolean
  xp_reward: number
}

export interface ChallengeSet {
  source_book: string
  generated_at: string
  challenges: Challenge[]
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
