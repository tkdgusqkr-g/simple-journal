<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/auth/store.svelte";
  import { diariesApi } from "$lib/api/diaries";

  const token = $derived(page.params.token as string);

  let status = $state<"loading" | "success" | "error">("loading");
  let errorMsg = $state("");

  async function accept() {
    if (authStore.status !== "authenticated") {
      goto(`/login?redirect=/invite/${token}`);
      return;
    }
    try {
      await diariesApi.acceptInviteLink(token);
      status = "success";
      setTimeout(() => goto("/diary"), 1500);
    } catch (err) {
      status = "error";
      errorMsg = err instanceof Error ? err.message : "Failed to join";
    }
  }

  $effect(() => {
    if (authStore.status === "authenticated" && token) {
      void accept();
    } else if (authStore.status === "anonymous") {
      goto(`/login?redirect=/invite/${token}`);
    }
  });
</script>

<svelte:head>
  <title>Join Diary · SimpleJournal</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center px-4">
  <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
    {#if status === "loading"}
      <p class="text-sm text-slate-500">Joining diary…</p>
    {:else if status === "success"}
      <p class="text-sm text-green-600">Joined successfully! Redirecting…</p>
    {:else}
      <p class="text-sm text-rose-600">{errorMsg}</p>
      <a href="/diary" class="mt-4 inline-block text-sm text-blue-600 hover:underline">Go to diaries</a>
    {/if}
  </div>
</main>
