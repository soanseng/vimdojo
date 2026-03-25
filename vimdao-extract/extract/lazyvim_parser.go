package extract

import (
	"regexp"
	"strings"

	"golang.org/x/net/html"
)

// ParsedLazyVimPage holds all structured content extracted from a LazyVim chapter page.
type ParsedLazyVimPage struct {
	ChapterNum  int
	ChapterTitle string
	Sections    []parsedLVSection
}

type parsedLVSection struct {
	ID          string
	Title       string
	BodyText    string
	Principals  []principalEntry   // <span class="principal"> items
	Admonitions []admonitionEntry  // <aside class="admonition"> items
	InlineCodes []string           // all <code class="literal"> values
}

type principalEntry struct {
	FullText string   // the full text of the principal span
	Codes    []string // <code class="literal"> values within this span
}

type admonitionEntry struct {
	Type string // "tip", "note", "warning"
	Text string
}

var (
	// Patterns for identifying Neovim/LazyVim-specific keybindings
	reLeaderKey   = regexp.MustCompile(`^<Space>`)
	reBracketJump = regexp.MustCompile(`^[\[\]][a-zA-Z%({]$`)
	reGPrefix     = regexp.MustCompile(`^g[a-zA-Z~]`)
	reSurround    = regexp.MustCompile(`^gs[adrfFhSA]`)
	reControlKey  = regexp.MustCompile(`(?i)^(Control|Ctrl)[+-]`)
	reAltKey      = regexp.MustCompile(`(?i)^Alt[+-]`)
	reShiftKey    = regexp.MustCompile(`(?i)^Shift[+-]`)

	// Known LazyVim plugin commands
	surroundCmds = map[string]bool{
		"gsa": true, "gsd": true, "gsr": true, "gsf": true, "gsF": true, "gsh": true,
	}
	commentCmds = map[string]bool{
		"gc": true, "gcc": true, "gco": true, "gcO": true, "gcA": true,
	}
)

// ParseLazyVimChapter extracts structured content from a LazyVim chapter XHTML.
func ParseLazyVimChapter(xhtmlBytes []byte) (*ParsedLazyVimPage, error) {
	doc, err := html.Parse(strings.NewReader(string(xhtmlBytes)))
	if err != nil {
		return nil, err
	}

	page := &ParsedLazyVimPage{}

	// Find the <section class="chapter"> node
	var findChapter func(*html.Node)
	findChapter = func(n *html.Node) {
		if n.Type == html.ElementNode && isLazyVimChapter(n) {
			page.ChapterNum, page.ChapterTitle = parseLazyVimChapter(n)
			page.Sections = parseLVSections(n)
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findChapter(c)
		}
	}
	findChapter(doc)

	return page, nil
}

// parseLVSections extracts all sect2 subsections from a chapter node.
func parseLVSections(chapterNode *html.Node) []parsedLVSection {
	var sections []parsedLVSection

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "section" && hasClass(n, "sect2") {
			sec := parseLVSubSection(n)
			sections = append(sections, sec)
			return // don't recurse into nested sections
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(chapterNode)

	return sections
}

func parseLVSubSection(n *html.Node) parsedLVSection {
	sec := parsedLVSection{}

	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if node.Type == html.ElementNode {
			switch {
			case node.Data == "h2":
				sec.Title = strings.TrimSpace(extractText(node))
				for _, attr := range node.Attr {
					if attr.Key == "id" {
						sec.ID = attr.Val
					}
				}

			case node.Data == "span" && hasClass(node, "principal"):
				pe := parsePrincipal(node)
				sec.Principals = append(sec.Principals, pe)

			case node.Data == "aside" && hasClass(node, "admonition"):
				ae := parseAdmonition(node)
				sec.Admonitions = append(sec.Admonitions, ae)

			case node.Data == "code" && hasClass(node, "literal"):
				code := strings.TrimSpace(extractText(node))
				if code != "" {
					sec.InlineCodes = append(sec.InlineCodes, code)
				}

			case node.Data == "p":
				text := strings.TrimSpace(extractText(node))
				if text != "" {
					if sec.BodyText != "" {
						sec.BodyText += "\n"
					}
					sec.BodyText += text
				}
			}
		}

		for c := node.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)

	return sec
}

// parsePrincipal extracts a <span class="principal"> entry with its inline codes.
func parsePrincipal(n *html.Node) principalEntry {
	pe := principalEntry{
		FullText: strings.TrimSpace(extractText(n)),
	}

	// Collect all <code class="literal"> within this span
	var findCodes func(*html.Node)
	findCodes = func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == "code" && hasClass(node, "literal") {
			code := strings.TrimSpace(extractText(node))
			if code != "" {
				pe.Codes = append(pe.Codes, code)
			}
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			findCodes(c)
		}
	}
	findCodes(n)

	return pe
}

// parseAdmonition extracts an <aside class="admonition"> block.
func parseAdmonition(n *html.Node) admonitionEntry {
	ae := admonitionEntry{Type: "note"}

	// Determine type from the class or title attribute
	for _, attr := range n.Attr {
		if attr.Key == "class" {
			classes := strings.Fields(attr.Val)
			for _, c := range classes {
				switch c {
				case "tip":
					ae.Type = "tip"
				case "note":
					ae.Type = "note"
				case "warning":
					ae.Type = "warning"
				case "important":
					ae.Type = "important"
				}
			}
		}
	}

	// Extract text from the content div inside
	var findContent func(*html.Node)
	findContent = func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == "div" && hasClass(node, "content") {
			ae.Text = strings.TrimSpace(extractText(node))
			return
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			findContent(c)
		}
	}
	findContent(n)

	// Fallback: if no content div found, get all text
	if ae.Text == "" {
		ae.Text = strings.TrimSpace(extractText(n))
	}

	return ae
}

// ClassifyKeybinding determines the category and requirement level of a keybinding.
func ClassifyKeybinding(keys string) (category, requires, plugin string) {
	// Leader key (<Space> prefix) — LazyVim specific
	if reLeaderKey.MatchString(keys) {
		return CatLeaderKey, "lazyvim", ""
	}

	// Surround commands (gsa, gsd, gsr, etc.) — mini.surround or nvim-surround
	for cmd := range surroundCmds {
		if strings.HasPrefix(keys, cmd) {
			return CatSurround, "lazyvim", "mini.surround"
		}
	}

	// Comment commands (gc, gcc, etc.) — Comment.nvim or mini.comment
	for cmd := range commentCmds {
		if keys == cmd || strings.HasPrefix(keys, cmd) {
			return CatComment, "neovim", "Comment.nvim"
		}
	}

	// Bracket jumps ([x / ]x) — unimpaired style, mostly LazyVim
	if reBracketJump.MatchString(keys) {
		return CatBracketJump, "lazyvim", ""
	}

	// g-prefix (gq, gw, gJ, etc.) — some are Vim, some are Neovim
	if reGPrefix.MatchString(keys) {
		// gq, gw, gJ, gu, gU, g~ are core Vim
		if isVimGCommand(keys) {
			return CatGPrefix, "vim", ""
		}
		return CatGPrefix, "neovim", ""
	}

	// Control/Alt/Shift combos
	if reControlKey.MatchString(keys) {
		return CatNeovimBuiltin, classifyControlKey(keys), ""
	}
	if reAltKey.MatchString(keys) {
		return CatNeovimBuiltin, "neovim", ""
	}
	if reShiftKey.MatchString(keys) {
		return CatVimCore, "vim", ""
	}

	// Default: classify by whether it looks like standard Vim
	return CatVimCore, "vim", ""
}

func isVimGCommand(keys string) bool {
	vimG := map[string]bool{
		"gq": true, "gw": true, "gJ": true, "gu": true, "gU": true, "g~": true,
		"ge": true, "gE": true, "gg": true, "gi": true, "gv": true, "gn": true,
		"gf": true,
	}
	// Check the first 2 chars
	if len(keys) >= 2 {
		return vimG[keys[:2]]
	}
	return false
}

func classifyControlKey(keys string) string {
	// Core Vim control keys
	vimCtrl := map[string]bool{
		"Control-r": true, "Control-R": true,
		"Control-a": true, "Control-x": true,
		"Control-o": true, "Control-i": true,
		"Control-f": true, "Control-b": true,
		"Control-d": true, "Control-u": true,
		"Control-e": true, "Control-y": true,
		"Control-v": true, "Control-V": true,
		"Control-c": true, "Control-C": true,
		"Control-n": true, "Control-p": true,
		"Control-t": true,
		"Control-]": true,
	}
	if vimCtrl[keys] {
		return "vim"
	}
	return "neovim"
}

// ExtractCommandFromPrincipal tries to extract a command and its explanation
// from a principal entry. Returns empty strings if no clear command found.
func ExtractCommandFromPrincipal(pe principalEntry) (command, explanation string) {
	if len(pe.Codes) == 0 {
		return "", ""
	}

	// The first <code> in a principal span is typically the command
	command = pe.Codes[0]

	// The explanation is the full text with the command removed
	explanation = pe.FullText

	// Clean up: remove the command from the beginning if it starts there
	explanation = strings.TrimSpace(explanation)
	if strings.HasPrefix(explanation, command) {
		explanation = strings.TrimSpace(explanation[len(command):])
	}
	// Remove leading "to " or "will " or "—" or ":"
	for _, prefix := range []string{"to ", "will ", "— ", ": ", "- "} {
		if strings.HasPrefix(strings.ToLower(explanation), prefix) {
			explanation = strings.TrimSpace(explanation[len(prefix):])
			break
		}
	}

	return command, explanation
}

// IsKeybinding checks if an inline code value looks like a keybinding
// (as opposed to a variable name, file path, or English word).
func IsKeybinding(code string) bool {
	if code == "" {
		return false
	}

	// Definitely keybindings
	if reLeaderKey.MatchString(code) || reBracketJump.MatchString(code) ||
		reSurround.MatchString(code) || reControlKey.MatchString(code) ||
		reAltKey.MatchString(code) {
		return true
	}

	// g-prefix commands (but reject English words starting with g)
	if reGPrefix.MatchString(code) && len(code) <= 8 {
		gRejects := map[string]bool{
			"git": true, "go": true, "get": true, "got": true,
			"give": true, "given": true, "glob": true, "glib": true,
			"green": true, "grep": true, "gui": true, "good": true,
			"graphite": true, "gsub": true,
		}
		if gRejects[strings.ToLower(code)] {
			return false
		}
		if strings.Contains(code, "_") {
			return false
		}
		// Real g-prefix commands are short (gc, gs, gUU, gqag)
		// or mixed case. Reject all-lowercase > 3 chars.
		if len(code) > 3 && code == strings.ToLower(code) {
			return false
		}
		return true
	}

	// Reject file paths, plugin names, config keys early
	if strings.Contains(code, "/") && !strings.HasPrefix(code, ":") && !strings.HasPrefix(code, "/") {
		return false
	}
	if strings.Contains(code, ".") && !strings.HasPrefix(code, ".") {
		return false
	}
	if strings.Contains(code, "_") || strings.Contains(code, "=") {
		return false
	}
	// Reject lowercase words > 4 chars (likely English/config, not commands)
	if len(code) > 4 && code == strings.ToLower(code) && !strings.HasPrefix(code, ":") {
		return false
	}

	// Short sequences that look like Vim commands
	if len(code) <= 4 {
		// Reject common English words
		rejectWords := map[string]bool{
			"a": true, "an": true, "the": true, "is": true, "it": true,
			"in": true, "on": true, "of": true, "to": true, "or": true,
			"if": true, "so": true, "no": true, "up": true, "go": true,
			"do": true, "be": true, "by": true, "at": true, "as": true,
			"we": true, "he": true, "me": true, "my": true, "us": true,
			"am": true, "re": true, "ed": true, "ex": true, "vi": true,
		}
		lower := strings.ToLower(code)
		if rejectWords[lower] {
			return false
		}
		// Single chars that are Vim commands
		if len(code) == 1 {
			return isVimCommandChar(code[0])
		}
		return true
	}

	// :ex commands
	if strings.HasPrefix(code, ":") && len(code) <= 50 {
		return true
	}

	// Longer: check for Vim-like patterns (d3w, ci{, etc.)
	if len(code) <= 8 && isVimCommandSequence(code) {
		return true
	}

	return false
}

func isVimCommandChar(c byte) bool {
	cmds := "hjklwWeEbB0^$GfFtT;,{}()HMLnN*#%dcy><.@quUpPxXrJoOiIaAsScCRvV~qQYDZ"
	return strings.ContainsRune(cmds, rune(c))
}

func isVimCommandSequence(s string) bool {
	if len(s) == 0 {
		return false
	}
	// Starts with a known verb/motion/operator
	first := s[0]
	operators := "dcy><="
	if strings.ContainsRune(operators, rune(first)) {
		return true
	}
	// Starts with a count
	if first >= '1' && first <= '9' {
		return true
	}
	// Starts with known command chars
	return isVimCommandChar(first)
}
