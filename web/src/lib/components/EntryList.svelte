<script lang="ts">
  import { formatLongDate } from "$lib/utils/date";
  import type { Entry } from "@simple-journal/shared-types/domain";

  interface Props {
    diaryId: string;
    entries: Entry[];
    loadingMore?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    onTogglePin?: (entry: Entry) => void;
  }

  let {
    diaryId,
    entries,
    loadingMore = false,
    hasMore = false,
    onLoadMore,
    onTogglePin,
  }: Props = $props();

  let sentinel: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!sentinel || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries_) => {
        if (entries_[0]?.isIntersecting && !loadingMore) {
          onLoadMore?.();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  });

  function preview(content: string, max = 240): string {
    const text = content.replace(/\s+/g, " ").trim();
    return text.length <= max ? text : text.slice(0, max) + "…";
  }
</script>

{#if entries.length === 0}
  <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
    No entries yet. Pick a date on the calendar to start writing.
  </div>
{:else}
  <ul class="space-y-3">
    {#each entries as entry (entry.id)}
      <li>
        <article
          class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
        >
          <div class="flex items-start justify-between gap-3">
            <a
              href={`/diary/${diaryId}/entry/${entry.date}`}
              class="block flex-1"
            >
              <div class="flex items-center gap-2">
                {#if entry.isPinned}
                  <span class="text-amber-500" aria-label="Pinned">📌</span>
                {/if}
                <h3 class="font-semibold tracking-tight">{formatLongDate(entry.date)}</h3>
              </div>
              {#if entry.content.trim()}
                <p class="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {preview(entry.content)}
                </p>
              {:else}
                <p class="mt-2 text-sm italic text-slate-400">(empty)</p>
              {/if}
              {#if entry.tags.length > 0}
                <div class="mt-3 flex flex-wrap gap-1">
                  {#each entry.tags as tag}
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      #{tag}
                    </span>
                  {/each}
                </div>
              {/if}
            </a>
            <button
              type="button"
              onclick={() => onTogglePin?.(entry)}
              class="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-amber-500 group-hover:opacity-100 dark:hover:bg-slate-800"
              class:opacity-100={entry.isPinned}
              class:text-amber-500={entry.isPinned}
              aria-label={entry.isPinned ? "Unpin" : "Pin"}
              title={entry.isPinned ? "Unpin" : "Pin"}
            >
              📌
            </button>
          </div>
        </article>
      </li>
    {/each}
  </ul>

  {#if hasMore}
    <div bind:this={sentinel} class="mt-6 flex justify-center text-xs text-slate-500">
      {loadingMore ? "Loading more…" : "Scroll to load more"}
    </div>
  {/if}
{/if}
