<script lang="ts">
  import {
    addMonths,
    formatMonth,
    isSameDay,
    startOfMonth,
    toIso,
  } from "$lib/utils/date";

  interface Props {
    month: Date;
    entryDates: Set<string>;
    pinnedDates?: Set<string>;
    selectedIso?: string | null;
    onMonthChange?: (next: Date) => void;
    onSelect?: (iso: string) => void;
  }

  let {
    month,
    entryDates,
    pinnedDates = new Set(),
    selectedIso = null,
    onMonthChange,
    onSelect,
  }: Props = $props();

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();

  const days = $derived.by(() => {
    const first = startOfMonth(month);
    const startWeekday = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    // Leading days from previous month
    for (let i = startWeekday; i > 0; i--) {
      const d = new Date(first);
      d.setDate(d.getDate() - i);
      cells.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(month.getFullYear(), month.getMonth(), i),
        inMonth: true,
      });
    }
    // Trailing days to fill 6 rows of 7
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1]!.date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, inMonth: false });
      if (cells.length >= 42) break;
    }
    return cells;
  });
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <div class="flex items-center justify-between">
    <button
      type="button"
      class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      onclick={() => onMonthChange?.(addMonths(month, -1))}
      aria-label="Previous month"
    >
      ‹
    </button>
    <h2 class="text-sm font-semibold tracking-tight">{formatMonth(month)}</h2>
    <button
      type="button"
      class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      onclick={() => onMonthChange?.(addMonths(month, 1))}
      aria-label="Next month"
    >
      ›
    </button>
  </div>

  <div class="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-slate-500">
    {#each weekdays as wd}
      <div>{wd}</div>
    {/each}
  </div>

  <div class="mt-1 grid grid-cols-7 gap-1">
    {#each days as cell}
      {@const iso = toIso(cell.date)}
      {@const hasEntry = entryDates.has(iso)}
      {@const isPinned = pinnedDates.has(iso)}
      {@const isToday = isSameDay(cell.date, today)}
      {@const isSelected = selectedIso === iso}
      <button
        type="button"
        onclick={() => onSelect?.(iso)}
        class:opacity-30={!cell.inMonth}
        class:bg-blue-600={isSelected}
        class:text-white={isSelected}
        class:ring-2={isToday && !isSelected}
        class:ring-blue-400={isToday && !isSelected}
        class="relative flex aspect-square items-center justify-center rounded-lg text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span>{cell.date.getDate()}</span>
        {#if hasEntry}
          <span
            class="absolute bottom-1 h-1 w-1 rounded-full"
            class:bg-amber-500={isPinned}
            class:bg-blue-500={!isPinned && !isSelected}
            class:bg-white={isSelected}
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    {/each}
  </div>
</div>
