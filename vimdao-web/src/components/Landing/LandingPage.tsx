import { useNavigate } from 'react-router-dom'

function handleStart(navigate: ReturnType<typeof useNavigate>) {
  localStorage.setItem('vimdojo_visited', '1')
  navigate('/')
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-ctp-base to-ctp-mantle text-ctp-text">
      {/* Section 1: Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-ctp-blue to-ctp-mauve bg-clip-text text-transparent">
          VimDao 鍵道
        </h1>
        <p className="text-lg md:text-xl text-ctp-overlay1 italic mb-4">
          「歡迎來到虛擬終端，修煉者。」
        </p>
        <p className="text-base md:text-lg text-ctp-subtext0 max-w-xl mb-10">
          互動式 Vim 學習平台 — 在瀏覽器中實際操作練習，從零開始掌握鍵道。
        </p>
        <button
          onClick={() => { handleStart(navigate) }}
          className="px-8 py-3 bg-ctp-blue text-ctp-base font-bold text-lg rounded-lg hover:opacity-90 transition-opacity"
        >
          開始修煉
        </button>

        {/* Scroll hint */}
        <div className="mt-16 text-ctp-overlay0 animate-bounce text-2xl select-none">
          &#8595;
        </div>
      </section>

      {/* Section 2: Three Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-6">
            <div className="text-3xl mb-4 select-none">&#9000;</div>
            <h3 className="text-lg font-bold text-ctp-blue mb-2">
              從零打造的 Vim 引擎
            </h3>
            <p className="text-sm text-ctp-subtext0 leading-relaxed">
              不依賴任何第三方套件，100+ 指令完整實作。支援 Normal、Insert、Visual、Replace、Command 五種模式。
            </p>
          </div>

          <div className="bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-6">
            <div className="text-3xl mb-4 select-none">&#9998;</div>
            <h3 className="text-lg font-bold text-ctp-green mb-2">
              167 道互動練習
            </h3>
            <p className="text-sm text-ctp-subtext0 leading-relaxed">
              69 道 Vim 核心修煉 + 98 道 LazyVim 插件練習。涵蓋 dot command、text objects、macros、search 等進階技巧。
            </p>
          </div>

          <div className="bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-6">
            <div className="text-3xl mb-4 select-none">&#9876;</div>
            <h3 className="text-lg font-bold text-ctp-peach mb-2">
              RPG 養成系統
            </h3>
            <p className="text-sm text-ctp-subtext0 leading-relaxed">
              完成練習獲得經驗值，提升鍵道等級。六大技能樹、章節解鎖、成就系統，讓學習充滿動力。
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-2xl font-bold text-ctp-text text-center mb-12">
          三步開始修煉
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-ctp-blue/20 text-ctp-blue flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              1
            </div>
            <h3 className="text-base font-semibold text-ctp-text mb-2">看題</h3>
            <p className="text-sm text-ctp-subtext0">
              閱讀目標文字，理解要做什麼修改
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-ctp-green/20 text-ctp-green flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              2
            </div>
            <h3 className="text-base font-semibold text-ctp-text mb-2">操作</h3>
            <p className="text-sm text-ctp-subtext0">
              在瀏覽器內的 Vim 編輯器中實際按鍵操作
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-ctp-peach/20 text-ctp-peach flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              3
            </div>
            <h3 className="text-base font-semibold text-ctp-text mb-2">成長</h3>
            <p className="text-sm text-ctp-subtext0">
              提交答案獲得 XP，解鎖新章節
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: CTA Footer */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-ctp-text mb-8">
          準備好了嗎？
        </h2>
        <button
          onClick={() => { handleStart(navigate) }}
          className="px-8 py-3 bg-ctp-blue text-ctp-base font-bold text-lg rounded-lg hover:opacity-90 transition-opacity mb-6"
        >
          開始修煉
        </button>
        <div className="mt-4">
          <button
            onClick={() => { navigate('/guide') }}
            className="text-sm text-ctp-subtext0 hover:text-ctp-blue transition-colors underline underline-offset-4"
          >
            安裝 Vim/Neovim 指南
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-ctp-overlay0 space-y-1">
        <p>
          <a href="https://anatomind.com" target="_blank" rel="noopener noreferrer" className="hover:text-ctp-blue transition-colors">
            Tân Soân-sêng — 析心事務所
          </a>
        </p>
        <p>
          <a href="https://github.com/soanseng/vimdojo" target="_blank" rel="noopener noreferrer" className="hover:text-ctp-blue transition-colors">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}
