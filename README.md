<p align="center">
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white" alt="React 18+">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/Vim_Engine-from_scratch-019733?logo=vim&logoColor=white" alt="Vim Engine">
  <img src="https://img.shields.io/badge/tests-538_passing-brightgreen" alt="Tests">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

# VimDao 鍵道

> **互動式 Vim 學習平台** — 在瀏覽器中實際操作練習 Vim，從零開始掌握鍵道。

## Demo

**[soanseng.github.io/vimdojo](https://soanseng.github.io/vimdojo/)**

## 特色

### 從零打造的 Vim 引擎
不依賴任何第三方 Vim 模擬套件，**VimEngine 完全從零實作**，支援 100+ 個 Vim 指令：

- **Normal / Insert / Visual / Replace / Command** 五種模式
- **Operator + Motion** 組合：`d`, `c`, `y`, `>`, `<`, `gU`, `gu` 搭配所有 motion
- **Text Objects**：`iw`, `aw`, `i"`, `a(`, `it`, `ap` 等
- **Visual Block** (`Ctrl-V`)：區塊選取、刪除、插入、替換
- **Macros** (`q`/`@`)：巨集錄製與回放
- **Search**：`/pattern`, `*`, `n`/`N`, `gn`, `d/pattern`
- **Surround**：`gsa`, `gsd`, `gsr`, visual `S`
- **Registers**：`"a`-`"z`, `"0`, `"_`, `<C-r>` 插入模式貼上
- **Marks**：`m{a-z}`, `` ` ``{a-z}, `` `` ``
- **Dot Repeat** (`.`)：完整支援所有操作的重複
- **`%` Bracket Match**、`~` Toggle Case、`R` Replace Mode

### RPG 養成系統
- **等級 & 經驗值**：完成練習獲得 XP，提升鍵道等級
- **六大技能樹**：移動之術、編輯之力、插入之術、組合技、搜尋之眼、重複之道
- **章節解鎖**：循序漸進的修煉路徑，從入門到精通
- **成就系統**：「初入鍵道」等里程碑成就

### 167 道練習題
- **69 道 Vim 核心練習** — 涵蓋 dot command、text objects、operators、search & replace、macros
- **98 道 LazyVim 進階練習** — 涵蓋 17 個熱門插件的快捷鍵

### Telescope 模擬器
互動式 Telescope 搜尋器模擬，在瀏覽器中體驗 Neovim 插件操作：
- 即時模糊搜尋與高亮
- `Ctrl-N`/`Ctrl-P` 導航、`Enter` 開啟、`Ctrl-V` 分割
- 逼真的 floating window 視覺效果

### 233 個指令速查
依類型分類的完整 Vim 指令參考，搭配出現頻率與相關章節。

## 技術架構

```
vimdojo/
  vimdao-web/          # React + TypeScript 前端
    src/
      engine/          # 純 TypeScript Vim 引擎（無 React 依賴）
        vim-engine.ts  # 核心按鍵處理
        vim-motions.ts # 移動指令
        vim-operations.ts # 編輯操作
        vim-text-objects.ts # 文字物件
        vim-search.ts  # 搜尋功能
        vim-surround.ts # Surround 操作
        vim-comment.ts # 註解切換
      components/      # React UI 元件
      hooks/           # 自訂 Hooks
      rpg/             # RPG 系統（等級、技能、成就）
    public/data/       # 練習題 JSON 資料
  vimdao-extract/      # Go 工具（資料生成）
```

## 開發

```bash
cd vimdao-web
npm install
npm run dev        # 開發伺服器
npx vitest run     # 執行測試（538 tests）
npx vite build     # 建置
```

## 推薦閱讀

搭配以下書籍學習效果更佳：

- *Practical Vim, 2nd Edition* — Drew Neil
- *LazyVim for Ambitious Developers* — Dusty Phillips

## License

MIT
