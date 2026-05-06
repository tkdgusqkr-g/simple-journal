// See https://svelte.dev/docs/kit/types for SvelteKit's `App` namespace.

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env?: {
        // Cloudflare Pages bindings will land here when added in later phases
        // (e.g. KV / D1 if the web app needs direct bindings).
      };
    }
  }
}

export {};
