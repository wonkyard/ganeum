import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

/**
 * 오프라인 프리캐시(brief-3A §4 D1): 빌드가 낸 실제 에셋 목록을 `sw.js` 에 주입하고
 * 캐시 이름에 그 목록의 해시를 박는다. 내용이 바뀌면 파일명 해시가 바뀌므로 캐시가
 * 자동으로 회전한다. 런타임 의존성 0 — Node 표준 모듈만 쓴다.
 */
function serviceWorkerPrecache(): Plugin {
  const SHELL_EXTRAS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
  let template = "";
  return {
    name: "ganeum-sw-precache",
    apply: "build",
    buildStart() {
      template = readFileSync(new URL("./build/sw.template.js", import.meta.url), "utf8");
    },
    generateBundle(_options, bundle) {
      const emitted = Object.keys(bundle)
        .filter((name) => !name.endsWith(".map"))
        .map((name) => `./${name}`);
      const precache = [...new Set([...SHELL_EXTRAS, ...emitted])].sort();
      const hash = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 12);
      const injected = template
        .replaceAll("__CACHE_VERSION__", `ganeum-${hash}`)
        .replaceAll("__PRECACHE_LIST__", JSON.stringify(precache, null, 2));
      this.emitFile({ type: "asset", fileName: "sw.js", source: injected });
    },
  };
}

// base: "./" keeps every asset reference relative, so the same `dist/` works
// under a GitHub Pages project path, a custom domain, or a local `file://` open.
export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  plugins: [serviceWorkerPrecache()],
});
