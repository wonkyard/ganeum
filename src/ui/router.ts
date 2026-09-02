/**
 * 해시 라우터. 정적 배포(GitHub Pages)에서 안전하고 뒤로가기가 동작한다(스펙 화면설계 §상태흐름).
 * 패턴 예: `#/`, `#/measure`, `#/results/:id`.
 */

export interface RouteMatch {
  path: string;
  params: Record<string, string>;
}

export type RouteHandler = (match: RouteMatch) => void;

interface CompiledRoute {
  segments: string[];
  handler: RouteHandler;
}

export interface Router {
  add(pattern: string, handler: RouteHandler): Router;
  start(): void;
  stop(): void;
  go(path: string): void;
  current(): string;
}

function normalize(hash: string): string {
  const raw = hash.replace(/^#/, "") || "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function createRouter(fallback: RouteHandler): Router {
  const routes: CompiledRoute[] = [];
  let lastResolved: string | null = null;

  const dispatch = (path: string): void => {
    const parts = path.split("/").filter(Boolean);
    for (const route of routes) {
      if (route.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(parts[i]);
        else if (seg !== parts[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        route.handler({ path, params });
        return;
      }
    }
    fallback({ path, params: {} });
  };

  const resolve = (force = false): void => {
    const path = normalize(window.location.hash);
    if (!force && path === lastResolved) return;
    lastResolved = path;
    dispatch(path);
  };

  const onHashChange = (): void => resolve();

  return {
    add(pattern, handler) {
      routes.push({ segments: pattern.split("/").filter(Boolean), handler });
      return this;
    },
    start() {
      window.addEventListener("hashchange", onHashChange);
      resolve(true);
    },
    stop() {
      window.removeEventListener("hashchange", onHashChange);
      lastResolved = null;
    },
    go(path) {
      const next = path.startsWith("/") ? path : `/${path}`;
      window.location.hash = `#${next}`;
      // hashchange 가 (jsdom 등에서) 동기적으로 안 오는 경우까지 커버.
      resolve();
    },
    current() {
      return normalize(window.location.hash);
    },
  };
}
