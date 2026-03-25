# VimDao 鍵道 — RPG 系統設計

## 概述

為 VimDao 鍵道加入 RPG 元素，將 69 道 Practical Vim 練習題從乾燥的技術操練轉化為一段賽博武俠修煉之旅。玩家扮演「修煉者」，在虛擬終端世界中學習鍵道，每完成練習獲得經驗值、提升功力、解鎖新章節。

## 世界觀：數位鍵道

**主題：** 賽博龐克 × 武俠修煉

在遙遠的未來，程式碼即是能量。掌握 Vim 鍵道者，能自在操控終端世界中的一切文字。玩家踏入「鍵道山門」（虛擬終端），跟隨全像投影的導師修煉。

**語調：** 繁中武俠用語，但場景是數位世界。「修煉」「內功」「招式」「境界」混合「終端」「程式碼」「能量流」「虛擬」。不過度嚴肅，偶有幽默。

## 章節故事結構

Practical Vim 的 13 個有練習的章節，各對應一個修煉階段：

| 章 | 原標題 | RPG 名稱 | 敘事主題 |
|---|---|---|---|
| Ch1 | The Vim Way | 鍵道入門 | 踏入虛擬終端，學習 dot 的力量 |
| Ch2 | Normal Mode | 正常模式之力 | 掌握基礎內功心法 |
| Ch3 | Insert Mode | 插入之術 | 學會在能量流中注入新文字 |
| Ch4 | Visual Mode | 視覺之眼 | 開啟選取之力，批量操控 |
| Ch5 | Command-Line Mode | 命令列秘技 | 進入終端底層的隱藏指令 |
| Ch8 | Motions | 移動心法 | 在程式碼中高速穿梭 |
| Ch10 | Copy and Paste | 暫存器之道 | 掌握記憶與複製的奧義 |
| Ch11 | Macros | 巨集之力 | 將招式錄製成自動化序列 |
| Ch13 | Search | 搜尋之眼 | 在龐大程式碼中精準定位 |
| Ch14 | Substitution | 替換煉金術 | 批量轉換文字的煉金之力 |
| Ch15 | Global Commands | 全域指令 | 對整個世界施展力量 |
| Ch16 | ctags | 程式碼導航 | 在專案間瞬移的傳送陣 |
| Ch19 | Autocompletion | 自動完成 | 預知未來文字的占卜術 |

### 每章節奏

```
章前故事（場景圖 + 2-3 段劇情文字）
  ↓
一般練習題 × N（各附一句任務風味文字）
  ↓
章末 BOSS 試煉（完整微敘事 + 特殊獎勵）
  ↓
章後結語（升級動畫 + 下一章預告）
```

### 任務風味文字

**一般練習：** 每題一句任務包裝，呼應該 tip 的概念。
```
Tip 1: 「刪除多餘字元，用 dot 的力量重複。一次修改，無限重複。」
Tip 2: 「在每行末尾注入分號能量。A 鍵移至行尾，dot 自動重複。」
```

**BOSS 試煉（每章最後一題）：** 完整微敘事，2-3 段文字，有角色對話。
```
「修煉者，你已掌握了基礎。」導師的全像投影閃爍。
「但真正的鍵道，在於將簡單的招式組合成流暢的序列。」
「用最少的按鍵，完成這項試煉。這便是 Dot Formula。」
```

## 角色成長系統

### 等級與經驗值

- 完成一般練習：**15 XP**
- 完成 BOSS 試煉：**80 XP**
- 每級所需 XP 固定：**100 XP**
- 最高等級：**Lv.12**

**XP 預算驗證：**
- 56 一般練習 × 15 XP = 840 XP
- 13 BOSS 試煉 × 80 XP = 1,040 XP
- 總可用 XP = **1,880 XP**
- 12 級所需 = 12 × 100 = **1,200 XP**
- 緩衝：680 XP（允許跳過部分練習仍可升到最高級）

### BOSS 試煉指定

每章最後一道練習為 BOSS 試煉。判定規則：取該章節 `chapter_id` 對應的最後一個 `challenge.id`。在 Go 生成器中自動標記 `is_boss: true`。

### 稱號系統

| 等級段 | 稱號 | 顏色 |
|--------|------|------|
| Lv.1-2 | 鍵道學徒 | ctp-subtext0 (#a6adc8) |
| Lv.3-4 | 見習劍客 | ctp-green (#a6e3a1) |
| Lv.5-6 | 終端行者 | ctp-blue (#89b4fa) |
| Lv.7-8 | 指令術師 | ctp-yellow (#f9e2af) |
| Lv.9-10 | 鍵道達人 | ctp-mauve (#cba6f7) |
| Lv.11-12 | 鍵道宗師 | ctp-red (#f38ba8) |

### 功力線（技能熟練度）

六條功力線，對應 Vim 指令類別：

| 功力線 | 對應指令 | 顏色 |
|--------|----------|------|
| 移動之術 | hjkl, w, b, e, 0, ^, $, f, t, ;, gg, G | ctp-blue |
| 編輯之力 | d, c, y, x, p, P, dd, cc, yy | ctp-green |
| 插入之術 | i, I, a, A, o, O | ctp-yellow |
| 組合技 | operator+motion (dw, cw, yw...) | ctp-red |
| 搜尋之眼 | /, n, N, *, # | ctp-teal |
| 重複之道 | ., u, q, @ | ctp-peach |

每完成一道練習，該練習涉及的功力線獲得熟練度。

**熟練度計算：** 根據練習的 `tags` 欄位判斷涉及哪些功力線。每個 tag 映射到對應的功力線（例如 `w` → 移動之術，`d` → 編輯之力）。完成練習時，涉及的每條功力線 +10 熟練度。每條功力線上限 100。

**映射表：**
- 移動之術：tags 中含 h, j, k, l, w, W, b, B, e, E, 0, ^, $, f, F, t, T, ;, ,, gg, G
- 編輯之力：tags 中含 d, c, y, x, X, dd, cc, yy, D, C, Y, p, P
- 插入之術：tags 中含 i, I, a, A, o, O, s, S, R
- 組合技：category === "combo"
- 搜尋之眼：tags 中含 /, n, N, *, #
- 重複之道：tags 中含 ., u, q, @

**熟練度等級：**
- **初學**（0-33）
- **進修中**（34-66）
- **熟練**（67-100）

與 PLAN.md 2.5 的 `command_proficiency` 共存：`command_proficiency` 追蹤每個指令的使用次數和成功率，`skill_mastery` 是聚合後的功力線等級。兩者互補。

### 成就系統

簡單成就，完成即獲得：

| 成就 | 條件 | 圖示 |
|------|------|------|
| 初入鍵道 | 完成第一道練習 | 🎋 |
| 重複之力 | 完成所有 dot command 練習 | 🔄 |
| 一擊必殺 | 用最少按鍵完成一道練習 | ⚡ |
| 連續修煉 | 連續 7 天練習 | 🔥 |
| 全章通關 | 完成任一章節所有練習 | 🏯 |
| 鍵道大成 | 完成所有 69 道練習 | 🐉 |

### 章節解鎖

- 第一章（Ch1）預設解鎖
- 完成當前章節所有練習 → 解鎖下一章
- 解鎖時顯示故事過場 + 新章節預告

## 視覺設計

### 像素圖策略

**關鍵場景圖（AI 生成或手繪，約 5-8 張）：**
- 主角立繪（不同等級段各一張，共 3 張）
- 導師 NPC 全像投影
- 2-3 張章節轉場背景（虛擬終端城市、訓練場、最終殿堂）

**CSS 像素風 UI 元素：**
- 經驗值條、功力線進度條
- 等級徽章、稱號標籤
- 成就圖示（用 emoji 或簡單 CSS 圖形）
- BOSS 試煉的邊框發光效果
- 章節卡片的像素風裝飾邊框

### 配色

沿用現有 Catppuccin Mocha，RPG 元素使用同色系：
- 故事文字：ctp-subtext0/subtext1
- 角色對話高亮：ctp-yellow（角色名）、ctp-blue（指令名）、ctp-green（概念名）
- BOSS 邊框：ctp-red 發光
- 經驗值條：ctp-mauve → ctp-blue 漸層

## 資料結構

### story.json（故事內容，放 public/data/）

```json
{
  "chapters": [
    {
      "chapter_id": 1,
      "title_zh": "鍵道入門",
      "title_en": "The Vim Way",
      "intro_story": [
        "「歡迎來到虛擬終端，修煉者。」全像投影的老者緩緩說道。",
        "「在這個數位世界中，一切文字皆是能量流。掌握 Vim 鍵道，便能自在操控這些能量。」",
        "「你的第一課 — dot 指令，重複的力量。一次修改，無限重複。這便是鍵道最基礎的法則。」"
      ],
      "outro_story": [
        "你感受到指尖的能量在流動。dot 指令的力量已融入你的本能。",
        "「很好，」導師微笑，「但這只是開始。正常模式中還有更強大的力量等著你。」"
      ],
      "boss_challenge_id": "pv-tip05-001",
      "boss_intro": [
        "「修煉者，你已學會了基礎。」導師的全像投影閃爍。",
        "「用最少的按鍵，完成這項試煉。這便是 Dot Formula。」"
      ],
      "scene_image": "ch1-terminal-entrance.png",
      "unlock_requires": null
    }
  ]
}
```

### 在 challenges.json 中擴展

每道練習增加 RPG 風味欄位（在 Go 生成器中加入）：

```json
{
  "id": "pv-tip01-001",
  "flavor_zh": "刪除多餘字元，用 dot 的力量重複。一次修改，無限重複。",
  "is_boss": false,
  "xp_reward": 10
  // ... existing fields
}
```

### UserProgress 擴展（localStorage）

```typescript
interface UserProgress {
  // existing fields...
  level: number
  xp: number
  title: string
  skill_mastery: Record<string, number>  // 功力線 0-100
  achievements: string[]                  // unlocked achievement ids
  chapters_unlocked: number[]
  current_chapter: number
}
```

## 與 CLAUDE.md 約束的關係

**「不手動編寫練習題目」例外：** story.json 中的故事文字（intro_story、outro_story、boss_intro、flavor_zh）是手動撰寫的敘事內容，不是練習題目。練習的 `initial_text` 和 `expected_text` 仍然完全從書籍提取。故事文字是 RPG 包裝層，不影響練習的技術內容。

**章節解鎖 vs 自由練習：** `/path` 頁面的章節順序強制線性解鎖。`/practice` 自由練習頁不受限制 — 玩家可以自由篩選和練習任何已提取的題目，但不會獲得章節進度的推進。這保留了兩種使用模式：RPG 故事線（線性）和自由練習（開放）。

**像素圖資源：** 場景圖放 `public/images/rpg/`，CSS 像素風 UI 樣式放 `src/styles/rpg-ui.css`。

**成就「一擊必殺」定義：** 按鍵數 ≤ `hint_commands.length`（書中建議的按鍵數）即算達成。不需要額外欄位。

**localStorage 遷移：** 如果 localStorage 中存在舊版 `UserProgress`（沒有 RPG 欄位），讀取時自動補上預設值（level: 1, xp: 0, 等）。不需要顯式遷移。

## 不做的事

- 不做即時對戰/排行榜（YAGNI）
- 不做裝備/外觀商店
- 不做每日隨機任務（保持線性）
- 不做動畫過場（簡單文字 + 靜態圖即可）
- 不做音效/音樂
- 像素圖不需要精細，風格一致即可

## 實作範圍

這個 RPG 系統是一個新的功能層，疊加在現有的 VimEngine + ChallengeView 之上：

1. **資料層：** story.json + challenges.json 擴展 + UserProgress 擴展
2. **UI 層：** 角色面板、章節地圖、故事對話框、BOSS 邊框、成就通知
3. **邏輯層：** XP 計算、等級判定、功力線更新、章節解鎖、成就檢查
