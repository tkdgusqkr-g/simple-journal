<script lang="ts">
  import { authStore } from "$lib/auth/store.svelte";

  const user = $derived(authStore.user);
</script>

<svelte:head>
  <title>Settings · SimpleJournal</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
  <h1 class="text-2xl font-bold tracking-tight">Settings</h1>

  <section class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
      Account
    </h2>
    {#if user}
      <dl class="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <div class="flex justify-between py-2">
          <dt class="text-slate-500">Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-500">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-500">Sign-in method</dt>
          <dd class="capitalize">{user.authProvider}</dd>
        </div>
        <div class="flex justify-between py-2">
          <dt class="text-slate-500">Joined</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
    {/if}
  </section>

  <section class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">About</h2>
    <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">
      SimpleJournal — a diary app with collaborative features and handwriting support.
    </p>
    <p class="mt-2 text-xs text-slate-500">Phase 4 build · Web MVP.</p>
  </section>
</main>
