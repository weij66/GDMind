<script>
  import { onMount } from 'svelte';
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap
  } from '@xyflow/svelte';
  import { writable } from 'svelte/store';
  import '@xyflow/svelte/dist/style.css';
  import data from '$lib/data/genres.json';

  const nodes = writable([]);
  const edges = writable([]);

  let selectedGenre = $state(null);
  let selectedTopic = $state(null);

  const RADIUS_GENRE = 280;
  const RADIUS_TOPIC = 180;

  function buildBaseGraph() {
    const root = {
      id: data.root.id,
      type: 'default',
      data: { label: data.root.label },
      position: { x: 0, y: 0 },
      style: 'background:#1e1b4b;color:#fff;border:2px solid #818cf8;border-radius:9999px;padding:16px 24px;font-weight:600;font-size:15px;box-shadow:0 0 32px rgba(129,140,248,0.5);'
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
        style: `background:${g.color};color:#0f172a;border:none;border-radius:9999px;padding:14px 22px;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 4px 20px ${g.color}66;transition:all 0.3s;`
      };
    });

    const genreEdges = data.genres.map((g) => ({
      id: `e-root-${g.id}`,
      source: 'root',
      target: g.id,
      animated: true,
      style: `stroke:${g.color};stroke-width:2;opacity:0.5;`
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
      style: 'background:#1e1b4b;color:#fff;border:2px solid #818cf8;border-radius:9999px;padding:12px 20px;font-weight:600;font-size:13px;opacity:0.4;'
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
        style: `background:${g.color};color:#0f172a;border:${isActive ? '3px solid #fff' : 'none'};border-radius:9999px;padding:14px 22px;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 4px ${isActive ? '40px' : '20px'} ${g.color}${isActive ? 'cc' : '66'};transition:all 0.3s;opacity:${isActive ? 1 : 0.35};transform:scale(${isActive ? 1.1 : 1});`
      };
    });

    const activeGenreNode = genreNodes.find((n) => n.id === genreId);
    const cx = activeGenreNode.position.x;
    const cy = activeGenreNode.position.y;

    const topicNodes = genre.topics.map((t, i) => {
      const angle = (i / genre.topics.length) * Math.PI * 2;
      return {
        id: t.id,
        type: 'default',
        data: { label: t.label, _topic: t, _color: genre.color },
        position: {
          x: cx + Math.cos(angle) * RADIUS_TOPIC,
          y: cy + Math.sin(angle) * RADIUS_TOPIC
        },
        style: `background:#0f172a;color:${genre.color};border:2px solid ${genre.color};border-radius:14px;padding:10px 16px;font-weight:500;font-size:13px;cursor:pointer;transition:all 0.3s;`
      };
    });

    const baseEdges = data.genres.map((g) => ({
      id: `e-root-${g.id}`,
      source: 'root',
      target: g.id,
      animated: g.id === genreId,
      style: `stroke:${g.color};stroke-width:${g.id === genreId ? 3 : 1};opacity:${g.id === genreId ? 0.9 : 0.15};`
    }));

    const topicEdges = genre.topics.map((t) => ({
      id: `e-${genreId}-${t.id}`,
      source: genreId,
      target: t.id,
      animated: true,
      style: `stroke:${genre.color};stroke-width:2;opacity:0.7;`
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
  <title>遊戲設計學習 — 互動心智圖</title>
</svelte:head>

<main>
  <header>
    <h1>🎮 遊戲設計學習地圖</h1>
    <p>點擊類型泡泡展開該領域的設計面向；再點一次摺疊。</p>
  </header>

  <div class="flow-wrap">
    <SvelteFlow
      {nodes}
      {edges}
      fitView
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      on:nodeclick={handleNodeClick}
    >
      <Background patternColor="#312e81" bgColor="#0a0a1f" />
      <Controls />
      <MiniMap style="background:#1e1b4b;" maskColor="rgba(10,10,31,0.7)" />
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
        <button class="close" onclick={() => (selectedTopic = null)}>×</button>
        <h2>{selectedTopic.label}</h2>
        <p>{selectedTopic.detail}</p>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: #0a0a1f;
    color: #e0e7ff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
    overflow: hidden;
  }

  main {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    padding: 16px 28px;
    border-bottom: 1px solid #312e81;
    background: linear-gradient(180deg, #1e1b4b 0%, #0a0a1f 100%);
    z-index: 10;
  }

  header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  header p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #a5b4fc;
    opacity: 0.8;
  }

  .flow-wrap {
    flex: 1;
    position: relative;
  }

  .detail-panel {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 31, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fade 0.25s ease;
  }

  .detail-card {
    position: relative;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
    border: 1px solid #818cf8;
    border-radius: 18px;
    padding: 36px 40px;
    max-width: 540px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(129, 140, 248, 0.35);
    animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .detail-card h2 {
    margin: 0 0 16px;
    font-size: 22px;
    color: #fff;
  }

  .detail-card p {
    margin: 0;
    line-height: 1.7;
    color: #c7d2fe;
    font-size: 15px;
  }

  .close {
    position: absolute;
    top: 12px;
    right: 16px;
    background: none;
    border: none;
    color: #a5b4fc;
    font-size: 28px;
    cursor: pointer;
    line-height: 1;
    padding: 4px 10px;
    border-radius: 8px;
    transition: background 0.2s;
  }

  .close:hover {
    background: rgba(165, 180, 252, 0.15);
    color: #fff;
  }

  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pop {
    from { opacity: 0; transform: scale(0.9) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  :global(.svelte-flow__node) {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  :global(.svelte-flow__node:hover) {
    transform: scale(1.08);
    z-index: 10;
  }

  :global(.svelte-flow__edge-path) {
    transition: stroke-width 0.3s, opacity 0.3s;
  }
</style>
