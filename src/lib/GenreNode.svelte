<script>
  import { Handle, Position } from '@xyflow/svelte';

  let { data } = $props();
  /** @type {Record<string, string>} */
  const icons = {
    rpg: 'sword',
    platformer: 'jump',
    puzzle: 'puzzle',
    rts: 'units',
    roguelike: 'dice',
    narrative: 'book'
  };
  const variant = $derived(icons[data?._genre?.id] || 'dot');
  const color = $derived(data?._genre?.color || '#7dd3fc');
  const state = $derived(data?._state || 'normal');
</script>

<div class="genre-node" data-state={state} style="--c: {color};">
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
  <span class="icon" aria-hidden="true">
    {#if variant === 'sword'}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
        <path class="anim-sway" d="M14 4 L20 10 M20 10 L17 13 L11 7 Z M11 7 L4 14 L7 17 L14 10" />
      </svg>
    {:else if variant === 'jump'}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
        <circle class="anim-bounce" cx="12" cy="6" r="2.5" />
        <path class="anim-bounce" d="M12 9 v5 M12 14 l-4 5 M12 14 l4 5 M9 12 l3-1 3 1" />
        <line x1="3" y1="22" x2="21" y2="22" stroke-dasharray="2 3" opacity="0.5" />
      </svg>
    {:else if variant === 'puzzle'}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
        <path class="anim-pulse" d="M4 4 h6 v3 a2 2 0 0 0 4 0 v-3 h6 v6 h-3 a2 2 0 0 0 0 4 h3 v6 h-6 v-3 a2 2 0 0 0 -4 0 v3 h-6 v-6 h3 a2 2 0 0 0 0 -4 h-3 z" />
      </svg>
    {:else if variant === 'units'}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
        <rect class="anim-shift-1" x="3" y="3" width="7" height="7" rx="1" />
        <rect class="anim-shift-2" x="14" y="3" width="7" height="7" rx="1" />
        <rect class="anim-shift-3" x="3" y="14" width="7" height="7" rx="1" />
        <rect class="anim-shift-4" x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    {:else if variant === 'dice'}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">
        <g class="anim-rotate">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
          <circle cx="15" cy="9" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          <circle cx="9" cy="15" r="1.2" fill="currentColor" />
          <circle cx="15" cy="15" r="1.2" fill="currentColor" />
        </g>
      </svg>
    {:else if variant === 'book'}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">
        <path class="anim-flip" d="M4 5 q4 -2 8 0 v14 q-4 -2 -8 0 z" />
        <path class="anim-flip" d="M20 5 q-4 -2 -8 0 v14 q4 -2 8 0 z" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24"><circle class="anim-pulse" cx="12" cy="12" r="4" fill="currentColor" /></svg>
    {/if}
  </span>
  <span class="label">{data.label}</span>
</div>

<style>
  .genre-node {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    background: radial-gradient(circle at 30% 25%, var(--c) 0%, color-mix(in srgb, var(--c) 80%, black) 70%, color-mix(in srgb, var(--c) 55%, black) 100%);
    color: #0a0a1f;
    border: 1.5px solid var(--c);
    border-radius: 9999px;
    padding: 12px 22px 12px 16px;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 12%, transparent), 0 0 24px color-mix(in srgb, var(--c) 60%, transparent), inset 0 1px 2px rgba(255,255,255,0.5);
    transition: all 0.55s cubic-bezier(0.34,1.4,0.5,1);
    line-height: 1;
  }

  .genre-node[data-state='active'] {
    transform: scale(1.12);
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--c) 18%, transparent), 0 0 56px color-mix(in srgb, var(--c) 80%, transparent), inset 0 1px 2px rgba(255,255,255,0.6);
  }

  .genre-node[data-state='dimmed'] {
    transform: scale(0.92);
    opacity: 0.28;
    box-shadow: 0 0 12px color-mix(in srgb, var(--c) 25%, transparent);
  }

  .icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .icon svg { width: 100%; height: 100%; overflow: visible; }

  .label { white-space: nowrap; }

  /* SVG 內動：每個 icon 一種主題動畫 */
  .anim-sway { animation: sway 2.6s ease-in-out infinite; transform-origin: 12px 12px; }
  @keyframes sway {
    0%, 100% { transform: rotate(-6deg); }
    50% { transform: rotate(6deg); }
  }

  .anim-bounce { animation: bounce 1.6s ease-in-out infinite; }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .anim-pulse { animation: pulse 2.2s ease-in-out infinite; transform-origin: 12px 12px; }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.92); opacity: 0.7; }
  }

  .anim-rotate { animation: rotate 4.5s linear infinite; transform-origin: 12px 12px; }
  @keyframes rotate {
    to { transform: rotate(360deg); }
  }

  .anim-flip { animation: flip 3s ease-in-out infinite; transform-origin: 12px 12px; }
  @keyframes flip {
    0%, 100% { transform: scaleX(1); }
    50% { transform: scaleX(0.85) translateY(-1px); }
  }

  .anim-shift-1 { animation: shift 2.8s ease-in-out infinite 0s; transform-origin: center; }
  .anim-shift-2 { animation: shift 2.8s ease-in-out infinite 0.4s; transform-origin: center; }
  .anim-shift-3 { animation: shift 2.8s ease-in-out infinite 0.8s; transform-origin: center; }
  .anim-shift-4 { animation: shift 2.8s ease-in-out infinite 1.2s; transform-origin: center; }
  @keyframes shift {
    0%, 100% { transform: translate(0,0); }
    50% { transform: translate(0.5px, -0.5px); }
  }

  /* hover 脈動 */
  .genre-node:hover {
    filter: brightness(1.18);
  }

  /* Svelte Flow 連線 handle 樣式重置 */
  :global(.svelte-flow__handle) {
    opacity: 0;
    width: 1px;
    height: 1px;
  }
</style>
