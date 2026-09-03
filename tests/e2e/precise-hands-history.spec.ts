import { expect, test, type Page } from "@playwright/test";

/**
 * brief-5-6-b done-when (Playwright, 폰 뷰포트):
 *  1. 정밀 측정 "정밀 측정" 카드 → 9조건 완주 → S3 결과. 진행 도트 9개.
 *  2. 정밀 + 양손: 첫 손 → 인앱 "손 바꾸세요" 인터스티셜 → 둘째 손 → S3 에
 *     "왼손 / 오른손 · 비대칭 N%" 타일. 두 Profile 이 sessionId 로 연결돼 저장됨.
 *  3. localStorage 로 같은 손·모드 과거 세션 2개를 시드한 뒤 측정 →
 *     "지난 측정 대비" 델타 + 직전 세션 오버레이 칩 + (3회+) 스파크라인.
 */
const PHONE = { width: 390, height: 844 };

type RunResult = "results" | "interstitial";

async function runConditions(page: Page, maxClicks = 600): Promise<RunResult> {
  const canvas = page.locator("canvas.target-canvas");
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => "__ganeum" in window);

  for (let i = 0; i < maxClicks; i++) {
    const state = await page.evaluate(() => {
      const app = (
        window as unknown as {
          __ganeum: { currentTargetPoint(): { x: number; y: number } | null };
        }
      ).__ganeum;
      return {
        point: app.currentTargetPoint(),
        hash: window.location.hash,
        interstitial: !!document.querySelector(".screen-interstitial"),
      };
    });
    if (state.hash.includes("/results/")) return "results";
    if (state.interstitial) return "interstitial";
    if (!state.point) {
      await page.waitForTimeout(15);
      continue;
    }
    const jx = (Math.random() - 0.5) * 10;
    const jy = (Math.random() - 0.5) * 10;
    await page.mouse.click(state.point.x + jx, state.point.y + jy);
    await page.waitForTimeout(12);
  }
  throw new Error("측정이 끝나지 않았습니다");
}

async function gotoSetup(page: Page): Promise<void> {
  await page.setViewportSize(PHONE);
  await page.goto("/");
  await page.getByRole("button", { name: "측정 시작" }).click();
  await expect(page).toHaveURL(/#\/setup/);
}

test("정밀 측정 — 9조건 완주 → 결과, 진행 도트 9개", async ({ page }) => {
  test.setTimeout(90_000);
  await gotoSetup(page);

  await page.locator('.setup-card[data-mode="precise"]').click();
  await expect(page.locator('.setup-card[data-mode="precise"]')).toHaveClass(/is-selected/);
  await page.getByRole("button", { name: /시작/ }).click();

  await expect(page.locator("canvas.target-canvas")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".progress-dots .dot")).toHaveCount(9);

  expect(await runConditions(page)).toBe("results");
  await expect(page).toHaveURL(/#\/results\//);
  await expect(page.getByRole("heading", { name: "가늠 결과" })).toBeVisible();
  // 단일 손 정밀 세션 — 좌우손 타일은 없다.
  await expect(page.locator(".wsp-hand-compare")).toHaveCount(0);
});

test("정밀 + 양손 — 인터스티셜 → 둘째 손 → 비대칭 타일 + sessionId 연결", async ({ page }) => {
  test.setTimeout(150_000);
  await gotoSetup(page);

  await page.locator('.setup-card[data-mode="precise"]').click();
  await page.getByLabel(/양손 비교/).check();
  await page.getByRole("button", { name: /시작/ }).click();

  expect(await runConditions(page)).toBe("interstitial");
  await expect(page.getByRole("heading", { name: "손을 바꾸세요" })).toBeVisible();
  await page.getByRole("button", { name: "준비됐어요" }).click();

  expect(await runConditions(page)).toBe("results");
  await expect(page).toHaveURL(/#\/results\//);

  const tile = page.locator(".wsp-hand-compare");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("왼손");
  await expect(tile).toContainText("오른손");
  await expect(tile).toContainText("비대칭");

  // 두 Profile 이 같은 sessionId 로 저장됨.
  const linked = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("ganeum.profiles") || "[]") as Array<{
      hand: string;
      sessionId: string;
    }>;
    const sessions = new Set(raw.map((p) => p.sessionId));
    const hands = new Set(raw.map((p) => p.hand));
    return { count: raw.length, sessions: sessions.size, hands: hands.size };
  });
  expect(linked.count).toBe(2);
  expect(linked.sessions).toBe(1);
  expect(linked.hands).toBe(2);
});

test("지난 측정 대비 — 과거 세션 시드 후 델타 + 오버레이 칩 + 스파크라인", async ({ page }) => {
  test.setTimeout(90_000);

  await page.addInitScript(() => {
    const past = (id: string, createdAt: string, throughput: number) => ({
      schema: 2,
      id,
      sessionId: id,
      appVersion: "seed",
      createdAt,
      pointerType: "mouse",
      hand: "right",
      mode: "quick",
      calibrated: false,
      viewport: { w: 390, h: 844, dpr: 2, pxPerMm: null },
      conditions: [],
      fitts: { a: 0.2, b: 0.09, r2: 0.95 },
      throughput,
      we: 30,
      weSource: "measured",
      errorRate: 0.03,
      consistencySD: 0.03,
      asymmetry: null,
    });
    localStorage.setItem(
      "ganeum.profiles",
      JSON.stringify([
        past("aa-seed-1", "2026-08-15T09:00:00.000Z", 4.0),
        past("ab-seed-2", "2026-08-25T09:00:00.000Z", 4.2),
      ]),
    );
  });

  await gotoSetup(page);
  // 기본 = 빠른 측정, 오른손. 그대로 시작.
  await page.getByRole("button", { name: /시작/ }).click();
  expect(await runConditions(page)).toBe("results");

  const panel = page.locator(".within-subject-panel");
  await expect(panel.locator(".wsp-history-delta")).toBeVisible();
  await expect(panel.locator(".wsp-history-delta")).toContainText(/지난 측정|거의 같/);

  // 프리셋 3 + 나 + 직전 세션 = 5.
  await expect(panel.locator(".wsp-chip")).toHaveCount(5);
  await expect(panel.locator(".wsp-chip").nth(4)).toContainText("지난 측정");

  // 오버레이 토글: 칩 누르면 직전 회귀선이 켜진다.
  const prevOverlay = page.locator('path.fitts-overlay[data-overlay-id="prev"]');
  await expect(prevOverlay).toHaveClass(/is-off/);
  await panel.locator(".wsp-chip").nth(4).click();
  await expect(prevOverlay).not.toHaveClass(/is-off/);

  // 3회차(과거 2 + 현재 1) → 스파크라인.
  await expect(panel.locator("svg.wsp-sparkline")).toBeVisible();
  await expect(panel.locator("svg.wsp-sparkline circle")).toHaveCount(3);
});
