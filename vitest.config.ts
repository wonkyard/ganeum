import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    // 앱 코드가 참조하는 빌드타임 상수 — 테스트에서도 정의돼 있어야 한다.
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
  },
  test: {
    globals: true,
    // core 는 프레임워크 무관 → node 에서 테스트(빠름). DOM 이 필요한 테스트 파일은
    // 파일 상단에 `// @vitest-environment jsdom` 을 단다.
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Coverage is gated hard on the measurement engine only (spec §10).
      // UI is covered by the Playwright smoke, not by a coverage number.
      include: ["src/core/**/*.ts"],
      exclude: ["src/core/index.ts", "src/core/**/*.test.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});
