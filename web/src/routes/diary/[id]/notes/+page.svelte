<script lang="ts">
  import { tick } from "svelte";
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

  /** Pinned entry first (only one); rest sorted by date ascending. */
  const sortedEntries = $derived.by(() => {
    const pinned = entries.find((e) => e.isPinned);
    const rest = entries
      .filter((e) => !e.isPinned)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    return pinned ? [pinned, ...rest] : rest;
  });

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
      void loadEntries(true);
    }
  });

  // Honor #entry-YYYY-MM-DD on load.
  $effect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (hash.startsWith("#entry-")) {
      void scrollToDate(hash.slice("#entry-".length));
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
        existing = await entriesApi.upsert(diaryId, {
          date,
          content: "",
          tags: [],
        });
        entries = [...entries, existing];
      } catch (err) {
        error = err instanceof Error ? err.message : "failed to create entry";
        return;
      }
    }
    activeIds = new Set([...activeIds, existing.id]);

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
    entries = entries.filter((e) => e.id !== id);
    if (activeIds.has(id)) {
      const next = new Set(activeIds);
      next.delete(id);
      activeIds = next;
    }
  }

  function onSlashAction(action: SlashAction) {
    if (action.kind === "createDate") {
      void scrollToDate(action.date);
    }
  }

  /** Single-pin enforcement: pinning a new entry unpins any others. */
  async function onTogglePin(entry: Entry) {
    try {
      if (entry.isPinned) {
        const updated = await entriesApi.setPin(entry.id, false);
        onEntryUpdated(updated);
        return;
      }
      const others = entries.filter((e) => e.isPinned && e.id !== entry.id);
      await Promise.all(others.map((e) => entriesApi.setPin(e.id, false)));
      const updated = await entriesApi.setPin(entry.id, true);
      const refreshed = await Promise.all(
        others.map((e) => entriesApi.get(e.id)),
      );
      entries = entries.map((e) => {
        if (e.id === updated.id) return updated;
        const r = refreshed.find((x) => x.id === e.id);
        return r ?? e;
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "pin failed";
    }
  }
</script>

<svelte:head>
  <title>Notes · SimpleJournal</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
  {#if loading}
    <p class="text-sm text-slate-500">Loading entries…</p>
  {:else if error}
    <p class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
      {error}
    </p>
  {:else}
    <div>
      {#each visibleEntries as entry (entry.id)}
        <EntryItem
          {entry}
          onUpdated={onEntryUpdated}
          onDeleted={onEntryDeleted}
          onSlashAction={onSlashAction}
          onTogglePin={onTogglePin}
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
