<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { authStore } from "$lib/auth/store.svelte";

  let { children } = $props();

  onMount(() => {
    authStore.init();
  });
</script>

{@render children()}
