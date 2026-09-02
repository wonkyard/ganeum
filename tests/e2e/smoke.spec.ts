import { expect, test } from "@playwright/test";

/**
 * 스모크: 홈 → 측정 → 결과 흐름 1개 (스펙 §10).
 * 캔버스 좌표 클릭은 불안정하므로, 개발 빌드에만 노출되는 결정적 훅
 * `window.__ganeum.tapCurrentTarget()` 로 세션을 완주시킨다.
 */
test("한 세션을 완주하면 (a, b, r², TP) 가 화면에 나온다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "측정 시작" })).toBeVisible();
  await page.getByRole("button", { name: "측정 시작" }).click();

  // 측정 화면 진입 대기.
  await expect(page.locator("canvas.target-canvas")).toBeVisible();

  // 훅으로 현재 타깃을 반복해서 누른다. 조건 3개 × 11탭 = 33탭 + 여유.
  await page.waitForFunction(() => "__ganeum" in window);
  for (let i = 0; i < 60; i++) {
    const done = await page.evaluate(() => {
      const app = (window as unknown as { __ganeum: { tapCurrentTarget(): void } }).__ganeum;
      app.tapCurrentTarget();
      return window.location.hash.includes("/results");
    });
    if (done) break;
    await page.waitForTimeout(15);
  }

  await expect(page).toHaveURL(/#\/results/);
  await expect(page.getByRole("heading", { name: "가늠 결과" })).toBeVisible();

  const body = await page.locator(".screen-results").innerText();
  expect(body).toMatch(/bits\/초/);
  expect(body).toMatch(/MT = -?\d+\.\d+ \+ -?\d+\.\d+·ID/);
  expect(body).toMatch(/r² = -?\d/);
});
