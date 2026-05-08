<script lang="ts">
  import { authStore } from "$lib/auth/store.svelte";
  import { diariesApi } from "$lib/api/diaries";
  import type { Diary, DiaryType } from "@simple-journal/shared-types/domain";

  let diaries = $state<Diary[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let creating = $state(false);
  let newName = $state("");
  let newType = $state<DiaryType>("personal");
  let createError = $state<string | null>(null);

  async function load() {
    if (authStore.status !== "authenticated") return;
    loading = true;
    error = null;
    try {
      diaries = await diariesApi.list();
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to load diaries";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (authStore.status === "authenticated") void load();
  });

  async function onCreate(event: SubmitEvent) {
    event.preventDefault();
    createError = null;
    try {
      const diary = await diariesApi.create({
        name: newName.trim(),
        type: newType,
      });
      diaries = [diary, ...diaries];
      newName = "";
      newType = "personal";
      creating = false;
    } catch (err) {
      createError = err instanceof Error ? err.message : "failed to create";
    }
  }

  async function onDelete(d: Diary) {
    const ok = confirm(
      `Delete "${d.name}"? All of its writing will be permanently removed.`,
    );
    if (!ok) return;
    try {
      await diariesApi.remove(d.id);
      diaries = diaries.filter((x) => x.id !== d.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to delete diary";
    }
  }
</script>

<svelte:head>
  <title>Diaries · SimpleJournal</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold tracking-tight">Diaries</h1>
    <button
      type="button"
      class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      onclick={() => (creating = !creating)}
    >
      {creating ? "Cancel" : "New diary"}
    </button>
  </div>

  {#if creating}
    <form
      onsubmit={onCreate}
      class="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <label for="diary-name" class="block text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
        <input
          id="diary-name"
          type="text"
          bind:value={newName}
          required
          maxlength={80}
          placeholder="Daily journal"
          class="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
        />
      </div>
      <fieldset>
        <legend class="block text-xs font-medium uppercase tracking-wide text-slate-500">Type</legend>
        <div class="mt-1 flex gap-2">
          <label class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-slate-700 dark:has-[:checked]:bg-blue-950">
            <input type="radio" bind:group={newType} value="personal" class="sr-only" />
            Personal
          </label>
          <label class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-slate-700 dark:has-[:checked]:bg-blue-950">
            <input type="radio" bind:group={newType} value="shared" class="sr-only" />
            Shared
          </label>
        </div>
      </fieldset>
      <button
        type="submit"
        class="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        disabled={!newName.trim()}
      >
        Create
      </button>
      {#if createError}
        <p class="text-sm text-rose-600">{createError}</p>
      {/if}
    </form>
  {/if}

  {#if loading}
    <p class="mt-8 text-sm text-slate-500">Loading…</p>
  {:else if error}
    <p class="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">{error}</p>
  {:else if diaries.length === 0}
    <div class="mt-12 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
      No diaries yet. Create your first one above.
    </div>
  {:else}
    <ul class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each diaries as diary (diary.id)}
        <li class="group relative">
          <a
            href={`/diary/${diary.id}`}
            class="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="truncate font-semibold tracking-tight">{diary.name}</h2>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800">
                {diary.type}
              </span>
            </div>
            <p class="mt-2 text-xs text-slate-500">
              Created {new Date(diary.createdAt).toLocaleDateString()}
            </p>
          </a>
          <button
            type="button"
            onclick={() => void onDelete(diary)}
            aria-label={`Delete ${diary.name}`}
            title="Delete diary"
            class="absolute bottom-3 right-3 rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-rose-950"
          >
            🗑
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</main>
