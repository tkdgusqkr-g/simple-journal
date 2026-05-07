<script lang="ts">
  import { onMount } from "svelte";
  import { ApiError } from "$lib/api/client";
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
  }

  let { entry, onUpdated, onDeleted, onSlashAction }: Props = $props();

  // svelte-ignore state_referenced_locally
  let content = $state(entry.content);

  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let deleted = $state(false);

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
    if (deleted) return;
    try {
      const updated = await entriesApi.update(entry.id, { content });
      if (deleted) return; // raced with delete — drop the result
      onUpdated?.(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return; // entry gone
      // Other errors are intentionally silent — autosave is best-effort.
      console.warn("[entry save] failed:", err);
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

  async function deleteSilently() {
    if (deleted) return;
    deleted = true;
    save.cancel(); // drop any pending PATCH for this entry
    try {
      await entriesApi.remove(entry.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // already gone — that's fine
      } else {
        console.warn("[entry delete] failed:", err);
      }
    }
    onDeleted?.(entry.id);
  }

  function onTextareaKeydown(event: KeyboardEvent) {
    // Backspace at the very start of an empty entry removes the entry —
    // the natural way to undo a slash command (`/today`) you regret.
    if (
      !slashOpen &&
      event.key === "Backspace" &&
      textareaEl !== null &&
      textareaEl.selectionStart === 0 &&
      textareaEl.selectionEnd === 0 &&
      content.length === 0
    ) {
      event.preventDefault();
      void deleteSilently();
      return;
    }

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
    if (slashOpen) return;
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
    queueMicrotask(() => {
      if (!textareaEl) return;
      textareaEl.value = next;
      textareaEl.setSelectionRange(slashStart!, slashStart!);
      autoResize(textareaEl);
    });
    save.flush();
  }

  onMount(() => {
    autoResize(textareaEl);
  });
</script>

<article
  id={`entry-${entry.date}`}
  class="scroll-mt-24 py-4"
  role="region"
  aria-label={`Entry for ${entry.date}`}
>
  <h2 class="mb-1.5 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
    {formatLongDate(entry.date)}
  </h2>

  <textarea
    bind:this={textareaEl}
    rows="1"
    class="w-full resize-none border-none bg-transparent p-0 text-base leading-relaxed focus:outline-none focus:ring-0"
    bind:value={content}
    oninput={onContentInput}
    onkeydown={onTextareaKeydown}
    onkeyup={onTextareaKeyup}
    onclick={onTextareaClick}
    onblur={() => {
      setTimeout(() => {
        if (!textareaEl || document.activeElement !== textareaEl) {
          closeSlashMenu();
        }
      }, 100);
    }}
    autocomplete="off"
    spellcheck="true"
  ></textarea>
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
