import { defineConfig } from "vite";

// base: "./" keeps every asset reference relative, so the same `dist/` works
// under a GitHub Pages project path, a custom domain, or a local `file://` open.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
