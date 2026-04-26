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
  /** @type {{id:string, label:string, detail:string} | null} */
  let selectedTopic = $state(null);
  let topicHtml = $state('');
  let topicLoading = $state(false);

  const RADIUS = 260;

  /** @param {number} i @param {number} total */
  function clusterPos(i, total) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS };
  }

  /** @param {any} g */
  function pickGenre(g) {
    selectedGenre = g;
    stage = 'topic';
  }

  /** @param {any} t */
  async function pickTopic(t) {
    selectedTopic = t;
    topicLoading = true;
    topicHtml = '';
    try {
      const res = await fetch(`${base}/topics/${t.id}.md`);
      if (res.ok) {
        const md = await res.text();
        topicHtml = /** @type {string} */ (marked.parse(md));
        topicLoading = false;
        return;
      }
    } catch {}
    topicHtml = `<p>${t.detail}</p>`;
    topicLoading = false;
  }

  function backToGenres() {
    selectedGenre = null;
    selectedTopic = null;
    stage = 'genre';
  }

  function closeTopic() {
    selectedTopic = null;
  }

  const question = $derived(
    stage === 'genre'
      ? '你想做什麼類型的遊戲？'
      : selectedGenre
      ? `${selectedGenre.label}　中，你想學哪個面向？`
      : ''
  );
</script>

<svelte:head>
  <title>遊戲設計學習</title>
</svelte:head>

<svelte:window
  onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    if (selectedTopic) closeTopic();
    else if (stage === 'topic') backToGenres();
  }}
/>

<main>
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

  <!-- 提示 -->
  <p class="hint">點擊任一泡泡選擇</p>

  <!-- 泡泡群 -->
  <div class="stage-area">
    {#if stage === 'genre'}
      {#each data.genres as g, i (g.id)}
        {@const p = clusterPos(i, data.genres.length)}
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
      <!-- 中心保留所選類型，當作上下文錨點 -->
      <div
        class="bubble genre-bubble center-anchor"
        style="--c:{selectedGenre.color};"
        in:scale={{ start: 0.6, duration: 500, easing: cubicOut }}
      >
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

  <!-- 教材面板 -->
  {#if selectedTopic}
    <div
      class="hud-panel"
      role="region"
      aria-label="設計面向詳情"
      transition:fly={{ x: 40, duration: 450, easing: cubicOut }}
    >
      <div
        class="hud-header"
        style="--accent:{selectedGenre?.color || '#7dd3fc'};"
      >
        <span class="hud-tag">設計面向</span>
        <button class="close" onclick={closeTopic} aria-label="關閉">×</button>
      </div>
      <h2>{selectedTopic.label}</h2>
      <div
        class="hud-body"
        style="--accent:{selectedGenre?.color || '#7dd3fc'};"
      >
        {#if topicLoading}
          <p class="loading">載入中…</p>
        {:else}
          {@html topicHtml}
        {/if}
      </div>
      <div class="hud-foot">按 ESC 或點擊 × 關閉</div>
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
    background:
      radial-gradient(ellipse at 20% 20%, rgba(56,189,248,0.08), transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(244,114,182,0.06), transparent 60%),
      #0a0a1f;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

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

  .hint {
    position: absolute;
    top: calc(12% + 48px);
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
    width: 105px;
    height: 105px;
    pointer-events: none;
    cursor: default;
    opacity: 0.85;
    animation: bubble-float 5s ease-in-out infinite;
  }
  .center-anchor :global(.icon) { width: 28px; height: 28px; }
  .center-anchor .label { font-size: 12px; }

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

  .loading {
    color: #64748b;
    font-size: 13px;
    letter-spacing: 0.15em;
    text-align: center;
    margin-top: 40px;
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
</style>
