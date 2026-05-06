<script lang="ts">
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/auth/store.svelte";

  $effect(() => {
    if (authStore.status === "authenticated") {
      void goto("/diary");
    } else if (authStore.status === "anonymous") {
      void goto("/login");
    }
  });
</script>

<svelte:head>
  <title>SimpleJournal</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
  <div class="text-center">
    <h1 class="text-3xl font-bold">SimpleJournal</h1>
    <p class="mt-2 text-sm text-slate-500">Loading…</p>
  </div>
</div>
