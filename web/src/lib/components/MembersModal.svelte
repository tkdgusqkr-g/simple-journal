<script lang="ts">
  import { diariesApi } from "$lib/api/diaries";
  import type { DiaryMember } from "@simple-journal/shared-types/domain";

  interface Props {
    diaryId: string;
    onClose: () => void;
  }

  let { diaryId, onClose }: Props = $props();

  let members = $state<DiaryMember[]>([]);
  let inviteLinks = $state<{ token: string; role: string; expiresAt: string | null; createdAt: string }[]>([]);
  let inviteEmail = $state("");
  let inviteRole = $state<"editor" | "viewer">("editor");
  let linkRole = $state<"editor" | "viewer">("editor");
  let error = $state<string | null>(null);
  let copiedToken = $state<string | null>(null);

  async function load() {
    try {
      [members, inviteLinks] = await Promise.all([
        diariesApi.members(diaryId),
        diariesApi.listInviteLinks(diaryId),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to load";
    }
  }

  void load();

  async function onInviteEmail(e: SubmitEvent) {
    e.preventDefault();
    error = null;
    try {
      await diariesApi.invite(diaryId, inviteEmail.trim(), inviteRole);
      inviteEmail = "";
      await load();
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to invite";
    }
  }

  async function onCreateLink() {
    error = null;
    try {
      const link = await diariesApi.createInviteLink(diaryId, linkRole, 7);
      inviteLinks = [...inviteLinks, { ...link, createdAt: new Date().toISOString() }];
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to create link";
    }
  }

  async function onDeleteLink(token: string) {
    try {
      await diariesApi.deleteInviteLink(diaryId, token);
      inviteLinks = inviteLinks.filter((l) => l.token !== token);
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to delete link";
    }
  }

  async function onRemoveMember(userId: string) {
    try {
      await diariesApi.removeMember(diaryId, userId);
      members = members.filter((m) => m.userId !== userId);
    } catch (err) {
      error = err instanceof Error ? err.message : "failed to remove member";
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    copiedToken = token;
    setTimeout(() => (copiedToken = null), 2000);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
  onmousedown={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
  <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold">Members</h2>
      <button type="button" onclick={onClose} class="text-slate-400 hover:text-slate-600">✕</button>
    </div>

    {#if error}
      <p class="mt-3 text-sm text-rose-600">{error}</p>
    {/if}

    <!-- Member list -->
    <ul class="mt-4 space-y-2">
      {#each members as m}
        <li class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
          <span>{m.userId}</span>
          <div class="flex items-center gap-2">
            <span class="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">{m.role}</span>
            {#if m.role !== "owner"}
              <button
                type="button"
                onclick={() => void onRemoveMember(m.userId)}
                class="text-xs text-rose-500 hover:text-rose-700"
              >Remove</button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    <!-- Email invite -->
    <form onsubmit={onInviteEmail} class="mt-5">
      <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-400">Invite by email</h3>
      <div class="mt-2 flex gap-2">
        <input
          type="email"
          bind:value={inviteEmail}
          placeholder="user@example.com"
          required
          class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <select bind:value={inviteRole} class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <button type="submit" class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Invite
        </button>
      </div>
    </form>

    <!-- Invite links -->
    <div class="mt-5">
      <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-400">Invite links</h3>
      <div class="mt-2 flex gap-2">
        <select bind:value={linkRole} class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          type="button"
          onclick={onCreateLink}
          class="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Create link (7 days)
        </button>
      </div>
      {#if inviteLinks.length > 0}
        <ul class="mt-3 space-y-2">
          {#each inviteLinks as link}
            <li class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
              <div>
                <span class="font-mono">{link.token.slice(0, 8)}…</span>
                <span class="ml-2 rounded bg-slate-200 px-1 dark:bg-slate-700">{link.role}</span>
                {#if link.expiresAt}
                  <span class="ml-2 text-slate-500">expires {new Date(link.expiresAt).toLocaleDateString()}</span>
                {/if}
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={() => copyLink(link.token)}
                  class="text-blue-600 hover:text-blue-800"
                >
                  {copiedToken === link.token ? "Copied!" : "Copy"}
                </button>
                <button
                  type="button"
                  onclick={() => void onDeleteLink(link.token)}
                  class="text-rose-500 hover:text-rose-700"
                >Delete</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>
