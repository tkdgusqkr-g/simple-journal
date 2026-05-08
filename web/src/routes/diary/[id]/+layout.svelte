<script lang="ts">
  import { page } from "$app/state";
  import { authStore } from "$lib/auth/store.svelte";
  import { diariesApi } from "$lib/api/diaries";
  import type { Diary } from "@simple-journal/shared-types/domain";

  let { children } = $props();

  const diaryId = $derived(page.params.id as string);
  let diary = $state<Diary | null>(null);

  async function load() {
    if (authStore.status !== "authenticated" || !diaryId) return;
    try {
      const all = await diariesApi.list();
      diary = all.find((d) => d.id === diaryId) ?? null;
    } catch {
      // Non-fatal — header just shows the placeholder
    }
  }

  let loaded = false;
  $effect(() => {
    if (loaded) return;
    if (authStore.status === "authenticated" && diaryId) {
      loaded = true;
      void load();
    }
  });
</script>

<div class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
  <div class="mx-auto max-w-3xl px-4 py-4 sm:px-6">
    <a href="/diary" class="text-xs text-slate-500 hover:underline">← All diaries</a>
    <div class="mt-1 min-w-0">
      <h1 class="truncate text-2xl font-bold tracking-tight">
        {diary?.name ?? "…"}
      </h1>
      {#if diary}
        <p class="text-xs text-slate-500">
          {diary.type === "personal" ? "Personal diary" : "Shared diary"}
        </p>
      {/if}
    </div>
  </div>
</div>

{@render children()}
