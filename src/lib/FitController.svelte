<script>
  import { useSvelteFlow } from '@xyflow/svelte';

  let { triggerKey } = $props();
  const { fitView } = useSvelteFlow();

  $effect(() => {
    triggerKey;
    const t = setTimeout(() => {
      fitView({ padding: 0.28, duration: 700 });
    }, 80);
    return () => clearTimeout(t);
  });
</script>
