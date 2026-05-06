import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // Output to .svelte-kit/cloudflare. The deploy script uploads from this dir.
      routes: {
        include: ["/*"],
        exclude: ["<all>"],
      },
    }),
    alias: {
      $lib: "src/lib",
    },
  },
};

export default config;
