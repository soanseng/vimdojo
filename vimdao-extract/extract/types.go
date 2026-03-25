package extract

// Chapter represents a parsed chapter from the book.
type Chapter struct {
	ChapterID     int       `json:"chapter_id"`
	Title         string    `json:"title"`
	Sections      []Section `json:"sections"`
	HasVimContent bool      `json:"has_vim_content"`
}

// Section represents a tip or sub-section within a chapter.
type Section struct {
	SectionID   string      `json:"section_id"`
	TipNumber   int         `json:"tip_number,omitempty"`
	Title       string      `json:"title"`
	RawText     string      `json:"raw_text"`
	CodeBlocks  []CodeBlock `json:"code_blocks,omitempty"`
	VimCommands []string    `json:"vim_commands,omitempty"`
	WordCount   int         `json:"word_count"`
}

// CodeBlock represents a before/after editing example from the book.
type CodeBlock struct {
	Before      string `json:"before,omitempty"`
	After       string `json:"after,omitempty"`
	Keystrokes  string `json:"keystrokes,omitempty"`
	Description string `json:"description,omitempty"`
}

// KeystrokeStep is one row of a keystroke/buffer table.
type KeystrokeStep struct {
	Keystroke     string
	BufferContent string // text content of the buffer at this step
}

// ExtractedBook is the top-level extraction result.
type ExtractedBook struct {
	BookTitle     string    `json:"book_title"`
	Author        string    `json:"author"`
	TotalChapters int       `json:"total_chapters"`
	ExtractedAt   string    `json:"extracted_at"`
	Chapters      []Chapter `json:"chapters"`
}
