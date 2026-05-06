<script lang="ts">
  import { entriesApi } from "$lib/api/diaries";
  import { debounce } from "$lib/utils/debounce";
  import { formatLongDate } from "$lib/utils/date";
  import type { Entry } from "@simple-journal/shared-types/domain";

  interface Props {
    entry: Entry;
    onUpdated?: (entry: Entry) => void;
    onDeleted?: (id: string) => void;
  }

  let { entry, onUpdated, onDeleted }: Props = $props();

  // Local state owned by the editor — after mount this component is the
  // source of truth for content/tags. Saves flow back through onUpdated;
  // read-only fields like isPinned still come from the prop.
  // svelte-ignore state_referenced_locally
  let content = $state(entry.content);
  // svelte-ignore state_referenced_locally
  let tags = $state<string[]>([...entry.tags]);
  let tagInput = $state("");
  let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");
  let errorMessage = $state<string | null>(null);

  const save = debounce(async () => {
    saveStatus = "saving";
    errorMessage = null;
    try {
      const updated = await entriesApi.update(entry.id, { content, tags });
      saveStatus = "saved";
      onUpdated?.(updated);
    } catch (err) {
      saveStatus = "error";
      errorMessage = err instanceof Error ? err.message : "save failed";
    }
  }, 800);

  function onContentInput(event: Event) {
    content = (event.target as HTMLTextAreaElement).value;
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
    try {
      const updated = await entriesApi.setPin(entry.id, !entry.isPinned);
      onUpdated?.(updated);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "pin failed";
    }
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
</script>

<article id={`entry-${entry.date}`} class="scroll-mt-24 border-b border-slate-200 py-8 first:pt-0 dark:border-slate-800">
  <header class="mb-3 flex items-baseline justify-between gap-3">
    <div class="flex items-baseline gap-2">
      <h2 class="text-lg font-semibold tracking-tight">
        {formatLongDate(entry.date)}
      </h2>
      {#if entry.isPinned}
        <span class="text-amber-500" aria-label="Pinned">📌</span>
      {/if}
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
        class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"
        class:text-amber-500={entry.isPinned}
        title={entry.isPinned ? "Unpin" : "Pin"}
      >
        📌
      </button>
      <button
        type="button"
        onclick={onDelete}
        class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
        title="Delete"
      >
        🗑
      </button>
    </div>
  </header>

  <textarea
    placeholder="Start writing…"
    rows={Math.max(3, content.split("\n").length)}
    class="w-full resize-none border-none bg-transparent p-0 text-base leading-relaxed focus:outline-none focus:ring-0"
    value={content}
    oninput={onContentInput}
    autocomplete="off"
    spellcheck="true"
  ></textarea>

  <div class="mt-3 flex flex-wrap items-center gap-1.5">
    {#each tags as tag}
      <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
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
      class="flex-1 min-w-[100px] max-w-[200px] rounded-full bg-transparent px-2 py-0.5 text-xs outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
    />
  </div>

  {#if errorMessage}
    <p class="mt-2 text-xs text-rose-600">{errorMessage}</p>
  {/if}
</article>
