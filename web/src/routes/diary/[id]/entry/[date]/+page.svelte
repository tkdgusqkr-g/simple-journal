<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/auth/store.svelte";
  import { entriesApi } from "$lib/api/diaries";
  import type { Entry } from "@simple-journal/shared-types/domain";
  import { debounce } from "$lib/utils/debounce";
  import { formatLongDate } from "$lib/utils/date";

  const diaryId = $derived(page.params.id as string);
  const date = $derived(page.params.date as string);

  let entry = $state<Entry | null>(null);
  let content = $state("");
  let tags = $state<string[]>([]);
  let tagInput = $state("");
  let loading = $state(true);
  let error = $state<string | null>(null);
  let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

  async function load() {
    if (authStore.status !== "authenticated" || !diaryId || !date) return;
    loading = true;
    error = null;
    try {
      // Look up the entry for this date without creating one. The backend
      // search route filters by diary + date range; an empty result means
      // "no entry for this day yet" — we let the user start typing and
      // create on first save.
      const found = await entriesApi.search({
        diaryId,
        from: date,
        to: date,
        limit: 1,
      });
      const existing = found[0] ?? null;
      entry = existing;
      content = existing?.content ?? "";
      tags = existing?.tags ?? [];
      saveStatus = "idle";
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to load entry";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (authStore.status === "authenticated" && diaryId && date) {
      void load();
    }
  });

  const save = debounce(async () => {
    saveStatus = "saving";
    try {
      if (entry) {
        const updated = await entriesApi.update(entry.id, { content, tags });
        entry = updated;
      } else {
        // First save for this date — create the entry.
        const created = await entriesApi.upsert(diaryId, {
          date,
          content,
          tags,
        });
        entry = created;
      }
      saveStatus = "saved";
    } catch (err) {
      error = err instanceof Error ? err.message : "save failed";
      saveStatus = "error";
    }
  }, 800);

  function onContentInput(event: Event) {
    const t = event.target as HTMLTextAreaElement;
    content = t.value;
    save();
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.includes(t)) {
      tagInput = "";
      return;
    }
    tags = [...tags, t];
    tagInput = "";
    save();
  }

  function removeTag(tag: string) {
    tags = tags.filter((t) => t !== tag);
    save();
  }

  async function togglePin() {
    if (!entry) return;
    try {
      const updated = await entriesApi.setPin(entry.id, !entry.isPinned);
      entry = updated;
    } catch (err) {
      error = err instanceof Error ? err.message : "pin failed";
    }
  }

  async function onDelete() {
    if (!entry) return;
    if (!confirm("Delete this entry?")) return;
    try {
      await entriesApi.remove(entry.id);
      void goto(`/diary/${diaryId}`);
    } catch (err) {
      error = err instanceof Error ? err.message : "delete failed";
    }
  }
</script>

<svelte:head>
  <title>{date ? formatLongDate(date) : "Entry"} · SimpleJournal</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
  <div class="flex items-start justify-between gap-4">
    <div>
      <a href={`/diary/${diaryId}`} class="text-xs text-slate-500 hover:underline">← Back to diary</a>
      <h1 class="mt-1 text-2xl font-bold tracking-tight">
        {date ? formatLongDate(date) : ""}
      </h1>
    </div>
    <div class="flex items-center gap-2 text-xs text-slate-500">
      {#if saveStatus === "saving"}
        <span>Saving…</span>
      {:else if saveStatus === "saved"}
        <span class="text-emerald-600">Saved</span>
      {:else if saveStatus === "error"}
        <span class="text-rose-600">Save failed</span>
      {/if}
      <button
        type="button"
        onclick={togglePin}
        class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"
        class:text-amber-500={entry?.isPinned}
        title={entry?.isPinned ? "Unpin" : "Pin"}
      >
        📌
      </button>
      <button
        type="button"
        onclick={onDelete}
        class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
        title="Delete"
      >
        🗑
      </button>
    </div>
  </div>

  {#if loading}
    <p class="mt-8 text-sm text-slate-500">Loading…</p>
  {:else if error}
    <p class="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
      {error}
    </p>
  {:else}
    <textarea
      placeholder="Start writing…"
      class="mt-6 min-h-[60vh] w-full resize-y rounded-2xl border border-slate-200 bg-white p-5 text-base leading-relaxed shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
      value={content}
      oninput={onContentInput}
      autocomplete="off"
      spellcheck="true"
    ></textarea>

    <div class="mt-6">
      <h3 class="text-xs font-medium uppercase tracking-wide text-slate-500">Tags</h3>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        {#each tags as tag}
          <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            #{tag}
            <button
              type="button"
              onclick={() => removeTag(tag)}
              class="text-slate-400 transition hover:text-rose-500"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        {/each}
        <input
          type="text"
          bind:value={tagInput}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          onblur={addTag}
          placeholder="Add tag"
          class="flex-1 min-w-[120px] rounded-full bg-transparent px-2 py-1 text-xs outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
        />
      </div>
    </div>
  {/if}
</main>
