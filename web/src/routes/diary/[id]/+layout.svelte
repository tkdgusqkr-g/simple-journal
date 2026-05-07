<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { authStore } from "$lib/auth/store.svelte";
  import { diariesApi } from "$lib/api/diaries";
  import { todayIso } from "$lib/utils/date";
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

  $effect(() => {
    if (authStore.status === "authenticated" && diaryId) void load();
  });

  // Track which sub-page we're on so the toggle button shows the right label.
  const onCalendarPage = $derived(page.url.pathname.endsWith("/calendar"));
  const onNotesPage = $derived(page.url.pathname.includes("/notes"));

  function goToOther() {
    if (onCalendarPage) {
      void goto(`/diary/${diaryId}/notes`);
    } else {
      void goto(`/diary/${diaryId}/calendar`);
    }
  }

  function goToToday() {
    void goto(`/diary/${diaryId}/notes#entry-${todayIso()}`);
  }
</script>

<div class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
  <div class="mx-auto max-w-5xl px-4 py-4 sm:px-6">
    <a href="/diary" class="text-xs text-slate-500 hover:underline">← All diaries</a>
    <div class="mt-1 flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          {diary?.name ?? "…"}
        </h1>
        {#if diary}
          <p class="text-xs text-slate-500">
            {diary.type === "personal" ? "Personal diary" : "Shared diary"}
          </p>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={goToOther}
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-pressed={onNotesPage}
        >
          {#if onCalendarPage}
            <span aria-hidden="true">✏️</span>
            Notes
          {:else}
            <span aria-hidden="true">📅</span>
            Calendar
          {/if}
        </button>
        <button
          type="button"
          onclick={goToToday}
          class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          Today's entry
        </button>
      </div>
    </div>
  </div>
</div>

{@render children()}
