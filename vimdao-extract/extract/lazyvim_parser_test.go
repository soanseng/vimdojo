package extract

import (
	"testing"
)

func TestIsKeybinding(t *testing.T) {
	tests := []struct {
		code string
		want bool
	}{
		// Definitely keybindings
		{"<Space>ff", true},
		{"<Space>/", true},
		{"[c", true},
		{"]d", true},
		{"gsa", true},
		{"gsd", true},
		{"gsr\"'", true},
		{"Control-r", true},
		{"Alt-s", true},
		{"gc", true},
		{"gcc", true},
		{"gq", true},
		{"gU", true},
		{"gg", true},
		{"dd", true},
		{"dw", true},
		{"ci{", true},
		{"d3w", true},
		{":w", true},
		{":%s/foo/bar/g", true},
		{":help", true},

		// Single Vim command chars
		{"d", true},
		{"w", true},
		{"j", true},
		{"x", true},
		{".", true},

		// Should reject — English words
		{"the", false},
		{"is", false},
		{"it", false},
		{"in", false},
		{"go", false},
		{"as", false},
		{"if", false},
		{"vi", false},
		{"ex", false},
		{"ed", false},

		// Should reject — file paths, plugin names, config
		{"config/plugins", false},
		{".config/nvim/lua", false},
		{"text-case.nvim", false},
		{"vim.opt.ignorecase", false},
		{"lazy = false", false},
		{"options.lua", false},
		{"extend-mini-surround.lua", false},

		// Should reject — English words starting with g
		{"git", false},
		{"green", false},
		{"glib", false},
		{"graphite", false},
		{"gsub", false},
		{"go_in", false},
		{"go_out", false},

		// Should reject — long lowercase words
		{"hello", false},
		{"command", false},
		{"pattern", false},
		{"inside", false},
		{"around", false},
		{"replace", false},

		// Edge cases
		{"", false},
		{"q", true},
		{"Q", true},
	}

	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			got := IsKeybinding(tt.code)
			if got != tt.want {
				t.Errorf("IsKeybinding(%q) = %v, want %v", tt.code, got, tt.want)
			}
		})
	}
}

func TestClassifyKeybinding(t *testing.T) {
	tests := []struct {
		keys        string
		wantCat     string
		wantReq     string
	}{
		// Leader keys
		{"<Space>ff", CatLeaderKey, "lazyvim"},
		{"<Space>/", CatLeaderKey, "lazyvim"},
		{"<Space>sr", CatLeaderKey, "lazyvim"},

		// Surround
		{"gsa", CatSurround, "lazyvim"},
		{"gsd", CatSurround, "lazyvim"},
		{"gsr", CatSurround, "lazyvim"},

		// Comment
		{"gc", CatComment, "neovim"},
		{"gcc", CatComment, "neovim"},

		// Bracket jumps
		{"[c", CatBracketJump, "lazyvim"},
		{"]d", CatBracketJump, "lazyvim"},
		{"[m", CatBracketJump, "lazyvim"},

		// g-prefix vim
		{"gq", CatGPrefix, "vim"},
		{"gw", CatGPrefix, "vim"},
		{"gJ", CatGPrefix, "vim"},
		{"gu", CatGPrefix, "vim"},
		{"gU", CatGPrefix, "vim"},

		// g-prefix neovim
		{"gs", CatGPrefix, "neovim"},
		{"gt", CatGPrefix, "neovim"},
		{"gd", CatGPrefix, "neovim"},

		// Control keys — vim
		{"Control-r", CatNeovimBuiltin, "vim"},
		{"Control-o", CatNeovimBuiltin, "vim"},
		{"Control-v", CatNeovimBuiltin, "vim"},

		// Control keys — neovim
		{"Control-Enter", CatNeovimBuiltin, "neovim"},

		// Alt — neovim
		{"Alt-s", CatNeovimBuiltin, "neovim"},

		// Shift — vim
		{"Shift-G", CatVimCore, "vim"},

		// Plain vim
		{"dd", CatVimCore, "vim"},
	}

	for _, tt := range tests {
		t.Run(tt.keys, func(t *testing.T) {
			cat, req, _ := ClassifyKeybinding(tt.keys)
			if cat != tt.wantCat {
				t.Errorf("category: got %q, want %q", cat, tt.wantCat)
			}
			if req != tt.wantReq {
				t.Errorf("requires: got %q, want %q", req, tt.wantReq)
			}
		})
	}
}

func TestExtractCommandFromPrincipal(t *testing.T) {
	tests := []struct {
		name       string
		pe         principalEntry
		wantCmd    string
		wantExpl   string
	}{
		{
			name: "simple delete command",
			pe: principalEntry{
				FullText: "dh to delete the character to the left of the cursor.",
				Codes:    []string{"dh"},
			},
			wantCmd:  "dh",
			wantExpl: "delete the character to the left of the cursor.",
		},
		{
			name: "command with will prefix",
			pe: principalEntry{
				FullText: "d3w will delete three words.",
				Codes:    []string{"d3w"},
			},
			wantCmd:  "d3w",
			wantExpl: "delete three words.",
		},
		{
			name: "no codes",
			pe: principalEntry{
				FullText: "just some text",
				Codes:    nil,
			},
			wantCmd:  "",
			wantExpl: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd, expl := ExtractCommandFromPrincipal(tt.pe)
			if cmd != tt.wantCmd {
				t.Errorf("command: got %q, want %q", cmd, tt.wantCmd)
			}
			if expl != tt.wantExpl {
				t.Errorf("explanation: got %q, want %q", expl, tt.wantExpl)
			}
		})
	}
}

func TestParsePrincipal(t *testing.T) {
	xhtml := []byte(`<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml">
<body>
<section class="chapter">
<header><div class="chapter-header">
<h1 class="chapter-title"><small class="subtitle">6. Basic Editing</small></h1>
</div></header>
<section class="sect2">
<h2 id="_delete">6.1. Delete</h2>
<ul><li>
<span class="principal"><code class="literal">dh</code> to delete the character to the left.</span>
</li><li>
<span class="principal"><code class="literal">d3w</code> to delete three words.</span>
</li></ul>
<aside class="admonition tip" title="Tip" epub:type="tip">
<div class="content"><p>This is a helpful tip about deleting.</p></div>
</aside>
<p>Some body text about deletion.</p>
</section>
</section>
</body></html>`)

	page, err := ParseLazyVimChapter(xhtml)
	if err != nil {
		t.Fatal(err)
	}

	if page.ChapterNum != 6 {
		t.Errorf("chapter num: got %d, want 6", page.ChapterNum)
	}
	if page.ChapterTitle != "Basic Editing" {
		t.Errorf("title: got %q", page.ChapterTitle)
	}
	if len(page.Sections) != 1 {
		t.Fatalf("sections: got %d, want 1", len(page.Sections))
	}

	sec := page.Sections[0]
	if sec.Title != "6.1. Delete" {
		t.Errorf("section title: got %q", sec.Title)
	}
	if len(sec.Principals) != 2 {
		t.Errorf("principals: got %d, want 2", len(sec.Principals))
	}
	if len(sec.Principals) >= 2 {
		if sec.Principals[0].Codes[0] != "dh" {
			t.Errorf("first principal code: got %q", sec.Principals[0].Codes[0])
		}
		if sec.Principals[1].Codes[0] != "d3w" {
			t.Errorf("second principal code: got %q", sec.Principals[1].Codes[0])
		}
	}
	if len(sec.Admonitions) != 1 {
		t.Fatalf("admonitions: got %d, want 1", len(sec.Admonitions))
	}
	if sec.Admonitions[0].Type != "tip" {
		t.Errorf("admonition type: got %q", sec.Admonitions[0].Type)
	}
	if sec.Admonitions[0].Text != "This is a helpful tip about deleting." {
		t.Errorf("admonition text: got %q", sec.Admonitions[0].Text)
	}
}

func TestExtractLazyVimBookIntegration(t *testing.T) {
	book := loadLazyVimBook(t)

	result, err := ExtractLazyVimBook(book)
	if err != nil {
		t.Fatal(err)
	}

	t.Logf("Chapters: %d", len(result.Chapters))
	t.Logf("Keybindings: %d", len(result.Keybindings))
	t.Logf("Tips: %d", len(result.Tips))

	if len(result.Chapters) < 15 {
		t.Errorf("expected at least 15 chapters, got %d", len(result.Chapters))
	}
	if len(result.Keybindings) < 200 {
		t.Errorf("expected at least 200 keybindings, got %d", len(result.Keybindings))
	}
	if len(result.Tips) < 30 {
		t.Errorf("expected at least 30 tips, got %d", len(result.Tips))
	}

	// Verify no obvious false positives
	falsePositives := []string{"git", "green", "glib", "graphite", "gsub"}
	for _, kb := range result.Keybindings {
		for _, fp := range falsePositives {
			if kb.Keys == fp {
				t.Errorf("false positive keybinding: %q", fp)
			}
		}
	}

	// Check category distribution
	cats := make(map[string]int)
	for _, kb := range result.Keybindings {
		cats[kb.Category]++
	}
	t.Logf("Categories: %v", cats)

	if cats[CatLeaderKey] < 50 {
		t.Errorf("expected at least 50 leader key bindings, got %d", cats[CatLeaderKey])
	}
	if cats[CatBracketJump] < 20 {
		t.Errorf("expected at least 20 bracket jumps, got %d", cats[CatBracketJump])
	}
}
