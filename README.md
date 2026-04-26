# 🎮 遊戲設計學習地圖

互動式心智圖，讓設計師選擇想做的遊戲類型，展開該領域的核心設計面向。

## 技術棧

- **SvelteKit 2** + **Svelte 5**（runes）
- **@xyflow/svelte**（Svelte Flow，心智圖）
- **adapter-static**（純靜態輸出，部署到 GitHub Pages）

## 開發

```bash
npm install
npm run dev
```

開啟 http://localhost:5173

## 編輯資料

所有遊戲類型與設計面向都在 [`src/lib/data/genres.json`](src/lib/data/genres.json)。

```json
{
  "id": "rpg",
  "label": "角色扮演 RPG",
  "color": "#a78bfa",
  "topics": [
    { "id": "rpg-progression", "label": "成長系統", "detail": "..." }
  ]
}
```

新增類型只要在 `genres` 陣列加一個物件，畫面會自動環狀排列。

## 部署到 GitHub Pages

1. 在 GitHub 建一個 repo 名為 `game-design-learning`（或改 `svelte.config.js` 的 `repoName`）
2. push 到 `main` 分支
3. Repo Settings → Pages → Source 選擇 **GitHub Actions**
4. workflow 會自動 build & deploy

網址：`https://<username>.github.io/game-design-learning/`

## 互動

- 點擊類型泡泡 → 展開該類型的設計面向（其他類型會淡化）
- 再點一次同一類型 → 收合
- 點擊面向小卡 → 跳出詳細說明
- 滾輪縮放、拖曳平移、右下角 MiniMap 導航
