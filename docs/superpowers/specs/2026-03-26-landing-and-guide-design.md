# Landing Page + 安裝指南設計

## 1. Landing Page

### 進入邏輯
- 首次訪問（`localStorage` 無 `vimdojo_visited` key）→ 顯示 Landing
- 回訪者 → 直接進 Dashboard
- Nav 加「關於」連結可隨時回看

### 頁面結構（單頁滾動）

**Section 1: Hero**
- 故事引言：「歡迎來到虛擬終端，修煉者。」
- 副標：互動式 Vim 學習平台 — 從零開始掌握鍵道
- CTA 按鈕：「開始修煉」

**Section 2: 三大特色**（卡片排列）
- 從零打造的 Vim 引擎 — 100+ 指令，瀏覽器即練
- 167 道練習題 — Vim 核心 + LazyVim 插件
- RPG 養成系統 — 等級、技能樹、成就解鎖

**Section 3: 體驗預覽**
- 一張編輯器截圖或動態示意
- 簡述操作流程：看題 → 打字 → 提交 → 獲得 XP

**Section 4: 快速開始**
- 「開始修煉」按鈕 → 設 localStorage + 跳轉 Dashboard
- 「安裝 Vim/Neovim 指南」連結 → /guide

### 路由
- `/welcome` — Landing Page
- `/` — Dashboard（原本不變）
- App.tsx 在 `/` 路由加 localStorage 檢查，首次導向 `/welcome`

## 2. 安裝指南頁

### 路由
- `/guide` — 指南頁
- Nav 加入「指南」連結

### 頁面結構

**Tab 1: Vim 基礎**
- 什麼是 Vim、為什麼學 Vim（2-3 句）
- 安裝指令：macOS (`brew install vim`)、Linux (`apt install vim`)、Windows (下載連結)
- 基本操作速覽：模式切換、存檔退出
- 連結：官方文件、vimtutor

**Tab 2: Neovim**
- Vim → Neovim 的差異（1-2 句）
- 安裝指令：brew/apt/winget
- 基本設定：`init.lua` 位置
- 連結：neovim.io

**Tab 3: LazyVim**
- 什麼是 LazyVim（預設好的 Neovim 設定）
- 安裝步驟（3 步：備份 → clone → 啟動）
- Plugin 管理方式（Lazy.nvim）
- 連結：lazyvim.org

**Tab 4: 熱門 Plugin**
- 列出本站練習涵蓋的 plugin
- 每個 plugin：名稱、一句描述、關鍵快捷鍵、「去練習」連結
- 資料從 `lazyvim_plugins.json` 載入

### 設計原則
- 站內提供足夠起步資訊（安裝指令可直接複製）
- 進階內容連結官方文件
- Plugin 教學和練習題連結，學完可以馬上練
