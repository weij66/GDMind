<script>
  import { onMount } from 'svelte';
  import { SvelteFlow, Background } from '@xyflow/svelte';
  import { writable } from 'svelte/store';
  import { base } from '$app/paths';
  import { marked } from 'marked';
  import '@xyflow/svelte/dist/style.css';
  import data from '$lib/data/genres.json';

  marked.setOptions({ breaks: true, gfm: true });

  let topicHtml = $state('');
  let topicLoading = $state(false);

  /** @param {{id:string, label:string, detail:string}} topic */
  async function loadTopicMarkdown(topic) {
    topicLoading = true;
    topicHtml = '';
    try {
      const res = await fetch(`${base}/topics/${topic.id}.md`);
      if (res.ok) {
        const md = await res.text();
        topicHtml = /** @type {string} */ (marked.parse(md));
        topicLoading = false;
        return;
      }
    } catch {}
    topicHtml = `<p>${topic.detail}</p>`;
    topicLoading = false;
  }

  /** @type {import('svelte/store').Writable<any[]>} */
  const nodes = writable([]);
  /** @type {import('svelte/store').Writable<any[]>} */
  const edges = writable([]);

  // 四幕：1=只有總領, 2=展開類型, 3=展開類型內面向, 4=面向詳情面板
  let stage = $state(1);
  /** @type {string | null} */
  let selectedGenre = $state(null);
  /** @type {{id:string, label:string, detail:string, _color?:string} | null} */
  let selectedTopic = $state(null);

  $effect(() => {
    if (selectedTopic) loadTopicMarkdown(selectedTopic);
  });

  const RADIUS_GENRE = 320;
  const RADIUS_TOPIC = 200;

  function rootStyle({ focus = false, dim = false } = {}) {
    const size = focus ? '22px 36px' : dim ? '14px 22px' : '20px 32px';
    const fontSize = focus ? '17px' : dim ? '13px' : '16px';
    return `
      background:radial-gradient(circle at 30% 30%, #ffffff 0%, #e0f2fe 60%, #bae6fd 100%);
      color:#0c4a6e;
      border:1.5px solid #7dd3fc;
      border-radius:9999px;
      padding:${size};
      font-weight:600;
      font-size:${fontSize};
      letter-spacing:0.04em;
      cursor:pointer;
      box-shadow:0 0 0 6px rgba(125,211,252,0.12), 0 0 32px rgba(125,211,252,0.55), inset 0 1px 2px rgba(255,255,255,0.8);
      opacity:${dim ? 0.45 : 1};
      transform:scale(${focus ? 1.05 : 1});
      transition:all 0.5s cubic-bezier(0.34,1.3,0.5,1);
    `.replace(/\s+/g, '');
  }

  function genreStyle(color, state) {
    const isActive = state === 'active';
    const isDimmed = state === 'dimmed';
    return `
      background:radial-gradient(circle at 30% 25%, ${color}ff 0%, ${color}cc 70%, ${color}88 100%);
      color:#0a0a1f;
      border:1.5px solid ${color};
      border-radius:9999px;
      padding:14px 26px;
      font-weight:600;
      font-size:14px;
      letter-spacing:0.04em;
      cursor:pointer;
      box-shadow:${isActive
        ? `0 0 0 8px ${color}22, 0 0 48px ${color}cc, inset 0 1px 2px rgba(255,255,255,0.5)`
        : isDimmed
        ? `0 0 12px ${color}33`
        : `0 0 0 4px ${color}1a, 0 0 24px ${color}88, inset 0 1px 2px rgba(255,255,255,0.5)`};
      opacity:${isDimmed ? 0.25 : 1};
      transform:scale(${isActive ? 1.12 : isDimmed ? 0.92 : 1});
      transition:all 0.55s cubic-bezier(0.34,1.4,0.5,1);
    `.replace(/\s+/g, '');
  }

  function topicStyle(color) {
    return `
      background:rgba(15,15,40,0.85);
      color:${color};
      border:1.5px solid ${color}aa;
      border-radius:14px;
      padding:11px 20px;
      font-weight:500;
      font-size:13px;
      letter-spacing:0.03em;
      cursor:pointer;
      backdrop-filter:blur(6px);
      box-shadow:0 0 20px ${color}55, inset 0 0 12px ${color}1a;
      transition:all 0.3s ease;
    `.replace(/\s+/g, '');
  }

  function edgeStyle(color, opts = {}) {
    const { dim = false, strong = false } = opts;
    const stroke = dim ? '#3f3f5a' : color;
    const width = strong ? 2 : 1.4;
    const opacity = dim ? 0.18 : strong ? 0.85 : 0.6;
    return `stroke:${stroke};stroke-width:${width};opacity:${opacity};filter:drop-shadow(0 0 ${dim ? 0 : 4}px ${color}aa);`;
  }

  function buildAct1() {
    nodes.set([
      {
        id: data.root.id,
        type: 'default',
        data: { label: data.root.label, _root: true },
        position: { x: 0, y: 0 },
        style: rootStyle({ focus: true })
      }
    ]);
    edges.set([]);
  }

  function buildAct2() {
    const root = {
      id: data.root.id,
      type: 'default',
      data: { label: data.root.label, _root: true },
      position: { x: 0, y: 0 },
      style: rootStyle({ dim: true })
    };

    const genreNodes = data.genres.map((g, i) => {
      const angle = (i / data.genres.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: g.id,
        type: 'default',
        data: { label: g.label, _genre: g },
        position: {
          x: Math.cos(angle) * RADIUS_GENRE,
          y: Math.sin(angle) * RADIUS_GENRE
        },
        style: genreStyle(g.color, 'normal')
      };
    });

    const genreEdges = data.genres.map((g) => ({
      id: `e-root-${g.id}`,
      source: 'root',
      target: g.id,
      animated: false,
      style: edgeStyle(g.color),
      className: 'edge-grow'
    }));

    nodes.set([root, ...genreNodes]);
    edges.set(genreEdges);
  }

  function buildAct3(genreId) {
    const genre = data.genres.find((g) => g.id === genreId);
    if (!genre) return;

    const root = {
      id: data.root.id,
      type: 'default',
      data: { label: data.root.label, _root: true },
      position: { x: 0, y: 0 },
      style: rootStyle({ dim: true })
    };

    const SCATTER = 1.45;
    const genreNodes = data.genres.map((g, i) => {
      const angle = (i / data.genres.length) * Math.PI * 2 - Math.PI / 2;
      const isActive = g.id === genreId;
      const r = isActive ? RADIUS_GENRE * 0.78 : RADIUS_GENRE * SCATTER;
      return {
        id: g.id,
        type: 'default',
        data: { label: g.label, _genre: g },
        position: {
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r
        },
        style: genreStyle(g.color, isActive ? 'active' : 'dimmed')
      };
    });

    const activeNode = genreNodes.find((n) => n.id === genreId);
    const cx = activeNode.position.x;
    const cy = activeNode.position.y;
    const angleAwayFromRoot = Math.atan2(cy, cx);

    const topicNodes = genre.topics.map((t, i) => {
      const span = Math.PI * 1.05;
      const startAngle = angleAwayFromRoot - span / 2;
      const denom = Math.max(1, genre.topics.length - 1);
      const angle = startAngle + (i / denom) * span;
      return {
        id: t.id,
        type: 'default',
        data: { label: t.label, _topic: t, _color: genre.color },
        position: {
          x: cx + Math.cos(angle) * RADIUS_TOPIC,
          y: cy + Math.sin(angle) * RADIUS_TOPIC
        },
        style: topicStyle(genre.color)
      };
    });

    const baseEdges = data.genres.map((g) => ({
      id: `e-root-${g.id}`,
      source: 'root',
      target: g.id,
      animated: false,
      style: edgeStyle(g.color, { dim: g.id !== genreId, strong: g.id === genreId }),
      className: g.id === genreId ? 'edge-flow' : ''
    }));

    const topicEdges = genre.topics.map((t) => ({
      id: `e-${genreId}-${t.id}`,
      source: genreId,
      target: t.id,
      animated: false,
      style: edgeStyle(genre.color, { strong: true }),
      className: 'edge-grow edge-flow'
    }));

    nodes.set([root, ...genreNodes, ...topicNodes]);
    edges.set([...baseEdges, ...topicEdges]);
  }

  function handleNodeClick({ detail }) {
    const node = detail.node;
    if (node.data._root) {
      if (stage === 1) {
        stage = 2;
        buildAct2();
      } else {
        stage = 1;
        selectedGenre = null;
        selectedTopic = null;
        buildAct1();
      }
      return;
    }
    if (node.data._genre) {
      if (selectedGenre === node.id) {
        stage = 2;
        selectedGenre = null;
        selectedTopic = null;
        buildAct2();
      } else {
        stage = 3;
        selectedGenre = node.id;
        selectedTopic = null;
        buildAct3(node.id);
      }
      return;
    }
    if (node.data._topic) {
      selectedTopic = node.data._topic;
      stage = 4;
    }
  }

  function closeTopic() {
    selectedTopic = null;
    stage = selectedGenre ? 3 : 2;
  }

  onMount(() => {
    buildAct1();
  });
</script>

<svelte:head>
  <title>遊戲設計學習</title>
</svelte:head>

<main>
  {#if stage === 1}
    <div class="hint">點擊中央泡泡開始</div>
  {:else if stage === 2}
    <div class="hint">選擇一個遊戲類型</div>
  {/if}

  <div class="flow-wrap">
    <SvelteFlow
      {nodes}
      {edges}
      fitView
      fitViewOptions={{ padding: 0.3, duration: 600 }}
      minZoom={0.3}
      maxZoom={1.6}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag={true}
      proOptions={{ hideAttribution: true }}
      on:nodeclick={handleNodeClick}
    >
      <Background patternColor="#1e1b4b" bgColor="#0a0a1f" gap={32} size={1} />
    </SvelteFlow>
  </div>

  {#if selectedTopic}
    <div class="hud-panel" role="region" aria-label="設計面向詳情">
      <div class="hud-header" style="--accent: {selectedTopic._color || '#7dd3fc'};">
        <span class="hud-tag">設計面向</span>
        <button class="close" onclick={closeTopic} aria-label="關閉">×</button>
      </div>
      <h2>{selectedTopic.label}</h2>
      <div class="hud-body">
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
  }

  .hint {
    position: fixed;
    top: 36px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    font-size: 13px;
    color: #94a3b8;
    letter-spacing: 0.18em;
    pointer-events: none;
    animation: hint-pulse 2.4s ease-in-out infinite;
  }

  @keyframes hint-pulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.95; }
  }

  .flow-wrap {
    width: 100%;
    height: 100%;
  }

  .hud-panel {
    position: fixed;
    top: 24px;
    right: 24px;
    bottom: 24px;
    width: 420px;
    max-width: calc(100vw - 48px);
    background: rgba(15, 15, 40, 0.78);
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
    animation: slide-in 0.5s cubic-bezier(0.34, 1.2, 0.5, 1);
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
    opacity: 0.85;
    box-shadow: 0 0 12px var(--accent);
  }

  .hud-panel h2 {
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 600;
    color: #f8fafc;
    letter-spacing: 0.02em;
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
    line-height: 1.4;
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
    font-style: normal;
  }
  .hud-body :global(blockquote p) { margin: 0; }
  .hud-body :global(ul),
  .hud-body :global(ol) { padding-left: 20px; margin: 0 0 14px; }
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
  .hud-body :global(pre code) {
    background: none;
    padding: 0;
    color: #cbd5e1;
  }
  .hud-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 14px;
    font-size: 13px;
  }
  .hud-body :global(th),
  .hud-body :global(td) {
    padding: 8px 10px;
    border: 1px solid rgba(125, 211, 252, 0.15);
    text-align: left;
  }
  .hud-body :global(th) {
    background: rgba(125, 211, 252, 0.08);
    color: #f1f5f9;
    font-weight: 600;
  }
  .hud-body :global(hr) {
    border: none;
    border-top: 1px solid rgba(125, 211, 252, 0.15);
    margin: 18px 0;
  }
  .hud-body :global(a) { color: var(--accent, #7dd3fc); }
  .hud-body :global(input[type="checkbox"]) { accent-color: var(--accent, #7dd3fc); margin-right: 6px; }

  .loading {
    color: #64748b;
    font-size: 13px;
    letter-spacing: 0.15em;
    text-align: center;
    margin-top: 40px;
  }

  /* 自訂卷軸 */
  .hud-body::-webkit-scrollbar { width: 6px; }
  .hud-body::-webkit-scrollbar-track { background: transparent; }
  .hud-body::-webkit-scrollbar-thumb {
    background: rgba(125, 211, 252, 0.25);
    border-radius: 3px;
  }

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

  .close:hover {
    background: rgba(148, 163, 184, 0.15);
    border-color: rgba(148, 163, 184, 0.6);
    color: #fff;
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }

  :global(.svelte-flow) {
    background: transparent !important;
  }

  :global(.svelte-flow__node) {
    transition: transform 0.5s cubic-bezier(0.34,1.4,0.5,1);
  }

  :global(.svelte-flow__node:hover) {
    animation: bubble-pulse 1.2s ease-in-out infinite;
    z-index: 10;
  }

  @keyframes bubble-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.18); }
  }

  :global(.svelte-flow__edge-path) {
    transition: stroke 0.4s, stroke-width 0.4s, opacity 0.4s;
  }

  /* 連線生長動畫：新增 className=edge-grow 的邊線會從父→子「長」出來 */
  :global(.svelte-flow__edge.edge-grow .svelte-flow__edge-path) {
    stroke-dasharray: 600;
    stroke-dashoffset: 600;
    animation: edge-grow 700ms cubic-bezier(0.5, 0, 0.2, 1) forwards;
  }
  @keyframes edge-grow {
    to { stroke-dashoffset: 0; }
  }

  /* 連線能量流動：edge-flow 類別的邊線持續流動，模擬資訊流 */
  :global(.svelte-flow__edge.edge-flow .svelte-flow__edge-path) {
    stroke-dasharray: 6 10;
    animation: edge-flow 1.6s linear infinite;
  }
  :global(.svelte-flow__edge.edge-grow.edge-flow .svelte-flow__edge-path) {
    animation:
      edge-grow 700ms cubic-bezier(0.5, 0, 0.2, 1) forwards,
      edge-flow 1.6s linear 700ms infinite;
  }
  @keyframes edge-flow {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: -32; }
  }
</style>
