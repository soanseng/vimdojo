import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PluginInfo, PluginData } from '../../types'

type TabId = 'vim' | 'neovim' | 'lazyvim' | 'plugins'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'vim', label: 'Vim 基礎' },
  { id: 'neovim', label: 'Neovim' },
  { id: 'lazyvim', label: 'LazyVim' },
  { id: 'plugins', label: '熱門 Plugin' },
]

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-ctp-mantle text-ctp-green rounded p-3 font-mono text-sm overflow-x-auto my-2">
      <code>{children}</code>
    </pre>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ctp-blue hover:underline"
    >
      {children}
    </a>
  )
}

function VimTab() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">什麼是 Vim？</h2>
        <p className="text-sm text-ctp-subtext0 leading-relaxed">
          Vim 是一款強大的終端文字編輯器，以「模式編輯」聞名。透過不同模式（Normal、Insert、Visual）的切換，你可以用最少的按鍵完成複雜的文字操作。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">安裝</h2>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">macOS</h3>
        <CodeBlock>brew install vim</CodeBlock>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">Linux (Ubuntu/Debian)</h3>
        <CodeBlock>sudo apt install vim</CodeBlock>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">Windows</h3>
        <p className="text-sm text-ctp-subtext0">
          從 <ExternalLink href="https://www.vim.org/download.php">vim.org/download.php</ExternalLink> 下載安裝程式
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">基本操作</h2>
        <div className="space-y-1 text-sm text-ctp-subtext0">
          <p><code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">vim filename</code> — 開啟檔案</p>
          <p><code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">i</code> — 進入插入模式</p>
          <p><code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">Escape</code> — 回到正常模式</p>
          <p><code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">:w</code> — 存檔</p>
          <p><code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">:q</code> — 離開</p>
          <p><code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">:wq</code> — 存檔並離開</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">延伸學習</h2>
        <ul className="list-disc list-inside text-sm text-ctp-subtext0 space-y-1">
          <li>在終端輸入 <code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">vimtutor</code> 可以啟動內建教學</li>
          <li>官方文件：<ExternalLink href="https://www.vim.org/docs.php">vim.org/docs.php</ExternalLink></li>
        </ul>
      </section>
    </div>
  )
}

function NeovimTab() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">什麼是 Neovim？</h2>
        <p className="text-sm text-ctp-subtext0 leading-relaxed">
          Neovim 是 Vim 的現代化分支，支援 Lua 設定、內建 LSP、更好的插件生態。如果你是新手，建議直接從 Neovim 開始。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">安裝</h2>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">macOS</h3>
        <CodeBlock>brew install neovim</CodeBlock>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">Linux (Ubuntu/Debian)</h3>
        <CodeBlock>{`sudo apt install neovim
# 或安裝最新版
curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux-x86_64.appimage`}</CodeBlock>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">Windows</h3>
        <CodeBlock>winget install Neovim.Neovim</CodeBlock>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">基本設定</h2>
        <p className="text-sm text-ctp-subtext0">
          設定檔位置：<code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">~/.config/nvim/init.lua</code>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">延伸學習</h2>
        <ul className="list-disc list-inside text-sm text-ctp-subtext0 space-y-1">
          <li>官方網站：<ExternalLink href="https://neovim.io">neovim.io</ExternalLink></li>
          <li>GitHub：<ExternalLink href="https://github.com/neovim/neovim">github.com/neovim/neovim</ExternalLink></li>
        </ul>
      </section>
    </div>
  )
}

function LazyVimTab() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">什麼是 LazyVim？</h2>
        <p className="text-sm text-ctp-subtext0 leading-relaxed">
          LazyVim 是一套預先設定好的 Neovim 設定框架，開箱即用。內建 LSP、自動補全、檔案搜尋、Git 整合等常用功能，讓你專注在學習 Vim 操作而非設定。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">安裝（3 步驟）</h2>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">1. 備份現有設定</h3>
        <CodeBlock>{`mv ~/.config/nvim{,.bak}
mv ~/.local/share/nvim{,.bak}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">2. Clone LazyVim starter</h3>
        <CodeBlock>git clone https://github.com/LazyVim/starter ~/.config/nvim</CodeBlock>

        <h3 className="text-sm font-semibold text-ctp-subtext1 mt-4 mb-1">3. 啟動 Neovim</h3>
        <CodeBlock>nvim</CodeBlock>
        <p className="text-sm text-ctp-subtext0 mt-1">
          首次啟動會自動安裝所有插件，等待完成即可。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">Plugin 管理</h2>
        <ul className="list-disc list-inside text-sm text-ctp-subtext0 space-y-1">
          <li>按 <code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">{'<Space>'}</code> 開啟 Which-Key 選單，查看所有可用快捷鍵</li>
          <li>輸入 <code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">:Lazy</code> 開啟插件管理器</li>
          <li>輸入 <code className="bg-ctp-mantle text-ctp-blue px-1.5 py-0.5 rounded font-mono">:LazyExtras</code> 啟用/停用額外插件</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-ctp-text mb-3">延伸學習</h2>
        <ul className="list-disc list-inside text-sm text-ctp-subtext0 space-y-1">
          <li>官方文件：<ExternalLink href="https://www.lazyvim.org">lazyvim.org</ExternalLink></li>
          <li>GitHub：<ExternalLink href="https://github.com/LazyVim/LazyVim">github.com/LazyVim/LazyVim</ExternalLink></li>
        </ul>
      </section>
    </div>
  )
}

const FALLBACK_PLUGINS: PluginInfo[] = [
  { id: 'telescope', name: 'telescope.nvim', repo_url: 'https://github.com/nvim-telescope/telescope.nvim', description_zh: '高度可擴展的模糊搜尋器', description_en: '', category: 'file-navigation', stars: '19K', author: 'nvim-telescope' },
  { id: 'harpoon', name: 'harpoon', repo_url: 'https://github.com/ThePrimeagen/harpoon', description_zh: '快速標記並在常用檔案間瞬間切換', description_en: '', category: 'file-navigation', stars: '9K', author: 'ThePrimeagen' },
  { id: 'neo-tree', name: 'neo-tree.nvim', repo_url: 'https://github.com/nvim-neo-tree/neo-tree.nvim', description_zh: '現代化的檔案樹瀏覽器', description_en: '', category: 'file-navigation', stars: '5K', author: 'nvim-neo-tree' },
  { id: 'mini-surround', name: 'mini.surround', repo_url: 'https://github.com/echasnovski/mini.surround', description_zh: '快速新增、刪除、替換環繞符號', description_en: '', category: 'editing', stars: '9K', author: 'echasnovski' },
  { id: 'flash', name: 'flash.nvim', repo_url: 'https://github.com/folke/flash.nvim', description_zh: '閃電般的光標跳躍', description_en: '', category: 'file-navigation', stars: '4K', author: 'folke' },
  { id: 'which-key', name: 'which-key.nvim', repo_url: 'https://github.com/folke/which-key.nvim', description_zh: '按鍵後顯示可用的後續按鍵與說明', description_en: '', category: 'ui', stars: '7K', author: 'folke' },
]

function PluginsTab() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()

    fetch(import.meta.env.BASE_URL + 'data/lazyvim_plugins.json', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        return res.json() as Promise<PluginData>
      })
      .then(data => {
        if (Array.isArray(data?.plugins)) {
          setPlugins(data.plugins)
        } else {
          setPlugins(FALLBACK_PLUGINS)
        }
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setPlugins(FALLBACK_PLUGINS)
        setLoading(false)
      })

    return () => { controller.abort() }
  }, [])

  if (loading) {
    return <div className="text-ctp-subtext0 text-sm py-8 text-center">載入中...</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ctp-subtext0 mb-6">
        以下是 LazyVim 預設或常用的插件，每個都有對應的互動練習。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map(plugin => (
          <div
            key={plugin.id}
            className="bg-ctp-mantle border border-ctp-surface1 rounded-lg p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-ctp-text">{plugin.name}</h3>
                <span className="text-xs text-ctp-overlay0">{plugin.stars} stars</span>
              </div>
              <p className="text-sm text-ctp-subtext0 mb-3 leading-relaxed">
                {plugin.description_zh}
              </p>
              <div className="flex items-center gap-2 text-xs text-ctp-overlay0 mb-3">
                <span className="px-2 py-0.5 rounded-full bg-ctp-surface0 text-ctp-subtext0">
                  {plugin.category}
                </span>
                <span>by {plugin.author}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { navigate(`/lazyvim?plugins=${encodeURIComponent(plugin.id)}`) }}
                className="text-xs px-3 py-1.5 bg-ctp-blue text-ctp-base rounded font-medium hover:opacity-90 transition-opacity"
              >
                去練習
              </button>
              <a
                href={plugin.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ctp-subtext0 hover:text-ctp-blue transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState<TabId>('vim')

  return (
    <div className="min-h-screen bg-ctp-base text-ctp-text">
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-ctp-text mb-6">
          安裝與入門指南
        </h1>

        {/* Tabs */}
        <div className="flex border-b border-ctp-surface0 mb-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id) }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-ctp-blue text-ctp-blue'
                  : 'border-transparent text-ctp-subtext0 hover:text-ctp-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-ctp-surface0 rounded-lg p-6">
          {activeTab === 'vim' && <VimTab />}
          {activeTab === 'neovim' && <NeovimTab />}
          {activeTab === 'lazyvim' && <LazyVimTab />}
          {activeTab === 'plugins' && <PluginsTab />}
        </div>
      </main>
    </div>
  )
}
