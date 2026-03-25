package challenge

// ChallengeSet is the top-level output for generated challenges.
type ChallengeSet struct {
	SourceBook  string      `json:"source_book"`
	GeneratedAt string      `json:"generated_at"`
	Challenges  []Challenge `json:"challenges"`
}

// Challenge is a single practice exercise generated from a code block.
type Challenge struct {
	ID           string          `json:"id"`
	Source       ChallengeSource `json:"source"`
	TitleZh      string          `json:"title_zh"`
	TitleEn      string          `json:"title_en"`
	DescZh       string          `json:"description_zh"`
	DescEn       string          `json:"description_en"`
	Category     string          `json:"category"`
	Difficulty   int             `json:"difficulty"`
	InitialText  string          `json:"initial_text"`
	ExpectedText string          `json:"expected_text"`
	CursorStart  CursorPos       `json:"cursor_start"`
	HintCommands []string        `json:"hint_commands"`
	HintText     string          `json:"hint_text"`
	Tags         []string        `json:"tags"`
	ConceptsZh   []string        `json:"concepts_zh"`
	NeedsTranslation bool        `json:"needs_translation,omitempty"`
	FlavorZh  string `json:"flavor_zh,omitempty"`
	IsBoss    bool   `json:"is_boss"`
	XpReward  int    `json:"xp_reward"`
}

// ChallengeSource tracks where this challenge came from.
type ChallengeSource struct {
	Book      string `json:"book"`
	Chapter   int    `json:"chapter"`
	Section   string `json:"section"`
	TipNumber int    `json:"tip_number"`
}

// CursorPos is a line/column position.
type CursorPos struct {
	Line int `json:"line"`
	Col  int `json:"col"`
}

// ReferenceSet is the top-level output for Neovim/LazyVim reference cards.
type ReferenceSet struct {
	SourceBook  string          `json:"source_book"`
	GeneratedAt string          `json:"generated_at"`
	Cards       []ReferenceCard `json:"cards"`
}

// ReferenceCard is a keybinding reference card (not a practice exercise).
type ReferenceCard struct {
	ID               string `json:"id"`
	Keys             string `json:"keys"`
	TitleZh          string `json:"title_zh"`
	TitleEn          string `json:"title_en"`
	DescZh           string `json:"description_zh"`
	DescEn           string `json:"description_en"`
	Category         string `json:"category"`
	Requires         string `json:"requires"`
	Plugin           string `json:"plugin,omitempty"`
	Chapter          int    `json:"chapter"`
	NeedsTranslation bool   `json:"needs_translation,omitempty"`
}
