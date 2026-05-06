<script lang="ts">
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/auth/store.svelte";
  import AppHeader from "$lib/components/AppHeader.svelte";

  let { children } = $props();

  $effect(() => {
    if (authStore.status === "anonymous") {
      void goto("/login");
    }
  });
</script>

{#if authStore.status === "authenticated"}
  <AppHeader />
  {@render children()}
{:else if authStore.status === "loading"}
  <div class="flex min-h-screen items-center justify-center text-sm text-slate-500">
    Loading…
  </div>
{/if}
