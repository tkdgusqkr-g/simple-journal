<script lang="ts">
  import { tick, untrack } from "svelte";
  import { page } from "$app/state";
  import { authStore } from "$lib/auth/store.svelte";
  import { entriesApi } from "$lib/api/diaries";
  import EntryItem from "$lib/components/EntryItem.svelte";
  import type { Entry } from "@simple-journal/shared-types/domain";
  import type { SlashAction } from "$lib/utils/slash";

  const diaryId = $derived(page.params.id as string);

  let entries = $state<Entry[]>([]);
  let cursor = $state<string | null>(null);
  let hasMore = $state(false);
  let loading = $state(true);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let sentinel: HTMLDivElement | undefined = $state();

  // Entries created/visited during this session — they render even if
  // empty so the user has a place to type. Empty entries from earlier
  // sessions are filtered out (Word-like clean canvas).
  let activeIds = $state<Set<string>>(new Set());

  /** Plain date-ascending order. (Pin is no longer surfaced in the UI.) */
  const sortedEntries = $derived(
    entries.slice().sort((a, b) => a.date.localeCompare(b.date)),
  );

  /** Hide empty entries unless they were created/visited this session. */
  const visibleEntries = $derived(
    sortedEntries.filter(
      (e) => e.content.trim().length > 0 || activeIds.has(e.id),
    ),
  );

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
      if (reset) {
        entries = result.entries;
      } else {
        // Dedupe by id — pagination overlap would crash {#each (id)} with
        // each_key_duplicate.
        const have = new Set(entries.map((e) => e.id));
        const newOnly = result.entries.filter((e) => !have.has(e.id));
        entries = [...entries, ...newOnly];
      }
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
      void loadEntries(true);
    }
  });

  // Honor #entry-YYYY-MM-DD on load. Wrap the scrollToDate call in
  // untrack() so its `entries.find(...)` read isn't picked up as a dep —
  // otherwise deleting the entry that the hash points to would re-fire
  // this effect and re-create the very entry the user just removed.
  $effect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (hash.startsWith("#entry-")) {
      const date = hash.slice("#entry-".length);
      untrack(() => {
        void scrollToDate(date);
      });
    }
  });

  // Infinite scroll for older entries.
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

  async function scrollToDate(date: string) {
    let existing = entries.find((e) => e.date === date);

    if (!existing) {
      try {
        const created = await entriesApi.upsert(diaryId, {
          date,
          content: "",
          tags: [],
        });
        // Dedupe — server may return an entry whose id we already have
        // (e.g. raced with pagination loading the same date).
        if (!entries.some((e) => e.id === created.id)) {
          entries = [...entries, created];
        }
        existing = created;
      } catch (err) {
        error = err instanceof Error ? err.message : "failed to create entry";
        return;
      }
    }
    // Only write the Set when the id is genuinely new — every assignment
    // creates a fresh Set reference and would re-trigger this effect's
    // entries.find() read, looping until the budget exceeds.
    if (!activeIds.has(existing.id)) {
      activeIds = new Set([...activeIds, existing.id]);
    }

    await tick();
    const el = document.getElementById(`entry-${date}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, "", `#entry-${date}`);
      const ta = el.querySelector("textarea") as HTMLTextAreaElement | null;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    } else if (hasMore) {
      while (hasMore) {
        await loadEntries(false);
        if (entries.some((e) => e.date === date)) {
          await tick();
          const el2 = document.getElementById(`entry-${date}`);
          el2?.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.replaceState({}, "", `#entry-${date}`);
          break;
        }
      }
    }
  }

  function onEntryUpdated(updated: Entry) {
    entries = entries.map((e) => (e.id === updated.id ? updated : e));
  }

  function onEntryDeleted(id: string) {
    const target = entries.find((e) => e.id === id);
    entries = entries.filter((e) => e.id !== id);
    if (activeIds.has(id)) {
      const next = new Set(activeIds);
      next.delete(id);
      activeIds = next;
    }
    // If the URL hash points to the entry we just removed, clear it so
    // a refresh doesn't re-create the entry through the hash effect.
    if (target && window.location.hash === `#entry-${target.date}`) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  function onSlashAction(action: SlashAction) {
    if (action.kind === "createDate") {
      void scrollToDate(action.date);
    }
  }

  async function startTodaysEntry() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    await scrollToDate(`${y}-${m}-${d}`);
  }
</script>

<svelte:head>
  <title>Notes · SimpleJournal</title>
</svelte:head>

<main class="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
  {#if loading}
    <p class="text-sm text-slate-500">Loading entries…</p>
  {:else if error}
    <p class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
      {error}
    </p>
  {:else if visibleEntries.length === 0}
    <div class="mt-16 flex flex-col items-center text-center">
      <h2 class="text-lg font-medium text-slate-700 dark:text-slate-300">
        Start your journal
      </h2>
      <p class="mt-2 max-w-sm text-sm text-slate-500">
        Pick a date on the calendar, or jump straight in.
      </p>
      <button
        type="button"
        onclick={() => void startTodaysEntry()}
        class="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Write today's entry
      </button>
      <p class="mt-8 max-w-sm text-xs text-slate-400">
        Tip: inside an entry, type <kbd class="rounded bg-slate-100 px-1 font-mono dark:bg-slate-800">/today</kbd>,
        <kbd class="rounded bg-slate-100 px-1 font-mono dark:bg-slate-800">/yesterday</kbd>, or
        <kbd class="rounded bg-slate-100 px-1 font-mono dark:bg-slate-800">/date</kbd>
        to insert another day. Backspace at the start of an empty entry removes it.
      </p>
    </div>
  {:else}
    <div>
      {#each visibleEntries as entry (entry.id)}
        <EntryItem
          {entry}
          onUpdated={onEntryUpdated}
          onDeleted={onEntryDeleted}
          onSlashAction={onSlashAction}
        />
      {/each}
    </div>
    <div bind:this={sentinel} class="py-6 text-center text-xs text-slate-500">
      {#if loadingMore}
        Loading older entries…
      {/if}
    </div>
  {/if}
</main>
