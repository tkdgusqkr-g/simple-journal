<script lang="ts">
  import { page } from "$app/state";
  import { authStore } from "$lib/auth/store.svelte";
  import { diariesApi } from "$lib/api/diaries";
  import MembersModal from "$lib/components/MembersModal.svelte";
  import type { Diary } from "@simple-journal/shared-types/domain";

  let { children } = $props();

  const diaryId = $derived(page.params.id as string);
  let diary = $state<Diary | null>(null);
  let showMembers = $state(false);

  async function load() {
    if (authStore.status !== "authenticated" || !diaryId) return;
    try {
      const all = await diariesApi.list();
      diary = all.find((d) => d.id === diaryId) ?? null;
    } catch {
      // Non-fatal
    }
  }

  let loaded = false;
  $effect(() => {
    if (loaded) return;
    if (authStore.status === "authenticated" && diaryId) {
      loaded = true;
      void load();
    }
  });
</script>

{#if diary?.type === "shared"}
  <button
    type="button"
    onclick={() => (showMembers = true)}
    title="Manage members"
    class="fixed bottom-4 right-4 z-30 rounded-full bg-white p-2 text-slate-500 shadow-md transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-900 dark:hover:bg-blue-950"
  >
    👥
  </button>
{/if}

{@render children()}

{#if showMembers && diaryId}
  <MembersModal diaryId={diaryId} onClose={() => (showMembers = false)} />
{/if}
