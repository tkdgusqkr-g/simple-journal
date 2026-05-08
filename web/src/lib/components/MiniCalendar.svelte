<script lang="ts">
  import {
    addMonths,
    formatMonth,
    isSameDay,
    startOfMonth,
    toIso,
  } from "$lib/utils/date";

  interface Props {
    onPick: (iso: string) => void;
    onKeyClose?: () => void;
  }

  let { onPick, onKeyClose }: Props = $props();

  let month = $state<Date>(startOfMonth(new Date()));
  let cursor = $state<Date>(new Date());
  const today = new Date();
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

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

  function moveCursor(days: number) {
    const next = new Date(cursor);
    next.setDate(next.getDate() + days);
    cursor = next;
    // Switch month view if cursor leaves current month
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
      month = startOfMonth(next);
    }
  }

  export function handleKey(event: KeyboardEvent): boolean {
    switch (event.key) {
      case "ArrowLeft":
        moveCursor(-1);
        return true;
      case "ArrowRight":
        moveCursor(1);
        return true;
      case "ArrowUp":
        moveCursor(-7);
        return true;
      case "ArrowDown":
        moveCursor(7);
        return true;
      case "Enter":
        onPick(toIso(cursor));
        return true;
      case "Escape":
        onKeyClose?.();
        return true;
      default:
        return false;
    }
  }
</script>

<div
  class="w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
  onmousedown={(e) => {
    e.preventDefault();
  }}
  role="presentation"
>
  <div class="flex items-center justify-between">
    <button
      type="button"
      class="rounded p-1 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      onmousedown={(e) => e.preventDefault()}
      onclick={() => (month = addMonths(month, -1))}
      aria-label="Previous month"
    >
      ‹
    </button>
    <h3 class="text-sm font-semibold">{formatMonth(month)}</h3>
    <button
      type="button"
      class="rounded p-1 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      onmousedown={(e) => e.preventDefault()}
      onclick={() => (month = addMonths(month, 1))}
      aria-label="Next month"
    >
      ›
    </button>
  </div>

  <div class="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase tracking-wide text-slate-500">
    {#each weekdays as wd}
      <div>{wd}</div>
    {/each}
  </div>

  <div class="mt-1 grid grid-cols-7 gap-0.5">
    {#each cells as cell}
      {@const iso = toIso(cell.date)}
      {@const isToday = isSameDay(cell.date, today)}
      {@const isCursor = isSameDay(cell.date, cursor)}
      <button
        type="button"
        onmousedown={(e) => e.preventDefault()}
        onclick={() => onPick(iso)}
        class:opacity-30={!cell.inMonth}
        class:ring-2={isToday && !isCursor}
        class:ring-blue-400={isToday && !isCursor}
        class:bg-blue-500={isCursor}
        class:text-white={isCursor}
        class="flex aspect-square items-center justify-center rounded text-xs transition hover:bg-blue-100 dark:hover:bg-slate-800"
      >
        {cell.date.getDate()}
      </button>
    {/each}
  </div>
</div>
