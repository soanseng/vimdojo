# VimDao 鍵道

互動式 Vim 學習平台，從 Vim 教學書籍（EPUB）提取內容，自動生成練習題目，在瀏覽器中實際操作練習。

## 核心原則

**所有練習內容從書籍提取生成，不手動編寫。** 來源書籍：
1. *LazyVim for Ambitious Developers* — Dusty Phillips
2. *Practical Vim, 2nd Edition* — Drew Neil

提取流程：EPUB → 結構化 JSON → 練習題 JSON → 前端載入

## 語言

- 所有使用者看到的 UI 文字、說明、提示、指令解釋：繁體中文
- 書籍原文內容保留英文原文，搭配繁中翻譯/說明
- 程式碼、變數名稱、commit message、註解：英文

## Tech Stack

### 提取工具 (`vimdao-extract/`)
- Go（純 Go，無 CGo）
- EPUB 解析 + Vim 指令偵測 + 練習題自動生成
- 輸出：JSON（供前端直接載入）

### 前端 (`vimdao-web/`)
- React 18+ with TypeScript（strict mode）
- Vite
- TailwindCSS v4
- React Router
- 無後端，資料從提取工具產生的 JSON 靜態載入
- localStorage 儲存使用者進度
- 不使用任何第三方 Vim 模擬 library — VimEngine 從零實作

## 設計原則

- **VimEngine 是純 TypeScript 邏輯**，不依賴 React，放在 `src/engine/`
- **練習驗證只比對最終文字狀態**（`expected_text`），不限制按鍵路徑
- **按鍵全程追蹤**，用於熟練度分析和結果回放
- **深色主題為主**，色彩參考 Catppuccin Mocha，可切換淺色
- **等寬字體**用於編輯器（Fira Code / JetBrains Mono / 系統 monospace），UI 用 Noto Sans TC
- **桌面優先** RWD，平板可用

## 程式碼風格

- 元件用 functional component + hooks
- 狀態管理用 React hooks（useState, useReducer），不引入外部狀態管理
- 檔案命名：元件 PascalCase（`VimEditor.tsx`），工具/引擎 kebab-case（`vim-state.ts`）
- 一個元件一個檔案
- CSS 優先用 Tailwind utility class，編輯器專用樣式放 `vim-editor.css`

## 重要約束

- **不要手動編寫練習題目**，所有練習從 EPUB 提取內容生成
- 不要安裝任何 Vim 模擬相關的 npm package
- 不要用 `dangerouslySetInnerHTML` 渲染編輯器內容
- 所有鍵盤事件在 VimEditor 元件內捕捉，不要用 global event listener
- JSON 資料檔放 `public/data/`，用 fetch 載入
