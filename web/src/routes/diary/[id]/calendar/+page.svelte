<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { authStore } from "$lib/auth/store.svelte";
  import { entriesApi } from "$lib/api/diaries";
  import {
    addMonths,
    formatMonth,
    isSameDay,
    startOfMonth,
    toIso,
  } from "$lib/utils/date";
  import type { Entry } from "@simple-journal/shared-types/domain";

  const diaryId = $derived(page.params.id as string);

  let month = $state<Date>(startOfMonth(new Date()));
  let monthEntries = $state<Entry[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  const today = new Date();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Cells for the visible month grid: 6 rows × 7 cols, with leading/trailing
  // days from neighbouring months filled in for a tidy grid.
  const cells = $derived.by(() => {
    const first = startOfMonth(month);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    const out: { date: Date; inMonth: boolean }[] = [];
    for (let i = startWeekday; i > 0; i--) {
      const d = new Date(first);
      d.setDate(d.getDate() - i);
      out.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      out.push({
        date: new Date(month.getFullYear(), month.getMonth(), i),
        inMonth: true,
      });
    }
    while (out.length < 42) {
      const last = out[out.length - 1]!.date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      out.push({ date: d, inMonth: false });
    }
    return out;
  });

  const fromDate = $derived(toIso(cells[0]!.date));
  const toDate = $derived(toIso(cells[cells.length - 1]!.date));

  const entriesByDate = $derived(
    new Map(monthEntries.map((e) => [e.date, e] as const)),
  );

  async function loadMonth() {
    if (authStore.status !== "authenticated" || !diaryId) return;
    loading = true;
    error = null;
    try {
      monthEntries = await entriesApi.search({
        diaryId,
        from: fromDate,
        to: toDate,
        limit: 200,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to load entries";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    // Refetch whenever the visible window changes.
    void fromDate;
    void toDate;
    if (authStore.status === "authenticated" && diaryId) {
      void loadMonth();
    }
  });

  function preview(text: string, max = 60): string {
    const t = text.replace(/\s+/g, " ").trim();
    return t.length <= max ? t : t.slice(0, max) + "…";
  }

  function onSelectDate(iso: string) {
    void goto(`/diary/${diaryId}/notes#entry-${iso}`);
  }

  function onMonthChange(next: Date) {
    month = next;
  }
</script>

<svelte:head>
  <title>Calendar · SimpleJournal</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
  <div class="flex items-center justify-between">
    <button
      type="button"
      class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      onclick={() => onMonthChange(addMonths(month, -1))}
      aria-label="Previous month"
    >
      ‹
    </button>
    <h2 class="text-xl font-semibold tracking-tight">{formatMonth(month)}</h2>
    <button
      type="button"
      class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      onclick={() => onMonthChange(addMonths(month, 1))}
      aria-label="Next month"
    >
      ›
    </button>
  </div>

  <div class="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 text-xs dark:border-slate-800 dark:bg-slate-800">
    {#each weekdays as wd}
      <div class="bg-slate-50 py-2 text-center font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-950">
        {wd}
      </div>
    {/each}

    {#each cells as cell (cell.date.toISOString())}
      {@const iso = toIso(cell.date)}
      {@const entry = entriesByDate.get(iso)}
      {@const isToday = isSameDay(cell.date, today)}
      <button
        type="button"
        onclick={() => onSelectDate(iso)}
        class="group relative flex min-h-[80px] flex-col bg-white p-2 text-left transition hover:bg-blue-50 sm:min-h-[110px] dark:bg-slate-900 dark:hover:bg-slate-800"
        class:opacity-50={!cell.inMonth}
      >
        <div class="flex items-baseline justify-between">
          <span
            class="text-sm font-semibold"
            class:text-blue-600={isToday}
            class:dark:text-blue-400={isToday}
          >
            {cell.date.getDate()}
          </span>
          {#if entry?.isPinned}
            <span class="text-amber-500 text-xs" aria-label="Pinned">📌</span>
          {/if}
        </div>

        {#if entry}
          <div class="mt-1 flex-1 overflow-hidden">
            {#if entry.content.trim()}
              <p class="line-clamp-3 text-[11px] leading-tight text-slate-600 dark:text-slate-400">
                {preview(entry.content, 90)}
              </p>
            {:else}
              <p class="text-[11px] italic text-slate-400">empty</p>
            {/if}
            {#if entry.tags.length > 0}
              <div class="mt-1 flex flex-wrap gap-0.5">
                {#each entry.tags.slice(0, 2) as tag}
                  <span class="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-500 dark:bg-slate-800">
                    #{tag}
                  </span>
                {/each}
                {#if entry.tags.length > 2}
                  <span class="text-[9px] text-slate-400">+{entry.tags.length - 2}</span>
                {/if}
              </div>
            {/if}
          </div>
        {:else}
          <div class="mt-2 hidden text-[11px] text-slate-400 group-hover:block">
            Tap to write
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <div class="mt-6 flex items-center justify-between text-xs text-slate-500">
    {#if loading}
      <span>Loading…</span>
    {:else if error}
      <span class="text-rose-600">{error}</span>
    {:else}
      <span>
        {monthEntries.length} {monthEntries.length === 1 ? "entry" : "entries"} this view
      </span>
    {/if}
    <button
      type="button"
      class="rounded-lg px-3 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      onclick={() => onMonthChange(startOfMonth(new Date()))}
    >
      Jump to today's month
    </button>
  </div>
</main>
