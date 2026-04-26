<script>
  import { onMount } from 'svelte';
  import { fly, scale, fade } from 'svelte/transition';
  import { cubicOut, cubicInOut } from 'svelte/easing';
  import { base } from '$app/paths';
  import { marked } from 'marked';
  import {
    forceSimulation,
    forceCollide,
    forceX,
    forceY,
    forceManyBody
  } from 'd3-force';
  import data from '$lib/data/genres.json';
  import GenreIcon from '$lib/GenreIcon.svelte';

  marked.setOptions({ breaks: true, gfm: true });

  /** @type {'genre' | 'topic'} */
  let stage = $state('genre');
  /** @type {{id:string, label:string, description?:string, color:string, topics:any[]} | null} */
  let selectedGenre = $state(null);
  /** @type {Record<string, {id:string, label:string, detail:string}>} */
  let selections = $state({});
  /** @type {string | null} */
  let activeGenreId = $state(null);
  /** @type {{genre:any, topic?:any, idx:number, total:number} | null} */
  let hovered = $state(null);
  /** @type {ReturnType<typeof setTimeout> | null} */
  let hoverClearTimer = null;

  /** @param {{genre:any, topic?:any, idx:number, total:number}} h */
  function setHovered(h) {
    if (hoverClearTimer) clearTimeout(hoverClearTimer);
    hovered = h;
  }
  function deferClearHover() {
    if (hoverClearTimer) clearTimeout(hoverClearTimer);
    hoverClearTimer = setTimeout(() => (hovered = null), 180);
  }
  let pondering = $state(false);
  let resultsHtml = $state(/** @type {Record<string, string>} */ ({}));
  let showResults = $state(false);

  const BASE_RADIUS = 260;
  const PONDER_MS = 1600;

  const allGenres = /** @type {any[]} */ (/** @type {any} */ (data).genres);
  const remainingGenres = $derived(allGenres.filter((g) => !selections[g.id]));
  const allDone = $derived(remainingGenres.length === 0);

  /** 找下一個還沒選的 genre id；都選完回 null */
  function nextUnselectedGenreId(after = activeGenreId) {
    const startIdx = Math.max(0, allGenres.findIndex((/** @type {any} */ g) => g.id === after));
    const total = allGenres.length;
    for (let i = 1; i <= total; i++) {
      const g = /** @type {any} */ (allGenres[(startIdx + i) % total]);
      if (!selections[g.id]) return g.id;
    }
    return null;
  }

  const activeGenre = $derived(
    /** @type {any} */ (allGenres.find((/** @type {any} */ g) => g.id === activeGenreId)) ?? null
  );

  /**
   * 根據泡泡數量與大小自動撐開圓周，避免相鄰泡泡擠在一起
   * @param {number} total
   * @param {number} bubbleSize
   * @param {number} base
   */
  function clusterRadius(total, bubbleSize, base = BASE_RADIUS) {
    if (total <= 1) return base;
    // 周長 = 2πR；要讓 N 顆寬 W 的泡泡相距至少 1.25W
    const minR = Math.ceil((bubbleSize * 1.25 * total) / (2 * Math.PI));
    return Math.max(base, minR);
  }

  /** @param {number} i @param {number} total @param {number} [radius] */
  function clusterPos(i, total, radius = BASE_RADIUS) {
    // 加半格偏移：避免第一顆剛好出現在正上方擋到問句文字
    const angle = ((i + 0.5) / total) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }

  const genreRadius = $derived(clusterRadius(remainingGenres.length, 172));
  const topicRadius = $derived(
    selectedGenre ? clusterRadius(selectedGenre.topics.length, 138) : BASE_RADIUS
  );

  // === 攤平模式：所有泡泡同時顯示，依類別群聚 ===
  /** @param {number} count */
  function topicBubbleSize(count) {
    // 最小 78px 才放得下 4 個中文字（"經營/管理" 這種）
    if (count <= 4) return 116;
    if (count <= 8) return 100;
    if (count <= 14) return 90;
    if (count <= 22) return 84;
    return 78;
  }
  /**
   * 多環裝填：超過單環容量時往外加環
   * @param {number} total @param {number} size
   * @returns {{x:number, y:number}[]}
   */
  function clusterPositions(total, size) {
    if (total === 0) return [];
    if (total === 1) return [{ x: 0, y: 0 }];
    const spacing = size * 1.18;
    /** @type {{x:number,y:number}[]} */
    const out = [];
    let placed = 0;
    let ring = 1;
    while (placed < total) {
      const r = ring * spacing * 0.95;
      const cap = Math.max(2, Math.floor((2 * Math.PI * r) / spacing));
      const ringCount = Math.min(cap, total - placed);
      const offset = (ring % 2) * (Math.PI / Math.max(1, ringCount));
      for (let i = 0; i < ringCount; i++) {
        const ang = (i / ringCount) * Math.PI * 2 - Math.PI / 2 + offset;
        out.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
      }
      placed += ringCount;
      ring++;
    }
    return out;
  }
  /**
   * 取得 cluster 外圍最大半徑（給 halo 與 outer 計算用）
   * @param {number} total @param {number} size
   */
  function clusterMaxRadius(total, size) {
    if (total === 0) return 0;
    if (total === 1) return size / 2;
    const spacing = size * 1.18;
    let placed = 0;
    let ring = 0;
    while (placed < total) {
      ring++;
      const r = ring * spacing * 0.95;
      const cap = Math.max(2, Math.floor((2 * Math.PI * r) / spacing));
      placed += Math.min(cap, total - placed);
    }
    return ring * spacing * 0.95 + size / 2;
  }
  /** @param {number} count */
  function outerRadius(count) {
    if (count <= 4) return 320;
    if (count <= 6) return 380;
    if (count <= 8) return 440;
    return 500;
  }
  const flatOuter = $derived(outerRadius(allGenres.length));

  // === 有機排列：d3-force 物理模擬 ===
  /** @typedef {{gi:number, ti:number, gx:number, gy:number, radius:number, size:number, x:number, y:number, blob:string, blobAlt:string}} LayoutNode */

  /** 產生有機 blob border-radius（8 個百分比） */
  function randomBlob() {
    const v = () => 28 + Math.floor(Math.random() * 54); // 28-82%
    return `${v()}% ${v()}% ${v()}% ${v()}% / ${v()}% ${v()}% ${v()}% ${v()}%`;
  }
  /** @type {LayoutNode[]} */
  let layoutNodes = $state([]);
  /** @type {{gi:number, x:number, y:number}[]} */
  let clusterCenters = $state([]);

  function buildOrganicLayout() {
    if (typeof window === 'undefined') return;
    if (!activeGenreId) {
      layoutNodes = [];
      return;
    }
    const g = /** @type {any} */ (
      allGenres.find((/** @type {any} */ x) => x.id === activeGenreId)
    );
    if (!g) {
      layoutNodes = [];
      return;
    }

    const W = window.innerWidth;
    const H = window.innerHeight;
    // 預留：title 100 + subtitle 30 + tab 50 + chips 40 = ~220 + 12% buffer
    const padEdge = 30;
    const padTop = 290;
    const padBottom = 50;
    const maxX = W / 2 - padEdge;
    const minY = -(H / 2) + padTop - 80;
    const maxY = H / 2 - padBottom - 80;

    const tSize = topicBubbleSize(g.topics.length);
    const gi = /** @type {any} */ (allGenres.indexOf(g));

    /** @type {LayoutNode[]} */
    const nodes = [];
    // 中央留 anchor 空間
    const anchorR = 70;
    for (let ti = 0; ti < g.topics.length; ti++) {
      // 初始位置：環狀分散在 anchor 外圈
      const a0 = (ti / g.topics.length) * Math.PI * 2;
      const r0 = anchorR + tSize / 2 + 30;
      nodes.push({
        gi,
        ti,
        gx: 0,
        gy: 0,
        radius: tSize / 2,
        size: tSize,
        x: Math.cos(a0) * r0,
        y: Math.sin(a0) * r0,
        blob: randomBlob(),
        blobAlt: randomBlob()
      });
    }

    /** @param {any} d */
    const visualR = (d) => d.radius * 1.25 + 8;

    // 中央 anchor 排斥力：把泡泡推離中心
    const centerRepel = /** @type {any} */ (forceCollide(anchorR + 8));
    centerRepel.strength(0.6);
    centerRepel.iterations(2);

    const collide = /** @type {any} */ (forceCollide(visualR));
    collide.strength(1);
    collide.iterations(8);

    const sim = forceSimulation(/** @type {any[]} */ (nodes))
      .force('center_x', forceX(0).strength(0.04))
      .force('center_y', forceY(0).strength(0.04))
      .force('collide', collide)
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();

    // 中心防呆：把任何在 anchor 範圍內的泡泡推出去
    for (const n of nodes) {
      const dist = Math.hypot(n.x, n.y);
      const minDist = anchorR + n.radius + 12;
      if (dist < minDist) {
        const ux = dist === 0 ? 0 : n.x / dist;
        const uy = dist === 0 ? 1 : n.y / dist;
        n.x = ux * minDist || (Math.random() - 0.5) * minDist;
        n.y = uy * minDist || minDist;
      }
    }

    // 限制到視窗內
    for (const n of nodes) {
      n.x = Math.max(-maxX + n.radius, Math.min(maxX - n.radius, n.x));
      n.y = Math.max(minY + n.radius, Math.min(maxY - n.radius, n.y));
    }

    layoutNodes = nodes;
    clusterCenters = [{ gi, x: 0, y: 0 }];
  }

  // activeGenreId 變動時自動重排
  $effect(() => {
    if (activeGenreId) buildOrganicLayout();
  });

  onMount(() => {
    if (!activeGenreId && allGenres.length > 0) {
      activeGenreId = /** @type {any} */ (allGenres[0]).id;
    }
    buildOrganicLayout();
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(buildOrganicLayout, 220);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
    };
  });

  /** @param {any} g */
  function pickGenre(g) {
    selectedGenre = g;
    stage = 'topic';
  }

  /** @param {any} t @param {any} [genre] */
  async function pickTopic(t, genre) {
    const target = genre ?? activeGenre ?? selectedGenre;
    if (!target) return;
    const genreId = target.id;
    // 寫入該元素的選擇
    selections = { ...selections, [genreId]: t };
    selectedGenre = null;
    stage = 'genre';
    // 清掉 hover 預覽
    if (hoverClearTimer) clearTimeout(hoverClearTimer);
    hovered = null;

    // 自動推進到下一個還沒選的 genre
    const next = nextUnselectedGenreId(genreId);
    if (next) activeGenreId = next;

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
    activeGenreId = allGenres.length > 0 ? /** @type {any} */ (allGenres[0]).id : null;
  }

  /** @param {string} id */
  function pickGenreTab(id) {
    activeGenreId = id;
  }

  function closeResults() {
    showResults = false;
  }

  const root = /** @type {any} */ (data).root;
  const rootLabel = /** @type {string} */ (root.label);
  const rootDesc = /** @type {string} */ (root.description ?? '');
  const question = $derived(
    Object.keys(selections).length === 0
      ? rootLabel
      : allDone
      ? '你的遊戲設計組合'
      : `已選 ${Object.keys(selections).length} / ${allGenres.length}`
  );
  const subtitle = $derived(
    Object.keys(selections).length === 0
      ? rootDesc
      : allDone
      ? '水晶球已揭示了你選的元素——點右側面板看詳情。'
      : `從各類別中各挑一個。再選 ${remainingGenres.length} 個就完成。`
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

  <!-- 範例遊戲截圖：hover 元素時左右兩側顯示 -->
  {#if hovered && stage === 'genre'}
    {@const allExamples = /** @type {any[]} */ (hovered.genre.topics).flatMap(
      (/** @type {any} */ t) =>
        (t.examples || []).map((/** @type {any} */ e) => ({
          ...e,
          topicLabel: t.label
        }))
    )}
    {@const half = Math.ceil(allExamples.length / 2)}
    {@const leftList = allExamples.slice(0, half)}
    {@const rightList = allExamples.slice(half)}
    <aside
      class="examples-rail left"
      style="--c:{hovered.genre.color};"
      onmouseenter={() => hovered && setHovered(hovered)}
      onmouseleave={deferClearHover}
      transition:fade={{ duration: 220 }}
    >
      {#each leftList as ex, i (ex.appid ?? ex.name)}
        <div class="example-card" style="--c:{hovered.genre.color}; --i:{i};">
          {#if ex.screenshot}
            <img
              src={ex.screenshot}
              alt={ex.name}
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          {:else if ex.appid}
            <img
              src="https://cdn.cloudflare.steamstatic.com/steam/apps/{ex.appid}/library_hero.jpg"
              alt={ex.name}
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          {:else}
            <div class="example-img-fallback"></div>
          {/if}
          <div class="example-meta">
            <span class="example-topic">{ex.topicLabel}</span>
            <span class="example-name">{ex.name}</span>
          </div>
        </div>
      {/each}
    </aside>
    <aside
      class="examples-rail right"
      style="--c:{hovered.genre.color};"
      onmouseenter={() => hovered && setHovered(hovered)}
      onmouseleave={deferClearHover}
      transition:fade={{ duration: 220 }}
    >
      {#each rightList as ex, i (ex.appid ?? ex.name)}
        <div class="example-card" style="--c:{hovered.genre.color}; --i:{i};">
          {#if ex.screenshot}
            <img
              src={ex.screenshot}
              alt={ex.name}
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          {:else if ex.appid}
            <img
              src="https://cdn.cloudflare.steamstatic.com/steam/apps/{ex.appid}/library_hero.jpg"
              alt={ex.name}
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          {:else}
            <div class="example-img-fallback"></div>
          {/if}
          <div class="example-meta">
            <span class="example-topic">{ex.topicLabel}</span>
            <span class="example-name">{ex.name}</span>
          </div>
        </div>
      {/each}
    </aside>
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

  <!-- 類別 Tab 列 -->
  {#if !allDone}
    <nav class="tab-bar" aria-label="元素類別">
      {#each allGenres as g (g.id)}
        {@const isActive = activeGenreId === g.id}
        {@const isPicked = !!selections[g.id]}
        <button
          class="tab"
          class:active={isActive}
          class:picked={isPicked}
          style="--c:{g.color};"
          onclick={() => pickGenreTab(g.id)}
        >
          <GenreIcon id={g.id} />
          <span class="tab-label">{g.label}</span>
          {#if isPicked}
            <span class="tab-check" aria-hidden="true">✓</span>
          {/if}
        </button>
      {/each}
    </nav>
  {/if}

  <!-- 泡泡群：所有元素的子選項一次鋪在主畫面，d3-force 物理排列 -->
  <div class="stage-area">
    {#if !allDone && layoutNodes.length > 0}
      <!-- Cluster halo + anchor（在 cluster 中心） -->
      {#each clusterCenters as c (c.gi)}
        {@const g = allGenres[c.gi]}
        <div
          class="cluster-halo"
          style="--x:{c.x}px; --y:{c.y}px; --c:{g.color};"
          aria-hidden="true"
        ></div>
        <div class="cluster-anchor" style="--x:{c.x}px; --y:{c.y}px; --c:{g.color};">
          <GenreIcon id={g.id} />
          <span class="anchor-label">{g.label}</span>
        </div>
      {/each}

      <!-- Topic bubbles：用 d3-force 計算後的位置 -->
      {#each layoutNodes as node (node.gi + '-' + node.ti)}
        {@const g = allGenres[node.gi]}
        {@const t = g.topics[node.ti]}
        {@const isSelected = selections[g.id]?.id === t.id}
        <button
          class="bubble topic-bubble cluster-topic"
          class:selected={isSelected}
          style="--x:{node.x}px; --y:{node.y}px; --c:{g.color}; --size:{node.size}px; --br:{node.blob}; --br-alt:{node.blobAlt};"
          onclick={() => pickTopic(t, g)}
          onmouseenter={() => setHovered({ genre: g, topic: t, idx: node.gi, total: allGenres.length })}
          onmouseleave={deferClearHover}
          onfocus={() => setHovered({ genre: g, topic: t, idx: node.gi, total: allGenres.length })}
          onblur={deferClearHover}
          aria-label={`${g.label} - ${t.label}`}
        >
          <span class="label">{t.label}</span>
          {#if isSelected}
            <span class="check" aria-hidden="true">✓</span>
          {/if}
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
    background: #04031a;
    color: #e0e7ff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  main {
    width: 100vw;
    height: 100vh;
    position: relative;
    background: #04031a;
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
    width: 60vmin;
    height: 60vmin;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.4;
    mix-blend-mode: screen;
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
    display: none;
  }
  @keyframes bands-spin {
    to { transform: rotate(360deg); }
  }

  .grain {
    display: none;
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
    font-size: 32px;
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
    top: calc(12% + 56px);
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 18px;
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
    top: calc(12% + 108px);
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 14px;
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
    padding: 11px 20px 11px 18px;
    border-radius: 9999px;
    font-size: 15px;
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
    font-size: 17px;
    letter-spacing: 0.02em;
    line-height: 1.05;
    pointer-events: none;
  }
  .cluster-topic .label {
    font-size: inherit;
    line-height: 1.05;
    text-align: center;
    padding: 0 6px;
    word-break: break-word;
    overflow-wrap: anywhere;
    max-width: 100%;
  }

  /* 類型泡泡：圓形大球，內含 icon + 標籤 */
  .root-bubble {
    width: 168px !important;
    height: 168px !important;
    padding: 0 18px;
  }
  .root-bubble .label {
    font-size: 19px;
    margin-top: 2px;
  }
  .bubble-desc {
    color: rgba(10, 10, 31, 0.78);
    font-size: 13px;
    line-height: 1.45;
    text-align: center;
    letter-spacing: 0.02em;
    max-width: 130px;
    font-weight: 500;
    margin-top: 4px;
    pointer-events: none;
  }

  /* ===== 範例遊戲側邊欄 ===== */
  .examples-rail {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 14px;
    z-index: 6;
    width: 240px;
    max-height: 92vh;
    overflow: hidden;
    pointer-events: auto;
  }
  .examples-rail.left { left: 28px; }
  .examples-rail.right { right: 28px; }

  .example-card {
    border-radius: 10px;
    overflow: hidden;
    background: rgba(15, 15, 40, 0.85);
    border: 1px solid color-mix(in srgb, var(--c) 50%, transparent);
    box-shadow:
      0 0 18px color-mix(in srgb, var(--c) 30%, transparent),
      0 6px 18px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(6px);
    animation: example-in 0.4s cubic-bezier(0.34, 1.4, 0.5, 1) backwards;
    animation-delay: calc(var(--i, 0) * 70ms + 100ms);
  }
  .examples-rail.left .example-card { transform-origin: left center; }
  .examples-rail.right .example-card { transform-origin: right center; }

  @keyframes example-in {
    from { opacity: 0; transform: translateX(-20px) scale(0.92); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  .examples-rail.right .example-card {
    animation-name: example-in-right;
  }
  @keyframes example-in-right {
    from { opacity: 0; transform: translateX(20px) scale(0.92); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }

  .example-card img {
    width: 100%;
    height: 135px;
    display: block;
    object-fit: cover;
    object-position: center;
  }
  .example-img-fallback {
    width: 100%;
    height: 135px;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--c) 30%, transparent) 0%,
      rgba(15, 15, 40, 0.5) 100%
    );
  }
  .example-meta {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .example-topic {
    font-size: 11px;
    color: var(--c);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .example-name {
    font-size: 14px;
    color: #f1f5f9;
    font-weight: 600;
    line-height: 1.35;
  }

  /* 螢幕較窄時隱藏 */
  @media (max-width: 1100px) {
    .examples-rail { display: none; }
  }

  /* ===== Hover 預覽：小泡泡從大泡泡背後扇形彈出 ===== */
  .mini-bubble {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--c);
    background: radial-gradient(
      circle at 32% 30%,
      rgba(15, 15, 40, 0.95) 0%,
      rgba(15, 15, 40, 0.78) 100%
    );
    border: 1.5px solid color-mix(in srgb, var(--c) 65%, transparent);
    box-shadow:
      0 0 22px color-mix(in srgb, var(--c) 40%, transparent),
      inset 0 0 14px color-mix(in srgb, var(--c) 14%, transparent);
    backdrop-filter: blur(4px);
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    pointer-events: auto;
    z-index: 2;
    transform: translate(calc(var(--sx) - 50%), calc(var(--sy) - 50%));
    animation: mini-hatch 0.45s cubic-bezier(0.34, 1.55, 0.5, 1) backwards;
    animation-delay: calc(var(--i, 0) * 65ms);
    transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.5, 1), box-shadow 0.25s, border-color 0.25s;
  }
  .mini-bubble:hover {
    transform: translate(calc(var(--sx) - 50%), calc(var(--sy) - 50%)) scale(1.12);
    box-shadow:
      0 0 36px color-mix(in srgb, var(--c) 70%, transparent),
      inset 0 0 18px color-mix(in srgb, var(--c) 25%, transparent);
    border-color: var(--c);
  }
  .mini-bubble:active {
    transform: translate(calc(var(--sx) - 50%), calc(var(--sy) - 50%)) scale(1.04);
  }
  .mini-bubble::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
    opacity: 0.5;
    pointer-events: none;
  }
  .mini-label {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    padding: 0 8px;
    letter-spacing: 0.04em;
    text-shadow: 0 0 10px color-mix(in srgb, var(--c) 50%, transparent);
  }

  @keyframes mini-hatch {
    0% {
      opacity: 0;
      transform: translate(calc(var(--bx) - 50%), calc(var(--by) - 50%)) scale(0.25);
    }
    50% {
      opacity: 0.85;
    }
    100% {
      opacity: 1;
      transform: translate(calc(var(--sx) - 50%), calc(var(--sy) - 50%)) scale(1);
    }
  }

  /* 大泡泡需要在小泡泡之上，當小泡泡飛出前會被遮住 */
  .root-bubble { z-index: 3; }

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
  .center-anchor :global(.icon) { width: 36px; height: 36px; position: relative; z-index: 3; }
  .center-anchor .label { font-size: 16px; position: relative; z-index: 3; }

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
    width: var(--size, 100px);
    height: var(--size, 100px);
    font-size: clamp(10px, calc(var(--size, 100px) * 0.18), 17px);
    border-radius: var(--br, 50%);
    transition: border-radius 0.7s cubic-bezier(0.45, 0.05, 0.2, 1),
                box-shadow 0.18s, border-color 0.18s, background 0.18s,
                transform 0.25s cubic-bezier(0.34, 1.4, 0.5, 1);
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

  /* ===== 攤平模式：cluster anchor + halo + selected ===== */
  .cluster-anchor {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%));
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 22px 12px 18px;
    border-radius: 9999px;
    border: 1.5px solid var(--c);
    background: color-mix(in srgb, var(--c) 18%, rgba(8, 6, 24, 0.85));
    color: color-mix(in srgb, var(--c) 50%, white 50%);
    pointer-events: none;
    z-index: 4;
    box-shadow:
      0 0 28px color-mix(in srgb, var(--c) 55%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(10px);
  }
  .cluster-anchor :global(.icon) {
    width: 28px;
    height: 28px;
    color: color-mix(in srgb, var(--c) 70%, white 30%);
  }
  .anchor-label {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }

  .cluster-halo {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%));
    width: 480px;
    height: 480px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--c) 32%, transparent) 0%,
      color-mix(in srgb, var(--c) 14%, transparent) 45%,
      transparent 75%
    );
    pointer-events: none;
    z-index: 0;
    mix-blend-mode: screen;
    filter: blur(8px);
  }

  .cluster-topic {
    animation: none !important;
    backdrop-filter: none;
    will-change: auto;
    contain: layout style paint;
  }
  .cluster-topic:hover {
    z-index: 10;
    border-radius: var(--br-alt, 50%);
    transform: translate(calc(var(--x, 0px) - 50%), calc(var(--y, 0px) - 50%)) scale(1.15) rotate(8deg);
  }

  .cluster-topic.selected {
    background: radial-gradient(
      circle at 30% 28%,
      color-mix(in srgb, var(--c) 80%, white 15%) 0%,
      color-mix(in srgb, var(--c) 60%, black 5%) 100%
    );
    color: #0a0a1f;
    border-color: var(--c);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent),
      0 0 56px color-mix(in srgb, var(--c) 90%, transparent),
      inset 0 2px 8px rgba(255, 255, 255, 0.5);
  }
  .cluster-topic.selected .label {
    text-shadow: none;
  }
  .cluster-topic .check {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #0a0a1f;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .edge-static {
    fill: none;
    stroke: var(--c);
    stroke-width: 1;
    stroke-linecap: round;
    opacity: 0.22;
  }

  .topic-bubble:hover {
    transform: translate(calc(var(--x, 0px) - 50%), calc(var(--y, 0px) - 50%)) scale(1.08);
    box-shadow:
      0 0 48px color-mix(in srgb, var(--c) 60%, transparent),
      inset 0 0 22px color-mix(in srgb, var(--c) 20%, transparent);
    border-color: var(--c);
  }

  .topic-bubble .label {
    font-size: 16px;
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
    font-size: 13px;
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
    font-size: 28px;
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
    font-size: 17px;
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
  /* ===== 類別 Tab 列 ===== */
  .tab-bar {
    position: absolute;
    top: calc(12% + 90px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    max-width: 90vw;
    z-index: 15;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px 9px 14px;
    border-radius: 9999px;
    border: 1.5px solid color-mix(in srgb, var(--c) 50%, transparent);
    background: color-mix(in srgb, var(--c) 8%, rgba(8, 6, 24, 0.7));
    color: color-mix(in srgb, var(--c) 70%, white 30%);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all 0.22s cubic-bezier(0.34, 1.4, 0.5, 1);
    box-shadow: 0 0 12px color-mix(in srgb, var(--c) 20%, transparent);
  }
  .tab :global(.icon) {
    width: 22px;
    height: 22px;
  }
  .tab-label {
    line-height: 1;
  }
  .tab-check {
    font-size: 13px;
    color: var(--c);
    font-weight: 800;
    margin-left: 2px;
  }
  .tab:hover {
    border-color: color-mix(in srgb, var(--c) 80%, transparent);
    background: color-mix(in srgb, var(--c) 14%, rgba(8, 6, 24, 0.7));
    box-shadow: 0 0 20px color-mix(in srgb, var(--c) 50%, transparent);
    transform: translateY(-2px);
  }
  .tab.active {
    background: color-mix(in srgb, var(--c) 35%, rgba(8, 6, 24, 0.6));
    border-color: var(--c);
    color: #fff;
    box-shadow:
      0 0 24px color-mix(in srgb, var(--c) 70%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: scale(1.06);
  }
  .tab.picked {
    color: color-mix(in srgb, var(--c) 90%, white 10%);
  }
  .tab.picked.active {
    color: #fff;
  }

  .chips {
    position: absolute;
    top: calc(12% + 150px);
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
    padding: 8px 16px 8px 18px;
    border-radius: 9999px;
    border: 1px solid color-mix(in srgb, var(--c, #a78bfa) 60%, transparent);
    background: color-mix(in srgb, var(--c, #a78bfa) 12%, rgba(15, 15, 40, 0.7));
    color: #f1f5f9;
    font-size: 14px;
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
    font-size: 13px;
    letter-spacing: 0.25em;
    color: var(--accent);
    text-transform: uppercase;
  }
  .result-val {
    font-size: 22px;
    font-weight: 600;
    color: #f8fafc;
  }
  .result-content {
    font-size: 16px;
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
    padding: 10px 22px;
    border-radius: 9999px;
    font-size: 14px;
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
    font-size: 13px;
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
    font-size: 18px;
    letter-spacing: 0.4em;
    text-shadow: 0 0 16px rgba(244, 114, 182, 0.6);
    animation: ponder-text-fade 1.6s ease-in-out infinite;
  }
  @keyframes ponder-text-fade {
    0%, 100% { opacity: 0.5; letter-spacing: 0.4em; }
    50% { opacity: 1; letter-spacing: 0.55em; }
  }
</style>
