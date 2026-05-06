<script lang="ts">
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/auth/store.svelte";
  import { isFirebaseConfigured } from "$lib/auth/firebase";

  $effect(() => {
    if (authStore.status === "authenticated") {
      void goto("/diary");
    }
  });

  let email = $state("");
  let busy = $state(false);
  let info = $state<string | null>(null);
  let localError = $state<string | null>(null);

  async function onGoogle() {
    busy = true;
    localError = null;
    try {
      await authStore.signInWithGoogle();
    } catch (err) {
      localError = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }

  async function onApple() {
    busy = true;
    localError = null;
    try {
      await authStore.signInWithApple();
    } catch (err) {
      localError = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }

  async function onEmail(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    localError = null;
    info = null;
    try {
      const url = `${window.location.origin}/login`;
      await authStore.sendEmailLink(email, url);
      info = `A sign-in link has been sent to ${email}. Open it on this device to finish signing in.`;
    } catch (err) {
      localError = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }

  const errorMessage = $derived(localError ?? authStore.error);
</script>

<svelte:head>
  <title>Sign in · SimpleJournal</title>
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
  <div class="text-center">
    <h1 class="text-3xl font-bold">SimpleJournal</h1>
    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
      Sign in to continue
    </p>
  </div>

  {#if !isFirebaseConfigured()}
    <div class="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <strong>Firebase not configured.</strong>
      Set <code class="rounded bg-amber-100 px-1 dark:bg-amber-900">PUBLIC_FIREBASE_*</code>
      env vars in <code>web/.env</code> (locally) and Cloudflare Pages env vars (prod).
    </div>
  {:else}
    <div class="mt-10 space-y-3">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        onclick={onGoogle}
        disabled={busy}
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.12a6.92 6.92 0 0 1 0-4.24V7.04H2.18a11 11 0 0 0 0 9.92l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        Continue with Google
      </button>

      <button
        type="button"
        class="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        onclick={onApple}
        disabled={busy}
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.36 12.84c-.03-3.04 2.49-4.5 2.6-4.57-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.66 1.1-4.61 1.1-.96 0-2.42-1.08-3.99-1.05-2.05.03-3.95 1.2-5 3.04-2.13 3.7-.55 9.18 1.53 12.18 1.02 1.47 2.22 3.12 3.79 3.06 1.52-.06 2.1-.99 3.94-.99s2.36.99 3.97.96c1.64-.03 2.68-1.49 3.68-2.97 1.16-1.7 1.64-3.35 1.66-3.43-.04-.02-3.18-1.22-3.21-4.85zM13.4 4.04c.83-1.01 1.39-2.4 1.24-3.79-1.2.05-2.65.8-3.51 1.81-.77.89-1.45 2.32-1.27 3.68 1.34.1 2.71-.68 3.54-1.7z"/>
        </svg>
        Continue with Apple
      </button>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center" aria-hidden="true">
          <div class="w-full border-t border-slate-200 dark:border-slate-800"></div>
        </div>
        <div class="relative flex justify-center text-xs">
          <span class="bg-slate-50 px-2 text-slate-500 dark:bg-slate-950">or sign in with email</span>
        </div>
      </div>

      <form onsubmit={onEmail} class="space-y-3">
        <input
          type="email"
          bind:value={email}
          required
          placeholder="you@example.com"
          autocomplete="email"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          disabled={busy || !email.trim()}
        >
          Send magic link
        </button>
      </form>

      {#if info}
        <p class="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
          {info}
        </p>
      {/if}
      {#if errorMessage}
        <p class="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100">
          {errorMessage}
        </p>
      {/if}
    </div>
  {/if}
</main>
