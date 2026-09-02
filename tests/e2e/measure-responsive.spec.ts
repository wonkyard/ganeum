import { expect, test } from "@playwright/test";

/**
 * S2 측정 화면 반응형 회귀 (주 1–2 반려 수정).
 *
 * 폰(390×844)과 데스크톱(1280×800) 두 뷰포트에서 홈 → 측정(조건 3개 × 11탭) →
 * `/results` 를 완주하고 결과 4개 수치(a, b, r², TP)가 나오는지 본다.
 *
 * 핵심: 현재 타깃을 **표시 좌표**(`__ganeum.currentTargetPoint()`)로 계산해 실제
 * `page.mouse.click` 으로 누른다. 레이아웃 좌표계와 표시 박스가 어긋나면(반려 원인)
 * 클릭이 히트판정을 통과하지 못해 진행이 막히고 이 테스트가 실패한다.
 */
const VIEWPORTS = [
  { label: "폰", width: 390, height: 844 },
  { label: "데스크톱", width: 1280, height: 800 },
];

for (const vp of VIEWPORTS) {
  test(`${vp.label} ${vp.width}×${vp.height} — 표시 좌표 클릭으로 세션 완주 + 결과 4수치`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");

    await page.getByRole("button", { name: "측정 시작" }).click();
    const canvas = page.locator("canvas.target-canvas");
    await expect(canvas).toBeVisible();
    await page.waitForFunction(() => "__ganeum" in window);

    // 캔버스는 어느 뷰포트에서도 정사각으로 표시되고 뷰포트를 넘지 않는다.
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.abs(box.width - box.height)).toBeLessThan(2);
      expect(box.width).toBeLessThanOrEqual(vp.width);
    }

    // 조건 3개 × 11탭 = 33탭. 조건 전환 프레임까지 여유를 둔다.
    let reachedResults = false;
    for (let i = 0; i < 90; i++) {
      const state = await page.evaluate(() => {
        const app = (
          window as unknown as {
            __ganeum: { currentTargetPoint(): { x: number; y: number } | null };
          }
        ).__ganeum;
        return {
          point: app.currentTargetPoint(),
          done: window.location.hash.includes("/results"),
        };
      });
      if (state.done) {
        reachedResults = true;
        break;
      }
      if (!state.point) {
        await page.waitForTimeout(20);
        continue;
      }
      await page.mouse.click(state.point.x, state.point.y);
      await page.waitForTimeout(20);
    }

    expect(reachedResults).toBe(true);
    await expect(page).toHaveURL(/#\/results/);
    await expect(page.getByRole("heading", { name: "가늠 결과" })).toBeVisible();

    const body = await page.locator(".screen-results").innerText();
    expect(body).toMatch(/bits\/초/); // TP
    expect(body).toMatch(/MT = -?\d+\.\d+ \+ -?\d+\.\d+·ID/); // a, b
    expect(body).toMatch(/r² = -?\d/); // r²
  });
}
