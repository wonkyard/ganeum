import { expect, test, type Page } from "@playwright/test";

/**
 * brief-3A done-when: 폰(390×844) + 데스크톱(1280×800) 두 뷰포트에서
 * 홈 → 빠른 측정 → 결과 → 카드 를 **실클릭**(`page.mouse.click`)으로 완주하고,
 * 결과 화면의 4개 수치 + 회귀선 path 를 확인한다. 그리고 홈으로 돌아가
 * "지난 결과 (1)" 이 뜨는지 (프로파일이 저장됐는지) 본다.
 */
const VIEWPORTS = [
  { label: "phone", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 800 },
];

async function completeMeasurement(page: Page): Promise<void> {
  const canvas = page.locator("canvas.target-canvas");
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => "__ganeum" in window);

  // 캔버스는 어느 뷰포트에서도 정사각.
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) expect(Math.abs(box.width - box.height)).toBeLessThan(2);

  for (let i = 0; i < 120; i++) {
    const state = await page.evaluate(() => {
      const app = (
        window as unknown as {
          __ganeum: { currentTargetPoint(): { x: number; y: number } | null };
        }
      ).__ganeum;
      return {
        point: app.currentTargetPoint(),
        done: window.location.hash.includes("/results/"),
      };
    });
    if (state.done) return;
    if (!state.point) {
      await page.waitForTimeout(25);
      continue;
    }
    await page.mouse.click(state.point.x, state.point.y);
    await page.waitForTimeout(20);
  }
  throw new Error("측정이 결과 화면까지 진행되지 않았습니다");
}

for (const vp of VIEWPORTS) {
  test(`${vp.label} ${vp.width}×${vp.height} — 홈→측정→결과→카드 완주`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");

    await page.getByRole("button", { name: "측정 시작" }).click();
    await expect(page).toHaveURL(/#\/setup/);

    // S1: 빠른 측정이 기본 선택. 시작 → 카운트다운 → 측정.
    await page.getByRole("button", { name: /시작/ }).click();
    await completeMeasurement(page);

    // S3 결과.
    await expect(page).toHaveURL(/#\/results\//);
    await expect(page.getByRole("heading", { name: "가늠 결과" })).toBeVisible();

    const body = await page.locator(".screen-results").innerText();
    expect(body).toMatch(/bits\/초/); // ① 처리율
    expect(body).toMatch(/MT = -?\d+ \+ -?\d+·ID/); // ②③ a, b (ms 정수)
    expect(body).toMatch(/r² = /); // ④ r²
    expect(body).toMatch(/\d+%/); // 정확도

    // 회귀선 path 존재.
    await expect(page.locator("path.fitts-line")).toHaveCount(1);

    // S5 카드.
    await page.getByRole("button", { name: "결과 카드 저장" }).click();
    await expect(page).toHaveURL(/#\/card\//);
    await expect(page.locator("canvas.result-card-canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: "PNG 저장" })).toBeVisible();
    await expect(page.getByRole("button", { name: "프로파일 JSON 내보내기" })).toBeVisible();

    // 홈으로 — 프로파일이 저장돼 "지난 결과 (1)".
    await page.goto("/");
    await expect(page.getByRole("link", { name: /지난 결과 \(1\)/ })).toBeVisible();
  });
}
