<script lang="ts">
  import { getEndpoints } from "@simple-journal/shared-config";

  const endpoints = getEndpoints("dev");
</script>

<svelte:head>
  <title>SimpleJournal</title>
  <meta name="description" content="A diary app with collaborative features and handwriting support." />
</svelte:head>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-12">
  <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
    SimpleJournal
  </h1>
  <p class="mt-4 text-center text-base text-slate-600 dark:text-slate-400">
    A diary app with collaborative features and handwriting support.
  </p>

  <div class="mt-10 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
      Phase 3 — Web bootstrap
    </h2>
    <ul class="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
      <li>✓ SvelteKit on Cloudflare Pages</li>
      <li>✓ Tailwind CSS 3</li>
      <li>✓ Workspace types from <code class="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">@simple-journal/shared-types</code></li>
      <li>
        API:
        <a href={endpoints.api} class="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400">{endpoints.api}</a>
      </li>
    </ul>
  </div>

  <p class="mt-12 text-xs text-slate-500">
    Coming next: auth, calendar, and entry editor (Phase 4).
  </p>
</main>
