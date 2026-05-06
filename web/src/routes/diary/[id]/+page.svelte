<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { authStore } from "$lib/auth/store.svelte";
  import { diariesApi, entriesApi } from "$lib/api/diaries";
  import Calendar from "$lib/components/Calendar.svelte";
  import EntryItem from "$lib/components/EntryItem.svelte";
  import { startOfMonth, todayIso, fromIso } from "$lib/utils/date";
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
  let sentinel: HTMLDivElement | undefined = $state();

  const diary = $derived(diaries.find((d) => d.id === diaryId) ?? null);

  // Sort by date descending (newest first). The backend returns
  // pinned-first then date-desc; we re-sort to a strict date order
  // because the feed view is "by date", not "by pin status".
  const sortedEntries = $derived(
    [...entries].sort((a, b) => b.date.localeCompare(a.date)),
  );
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

  // After entries load, honor a #entry-YYYY-MM-DD hash if one is present.
  $effect(() => {
    if (loading || entries.length === 0) return;
    const hash = window.location.hash;
    if (hash.startsWith("#entry-")) {
      void scrollToDate(hash.slice("#entry-".length), false);
    }
  });

  // Infinite scroll: load more older entries when the sentinel is visible.
  $effect(() => {
    if (!sentinel || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries_) => {
        if (entries_[0]?.isIntersecting && !loadingMore && hasMore) {
          void loadEntries(false);
        }
      },
      { rootMargin: "400px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  });

  async function scrollToDate(date: string, createIfMissing = true) {
    let exists = entryDates.has(date);
    if (!exists && createIfMissing) {
      // Create an empty entry for this date so the user can immediately type.
      try {
        const created = await entriesApi.upsert(diaryId, {
          date,
          content: "",
          tags: [],
        });
        entries = [...entries, created];
        exists = true;
      } catch (err) {
        error = err instanceof Error ? err.message : "failed to create entry";
        return;
      }
    }
    if (!exists) return;

    await tick();
    const el = document.getElementById(`entry-${date}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Update URL hash without reloading.
      window.history.replaceState({}, "", `#entry-${date}`);
      // Focus the textarea if it's empty (helpful when newly created).
      const ta = el.querySelector("textarea") as HTMLTextAreaElement | null;
      if (ta && ta.value === "") ta.focus();
    } else if (hasMore) {
      // The date is older than what we've loaded — fetch more pages until
      // we either find it or run out of entries.
      while (hasMore) {
        await loadEntries(false);
        const found = entries.some((e) => e.date === date);
        if (found) {
          await tick();
          const el2 = document.getElementById(`entry-${date}`);
          el2?.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.replaceState({}, "", `#entry-${date}`);
          break;
        }
      }
    }
  }

  function onSelectDate(iso: string) {
    void scrollToDate(iso, true);
  }

  function onMonthChange(next: Date) {
    month = next;
  }

  function onEntryUpdated(updated: Entry) {
    entries = entries.map((e) => (e.id === updated.id ? updated : e));
  }

  function onEntryDeleted(id: string) {
    entries = entries.filter((e) => e.id !== id);
  }

  async function jumpToToday() {
    const today = todayIso();
    // Bring the calendar to the current month if it's not already.
    const t = fromIso(today);
    if (
      t.getFullYear() !== month.getFullYear() ||
      t.getMonth() !== month.getMonth()
    ) {
      month = startOfMonth(t);
    }
    void scrollToDate(today, true);
  }
</script>

<svelte:head>
  <title>{diary?.name ?? "Diary"} · SimpleJournal</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
  <div class="flex items-center justify-between gap-4">
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
    <button
      type="button"
      onclick={jumpToToday}
      class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
    >
      Today's entry
    </button>
  </div>

  <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
    <aside class="lg:sticky lg:top-20 lg:self-start">
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
      {:else if sortedEntries.length === 0}
        <div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
          <p>No entries yet.</p>
          <button
            type="button"
            onclick={jumpToToday}
            class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Start today's entry
          </button>
        </div>
      {:else}
        <div>
          {#each sortedEntries as entry (entry.id)}
            <EntryItem
              {entry}
              onUpdated={onEntryUpdated}
              onDeleted={onEntryDeleted}
            />
          {/each}
        </div>
        <div bind:this={sentinel} class="py-6 text-center text-xs text-slate-500">
          {#if loadingMore}
            Loading older entries…
          {:else if hasMore}
            Scroll to load more
          {:else}
            End of journal
          {/if}
        </div>
      {/if}
    </section>
  </div>
</main>
