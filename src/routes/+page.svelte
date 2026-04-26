<script>
  import { onMount } from 'svelte';
  import { SvelteFlow, Background } from '@xyflow/svelte';
  import { writable } from 'svelte/store';
  import '@xyflow/svelte/dist/style.css';
  import data from '$lib/data/genres.json';

  const nodes = writable([]);
  const edges = writable([]);

  let selectedGenre = $state(null);
  let selectedTopic = $state(null);

  const RADIUS_GENRE = 320;
  const RADIUS_TOPIC = 200;

  function rootStyle(dim = false) {
    return `
      background:#ffffff;
      color:#1f2937;
      border:1px solid #e5e7eb;
      border-radius:9999px;
      padding:${dim ? '14px 22px' : '20px 32px'};
      font-weight:500;
      font-size:${dim ? '13px' : '16px'};
      letter-spacing:0.02em;
      box-shadow:0 4px 24px rgba(15,23,42,0.06);
      opacity:${dim ? 0.5 : 1};
      transition:all 0.4s cubic-bezier(0.4,0,0.2,1);
    `.replace(/\s+/g, '');
  }

  function genreStyle(color, state) {
    const isActive = state === 'active';
    const isDimmed = state === 'dimmed';
    return `
      background:#ffffff;
      color:${isDimmed ? '#9ca3af' : color};
      border:1.5px solid ${isDimmed ? '#e5e7eb' : color}${isActive ? '' : '99'};
      border-radius:9999px;
      padding:14px 24px;
      font-weight:500;
      font-size:14px;
      letter-spacing:0.02em;
      cursor:pointer;
      box-shadow:${isActive ? `0 6px 28px ${color}55` : '0 2px 12px rgba(15,23,42,0.05)'};
      opacity:${isDimmed ? 0.4 : 1};
      transform:scale(${isActive ? 1.06 : 1});
      transition:all 0.4s cubic-bezier(0.4,0,0.2,1);
    `.replace(/\s+/g, '');
  }

  function topicStyle(color) {
    return `
      background:#ffffff;
      color:#374151;
      border:1px solid ${color}66;
      border-radius:14px;
      padding:11px 18px;
      font-weight:400;
      font-size:13px;
      cursor:pointer;
      box-shadow:0 2px 10px rgba(15,23,42,0.04);
      transition:all 0.3s ease;
    `.replace(/\s+/g, '');
  }

  function edgeStyle(color, opts = {}) {
    const { dim = false, strong = false } = opts;
    return `stroke:${dim ? '#d1d5db' : color};stroke-width:${strong ? 1.6 : 1};opacity:${dim ? 0.3 : 0.55};`;
  }

  function buildBaseGraph() {
    const root = {
      id: data.root.id,
      type: 'default',
      data: { label: data.root.label },
      position: { x: 0, y: 0 },
      style: rootStyle(false)
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
      style: edgeStyle(g.color)
    }));

    nodes.set([root, ...genreNodes]);
    edges.set(genreEdges);
  }

  function expandGenre(genreId) {
    const genre = data.genres.find((g) => g.id === genreId);
    if (!genre) return;

    if (selectedGenre === genreId) {
      selectedGenre = null;
      selectedTopic = null;
      buildBaseGraph();
      return;
    }

    selectedGenre = genreId;
    selectedTopic = null;

    const root = {
      id: data.root.id,
      type: 'default',
      data: { label: data.root.label },
      position: { x: 0, y: 0 },
      style: rootStyle(true)
    };

    const genreNodes = data.genres.map((g, i) => {
      const angle = (i / data.genres.length) * Math.PI * 2 - Math.PI / 2;
      const isActive = g.id === genreId;
      return {
        id: g.id,
        type: 'default',
        data: { label: g.label, _genre: g },
        position: {
          x: Math.cos(angle) * RADIUS_GENRE,
          y: Math.sin(angle) * RADIUS_GENRE
        },
        style: genreStyle(g.color, isActive ? 'active' : 'dimmed')
      };
    });

    const activeNode = genreNodes.find((n) => n.id === genreId);
    const cx = activeNode.position.x;
    const cy = activeNode.position.y;
    const angleToRoot = Math.atan2(-cy, -cx);

    const topicNodes = genre.topics.map((t, i) => {
      const span = Math.PI * 1.2;
      const startAngle = angleToRoot + Math.PI - span / 2;
      const angle = startAngle + (i / Math.max(1, genre.topics.length - 1)) * span;
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
      style: edgeStyle(g.color, { dim: g.id !== genreId, strong: g.id === genreId })
    }));

    const topicEdges = genre.topics.map((t) => ({
      id: `e-${genreId}-${t.id}`,
      source: genreId,
      target: t.id,
      animated: true,
      style: edgeStyle(genre.color, { strong: true })
    }));

    nodes.set([root, ...genreNodes, ...topicNodes]);
    edges.set([...baseEdges, ...topicEdges]);
  }

  function handleNodeClick({ detail }) {
    const node = detail.node;
    if (node.data._genre) {
      expandGenre(node.id);
    } else if (node.data._topic) {
      selectedTopic = node.data._topic;
    }
  }

  onMount(() => {
    buildBaseGraph();
  });
</script>

<svelte:head>
  <title>遊戲設計學習</title>
</svelte:head>

<main>
  <div class="hint" class:hidden={selectedGenre}>
    點擊任一類型開始探索
  </div>

  <div class="flow-wrap">
    <SvelteFlow
      {nodes}
      {edges}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.4}
      maxZoom={1.6}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
      panOnDrag={true}
      proOptions={{ hideAttribution: true }}
      on:nodeclick={handleNodeClick}
    >
      <Background patternColor="#f1f5f9" bgColor="#fafafa" gap={28} size={1.2} />
    </SvelteFlow>
  </div>

  {#if selectedTopic}
    <div
      class="detail-panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={() => (selectedTopic = null)}
      onkeydown={(e) => e.key === 'Escape' && (selectedTopic = null)}
    >
      <div
        class="detail-card"
        role="document"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <button class="close" onclick={() => (selectedTopic = null)} aria-label="關閉">×</button>
        <h2>{selectedTopic.label}</h2>
        <p>{selectedTopic.detail}</p>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background: #fafafa;
    color: #1f2937;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  main {
    width: 100vw;
    height: 100vh;
    position: relative;
  }

  .hint {
    position: fixed;
    top: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    font-size: 13px;
    color: #9ca3af;
    letter-spacing: 0.05em;
    pointer-events: none;
    transition: opacity 0.4s ease;
  }

  .hint.hidden {
    opacity: 0;
  }

  .flow-wrap {
    width: 100%;
    height: 100%;
  }

  .detail-panel {
    position: fixed;
    inset: 0;
    background: rgba(250, 250, 250, 0.65);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fade 0.25s ease;
  }

  .detail-card {
    position: relative;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 40px 44px;
    max-width: 520px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02);
    animation: pop 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
  }

  .detail-card h2 {
    margin: 0 0 18px;
    font-size: 22px;
    font-weight: 600;
    color: #111827;
    letter-spacing: 0.01em;
  }

  .detail-card p {
    margin: 0;
    line-height: 1.8;
    color: #4b5563;
    font-size: 15px;
  }

  .close {
    position: absolute;
    top: 14px;
    right: 18px;
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 26px;
    cursor: pointer;
    line-height: 1;
    padding: 4px 10px;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .close:hover {
    background: #f3f4f6;
    color: #4b5563;
  }

  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pop {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  :global(.svelte-flow) {
    background: #fafafa !important;
  }

  :global(.svelte-flow__node) {
    transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
  }

  :global(.svelte-flow__node:hover) {
    transform: translateY(-2px);
    z-index: 10;
  }

  :global(.svelte-flow__edge-path) {
    transition: stroke 0.4s, stroke-width 0.4s, opacity 0.4s;
  }
</style>
