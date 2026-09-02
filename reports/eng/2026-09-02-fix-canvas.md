# Eng — 2026-09-02 (주 1–2 반려 수정: S2 캔버스 좌표계)

Backlog item: 주 1–2 반려 수정 — S2 캔버스 좌표계 단일화 (빌드 라운드 2)
브랜치: `w1-2-fix-canvas` (main @ 8652dde 에서 분기)
반려 브리프: 회사 레포 `reports/IDEA-20260901-1455/w1-2-fix-canvas-FAIL.md`

## 근인

`app.ts renderMeasure()` 가 `size = min(innerWidth, innerHeight*0.9)` 로 캔버스
attribute 와 `style.height` 를 잡고 **그 `size` 로 타깃 레이아웃까지** 생성했다.
그런데 `.target-canvas { max-width:100% }` + `.chamber` 패딩 때문에 폰에서는 표시
폭이 `size` 보다 작아지고 `style.height` 는 `size` 그대로 → 세로로 늘어남.
`TargetField` 의 그리기·`toLocal()` 히트판정은 표시 박스(getBoundingClientRect)
좌표를 쓰는데 `layout.positions` 는 늘어나기 전 `size × size` 정사각 좌표계 →
좌표계 불일치로 히트가 안 잡히고 `seqPos` 가 안 올라가 조건이 안 끝남.

## 고친 방식 (브리프 요구 1:1)

- **크기의 단일 소스를 `TargetField` 로 이동.** 컨테이너의 실제 CSS 박스를 재서
  정사각(`min(가용폭, 가용높이)`, `measureSquare()`)으로 `style.width/height` 를
  **같은 값**으로 박고, 그 한 값(`this.size`, CSS px)으로 레이아웃 생성·그리기·
  히트판정을 모두 한다. DPR 은 백버퍼에만(`canvas.width = size·dpr`,
  `setTransform(dpr…)`). `app.ts` 는 이제 캔버스 크기를 만지지 않는다.
- **레이아웃도 그 크기에서 파생.** `TargetField` 가 `buildLayout(size)` 콜백을
  받고, `app.ts` 는 조건 스펙(A·W·ID)을 필드가 잰 `size*0.8` 에서 `designConditions`
  로 뽑는다. `app.ts` 가 별도 `size` 변수로 레이아웃을 미리 만들지 않는다.
- **DOM 부착 후 측정 + 0 방어.** `measureSquare()` 가 0 이면 `requestAnimationFrame`
  으로 재시도(`tryInit`). `ResizeObserver`(없으면 `window.resize`)로 방향전환/리사이즈
  시 정사각 재맞춤 + 현재 조건 레이아웃 재생성(`seqPos` 유지, `handleResize`).
- **CSS**: `.target-canvas { aspect-ratio: 1/1 }` — JS 가 크기를 박기 전 한 프레임의
  세로 늘어남만 막는 방어. `style.height` 를 CSS 로 따로 고정하지 않음.
- **`src/core/*` 무손.**
- **자동화 훅이 표시 좌표를 누르도록.** `tapCurrentTarget()` 은 이제
  `currentTargetClientPoint`(표시 박스 기준 좌표)에서 실제 `pointerdown` 을
  디스패치해 `toLocal()`/히트판정을 그대로 태운다. 새 `AppHandle.currentTargetPoint()`
  는 Playwright 가 실제 `page.mouse.click` 으로 누를 뷰포트 좌표를 준다. 좌표계가
  어긋나면 `scale = rect.width/size ≠ 1` 이라 클릭이 빗나가 테스트가 깨진다.

## Changed

- `src/render/target-field.ts` — 크기 단일 소스, `buildLayout` API, `measureSquare()`,
  `tryInit()`/`applySize()`/`handleResize()`, `ResizeObserver`, `currentTargetClientPoint`,
  표시 좌표 기반 `tapCurrentTarget()`. draw 는 `this.size` 로 clear/좌표 사용.
- `src/app.ts` — `renderMeasure()` 가 캔버스 크기/사전 `size` 를 안 만짐. 조건 스펙
  lazy 파생(`specsFor`). `AppHandle.currentTargetPoint()` 추가.
- `src/styles/app.css` — `.target-canvas { aspect-ratio: 1/1 }`.
- `src/render/target-field.test.ts` — 새 `buildLayout` API 반영 + 좌표계 일치 테스트 1건 추가.
- `tests/e2e/measure-responsive.spec.ts` — 신규. 폰 390×844 + 데스크톱 1280×800
  두 뷰포트에서 표시 좌표 실클릭으로 홈→측정(3×11)→`/results` 완주 + 결과 4수치 +
  캔버스 정사각 assert.

## Tests (실제 결과)

- `npm run typecheck` → 통과, 0 에러.
- `npm test` (`vitest run`) → **14 파일 / 70 테스트 전부 통과** (~2.3s).
- `npm run build` (`tsc --noEmit && vite build`) → 통과. dist 15.66 kB JS(gzip 6.74) +
  2.44 kB CSS.
- `npx playwright test` → **3 통과** (8.2s):
  - `measure-responsive.spec.ts` 폰 390×844 — 세션 완주 + 결과 4수치 (2.8s)
  - `measure-responsive.spec.ts` 데스크톱 1280×800 — 세션 완주 + 결과 4수치 (2.7s)
  - `smoke.spec.ts` 기존 스모크 (2.5s)

## Done-when check

- 폰(390×844)·데스크톱(1280×800) 둘 다 강조 타깃 **표시 좌표 실클릭**으로 히트 →
  criss-cross 로 조건 3개 완주 → `/results` 에서 `MT = a + b·ID`, `r²`, `bits/초`
  표시: **met** (Playwright 두 뷰포트).
- 캔버스가 어느 뷰포트에서도 정사각(폭≈높이, |Δ|<2px)이고 뷰포트 폭을 안 넘음:
  **met** (Playwright `boundingBox` assert).
- typecheck + test + build + Playwright 초록: **met**.

## Status

READY FOR RELEASE CHECK
