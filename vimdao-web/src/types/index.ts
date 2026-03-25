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
}

export interface ChallengeSet {
  source_book: string
  generated_at: string
  challenges: Challenge[]
}
