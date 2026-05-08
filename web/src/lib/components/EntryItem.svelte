<script lang="ts">
  import { onMount, untrack } from "svelte";
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
    /** Move focus to the previous entry's textarea (cursor at end). */
    onFocusPrev?: () => void;
    /** Move focus to the next entry's textarea (cursor at start). */
    onFocusNext?: () => void;
    /** Backspace at pos 0 of a non-empty entry: hand the entry's
     * content to the parent so it can be appended to the previous
     * entry, then this entry is removed. Returns true if a merge
     * happened (so the keypress was consumed). */
    onMergeWithPrev?: (content: string) => boolean;
  }

  let {
    entry,
    onUpdated,
    onDeleted,
    onSlashAction,
    onFocusPrev,
    onFocusNext,
    onMergeWithPrev,
  }: Props = $props();

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

  function isOnFirstLine(ta: HTMLTextAreaElement): boolean {
    const cursor = ta.selectionStart;
    if (cursor === 0) return true;
    return ta.value.lastIndexOf("\n", cursor - 1) === -1;
  }

  function isOnLastLine(ta: HTMLTextAreaElement): boolean {
    const cursor = ta.selectionStart;
    return ta.value.indexOf("\n", cursor) === -1;
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
    // Boundary navigation between entries — makes the feed feel like a
    // single continuous text doc rather than a stack of isolated boxes.
    if (
      !slashOpen &&
      textareaEl !== null &&
      textareaEl.selectionStart === textareaEl.selectionEnd
    ) {
      const atStart = textareaEl.selectionStart === 0;
      const atEnd = textareaEl.selectionStart === textareaEl.value.length;

      if (event.key === "Backspace" && atStart) {
        event.preventDefault();
        if (content.length === 0) {
          // Empty entry → delete it (undo a `/today` you regret).
          void deleteSilently();
        } else {
          // Non-empty entry → merge content into the previous entry
          // and remove this entry's date header. Like deleting a
          // block boundary in Notion — the date marker disappears,
          // the text survives. If there's no previous entry the
          // parent returns false and we leave the textarea alone.
          if (onMergeWithPrev) {
            const merged = onMergeWithPrev(content);
            if (merged) {
              // EntryItem will be unmounted; nothing more to do.
              return;
            }
          }
          // No previous entry to merge into — fall back to plain
          // navigation so the keystroke isn't a complete no-op.
          onFocusPrev?.();
        }
        return;
      }
      if (event.key === "ArrowLeft" && atStart) {
        event.preventDefault();
        onFocusPrev?.();
        return;
      }
      if (event.key === "ArrowRight" && atEnd) {
        event.preventDefault();
        onFocusNext?.();
        return;
      }
      if (event.key === "ArrowUp" && isOnFirstLine(textareaEl)) {
        event.preventDefault();
        onFocusPrev?.();
        return;
      }
      if (event.key === "ArrowDown" && isOnLastLine(textareaEl)) {
        event.preventDefault();
        onFocusNext?.();
        return;
      }
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
    // Set the initial value imperatively rather than via `bind:value` /
    // `value={...}` — those re-write the DOM on every state change,
    // which clears the browser's native undo stack on every keystroke.
    if (textareaEl) {
      textareaEl.value = entry.content;
      autoResize(textareaEl);
    }
  });

  // When the parent rewrites our entry.content prop (e.g. another entry
  // got merged into us via Backspace), pull the new content into our
  // local state and DOM — but only when this textarea isn't focused,
  // so we never clobber what the user is currently typing. This is
  // the only path that programmatically writes to textareaEl.value
  // outside of a user gesture, so undo is lost only here (acceptable
  // for the merge case, which is itself a destructive change).
  $effect(() => {
    const incoming = entry.content;
    untrack(() => {
      const isFocused =
        textareaEl !== null && document.activeElement === textareaEl;
      if (!isFocused && incoming !== content && !deleted) {
        content = incoming;
        if (textareaEl) {
          textareaEl.value = incoming;
          autoResize(textareaEl);
        }
      }
    });
  });
</script>

<article
  id={`entry-${entry.date}`}
  class="scroll-mt-24 pt-2"
  role="region"
  aria-label={`Entry for ${entry.date}`}
>
  <h2 class="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
    {formatLongDate(entry.date)}
  </h2>

  <textarea
    bind:this={textareaEl}
    rows="1"
    class="w-full resize-none border-none bg-transparent p-0 text-base leading-relaxed focus:outline-none focus:ring-0"
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
