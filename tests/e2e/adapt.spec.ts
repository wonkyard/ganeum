import { expect, test, type Page } from "@playwright/test";

/**
 * brief-3B-b done-when: 폰 뷰포트에서 측정 완주 → S3 "이 결과로 화면 맞춰보기" →
 * S4 적응 화면. 모프 슬라이더를 "손떨림" 쪽으로 끝까지 밀면 샘플 키패드의
 * `--hit-size` CSS 변수가 실제로 커지고, 측정된 "나" 스냅 마커가 존재한다.
 *
 * 착지에 소량 지터를 준다 — 정확히 같은 지점만 누르면 착지 산포가 0 이라
 * `weSource="nominal-fallback"` 이 되어 "나" 프로파일이 비활성되기 때문(퇴화 경로는
 * 단위 테스트가 따로 덮는다).
 */
const PHONE = { width: 390, height: 844 };

async function completeMeasurementWithJitter(page: Page): Promise<void> {
  const canvas = page.locator("canvas.target-canvas");
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => "__ganeum" in window);

  for (let i = 0; i < 160; i++) {
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
    const jx = (Math.random() - 0.5) * 12;
    const jy = (Math.random() - 0.5) * 12;
    await page.mouse.click(state.point.x + jx, state.point.y + jy);
    await page.waitForTimeout(20);
  }
  throw new Error("측정이 결과 화면까지 진행되지 않았습니다");
}

test("phone — 측정 → S3 → S4: 슬라이더가 --hit-size 를 키우고 '나' 마커가 있다", async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto("/");

  await page.getByRole("button", { name: "측정 시작" }).click();
  await expect(page).toHaveURL(/#\/setup/);
  await page.getByRole("button", { name: /시작/ }).click();
  await completeMeasurementWithJitter(page);

  await expect(page).toHaveURL(/#\/results\//);

  // S3 비교 패널: 프리셋 회귀선 오버레이 토글 칩.
  await expect(page.locator(".within-subject-panel .wsp-chip")).toHaveCount(4);
  await expect(page.locator(".wsp-citations a").first()).toBeVisible();
  const tremorOverlay = page.locator('path.fitts-overlay[data-overlay-id="tremor"]');
  await expect(tremorOverlay).toHaveClass(/is-off/);
  await page.locator(".wsp-chip", { hasText: "손떨림" }).click();
  await expect(tremorOverlay).not.toHaveClass(/is-off/);

  // S3 → S4.
  await page.getByRole("button", { name: "이 결과로 화면 맞춰보기" }).click();
  await expect(page).toHaveURL(/#\/adapt\//);
  await expect(page.getByRole("heading", { name: "화면을 당신에게 맞추기" })).toBeVisible();

  // "나" 스냅 마커.
  await expect(page.locator(".morph-slider-me")).toBeVisible();

  const hitSizeOf = () =>
    page.evaluate(() => {
      const root = document.querySelector(".sample-ui") as HTMLElement;
      return parseFloat(root.style.getPropertyValue("--hit-size"));
    });

  const before = await hitSizeOf();
  expect(before).toBeGreaterThan(0);

  // 슬라이더를 "손떨림"(축 오른쪽 끝)으로.
  const slider = page.locator(".morph-slider-input");
  await slider.fill("1");
  await expect
    .poll(async () => hitSizeOf(), { timeout: 2_000 })
    .toBeGreaterThan(before);

  // "원래대로" 토글 → 기본 44px 로.
  await page.getByRole("button", { name: "원래대로" }).click();
  await expect.poll(async () => hitSizeOf(), { timeout: 2_000 }).toBe(44);
});
