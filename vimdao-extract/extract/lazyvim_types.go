package extract

// LazyVimBook is the top-level extraction result for the LazyVim book.
// It uses a different schema from Practical Vim — focused on keybinding
// reference and command catalog rather than before/after exercises.
type LazyVimBook struct {
	BookTitle   string             `json:"book_title"`
	Author      string             `json:"author"`
	ExtractedAt string             `json:"extracted_at"`
	Chapters    []LazyVimChapter   `json:"chapters"`
	Keybindings []Keybinding       `json:"keybindings"`
	Tips        []Tip              `json:"tips"`
}

// LazyVimChapter is a chapter with its sections and extracted content.
type LazyVimChapter struct {
	ChapterID     int              `json:"chapter_id"`
	Title         string           `json:"title"`
	Sections      []LazyVimSection `json:"sections"`
	HasVimContent bool             `json:"has_vim_content"`
}

// LazyVimSection is a section within a chapter.
type LazyVimSection struct {
	SectionID   string              `json:"section_id"`
	Title       string              `json:"title"`
	RawText     string              `json:"raw_text"`
	WordCount   int                 `json:"word_count"`
	Commands    []CommandExplanation `json:"commands,omitempty"`
	Keybindings []Keybinding        `json:"keybindings,omitempty"`
	Tips        []Tip               `json:"tips,omitempty"`
}

// Keybinding represents a keybinding from LazyVim/Neovim.
type Keybinding struct {
	Keys          string `json:"keys"`
	DescriptionEn string `json:"description_en"`
	Category      string `json:"category"`
	Plugin        string `json:"plugin,omitempty"`
	Chapter       int    `json:"chapter"`
	SectionID     string `json:"section_id,omitempty"`
	Requires      string `json:"requires"` // "vim", "neovim", or "lazyvim"
}

// CommandExplanation is a command with its prose explanation, extracted
// from <span class="principal"> elements in the LazyVim book.
type CommandExplanation struct {
	Command       string `json:"command"`
	ExplanationEn string `json:"explanation_en"`
	Chapter       int    `json:"chapter"`
	SectionID     string `json:"section_id,omitempty"`
	Requires      string `json:"requires"` // "vim", "neovim", or "lazyvim"
}

// Tip is a practical tip or note from an <aside class="admonition"> block.
type Tip struct {
	Text      string `json:"text"`
	TipType   string `json:"type"` // "tip", "note", "warning"
	Chapter   int    `json:"chapter"`
	SectionID string `json:"section_id,omitempty"`
}

// Keybinding categories for Neovim/LazyVim-specific features.
const (
	CatVimCore       = "vim-core"        // standard Vim commands
	CatNeovimBuiltin = "neovim-builtin"  // Neovim-only builtins (LSP, treesitter, etc.)
	CatLazyVimPlugin = "lazyvim-plugin"  // LazyVim plugin keybindings
	CatGPrefix       = "g-prefix"        // g-prefix commands (gc, gs, gq, etc.)
	CatBracketJump   = "bracket-jump"    // [x / ]x unimpaired-style jumps
	CatLeaderKey     = "leader-key"      // <Space> leader keybindings
	CatSurround      = "surround"        // gsa, gsd, gsr surround operations
	CatComment       = "comment"         // gc, gcc comment operations
	CatTextObject    = "text-object-ext" // extended text objects (treesitter-based)
)
