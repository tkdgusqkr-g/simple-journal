<script lang="ts">
  import { entriesApi } from "$lib/api/diaries";
  import { debounce } from "$lib/utils/debounce";
  import { formatLongDate } from "$lib/utils/date";
  import {
    detectSlashTrigger,
    suggestionsFor,
    type SlashAction,
    type SlashSuggestion,
  } from "$lib/utils/slash";
  import SlashMenu from "./SlashMenu.svelte";
  import type { Entry } from "@simple-journal/shared-types/domain";

  interface Props {
    entry: Entry;
    onUpdated?: (entry: Entry) => void;
    onDeleted?: (id: string) => void;
    onSlashAction?: (action: SlashAction) => void;
    onTogglePin?: (entry: Entry) => void;
  }

  let {
    entry,
    onUpdated,
    onDeleted,
    onSlashAction,
    onTogglePin,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let content = $state(entry.content);

  let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");
  let errorMessage = $state<string | null>(null);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let focused = $state(false);
  let hovered = $state(false);

  // Slash menu state — local to this entry's textarea.
  let slashStart = $state<number | null>(null);
  let slashQuery = $state("");
  let slashSelectedIdx = $state(0);
  let slashShowDatePicker = $state(false);
  let slashPos = $state({ top: 0, left: 0 });

  const slashSuggestions = $derived(
    slashStart !== null ? suggestionsFor(slashQuery) : [],
  );
  const slashOpen = $derived(
    slashStart !== null && (slashShowDatePicker || slashSuggestions.length > 0),
  );

  const save = debounce(async () => {
    saveStatus = "saving";
    errorMessage = null;
    try {
      const updated = await entriesApi.update(entry.id, { content });
      saveStatus = "saved";
      onUpdated?.(updated);
    } catch (err) {
      saveStatus = "error";
      errorMessage = err instanceof Error ? err.message : "save failed";
    }
  }, 800);

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 28)}px`;
  }

  function refreshSlashState() {
    if (!textareaEl) return;
    const trig = detectSlashTrigger(textareaEl.value, textareaEl.selectionStart);
    if (trig) {
      // Only reset the highlighted suggestion when the slash position or the
      // query actually changes — otherwise arrow-key navigation in the menu
      // would snap back to the first item every time keyup fires.
      const isFreshTrigger =
        slashStart !== trig.slashIndex || slashQuery !== trig.query;
      slashStart = trig.slashIndex;
      slashQuery = trig.query;
      if (isFreshTrigger) slashSelectedIdx = 0;
      slashPos = computeMenuPosition(textareaEl);
    } else {
      closeSlashMenu();
    }
  }

  function closeSlashMenu() {
    slashStart = null;
    slashQuery = "";
    slashShowDatePicker = false;
    slashSelectedIdx = 0;
  }

  function computeMenuPosition(ta: HTMLTextAreaElement): {
    top: number;
    left: number;
  } {
    const rect = ta.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left + 8 };
  }

  function onContentInput() {
    if (!textareaEl) return;
    content = textareaEl.value;
    autoResize(textareaEl);
    save();
    refreshSlashState();
  }

  function onTextareaKeydown(event: KeyboardEvent) {
    if (!slashOpen) return;
    if (slashShowDatePicker) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSlashMenu();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      slashSelectedIdx = Math.min(
        slashSuggestions.length - 1,
        slashSelectedIdx + 1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      slashSelectedIdx = Math.max(0, slashSelectedIdx - 1);
    } else if (event.key === "Enter" || event.key === "Tab") {
      const choice = slashSuggestions[slashSelectedIdx];
      if (choice) {
        event.preventDefault();
        applySuggestion(choice);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSlashMenu();
    }
  }

  function onTextareaKeyup(event: KeyboardEvent) {
    // While the menu is open the keydown handler owns navigation; don't
    // recompute here or we'd fight it (and the textarea cursor isn't
    // moving anyway because keydown calls preventDefault).
    if (slashOpen) return;
    // Outside the menu, cursor-move keys can land inside or leave a slash
    // context, so re-evaluate.
    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      refreshSlashState();
    }
  }

  function onTextareaClick() {
    refreshSlashState();
  }

  function applySuggestion(s: SlashSuggestion) {
    const action = s.resolve();
    if (action.kind === "openDatePicker") {
      slashShowDatePicker = true;
      return;
    }
    if (action.kind === "createDate") {
      removeSlashFromTextarea();
      onSlashAction?.(action);
      closeSlashMenu();
    }
  }

  function onPickDate(iso: string) {
    removeSlashFromTextarea();
    onSlashAction?.({ kind: "createDate", date: iso });
    closeSlashMenu();
  }

  function removeSlashFromTextarea() {
    if (!textareaEl || slashStart === null) return;
    const before = textareaEl.value.slice(0, slashStart);
    const after = textareaEl.value.slice(textareaEl.selectionStart);
    const next = before + after;
    content = next;
    // The DOM update happens reactively; immediately reset selection on the new value.
    queueMicrotask(() => {
      if (!textareaEl) return;
      textareaEl.value = next;
      textareaEl.setSelectionRange(slashStart!, slashStart!);
      autoResize(textareaEl);
    });
    save.flush();
  }

  async function onDelete() {
    if (!confirm("Delete this entry?")) return;
    try {
      await entriesApi.remove(entry.id);
      onDeleted?.(entry.id);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "delete failed";
    }
  }

  function onPinClick() {
    onTogglePin?.(entry);
  }

  // Auto-size when the content state updates (covers external prop changes
  // and programmatic edits like slash removal).
  $effect(() => {
    void content;
    autoResize(textareaEl);
  });

  const toolbarVisible = $derived(focused || hovered);
</script>

<article
  id={`entry-${entry.date}`}
  class="group relative scroll-mt-24 py-4"
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
  role="region"
  aria-label={`Entry for ${entry.date}`}
>
  <div class="mb-1.5 flex items-baseline gap-2">
    <h2 class="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
      {formatLongDate(entry.date)}
    </h2>
    {#if entry.isPinned}
      <span class="text-amber-500" aria-label="Pinned">📌</span>
    {/if}
  </div>

  <textarea
    bind:this={textareaEl}
    rows="1"
    class="w-full resize-none border-none bg-transparent p-0 text-base leading-relaxed focus:outline-none focus:ring-0"
    bind:value={content}
    oninput={onContentInput}
    onkeydown={onTextareaKeydown}
    onkeyup={onTextareaKeyup}
    onclick={onTextareaClick}
    onfocus={() => (focused = true)}
    onblur={() => {
      focused = false;
      // Allow popup mousedown to fire before we close.
      setTimeout(() => {
        if (!textareaEl || document.activeElement !== textareaEl) {
          closeSlashMenu();
        }
      }, 100);
    }}
    autocomplete="off"
    spellcheck="true"
  ></textarea>

  <div
    class="absolute right-0 top-3 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs shadow-sm transition-opacity dark:border-slate-700 dark:bg-slate-900"
    class:opacity-0={!toolbarVisible}
    class:pointer-events-none={!toolbarVisible}
  >
    {#if saveStatus === "saving"}
      <span class="px-1 text-slate-500">Saving…</span>
    {:else if saveStatus === "saved"}
      <span class="px-1 text-emerald-600">Saved</span>
    {:else if saveStatus === "error"}
      <span class="px-1 text-rose-600">Save failed</span>
    {/if}
    <button
      type="button"
      tabindex={-1}
      onclick={onPinClick}
      class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"
      class:text-amber-500={entry.isPinned}
      title={entry.isPinned ? "Unpin" : "Pin to top"}
      aria-pressed={entry.isPinned}
    >
      📌
    </button>
    <button
      type="button"
      tabindex={-1}
      onclick={() => void onDelete()}
      class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
      title="Delete"
    >
      🗑
    </button>
  </div>

  {#if errorMessage}
    <p class="mt-2 text-xs text-rose-600">{errorMessage}</p>
  {/if}
</article>

{#if slashOpen}
  <SlashMenu
    suggestions={slashSuggestions}
    selectedIndex={slashSelectedIdx}
    showDatePicker={slashShowDatePicker}
    top={slashPos.top}
    left={slashPos.left}
    onSelectSuggestion={applySuggestion}
    onPickDate={onPickDate}
    onClose={closeSlashMenu}
  />
{/if}
