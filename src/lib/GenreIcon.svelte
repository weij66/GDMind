<script>
  let { id } = $props();
  /** @type {Record<string, string>} */
  const map = {
    view: 'eye',
    gameplay: 'pad',
    emotion: 'heart',
    multiplayer: 'people'
  };
  const variant = $derived(map[id] || 'dot');
</script>

<span class="icon" aria-hidden="true">
  {#if variant === 'eye'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
      <path d="M2.5 12 C 5 6, 19 6, 21.5 12 C 19 18, 5 18, 2.5 12 Z" />
      <circle class="anim-iris" cx="12" cy="12" r="3.2" fill="currentColor" />
      <circle cx="13.2" cy="10.8" r="0.8" fill="#ffffff" opacity="0.85" />
    </svg>
  {:else if variant === 'pad'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
      <path d="M4 9 q0 -3 4 -3 h8 q4 0 4 3 v6 q0 3 -3 3 q-2 0 -3 -2 H10 q-1 2 -3 2 q-3 0 -3 -3 z" />
      <line class="anim-press-1" x1="7" y1="11.5" x2="9.5" y2="11.5" />
      <line class="anim-press-1" x1="8.25" y1="10.25" x2="8.25" y2="12.75" />
      <circle class="anim-press-2" cx="15.5" cy="11" r="0.9" fill="currentColor" />
      <circle class="anim-press-3" cx="17.5" cy="13" r="0.9" fill="currentColor" />
    </svg>
  {:else if variant === 'heart'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">
      <path class="anim-beat" d="M12 20 C 6 15, 3 11, 3 8 a4 4 0 0 1 9 -1 a4 4 0 0 1 9 1 c 0 3 -3 7 -9 12 z" fill="currentColor" fill-opacity="0.18" />
    </svg>
  {:else if variant === 'people'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
      <g class="anim-wave-1">
        <circle cx="8" cy="8" r="2.4" />
        <path d="M3.5 18 q0 -4 4.5 -4 q4.5 0 4.5 4" />
      </g>
      <g class="anim-wave-2">
        <circle cx="16.5" cy="9" r="2.2" />
        <path d="M12.5 18.5 q0 -3.5 4 -3.5 q4 0 4 3.5" />
      </g>
    </svg>
  {:else}
    <svg viewBox="0 0 24 24"><circle class="anim-iris" cx="12" cy="12" r="4" fill="currentColor" /></svg>
  {/if}
</span>

<style>
  .icon { display: inline-flex; align-items: center; justify-content: center; }
  .icon svg { width: 100%; height: 100%; overflow: visible; }

  .anim-iris {
    animation: iris-scan 3.8s ease-in-out infinite;
    transform-origin: 12px 12px;
  }
  @keyframes iris-scan {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-1.5px); }
    75% { transform: translateX(1.5px); }
  }

  .anim-press-1 { animation: press 1.8s ease-in-out infinite; transform-origin: 8.25px 11.5px; }
  .anim-press-2 { animation: press 1.8s ease-in-out infinite 0.3s; transform-origin: 15.5px 11px; }
  .anim-press-3 { animation: press 1.8s ease-in-out infinite 0.6s; transform-origin: 17.5px 13px; }
  @keyframes press {
    0%, 70%, 100% { transform: scale(1); opacity: 1; }
    35% { transform: scale(0.7); opacity: 0.6; }
  }

  .anim-beat {
    animation: beat 1.2s ease-in-out infinite;
    transform-origin: 12px 12px;
  }
  @keyframes beat {
    0%, 100% { transform: scale(1); }
    20% { transform: scale(1.12); }
    40% { transform: scale(0.95); }
    60% { transform: scale(1.06); }
  }

  .anim-wave-1 { animation: wave 2.4s ease-in-out infinite; transform-origin: 8px 12px; }
  .anim-wave-2 { animation: wave 2.4s ease-in-out infinite 1.2s; transform-origin: 16.5px 12px; }
  @keyframes wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-1.5px); }
  }
</style>
