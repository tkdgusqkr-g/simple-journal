<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { authStore } from "$lib/auth/store.svelte";
  import { entriesApi } from "$lib/api/diaries";
  import EntryItem from "$lib/components/EntryItem.svelte";
  import type { Entry } from "@simple-journal/shared-types/domain";

  const diaryId = $derived(page.params.id as string);

  let entries = $state<Entry[]>([]);
  let cursor = $state<string | null>(null);
  let hasMore = $state(false);
  let loading = $state(true);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let sentinel: HTMLDivElement | undefined = $state();

  // Strict date-desc order; the feed view is "by date", not "by pin".
  const sortedEntries = $derived(
    [...entries].sort((a, b) => b.date.localeCompare(a.date)),
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

  // Honor #entry-YYYY-MM-DD on load — used by Calendar→Notes navigation.
  $effect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (hash.startsWith("#entry-")) {
      void scrollToDate(hash.slice("#entry-".length), true);
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

  async function scrollToDate(date: string, createIfMissing = true) {
    let exists = entries.some((e) => e.date === date);

    if (!exists && createIfMissing) {
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
    if (!exists) {
      // Date is older than what's loaded — keep paging until we find it.
      while (hasMore) {
        await loadEntries(false);
        if (entries.some((e) => e.date === date)) {
          exists = true;
          break;
        }
      }
      if (!exists) return;
    }

    await tick();
    const el = document.getElementById(`entry-${date}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, "", `#entry-${date}`);
      const ta = el.querySelector("textarea") as HTMLTextAreaElement | null;
      if (ta && ta.value === "") ta.focus();
    }
  }

  function onEntryUpdated(updated: Entry) {
    entries = entries.map((e) => (e.id === updated.id ? updated : e));
  }

  function onEntryDeleted(id: string) {
    entries = entries.filter((e) => e.id !== id);
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
  {:else if sortedEntries.length === 0}
    <div class="mt-12 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
      <p>No entries yet.</p>
      <p class="mt-2 text-xs">Tap “Today's entry” above to start writing.</p>
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
</main>
