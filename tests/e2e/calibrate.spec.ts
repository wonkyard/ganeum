import { expect, test } from "@playwright/test";

/**
 * brief-3B-a done-when: `#/calibrate` 에서 카드로 폭을 맞춰 저장하면 S0 보정 상태 줄이
 * "● 화면 보정됨 (X.XX px/mm)" 로 바뀐다. "보정 없이 계속" 은 저장하지 않는다.
 * 폰 뷰포트 하나로 충분(스펙).
 */
test("phone 390×844 — #/calibrate 저장 → S0 보정 상태 반영, 스킵은 저장 안 함", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // 1) 스킵 경로: 저장하지 않으면 홈은 여전히 "안 됨".
  await page.goto("/#/calibrate");
  await expect(page.getByRole("heading", { name: "화면 보정" })).toBeVisible();
  await page.getByRole("button", { name: "보정 없이 계속" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator(".calib-status")).toContainText("안 됨");

  // 2) 저장 경로: 직접입력 필드에 값 → 저장 → 홈이 px/mm 를 보여준다.
  await page.goto("/#/calibrate");
  const field = page.locator(".card-calibrator-number");
  await field.fill("5");
  await field.dispatchEvent("input");
  await expect(page.locator(".card-calibrator-readout")).toContainText("5.00 px/mm");
  await page.getByRole("button", { name: "이대로 저장" }).click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator(".calib-status")).toContainText("화면 보정됨 (5.00 px/mm)");

  // 새로고침해도 유지.
  await page.reload();
  await expect(page.locator(".calib-status")).toContainText("5.00 px/mm");
});
