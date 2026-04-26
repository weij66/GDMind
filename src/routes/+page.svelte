<script>
  import { onMount, onDestroy } from 'svelte';
  import { SvelteFlow, Background } from '@xyflow/svelte';
  import { writable } from 'svelte/store';
  import { base } from '$app/paths';
  import { marked } from 'marked';
  import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceX,
    forceY,
    forceCollide
  } from 'd3-force';
  import '@xyflow/svelte/dist/style.css';
  import data from '$lib/data/genres.json';
  import RootNode from '$lib/RootNode.svelte';
  import GenreNode from '$lib/GenreNode.svelte';
  import TopicNode from '$lib/TopicNode.svelte';
  import FitController from '$lib/FitController.svelte';

  marked.setOptions({ breaks: true, gfm: true });

  const nodeTypes = { root: RootNode, genre: GenreNode, topic: TopicNode };

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

  const fitTrigger = $derived(`${stage}-${selectedGenre}`);

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

  $effect(() => {
    if (selectedTopic) loadTopicMarkdown(selectedTopic);
  });

  const RADIUS_GENRE = 320;
  const RADIUS_TOPIC = 200;

  // d3-force 模擬：每次切換 stage 時重啟，讓泡泡動態尋找新平衡
  /** @type {any} */
  let simulation = null;
  /** @type {any[]} */
  let simNodes = [];
  /** @type {any[]} */
  let simLinks = [];

  function targetLayout() {
    /** @type {Array<{id:string, _type:'root'|'genre'|'topic', _data:any, _state?:string, tx:number, ty:number}>} */
    const out = [];
    /** @type {Array<{source:string, target:string}>} */
    const links = [];

    // root
    out.push({
      id: data.root.id,
      _type: 'root',
      _data: { label: data.root.label, _root: true, _focus: stage === 1, _dim: stage > 1 },
      tx: 0,
      ty: 0
    });

    if (stage === 1) return { items: out, links };

    // genres 環狀
    data.genres.forEach((g, i) => {
      const angle = (i / data.genres.length) * Math.PI * 2 - Math.PI / 2;
      const isActive = g.id === selectedGenre;
      const r =
        stage === 3
          ? isActive
            ? RADIUS_GENRE * 0.78
            : RADIUS_GENRE * 1.45
          : RADIUS_GENRE;
      const stateName =
        stage === 3 ? (isActive ? 'active' : 'dimmed') : 'normal';
      out.push({
        id: g.id,
        _type: 'genre',
        _data: { label: g.label, _genre: g, _state: stateName },
        tx: Math.cos(angle) * r,
        ty: Math.sin(angle) * r
      });
      links.push({ source: 'root', target: g.id });
    });

    // topics 圍繞 active genre，方向遠離 root
    if (stage === 3 && selectedGenre) {
      const active = out.find((n) => n.id === selectedGenre);
      if (active) {
        const cx = active.tx;
        const cy = active.ty;
        const angleAway = Math.atan2(cy, cx);
        const genre = data.genres.find((g) => g.id === selectedGenre);
        if (genre) {
          const span = Math.PI * 1.05;
          const start = angleAway - span / 2;
          const denom = Math.max(1, genre.topics.length - 1);
          genre.topics.forEach((t, i) => {
            const a = start + (i / denom) * span;
            out.push({
              id: t.id,
              _type: 'topic',
              _data: { label: t.label, _topic: t, _color: genre.color },
              tx: cx + Math.cos(a) * RADIUS_TOPIC,
              ty: cy + Math.sin(a) * RADIUS_TOPIC
            });
            links.push({ source: selectedGenre, target: t.id });
          });
        }
      }
    }

    return { items: out, links };
  }

  function buildEdges() {
    const list = [];
    if (stage === 1) return list;

    for (const g of data.genres) {
      list.push({
        id: `e-root-${g.id}`,
        source: 'root',
        target: g.id,
        animated: false,
        style: edgeStyle(g.color, {
          dim: stage === 3 && g.id !== selectedGenre,
          strong: stage === 3 && g.id === selectedGenre
        }),
        className:
          stage === 2
            ? 'edge-grow'
            : g.id === selectedGenre
            ? 'edge-flow'
            : ''
      });
    }
    if (stage === 3 && selectedGenre) {
      const genre = data.genres.find((g) => g.id === selectedGenre);
      if (genre) {
        for (const t of genre.topics) {
          list.push({
            id: `e-${selectedGenre}-${t.id}`,
            source: selectedGenre,
            target: t.id,
            animated: false,
            style: edgeStyle(genre.color, { strong: true }),
            className: 'edge-grow edge-flow'
          });
        }
      }
    }
    return list;
  }

  /**
   * @param {string} color
   * @param {{dim?:boolean, strong?:boolean}} [opts]
   */
  function edgeStyle(color, opts = {}) {
    const { dim = false, strong = false } = opts;
    const stroke = dim ? '#3f3f5a' : color;
    const width = strong ? 2 : 1.4;
    const opacity = dim ? 0.18 : strong ? 0.9 : 0.6;
    return `stroke:${stroke};stroke-width:${width};opacity:${opacity};filter:drop-shadow(0 0 ${dim ? 0 : 4}px ${color}aa);`;
  }

  function rebuild() {
    const { items, links } = targetLayout();

    // d3-force 用：保留前次模擬節點的 x/y 作為起始（順滑過渡）
    /** @type {Map<string, any>} */
    const prev = new Map(simNodes.map((n) => [n.id, n]));

    simNodes = items.map((it) => {
      const p = prev.get(it.id);
      return {
        id: it.id,
        _type: it._type,
        _data: it._data,
        tx: it.tx,
        ty: it.ty,
        x: p ? p.x : it.tx + (Math.random() - 0.5) * 12,
        y: p ? p.y : it.ty + (Math.random() - 0.5) * 12,
        vx: p ? p.vx : 0,
        vy: p ? p.vy : 0
      };
    });
    simLinks = links;

    if (simulation) simulation.stop();
    simulation = forceSimulation(simNodes)
      .force(
        'link',
        forceLink(simLinks)
          .id((/** @type {any} */ d) => d.id)
          .distance((/** @type {any} */ l) =>
            typeof l.source === 'object' && l.source.id === 'root' ? 300 : 190
          )
          .strength(0.15)
      )
      .force('charge', forceManyBody().strength(-260))
      .force(
        'x',
        forceX((/** @type {any} */ d) => d.tx).strength(0.35)
      )
      .force(
        'y',
        forceY((/** @type {any} */ d) => d.ty).strength(0.35)
      )
      .force('collide', forceCollide(56))
      .alpha(1)
      .alphaDecay(0.025)
      .alphaMin(0.005)
      .on('tick', () => {
        nodes.set(
          simNodes.map((n) => ({
            id: n.id,
            type: n._type,
            data: n._data,
            position: { x: n.x, y: n.y },
            draggable: false,
            selectable: true
          }))
        );
      });

    edges.set(buildEdges());
  }

  /** @param {any} param */
  function handleNodeClick({ detail }) {
    const node = detail.node;
    if (node.data._root) {
      if (stage === 1) {
        stage = 2;
      } else {
        stage = 1;
        selectedGenre = null;
        selectedTopic = null;
      }
      rebuild();
      return;
    }
    if (node.data._genre) {
      if (selectedGenre === node.id) {
        stage = 2;
        selectedGenre = null;
        selectedTopic = null;
      } else {
        stage = 3;
        selectedGenre = node.id;
        selectedTopic = null;
      }
      rebuild();
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
    rebuild();
  });

  onDestroy(() => {
    if (simulation) simulation.stop();
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
      {nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.28, duration: 600 }}
      minZoom={0.25}
      maxZoom={1.6}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag={true}
      proOptions={{ hideAttribution: true }}
      on:nodeclick={handleNodeClick}
    >
      <Background patternColor="#1e1b4b" bgColor="#0a0a1f" gap={32} size={1} />
      <FitController triggerKey={fitTrigger} />
    </SvelteFlow>
  </div>

  {#if selectedTopic}
    <div class="hud-panel" role="region" aria-label="設計面向詳情">
      <div class="hud-header" style="--accent: {selectedTopic._color || '#7dd3fc'};">
        <span class="hud-tag">設計面向</span>
        <button class="close" onclick={closeTopic} aria-label="關閉">×</button>
      </div>
      <h2>{selectedTopic.label}</h2>
      <div class="hud-body" style="--accent: {selectedTopic._color || '#7dd3fc'};">
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

<svelte:window onkeydown={(e) => selectedTopic && e.key === 'Escape' && closeTopic()} />

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

  .flow-wrap { width: 100%; height: 100%; }

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
  .hud-body :global(pre code) { background: none; padding: 0; color: #cbd5e1; }
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
  .hud-body :global(th) { background: rgba(125, 211, 252, 0.08); color: #f1f5f9; font-weight: 600; }
  .hud-body :global(hr) { border: none; border-top: 1px solid rgba(125, 211, 252, 0.15); margin: 18px 0; }
  .hud-body :global(a) { color: var(--accent, #7dd3fc); }
  .hud-body :global(input[type="checkbox"]) { accent-color: var(--accent, #7dd3fc); margin-right: 6px; }

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

  @keyframes slide-in {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }

  :global(.svelte-flow) { background: transparent !important; }

  :global(.svelte-flow__edge-path) {
    transition: stroke 0.4s, stroke-width 0.4s, opacity 0.4s;
  }

  :global(.svelte-flow__edge.edge-grow .svelte-flow__edge-path) {
    stroke-dasharray: 600;
    stroke-dashoffset: 600;
    animation: edge-grow 700ms cubic-bezier(0.5, 0, 0.2, 1) forwards;
  }
  @keyframes edge-grow { to { stroke-dashoffset: 0; } }

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
