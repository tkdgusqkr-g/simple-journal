<script lang="ts">
  import { authStore } from "$lib/auth/store.svelte";
  import { goto } from "$app/navigation";

  async function onLogout() {
    await authStore.logout();
    void goto("/login");
  }
</script>

<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
  <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
    <a href="/diary" class="font-semibold tracking-tight">SimpleJournal</a>
    <nav class="flex items-center gap-3 text-sm">
      <a
        href="/settings"
        class="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Settings
      </a>
      <button
        type="button"
        onclick={onLogout}
        class="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Sign out
      </button>
    </nav>
  </div>
</header>
