<script lang="ts">
  import MiniCalendar from "./MiniCalendar.svelte";
  import type { SlashAction, SlashSuggestion } from "$lib/utils/slash";

  interface Props {
    suggestions: SlashSuggestion[];
    selectedIndex: number;
    showDatePicker: boolean;
    top: number;
    left: number;
    onSelectSuggestion: (s: SlashSuggestion) => void;
    onPickDate: (iso: string) => void;
    onClose: () => void;
  }

  let {
    suggestions,
    selectedIndex,
    showDatePicker,
    top,
    left,
    onSelectSuggestion,
    onPickDate,
    onClose,
  }: Props = $props();
</script>

<svelte:window
  onmousedown={(e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest("[data-slash-menu]")) onClose();
  }}
/>

<div
  data-slash-menu
  class="fixed z-50"
  style:top={`${top}px`}
  style:left={`${left}px`}
>
  {#if showDatePicker}
    <MiniCalendar onPick={onPickDate} />
  {:else if suggestions.length > 0}
    <ul
      class="w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
      role="listbox"
    >
      {#each suggestions as s, i}
        <li>
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition"
            class:bg-blue-50={i === selectedIndex}
            class:dark:bg-blue-950={i === selectedIndex}
            onmousedown={(e) => {
              e.preventDefault();
              onSelectSuggestion(s);
            }}
            role="option"
            aria-selected={i === selectedIndex}
          >
            <span class="font-medium text-slate-900 dark:text-slate-100">{s.label}</span>
            <span class="text-xs text-slate-500">{s.hint}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
