import { expect, test } from "@playwright/test";

/**
 * brief-5-6-a done-when: 폰 뷰포트에서 `#/about` 교육 페이지가 7섹션으로 뜨고,
 * Fitts 위젯의 슬라이더를 움직이면 예측 MT 텍스트가 바뀐다. S0 "가늠이란?" 링크가
 * 여기로 오고, S3/S4 딥링크(`#/about#adapt-model`)가 해당 섹션으로 스크롤한다.
 */
const PHONE = { width: 390, height: 844 };

test.use({ viewport: PHONE });

test("#/about — 7섹션 스크롤 문서 + Fitts 위젯 슬라이더가 예측 MT 를 갱신", async ({ page }) => {
  await page.goto("/#/about");

  await expect(page.getByRole("heading", { level: 1, name: "가늠이란?" })).toBeVisible();
  await expect(page.locator(".about-section")).toHaveCount(7);

  // Fitts 위젯: 거리 슬라이더를 끝까지 → readout 텍스트 변화.
  const readout = page.locator(".fitts-widget-readout");
  const before = await readout.textContent();
  await page.locator(".fitts-widget-range").first().fill("250");
  await expect(readout).not.toHaveText(before ?? "");
  await expect(readout).toContainText("MT");

  // 인용 섹션에 외부 링크가 있다.
  await expect(page.locator("#citations a").first()).toBeVisible();
});

test("S0 '가늠이란?' 링크 → #/about", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "가늠이란?" }).click();
  await expect(page).toHaveURL(/#\/about$/);
  await expect(page.getByRole("heading", { level: 1, name: "가늠이란?" })).toBeVisible();
});

test("딥링크 #/about#adapt-model 은 해당 섹션 제목으로 포커스를 옮긴다", async ({ page }) => {
  await page.goto("/#/about#adapt-model");
  const heading = page.locator("#adapt-model-h");
  await expect(heading).toBeFocused();
});
