<script>
  import { Handle, Position } from '@xyflow/svelte';
  let { data } = $props();
  const dim = $derived(!!data?._dim);
  const focus = $derived(!!data?._focus);
</script>

<div class="root-node" class:dim class:focus>
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
  <span class="orb"></span>
  <span class="label">{data.label}</span>
</div>

<style>
  .root-node {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: radial-gradient(circle at 30% 30%, #ffffff 0%, #e0f2fe 60%, #bae6fd 100%);
    color: #0c4a6e;
    border: 1.5px solid #7dd3fc;
    border-radius: 9999px;
    padding: 18px 28px 18px 22px;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: 0 0 0 6px rgba(125,211,252,0.12), 0 0 36px rgba(125,211,252,0.55), inset 0 1px 2px rgba(255,255,255,0.8);
    transition: all 0.5s cubic-bezier(0.34,1.3,0.5,1);
    line-height: 1;
  }
  .root-node.focus { transform: scale(1.05); padding: 20px 32px 20px 26px; font-size: 17px; }
  .root-node.dim { opacity: 0.45; transform: scale(0.78); padding: 13px 20px 13px 16px; font-size: 13px; }
  .root-node:hover { filter: brightness(1.05); }

  .orb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #fff, #38bdf8 70%, #0284c7);
    box-shadow: 0 0 12px #7dd3fc, inset 0 1px 1px rgba(255,255,255,0.9);
    animation: orb-pulse 2.4s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes orb-pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 12px #7dd3fc; }
    50% { transform: scale(1.18); box-shadow: 0 0 22px #38bdf8; }
  }

  .label { white-space: nowrap; }

  :global(.svelte-flow__handle) { opacity: 0; width: 1px; height: 1px; }
</style>
