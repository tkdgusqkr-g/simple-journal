<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { ApiError } from "$lib/api/client";
  import { authStore } from "$lib/auth/store.svelte";
  import { entriesApi } from "$lib/api/diaries";
  import {
    readDiaryCache,
    writeDiaryCache,
  } from "$lib/utils/cache";
  import { todayIso } from "$lib/utils/date";
  import { debounce } from "$lib/utils/debounce";
  import {
    detectSlashTrigger,
    suggestionsFor,
    type SlashAction,
    type SlashSuggestion,
  } from "$lib/utils/slash";
  import SlashMenu from "$lib/components/SlashMenu.svelte";
  import type { Entry } from "@simple-journal/shared-types/domain";

  let slashMenuRef = $state<SlashMenu | null>(null);

  const diaryId = $derived(page.params.id as string);

  let entry = $state<Entry | null>(null);
  let content = $state("");
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let loading = $state(true);
  let migrating = $state(false);
  let error = $state<string | null>(null);

  // Set when the user types — prevents the background server refresh
  // from clobbering in-progress edits if the cached version was
  // already shown.
  let userTyped = $state(false);

  // Slash menu state
  let slashStart = $state<number | null>(null);
  let slashEnd = $state<number | null>(null);
  let slashQuery = $state("");
  let slashSelectedIdx = $state(0);
  let slashShowDatePicker = $state(false);
  let slashPos = $state({ top: 0, left: 0 });

  // Stored offset from textarea content origin (scroll-independent)
  let slashCaretOffsetTop = 0;
  let slashCaretOffsetLeft = 0;

  const slashSuggestions = $derived(
    slashStart !== null ? suggestionsFor(slashQuery) : [],
  );
  const slashOpen = $derived(
    slashStart !== null && (slashShowDatePicker || slashSuggestions.length > 0),
  );

  const save = debounce(async () => {
    if (!entry) return;
    try {
      const updated = await entriesApi.update(entry.id, { content });
      entry = updated;
      writeDiaryCache(diaryId, updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return;
      console.warn("[diary save] failed:", err);
    }
  }, 800);

  function autoResize() {
    if (!textareaEl) return;
    textareaEl.style.height = "auto";
    textareaEl.style.height = `${Math.max(textareaEl.scrollHeight, 200)}px`;
  }

  async function loadOrMigrate() {
    if (!diaryId) return;
    error = null;

    const cached = readDiaryCache(diaryId);
    if (cached) {
      entry = cached.entry;
      content = cached.entry.content;
      loading = false;
      requestAnimationFrame(() => {
        if (textareaEl) {
          textareaEl.value = content;
          autoResize();
        }
      });
    }

    try {
      const all: Entry[] = [];
      let cursor: string | null = null;
      do {
        const res = await entriesApi.listInDiary(diaryId, {
          cursor: cursor ?? undefined,
          limit: 100,
        });
        all.push(...res.entries);
        cursor = res.nextCursor;
      } while (cursor);

      let serverEntry: Entry;
      if (all.length === 0) {
        serverEntry = await entriesApi.upsert(diaryId, {
          date: todayIso(),
          content: "",
          tags: [],
        });
      } else if (all.length === 1) {
        serverEntry = all[0]!;
      } else {
        migrating = true;
        const sorted = all.slice().sort((a, b) => a.date.localeCompare(b.date));
        const main = sorted[0]!;
        const others = sorted.slice(1);
        const merged = sorted
          .map((e) => {
            const trimmed = e.content.trim();
            return trimmed.length > 0 ? `${e.date}\n${trimmed}` : null;
          })
          .filter((s): s is string => s !== null)
          .join("\n\n");

        serverEntry = await entriesApi.update(main.id, { content: merged });
        await Promise.all(
          others.map((e) =>
            entriesApi.remove(e.id).catch(() => {}),
          ),
        );
        migrating = false;
      }

      writeDiaryCache(diaryId, serverEntry);

      const cacheStillCurrent =
        cached &&
        cached.entry.id === serverEntry.id &&
        cached.entry.content === serverEntry.content;

      if (!cached || !cacheStillCurrent) {
        if (!userTyped) {
          entry = serverEntry;
          content = serverEntry.content;
          if (textareaEl) {
            textareaEl.value = content;
            autoResize();
          }
        } else {
          entry = { ...serverEntry, content };
        }
      } else {
        entry = serverEntry;
      }
    } catch (err) {
      if (!cached) {
        error = err instanceof Error ? err.message : "failed to load diary";
      }
    } finally {
      loading = false;
    }
  }

  let triggered = false;
  $effect(() => {
    if (triggered) return;
    if (authStore.status === "authenticated" && diaryId) {
      triggered = true;
      void loadOrMigrate();
    }
  });

  function refreshSlashState() {
    if (!textareaEl) return;
    const trig = detectSlashTrigger(textareaEl.value, textareaEl.selectionStart);
    if (trig) {
      const isFresh =
        slashStart !== trig.slashIndex || slashQuery !== trig.query;
      slashStart = trig.slashIndex;
      slashEnd = textareaEl.selectionStart;
      slashQuery = trig.query;
      if (isFresh) slashSelectedIdx = 0;
      slashPos = computeMenuPos(textareaEl, trig.slashIndex);
    } else {
      closeSlashMenu();
    }
  }

  function closeSlashMenu() {
    slashStart = null;
    slashEnd = null;
    slashQuery = "";
    slashShowDatePicker = false;
    slashSelectedIdx = 0;
  }

  function computeMenuPos(
    ta: HTMLTextAreaElement,
    caretIndex: number,
  ): { top: number; left: number } {
    const computed = window.getComputedStyle(ta);
    const mirror = document.createElement("div");
    const ms = mirror.style;
    ms.position = "absolute";
    ms.visibility = "hidden";
    ms.top = "0";
    ms.left = "0";
    ms.whiteSpace = "pre-wrap";
    ms.wordWrap = "break-word";
    ms.boxSizing = computed.boxSizing;
    ms.width = computed.width;
    ms.padding = computed.padding;
    ms.border = computed.border;
    ms.fontFamily = computed.fontFamily;
    ms.fontSize = computed.fontSize;
    ms.fontWeight = computed.fontWeight;
    ms.lineHeight = computed.lineHeight;
    ms.letterSpacing = computed.letterSpacing;
    ms.tabSize = computed.tabSize;

    mirror.textContent = ta.value.substring(0, caretIndex);
    const marker = document.createElement("span");
    marker.textContent = "";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const lineHeight =
      parseFloat(computed.lineHeight) ||
      parseFloat(computed.fontSize) * 1.4;

    document.body.removeChild(mirror);

    slashCaretOffsetTop = markerRect.top - mirrorRect.top + lineHeight + 4;
    slashCaretOffsetLeft = markerRect.left - mirrorRect.left;

    return getViewportPos(ta);
  }

  function getViewportPos(ta: HTMLTextAreaElement): { top: number; left: number } {
    const taRect = ta.getBoundingClientRect();
    return {
      top: taRect.top + slashCaretOffsetTop - ta.scrollTop,
      left: taRect.left + slashCaretOffsetLeft - ta.scrollLeft,
    };
  }

  function onContentInput() {
    if (!textareaEl) return;
    content = textareaEl.value;
    userTyped = true;
    autoResize();
    save();
    refreshSlashState();
  }

  function onTextareaKeydown(event: KeyboardEvent) {
    if (!slashOpen) return;
    if (slashShowDatePicker) {
      const handled = slashMenuRef?.handleCalendarKey(event);
      if (handled) event.preventDefault();
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
    if (action.kind === "insertText") {
      replaceSlashWithText(action.text);
      closeSlashMenu();
    }
  }

  function onPickDate(iso: string) {
    replaceSlashWithText(iso);
    closeSlashMenu();
  }

  function replaceSlashWithText(text: string) {
    if (!textareaEl || slashStart === null) return;
    const end = slashEnd ?? textareaEl.selectionStart;
    const before = textareaEl.value.slice(0, slashStart);
    const trailingNewlines = (before.match(/\n*$/)?.[0] ?? "").length;
    let payload = text;
    if (before.length > 0 && trailingNewlines < 2) {
      payload = "\n".repeat(2 - trailingNewlines) + payload;
    }
    payload += "\n";

    textareaEl.focus();
    textareaEl.setSelectionRange(slashStart, end);
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, payload);
    } catch {
      ok = false;
    }
    if (!ok) {
      const after = textareaEl.value.slice(end);
      const next = before + payload + after;
      textareaEl.value = next;
      const cursor = before.length + payload.length;
      textareaEl.setSelectionRange(cursor, cursor);
      textareaEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
    content = textareaEl.value;
    userTyped = true;
    autoResize();
    save();
  }

  function onWindowScroll() {
    if (!slashOpen || !textareaEl) return;
    slashPos = getViewportPos(textareaEl);
  }

  onMount(() => {
    autoResize();
    window.addEventListener("scroll", onWindowScroll, true);
    return () => window.removeEventListener("scroll", onWindowScroll, true);
  });
</script>

<svelte:head>
  <title>{`Diary · SimpleJournal`}</title>
</svelte:head>

<main class="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
  {#if loading}
    <p class="text-sm text-slate-500">
      {migrating ? "Reorganizing your old entries…" : "Loading…"}
    </p>
  {:else if error}
    <p class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
      {error}
    </p>
  {:else}
    <textarea
      bind:this={textareaEl}
      class="min-h-[60vh] w-full resize-none border-none bg-transparent p-0 text-base leading-relaxed focus:outline-none focus:ring-0"
      placeholder=""
      oninput={onContentInput}
      onkeydown={onTextareaKeydown}
      onkeyup={onTextareaKeyup}
      onclick={onTextareaClick}
      onblur={() => {
        setTimeout(() => {
          if (slashOpen) return;
          if (!textareaEl || document.activeElement !== textareaEl) {
            closeSlashMenu();
          }
        }, 150);
      }}
      autocomplete="off"
      spellcheck="true"
    ></textarea>
  {/if}
</main>

{#if slashOpen}
  <SlashMenu
    bind:this={slashMenuRef}
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
