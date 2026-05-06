<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/auth/store.svelte";
  import { diariesApi, entriesApi } from "$lib/api/diaries";
  import Calendar from "$lib/components/Calendar.svelte";
  import EntryList from "$lib/components/EntryList.svelte";
  import { startOfMonth, todayIso } from "$lib/utils/date";
  import type {
    Diary,
    Entry,
  } from "@simple-journal/shared-types/domain";

  const diaryId = $derived(page.params.id as string);

  let diaries = $state<Diary[]>([]);
  let entries = $state<Entry[]>([]);
  let cursor = $state<string | null>(null);
  let hasMore = $state(false);
  let loading = $state(true);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let month = $state<Date>(startOfMonth(new Date()));

  const diary = $derived(diaries.find((d) => d.id === diaryId) ?? null);
  const entryDates = $derived(new Set(entries.map((e) => e.date)));
  const pinnedDates = $derived(
    new Set(entries.filter((e) => e.isPinned).map((e) => e.date)),
  );

  async function loadDiaries() {
    if (diaries.length === 0) {
      try {
        diaries = await diariesApi.list();
      } catch (err) {
        error = err instanceof Error ? err.message : "failed to load";
      }
    }
  }

  async function loadEntries(reset = true) {
    if (!diaryId) return;
    if (reset) {
      loading = true;
      cursor = null;
    } else {
      loadingMore = true;
    }
    error = null;
    try {
      const result = await entriesApi.listInDiary(diaryId, {
        cursor: cursor ?? undefined,
        limit: 30,
      });
      entries = reset ? result.entries : [...entries, ...result.entries];
      cursor = result.nextCursor;
      hasMore = result.nextCursor !== null;
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to load entries";
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  $effect(() => {
    if (authStore.status === "authenticated" && diaryId) {
      void loadDiaries();
      void loadEntries(true);
    }
  });

  function onSelectDate(iso: string) {
    void goto(`/diary/${diaryId}/entry/${iso}`);
  }

  function onMonthChange(next: Date) {
    month = next;
  }

  async function onTogglePin(entry: Entry) {
    try {
      const updated = await entriesApi.setPin(entry.id, !entry.isPinned);
      entries = entries.map((e) => (e.id === entry.id ? updated : e));
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to pin";
    }
  }
</script>

<svelte:head>
  <title>{diary?.name ?? "Diary"} · SimpleJournal</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
  <div class="flex items-center justify-between">
    <div>
      <a href="/diary" class="text-xs text-slate-500 hover:underline">← All diaries</a>
      <h1 class="mt-1 text-2xl font-bold tracking-tight">
        {diary?.name ?? "…"}
      </h1>
      {#if diary}
        <p class="text-xs text-slate-500">
          {diary.type === "personal" ? "Personal diary" : "Shared diary"}
        </p>
      {/if}
    </div>
    <a
      href={`/diary/${diaryId}/entry/${todayIso()}`}
      class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
    >
      Today's entry
    </a>
  </div>

  <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
    <aside>
      <Calendar
        {month}
        {entryDates}
        {pinnedDates}
        onMonthChange={onMonthChange}
        onSelect={onSelectDate}
      />
    </aside>

    <section>
      {#if loading}
        <p class="text-sm text-slate-500">Loading entries…</p>
      {:else if error}
        <p class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
          {error}
        </p>
      {:else}
        <EntryList
          {diaryId}
          {entries}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={() => void loadEntries(false)}
          onTogglePin={onTogglePin}
        />
      {/if}
    </section>
  </div>
</main>
