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

  const onCalendarPage = $derived(page.url.pathname.endsWith("/calendar"));
  const onNotesPage = $derived(page.url.pathname.includes("/notes"));

  function goToCalendar() {
    if (!onCalendarPage) void goto(`/diary/${diaryId}/calendar`);
  }
  function goToNotes() {
    if (!onNotesPage) void goto(`/diary/${diaryId}/notes`);
  }
  function goToToday() {
    void goto(`/diary/${diaryId}/notes#entry-${todayIso()}`);
  }
</script>

<div class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
  <div class="mx-auto max-w-5xl px-4 py-4 sm:px-6">
    <a href="/diary" class="text-xs text-slate-500 hover:underline">← All diaries</a>
    <div class="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="truncate text-2xl font-bold tracking-tight">
          {diary?.name ?? "…"}
        </h1>
        {#if diary}
          <p class="text-xs text-slate-500">
            {diary.type === "personal" ? "Personal diary" : "Shared diary"}
          </p>
        {/if}
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="View"
          class="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
        >
          <button
            type="button"
            role="tab"
            aria-selected={onCalendarPage}
            onclick={goToCalendar}
            class={
              "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
              (onCalendarPage
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")
            }
          >
            <span aria-hidden="true" class="mr-1">📅</span>
            Calendar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={onNotesPage}
            onclick={goToNotes}
            class={
              "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
              (onNotesPage
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")
            }
          >
            <span aria-hidden="true" class="mr-1">✏️</span>
            Notes
          </button>
        </div>
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
