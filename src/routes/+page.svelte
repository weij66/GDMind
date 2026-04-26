<script>
  import { fly, scale, fade } from 'svelte/transition';
  import { cubicOut, cubicInOut } from 'svelte/easing';
  import { base } from '$app/paths';
  import { marked } from 'marked';
  import data from '$lib/data/genres.json';
  import GenreIcon from '$lib/GenreIcon.svelte';

  marked.setOptions({ breaks: true, gfm: true });

  /** @type {'genre' | 'topic'} */
  let stage = $state('genre');
  /** @type {{id:string, label:string, color:string, topics:any[]} | null} */
  let selectedGenre = $state(null);
  /** @type {Record<string, {id:string, label:string, detail:string}>} */
  let selections = $state({});
  let pondering = $state(false);
  let resultsHtml = $state(/** @type {Record<string, string>} */ ({}));
  let showResults = $state(false);

  const RADIUS = 260;
  const PONDER_MS = 1600;

  const allGenres = /** @type {any[]} */ (/** @type {any} */ (data).genres);
  const remainingGenres = $derived(allGenres.filter((g) => !selections[g.id]));
  const allDone = $derived(remainingGenres.length === 0);

  /** @param {number} i @param {number} total */
  function clusterPos(i, total) {
    // 加半格偏移：避免第一顆剛好出現在正上方擋到問句文字
    const angle = ((i + 0.5) / total) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS };
  }

  /** @param {any} g */
  function pickGenre(g) {
    selectedGenre = g;
    stage = 'topic';
  }

  /** @param {any} t */
  async function pickTopic(t) {
    if (!selectedGenre) return;
    const genreId = selectedGenre.id;
    // 寫入該元素的選擇
    selections = { ...selections, [genreId]: t };
    selectedGenre = null;
    stage = 'genre';

    // 若全部選完，先思索再揭曉結果
    const done = allGenres.every((g) => selections[g.id]);
    if (done) {
      pondering = true;
      const ponderStart = Date.now();
      // 平行載入四個 markdown
      const entries = await Promise.all(
        allGenres.map(async (g) => {
          const topic = selections[g.id];
          let html = `<p>${topic.detail}</p>`;
          try {
            const res = await fetch(`${base}/topics/${topic.id}.md`);
            if (res.ok) {
              html = /** @type {string} */ (marked.parse(await res.text()));
            }
          } catch {}
          return [g.id, html];
        })
      );
      const elapsed = Date.now() - ponderStart;
      await new Promise((r) => setTimeout(r, Math.max(0, PONDER_MS - elapsed)));
      resultsHtml = Object.fromEntries(entries);
      pondering = false;
      showResults = true;
    }
  }

  function backToGenres() {
    selectedGenre = null;
    stage = 'genre';
  }

  /** @param {string} genreId */
  function unselect(genreId) {
    const next = { ...selections };
    delete next[genreId];
    selections = next;
    showResults = false;
  }

  function reset() {
    selections = {};
    selectedGenre = null;
    showResults = false;
    resultsHtml = {};
    stage = 'genre';
  }

  function closeResults() {
    showResults = false;
  }

  const root = /** @type {any} */ (data).root;
  const rootLabel = /** @type {string} */ (root.label);
  const rootDesc = /** @type {string} */ (root.description ?? '');
  const question = $derived(
    stage === 'genre'
      ? Object.keys(selections).length === 0
        ? rootLabel
        : allDone
        ? '你的遊戲設計組合'
        : '下一個元素？'
      : selectedGenre
      ? `你想要哪種${selectedGenre.label}？`
      : ''
  );
  const subtitle = $derived(
    stage === 'genre'
      ? Object.keys(selections).length === 0
        ? rootDesc
        : allDone
        ? '水晶球已揭示了你選的四件事——點右側面板看詳情。'
        : `還剩 ${remainingGenres.length} 個元素未選`
      : selectedGenre
      ? selectedGenre.description ?? ''
      : ''
  );
</script>

<svelte:head>
  <title>遊戲設計學習</title>
</svelte:head>

<svelte:window
  onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    if (showResults) closeResults();
    else if (stage === 'topic') backToGenres();
  }}
/>

<main>
  <!-- 流體背景：迷幻水晶球氛圍 -->
  <div class="bg-layer" aria-hidden="true">
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>
    <div class="bg-orb orb-3"></div>
    <div class="bg-orb orb-4"></div>
    <div class="color-bands"></div>
    <div class="grain"></div>
  </div>

  <!-- 上方麵包屑/返回 -->
  {#if stage === 'topic'}
    <button class="back" onclick={backToGenres} transition:fade={{ duration: 200 }}>
      <span class="arrow">←</span>
      <span>重新選類型</span>
    </button>
  {/if}

  <!-- 中央問題 -->
  {#key question}
    <h1 class="question" in:fly={{ y: -16, duration: 500, easing: cubicOut }}>
      {question}
    </h1>
  {/key}
  {#if subtitle}
    {#key subtitle}
      <p class="subtitle" in:fly={{ y: -8, duration: 450, delay: 80, easing: cubicOut }}>
        {subtitle}
      </p>
    {/key}
  {/if}

  <!-- 已選 chips（Filter 面包屑） -->
  {#if Object.keys(selections).length > 0}
    <div class="chips" transition:fade={{ duration: 250 }}>
      {#each allGenres as g (g.id)}
        {#if selections[g.id]}
          <button
            class="chip"
            style="--c:{g.color};"
            onclick={() => unselect(g.id)}
            title="點擊重選此元素"
          >
            <span class="chip-key">{g.label}</span>
            <span class="chip-sep">·</span>
            <span class="chip-val">{selections[g.id].label}</span>
            <span class="chip-x" aria-hidden="true">×</span>
          </button>
        {/if}
      {/each}
      {#if allDone}
        <button class="chip chip-reset" onclick={reset}>↻ 重新開始</button>
      {/if}
    </div>
  {/if}

  <!-- 提示 -->
  {#if !allDone}
    <p class="hint">點擊任一泡泡選擇</p>
  {/if}

  <!-- 泡泡群 -->
  <div class="stage-area">
    {#if stage === 'genre' && !allDone}
      {#each remainingGenres as g, i (g.id)}
        {@const p = clusterPos(i, remainingGenres.length)}
        <button
          class="bubble genre-bubble"
          style="--x:{p.x}px; --y:{p.y}px; --c:{g.color}; --i:{i};"
          onclick={() => pickGenre(g)}
          in:scale={{
            start: 0.2,
            duration: 600,
            delay: 80 + i * 60,
            easing: cubicOut
          }}
          out:scale={{ start: 0.4, duration: 350, easing: cubicInOut }}
        >
          <GenreIcon id={g.id} />
          <span class="label">{g.label}</span>
        </button>
      {/each}
    {:else if stage === 'topic' && selectedGenre}
      <!-- 連接線：從水晶球向外生長 + 能量流動 -->
      <svg class="edges-svg" aria-hidden="true">
        <defs>
          <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {#each selectedGenre.topics as t, i (t.id)}
          {@const p = clusterPos(i, selectedGenre.topics.length)}
          {@const len = Math.hypot(p.x, p.y)}
          <line
            class="edge edge-grow"
            x1="0" y1="0" x2={p.x} y2={p.y}
            style="--c:{selectedGenre.color}; --len:{len}; --i:{i};"
          />
          <line
            class="edge edge-flow"
            x1="0" y1="0" x2={p.x} y2={p.y}
            style="--c:{selectedGenre.color}; --i:{i};"
          />
        {/each}
      </svg>

      <!-- 中心保留所選類型：水晶球 -->
      <div
        class="bubble genre-bubble center-anchor crystal-ball"
        style="--c:{selectedGenre.color};"
        in:scale={{ start: 0.6, duration: 500, easing: cubicOut }}
      >
        <span class="ball-swirl" aria-hidden="true"></span>
        <span class="ball-haze" aria-hidden="true"></span>
        <span class="ball-stars" aria-hidden="true"></span>
        <GenreIcon id={selectedGenre.id} />
        <span class="label">{selectedGenre.label}</span>
      </div>

      {#each selectedGenre.topics as t, i (t.id)}
        {@const p = clusterPos(i, selectedGenre.topics.length)}
        <button
          class="bubble topic-bubble"
          style="--x:{p.x}px; --y:{p.y}px; --c:{selectedGenre.color}; --i:{i};"
          onclick={() => pickTopic(t)}
          in:scale={{
            start: 0.2,
            duration: 550,
            delay: 200 + i * 90,
            easing: cubicOut
          }}
          out:scale={{ start: 0.4, duration: 300, easing: cubicInOut }}
        >
          <span class="dot"></span>
          <span class="label">{t.label}</span>
        </button>
      {/each}
    {/if}
  </div>

  <!-- 思索揭曉動畫：點氣泡後的全螢幕脈動液體 -->
  {#if pondering}
    <div
      class="ponder-overlay"
      role="status"
      aria-label="思索中"
      transition:fade={{ duration: 350 }}
    >
      <div class="ponder-blob pb-1"></div>
      <div class="ponder-blob pb-2"></div>
      <div class="ponder-blob pb-3"></div>
      <div class="ponder-ring"></div>
      <div class="ponder-text">凝視水晶球…</div>
    </div>
  {/if}

  <!-- 結果面板：四個元素全選完顯示 -->
  {#if showResults}
    <div
      class="hud-panel results-panel"
      role="region"
      aria-label="遊戲設計組合"
      transition:fly={{ x: 40, duration: 450, easing: cubicOut }}
    >
      <div class="hud-header" style="--accent:#f472b6;">
        <span class="hud-tag">你的遊戲組合</span>
        <button class="close" onclick={closeResults} aria-label="關閉">×</button>
      </div>
      <h2>水晶球揭示了…</h2>
      <div class="hud-body">
        {#each allGenres as g (g.id)}
          {#if selections[g.id]}
            <section class="result-block" style="--accent:{g.color};">
              <header class="result-head">
                <span class="result-key">{g.label}</span>
                <span class="result-val">{selections[g.id].label}</span>
              </header>
              <div class="result-content">{@html resultsHtml[g.id] || ''}</div>
            </section>
          {/if}
        {/each}
      </div>
      <div class="hud-foot">
        <button class="reset-btn" onclick={reset}>↻ 重新組合</button>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background: #0a0a1f;
    color: #e0e7ff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  main {
    width: 100vw;
    height: 100vh;
    position: relative;
    background: #07061a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  /* ===== 層級 1：流體背景（迷幻水晶球氛圍） ===== */
  .bg-layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .bg-orb {
    position: absolute;
    width: 70vmin;
    height: 70vmin;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.55;
    mix-blend-mode: screen;
    will-change: transform;
  }
  .orb-1 {
    background: radial-gradient(circle, #f472b6 0%, transparent 70%);
    animation: drift1 22s ease-in-out infinite;
  }
  .orb-2 {
    background: radial-gradient(circle, #38bdf8 0%, transparent 70%);
    animation: drift2 26s ease-in-out infinite;
  }
  .orb-3 {
    background: radial-gradient(circle, #a78bfa 0%, transparent 70%);
    animation: drift3 30s ease-in-out infinite;
  }
  .orb-4 {
    background: radial-gradient(circle, #fbbf24 0%, transparent 70%);
    opacity: 0.32;
    animation: drift4 34s ease-in-out infinite;
  }

  @keyframes drift1 {
    0%, 100% { transform: translate(-30%, -10%); }
    33% { transform: translate(20%, 30%); }
    66% { transform: translate(-10%, 50%); }
  }
  @keyframes drift2 {
    0%, 100% { transform: translate(60%, 50%); }
    50% { transform: translate(20%, -10%); }
  }
  @keyframes drift3 {
    0%, 100% { transform: translate(20%, -20%); }
    50% { transform: translate(60%, 60%); }
  }
  @keyframes drift4 {
    0%, 100% { transform: translate(-10%, 60%); }
    50% { transform: translate(70%, -20%); }
  }

  .color-bands {
    position: absolute;
    inset: -20%;
    background: conic-gradient(
      from 0deg at 50% 50%,
      rgba(244, 114, 182, 0.08),
      rgba(56, 189, 248, 0.06),
      rgba(167, 139, 250, 0.07),
      rgba(251, 191, 36, 0.05),
      rgba(244, 114, 182, 0.08)
    );
    filter: blur(40px);
    animation: bands-spin 60s linear infinite;
    mix-blend-mode: screen;
    opacity: 0.7;
  }
  @keyframes bands-spin {
    to { transform: rotate(360deg); }
  }

  .grain {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      rgba(255, 255, 255, 0.04) 1px,
      transparent 1px
    );
    background-size: 3px 3px;
    opacity: 0.25;
    mix-blend-mode: overlay;
    animation: grain-drift 4s steps(8) infinite;
  }
  @keyframes grain-drift {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-1px, 1px); }
    50% { transform: translate(1px, -1px); }
    75% { transform: translate(-2px, 0); }
  }

  /* 確保前景內容浮在背景之上 */
  .question, .hint, .stage-area, .back, .hud-panel {
    position: relative;
    z-index: 5;
  }
  .back, .hud-panel { z-index: 30; }
  .ponder-overlay { z-index: 40; }

  .question {
    position: absolute;
    top: 12%;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 26px;
    font-weight: 500;
    color: #f1f5f9;
    letter-spacing: 0.08em;
    text-align: center;
    white-space: nowrap;
    text-shadow: 0 0 24px rgba(125, 211, 252, 0.3);
    z-index: 5;
  }

  .subtitle {
    position: absolute;
    top: calc(12% + 44px);
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 14px;
    font-weight: 400;
    color: #cbd5e1;
    letter-spacing: 0.04em;
    text-align: center;
    max-width: 80vw;
    line-height: 1.5;
    text-shadow: 0 0 12px rgba(15, 15, 40, 0.6);
    z-index: 5;
  }

  .hint {
    position: absolute;
    top: calc(12% + 88px);
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 12px;
    color: #64748b;
    letter-spacing: 0.25em;
    pointer-events: none;
    animation: hint-pulse 2.4s ease-in-out infinite;
    z-index: 5;
  }

  @keyframes hint-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.85; }
  }

  .back {
    position: fixed;
    top: 28px;
    left: 28px;
    background: rgba(15, 15, 40, 0.6);
    border: 1px solid rgba(125, 211, 252, 0.25);
    color: #cbd5e1;
    padding: 9px 16px 9px 14px;
    border-radius: 9999px;
    font-size: 13px;
    letter-spacing: 0.08em;
    cursor: pointer;
    backdrop-filter: blur(8px);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.25s ease;
    z-index: 30;
  }
  .back:hover {
    background: rgba(125, 211, 252, 0.12);
    border-color: rgba(125, 211, 252, 0.5);
    color: #fff;
  }
  .back .arrow { font-size: 16px; line-height: 1; }

  .stage-area {
    position: relative;
    width: 0;
    height: 0;
    margin-top: 80px;
  }

  /* ===== 連接線：從水晶球生長 + 能量流動 ===== */
  .edges-svg {
    position: absolute;
    left: 0;
    top: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
    z-index: 1;
  }

  .edge {
    fill: none;
    stroke: var(--c);
    stroke-linecap: round;
  }

  .edge-grow {
    stroke-width: 2;
    opacity: 0.85;
    filter: url(#edge-glow);
    stroke-dasharray: var(--len);
    stroke-dashoffset: var(--len);
    animation: edge-grow 0.7s cubic-bezier(0.45, 0.05, 0.2, 1) forwards;
    animation-delay: calc(var(--i, 0) * 90ms + 80ms);
  }
  @keyframes edge-grow {
    to { stroke-dashoffset: 0; }
  }

  .edge-flow {
    stroke-width: 1.4;
    opacity: 0;
    stroke-dasharray: 4 14;
    animation:
      edge-flow-fade 0.5s ease-out forwards,
      edge-flow-march 1.6s linear infinite;
    animation-delay:
      calc(var(--i, 0) * 90ms + 700ms),
      calc(var(--i, 0) * 90ms + 700ms);
    filter: drop-shadow(0 0 4px var(--c));
  }
  @keyframes edge-flow-fade {
    to { opacity: 0.95; }
  }
  @keyframes edge-flow-march {
    from { stroke-dashoffset: 18; }
    to { stroke-dashoffset: 0; }
  }

  /* 泡泡基底 */
  .bubble {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(calc(var(--x, 0px) - 50%), calc(var(--y, 0px) - 50%));
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.4s cubic-bezier(0.34,1.4,0.5,1), filter 0.3s, box-shadow 0.3s;
    will-change: transform;
    animation: bubble-float 6s ease-in-out infinite;
    animation-delay: calc(var(--i, 0) * -1.1s);
  }

  @keyframes bubble-float {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 -6px; }
  }

  .bubble .label {
    color: inherit;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.04em;
    line-height: 1;
    pointer-events: none;
  }

  /* 類型泡泡：圓形大球，內含 icon + 標籤 */
  .genre-bubble {
    width: 130px;
    height: 130px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 30% 28%,
      color-mix(in srgb, var(--c) 95%, white 12%) 0%,
      color-mix(in srgb, var(--c) 80%, black 8%) 65%,
      color-mix(in srgb, var(--c) 55%, black 30%) 100%
    );
    color: #0a0a1f;
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--c) 12%, transparent),
      0 0 32px color-mix(in srgb, var(--c) 65%, transparent),
      inset 0 2px 6px rgba(255, 255, 255, 0.4),
      inset 0 -4px 12px rgba(0, 0, 0, 0.15);
  }

  .genre-bubble:hover {
    transform: translate(calc(var(--x, 0px) - 50%), calc(var(--y, 0px) - 50%)) scale(1.08);
    box-shadow:
      0 0 0 6px color-mix(in srgb, var(--c) 18%, transparent),
      0 0 56px color-mix(in srgb, var(--c) 90%, transparent),
      inset 0 2px 6px rgba(255, 255, 255, 0.55),
      inset 0 -4px 12px rgba(0, 0, 0, 0.18);
    filter: brightness(1.1);
  }

  .genre-bubble :global(.icon) {
    width: 36px;
    height: 36px;
    color: #0a0a1f;
    opacity: 0.92;
  }

  .center-anchor {
    --x: 0px;
    --y: 0px;
    width: 140px;
    height: 140px;
    pointer-events: none;
    cursor: default;
    opacity: 1;
    animation: bubble-float 5s ease-in-out infinite;
  }
  .center-anchor :global(.icon) { width: 32px; height: 32px; position: relative; z-index: 3; }
  .center-anchor .label { font-size: 13px; position: relative; z-index: 3; }

  /* ===== 層級 2：水晶球（中心錨點） ===== */
  .crystal-ball {
    overflow: hidden;
    background: radial-gradient(
      circle at 35% 30%,
      color-mix(in srgb, var(--c) 60%, white 25%) 0%,
      color-mix(in srgb, var(--c) 70%, black 5%) 45%,
      color-mix(in srgb, var(--c) 40%, #07061a 55%) 100%
    );
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--c) 30%, transparent),
      0 0 60px color-mix(in srgb, var(--c) 80%, transparent),
      0 0 120px color-mix(in srgb, var(--c) 40%, transparent),
      inset 0 4px 10px rgba(255, 255, 255, 0.5),
      inset 0 -10px 20px rgba(0, 0, 0, 0.35);
  }

  .crystal-ball .ball-swirl {
    position: absolute;
    inset: 8%;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      color-mix(in srgb, var(--c) 60%, white 30%) 25%,
      transparent 50%,
      color-mix(in srgb, var(--c) 80%, white 10%) 75%,
      transparent 100%
    );
    filter: blur(8px);
    mix-blend-mode: screen;
    opacity: 0.9;
    animation: ball-swirl-spin 6s linear infinite;
    pointer-events: none;
    z-index: 1;
  }
  @keyframes ball-swirl-spin {
    to { transform: rotate(360deg); }
  }

  .crystal-ball .ball-haze {
    position: absolute;
    inset: 18%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.55) 0%,
      transparent 60%
    );
    filter: blur(6px);
    mix-blend-mode: screen;
    animation: ball-haze-pulse 3.2s ease-in-out infinite;
    pointer-events: none;
    z-index: 2;
  }
  @keyframes ball-haze-pulse {
    0%, 100% { opacity: 0.4; transform: scale(0.85); }
    50% { opacity: 0.9; transform: scale(1.1); }
  }

  .crystal-ball .ball-stars {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background-image:
      radial-gradient(2px 2px at 22% 28%, rgba(255, 255, 255, 0.95), transparent 60%),
      radial-gradient(1.5px 1.5px at 70% 38%, rgba(255, 255, 255, 0.85), transparent 60%),
      radial-gradient(1.8px 1.8px at 55% 65%, rgba(255, 255, 255, 0.9), transparent 60%),
      radial-gradient(1.2px 1.2px at 30% 72%, rgba(255, 255, 255, 0.7), transparent 60%),
      radial-gradient(1.4px 1.4px at 78% 78%, rgba(255, 255, 255, 0.8), transparent 60%);
    animation: ball-stars-twinkle 2.4s ease-in-out infinite;
    pointer-events: none;
    z-index: 2;
  }
  @keyframes ball-stars-twinkle {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  /* 面向泡泡：較小，深色玻璃感 */
  .topic-bubble {
    width: 130px;
    height: 130px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 30% 28%,
      rgba(15, 15, 40, 0.95) 0%,
      rgba(15, 15, 40, 0.75) 100%
    );
    color: var(--c);
    border: 1.5px solid color-mix(in srgb, var(--c) 65%, transparent);
    box-shadow:
      0 0 28px color-mix(in srgb, var(--c) 35%, transparent),
      inset 0 0 18px color-mix(in srgb, var(--c) 12%, transparent);
    backdrop-filter: blur(6px);
  }

  .topic-bubble:hover {
    transform: translate(calc(var(--x, 0px) - 50%), calc(var(--y, 0px) - 50%)) scale(1.08);
    box-shadow:
      0 0 48px color-mix(in srgb, var(--c) 60%, transparent),
      inset 0 0 22px color-mix(in srgb, var(--c) 20%, transparent);
    border-color: var(--c);
  }

  .topic-bubble .label {
    font-size: 13px;
    text-align: center;
    padding: 0 12px;
    line-height: 1.35;
    color: var(--c);
    text-shadow: 0 0 10px color-mix(in srgb, var(--c) 50%, transparent);
  }

  .topic-bubble .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 12px var(--c);
    animation: dot-pulse 1.8s ease-in-out infinite;
  }
  @keyframes dot-pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.3); }
  }

  /* HUD 面板（同前） */
  .hud-panel {
    position: fixed;
    top: 24px;
    right: 24px;
    bottom: 24px;
    width: 440px;
    max-width: calc(100vw - 48px);
    background: rgba(15, 15, 40, 0.82);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(125, 211, 252, 0.25);
    border-radius: 18px;
    padding: 28px 30px;
    color: #e0e7ff;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(125, 211, 252, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    z-index: 50;
    display: flex;
    flex-direction: column;
  }

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }

  .hud-tag {
    font-size: 11px;
    letter-spacing: 0.25em;
    color: var(--accent);
    text-transform: uppercase;
    padding: 4px 10px;
    border: 1px solid var(--accent);
    border-radius: 999px;
    box-shadow: 0 0 12px var(--accent);
  }

  .hud-panel h2 {
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 600;
    color: #f8fafc;
    line-height: 1.3;
  }

  .hud-body {
    flex: 1;
    overflow-y: auto;
    padding-right: 6px;
    line-height: 1.85;
    color: #cbd5e1;
    font-size: 14.5px;
  }

  .hud-body :global(p) { margin: 0 0 12px; }
  .hud-body :global(h1) { display: none; }
  .hud-body :global(h2) {
    font-size: 16px;
    color: #f1f5f9;
    margin: 22px 0 10px;
    letter-spacing: 0.04em;
    border-left: 3px solid var(--accent, #7dd3fc);
    padding-left: 10px;
  }
  .hud-body :global(h3) {
    font-size: 14px;
    color: #e2e8f0;
    margin: 18px 0 6px;
    font-weight: 600;
  }
  .hud-body :global(blockquote) {
    margin: 0 0 14px;
    padding: 10px 14px;
    border-left: 3px solid var(--accent, #7dd3fc);
    background: rgba(125, 211, 252, 0.06);
    border-radius: 4px;
    color: #e0e7ff;
  }
  .hud-body :global(blockquote p) { margin: 0; }
  .hud-body :global(ul), .hud-body :global(ol) { padding-left: 20px; margin: 0 0 14px; }
  .hud-body :global(li) { margin: 4px 0; }
  .hud-body :global(strong) { color: #fef3c7; font-weight: 600; }
  .hud-body :global(em) { color: #f5d0fe; font-style: normal; }
  .hud-body :global(code) {
    background: rgba(125, 211, 252, 0.12);
    color: #93c5fd;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
  }
  .hud-body :global(pre) {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(125, 211, 252, 0.15);
    border-radius: 8px;
    padding: 12px 14px;
    overflow-x: auto;
    margin: 0 0 14px;
  }
  .hud-body :global(pre code) { background: none; padding: 0; color: #cbd5e1; }
  .hud-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 14px;
    font-size: 13px;
  }
  .hud-body :global(th), .hud-body :global(td) {
    padding: 8px 10px;
    border: 1px solid rgba(125, 211, 252, 0.15);
    text-align: left;
  }
  .hud-body :global(th) { background: rgba(125, 211, 252, 0.08); color: #f1f5f9; font-weight: 600; }
  .hud-body :global(hr) { border: none; border-top: 1px solid rgba(125, 211, 252, 0.15); margin: 18px 0; }
  .hud-body :global(a) { color: var(--accent, #7dd3fc); }

  /* ===== Filter 面包屑 chips ===== */
  .chips {
    position: absolute;
    top: 28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 80vw;
    z-index: 20;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 6px 14px;
    border-radius: 9999px;
    border: 1px solid color-mix(in srgb, var(--c, #a78bfa) 60%, transparent);
    background: color-mix(in srgb, var(--c, #a78bfa) 12%, rgba(15, 15, 40, 0.7));
    color: #f1f5f9;
    font-size: 12px;
    letter-spacing: 0.05em;
    cursor: pointer;
    backdrop-filter: blur(6px);
    box-shadow: 0 0 12px color-mix(in srgb, var(--c, #a78bfa) 35%, transparent);
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .chip:hover {
    background: color-mix(in srgb, var(--c, #a78bfa) 22%, rgba(15, 15, 40, 0.7));
    box-shadow: 0 0 18px color-mix(in srgb, var(--c, #a78bfa) 60%, transparent);
  }
  .chip-key {
    color: color-mix(in srgb, var(--c, #a78bfa) 70%, white 30%);
    font-weight: 600;
  }
  .chip-sep { opacity: 0.5; }
  .chip-val { color: #f8fafc; }
  .chip-x { opacity: 0.5; margin-left: 4px; font-size: 14px; line-height: 1; }
  .chip:hover .chip-x { opacity: 1; }
  .chip-reset {
    --c: #fbbf24;
    border-style: dashed;
  }

  /* ===== 結果面板 ===== */
  .results-panel {
    width: 480px;
  }
  .result-block {
    margin-bottom: 22px;
    padding: 14px 16px;
    border-left: 3px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-radius: 0 10px 10px 0;
  }
  .result-block:last-child { margin-bottom: 0; }
  .result-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 10px;
  }
  .result-key {
    font-size: 11px;
    letter-spacing: 0.25em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .result-val {
    font-size: 18px;
    font-weight: 600;
    color: #f8fafc;
  }
  .result-content {
    font-size: 13.5px;
    line-height: 1.7;
    color: #cbd5e1;
  }
  .result-content :global(h1) { display: none; }
  .result-content :global(p) { margin: 0 0 8px; }
  .result-content :global(ul), .result-content :global(ol) {
    padding-left: 18px; margin: 0 0 8px;
  }

  .reset-btn {
    background: transparent;
    border: 1px solid rgba(244, 114, 182, 0.4);
    color: #f5d0fe;
    padding: 8px 18px;
    border-radius: 9999px;
    font-size: 12px;
    letter-spacing: 0.2em;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .reset-btn:hover {
    background: rgba(244, 114, 182, 0.15);
    border-color: rgba(244, 114, 182, 0.8);
    color: #fff;
    box-shadow: 0 0 16px rgba(244, 114, 182, 0.4);
  }

  .hud-body::-webkit-scrollbar { width: 6px; }
  .hud-body::-webkit-scrollbar-track { background: transparent; }
  .hud-body::-webkit-scrollbar-thumb { background: rgba(125, 211, 252, 0.25); border-radius: 3px; }

  .hud-foot {
    margin-top: 24px;
    font-size: 11px;
    color: #64748b;
    letter-spacing: 0.2em;
    border-top: 1px solid rgba(125, 211, 252, 0.12);
    padding-top: 14px;
  }

  .close {
    background: none;
    border: 1px solid rgba(148, 163, 184, 0.3);
    color: #cbd5e1;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .close:hover { background: rgba(148, 163, 184, 0.15); border-color: rgba(148, 163, 184, 0.6); color: #fff; }

  /* ===== 層級 3：思索揭曉覆蓋層 ===== */
  .ponder-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(15, 10, 40, 0.55) 0%,
      rgba(7, 6, 26, 0.85) 70%
    );
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
    pointer-events: all;
  }

  .ponder-blob {
    position: absolute;
    width: 80vmin;
    height: 80vmin;
    border-radius: 50%;
    filter: blur(70px);
    mix-blend-mode: screen;
    will-change: transform;
  }
  .pb-1 {
    background: radial-gradient(circle, #f472b6 0%, transparent 70%);
    animation: ponder-pulse-1 1.6s ease-in-out infinite;
  }
  .pb-2 {
    background: radial-gradient(circle, #38bdf8 0%, transparent 70%);
    animation: ponder-pulse-2 1.6s ease-in-out infinite;
  }
  .pb-3 {
    background: radial-gradient(circle, #a78bfa 0%, transparent 70%);
    animation: ponder-pulse-3 1.6s ease-in-out infinite;
  }
  @keyframes ponder-pulse-1 {
    0%, 100% { transform: translate(-30%, -25%) scale(0.8); opacity: 0.6; }
    50% { transform: translate(-15%, -10%) scale(1.1); opacity: 1; }
  }
  @keyframes ponder-pulse-2 {
    0%, 100% { transform: translate(30%, 20%) scale(0.9); opacity: 0.7; }
    50% { transform: translate(10%, -5%) scale(1.2); opacity: 1; }
  }
  @keyframes ponder-pulse-3 {
    0%, 100% { transform: translate(0%, 30%) scale(0.7); opacity: 0.5; }
    50% { transform: translate(15%, 10%) scale(1.15); opacity: 0.95; }
  }

  .ponder-ring {
    position: relative;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    border: 2px solid rgba(244, 114, 182, 0.4);
    box-shadow:
      0 0 60px rgba(244, 114, 182, 0.5),
      inset 0 0 40px rgba(167, 139, 250, 0.4);
    animation: ring-breathe 1.6s ease-in-out infinite;
  }
  .ponder-ring::before,
  .ponder-ring::after {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    border: 1px solid rgba(56, 189, 252, 0.3);
    animation: ring-breathe 1.6s ease-in-out infinite;
  }
  .ponder-ring::after {
    inset: -22px;
    border-color: rgba(167, 139, 250, 0.25);
    animation-delay: 0.3s;
  }
  @keyframes ring-breathe {
    0%, 100% { transform: scale(0.85); opacity: 0.6; }
    50% { transform: scale(1.05); opacity: 1; }
  }

  .ponder-text {
    position: absolute;
    bottom: 20%;
    left: 50%;
    transform: translateX(-50%);
    color: #f5d0fe;
    font-size: 14px;
    letter-spacing: 0.4em;
    text-shadow: 0 0 16px rgba(244, 114, 182, 0.6);
    animation: ponder-text-fade 1.6s ease-in-out infinite;
  }
  @keyframes ponder-text-fade {
    0%, 100% { opacity: 0.5; letter-spacing: 0.4em; }
    50% { opacity: 1; letter-spacing: 0.55em; }
  }
</style>
