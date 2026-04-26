<script>
  import { Handle, Position } from '@xyflow/svelte';
  let { data } = $props();
  const color = $derived(data?._color || '#7dd3fc');
</script>

<div class="topic-node" style="--c: {color};">
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
  <span class="dot"></span>
  <span class="label">{data.label}</span>
</div>

<style>
  .topic-node {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(15,15,40,0.85);
    color: var(--c);
    border: 1.5px solid color-mix(in srgb, var(--c) 70%, transparent);
    border-radius: 14px;
    padding: 10px 16px 10px 12px;
    font-weight: 500;
    font-size: 13px;
    letter-spacing: 0.03em;
    cursor: pointer;
    backdrop-filter: blur(6px);
    box-shadow: 0 0 18px color-mix(in srgb, var(--c) 35%, transparent), inset 0 0 12px color-mix(in srgb, var(--c) 10%, transparent);
    transition: all 0.3s ease;
    line-height: 1;
  }
  .topic-node:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 28px color-mix(in srgb, var(--c) 60%, transparent), inset 0 0 14px color-mix(in srgb, var(--c) 14%, transparent);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
    animation: dot-pulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes dot-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .label { white-space: nowrap; }

  :global(.svelte-flow__handle) { opacity: 0; width: 1px; height: 1px; }
</style>
