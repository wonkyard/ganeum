# ganeum — backlog

## 2026-09-02 — 주 1–2 반려 수정: S2 캔버스 좌표계 단일화 (빌드 라운드 2)

Why: 라이브(https://wonkyard.github.io/ganeum/)에서 S2 측정 화면이 폰에서 동작
불가. 캔버스가 세로로 늘어나고, 타깃이 잘리고, 강조된 타깃을 눌러도 히트가 안
잡혀 2탭 뒤 멈춘다. 근인은 `app.ts`가 뷰포트에서 뽑은 `size`로 레이아웃을
만들고, CSS `max-width:100%`가 표시 폭을 줄여 **레이아웃 좌표계 ≠ 표시 박스**가
되는 것. 반려 브리프: 회사 레포 `reports/IDEA-20260901-1455/w1-2-fix-canvas-FAIL.md`.

Scope (이번 diff에 포함):
- `src/render/target-field.ts` — 캔버스 크기의 단일 소스를 `TargetField`로 이동.
  컨테이너 CSS 박스를 재서 정사각(min(가용폭,가용높이))으로 자신을 맞추고, 그
  크기 하나로 레이아웃 생성·그리기·히트판정을 모두 수행. DPR은 백버퍼에만.
  요소가 DOM에 붙은 뒤 측정(rect 0 방어 + rAF 재시도), `ResizeObserver`(없으면
  `window.resize`)로 방향전환/리사이즈 시 정사각 재맞춤 + 현재 조건 레이아웃
  재생성(`seqPos` 유지). 자동화 훅은 **표시 좌표**를 눌러 좌표계 회귀를 잡는다.
- `src/app.ts` — `renderMeasure()`가 별도 `size`를 미리 잡지 않도록. 조건 스펙은
  필드가 잰 정사각 크기에서 파생. `AppHandle.currentTargetPoint()` 추가(표시 좌표).
- `src/styles/app.css` — `.target-canvas { aspect-ratio: 1/1 }` (정사각 방어).
- `src/render/target-field.test.ts` — 새 `buildLayout` API에 맞춰 갱신.
- `tests/e2e/measure-responsive.spec.ts` — 폰 390×844 + 데스크톱 1280×800 두
  뷰포트에서 홈→측정(조건 3×11탭)→`/results` 완주 + 결과 4개 수치 표시 검증.
  현재 타깃의 **표시 좌표**를 실제 `page.mouse.click`으로 눌러 좌표계 어긋남이
  테스트를 깨도록 한다. + 캔버스 정사각 assert.

Out of scope (건드리지 않음):
- `src/core/*` — 근인이 아니다. 측정 과학/분석은 그대로.
- 시작 안내 화면·카운트다운·결과 시각화·적응·디자인 폴리시 (주 3–4).
- 조건 난이도(A/W 공식) 변경, SC 물리 보정.

Done when:
- 폰(390×844)·데스크톱(1280×800) 둘 다에서 강조 타깃 클릭 시 히트가 잡히고
  criss-cross로 조건 3개 완주 → `/results`에서 a·b·r²·TP 표시.
- 캔버스가 어느 뷰포트에서도 정사각으로 표시되고 타깃이 잘리지 않는다.
- `npm run typecheck` / `npm test` / `npm run build` / Playwright(두 뷰포트) 초록.

Priority: now

→ `project-eng`가 이어받는다.

## 2026-09-02 — 주 1–2: 뼈대 + 측정 엔진 + 테스트/CI

Why: 공모전 출품작의 토대. 측정 과학(`core/`)이 검증돼 있어야 이후 결과·적응
화면이 신뢰할 수 있는 수치를 그린다. 접근성·CI는 스펙 §9/§10에 따라 1주차부터.

Scope (이번 diff에 포함):
- 레포 셋업: Vite + TypeScript, vitest, Playwright, `.github/workflows`
  (typecheck / test / build), GitHub Pages 배포 워크플로, 수동 service worker 스텁.
- `src/core/` 프레임워크 무관 순수 함수 + 골든 단위테스트:
  - `ids.ts` — 프로파일/조건 ID
  - `task.ts` — ISO 9241-411 원형 배열 타깃 생성, criss-cross 순서, 조건 설계
  - `regression.ts` — 최소제곱 회귀 (`MT = a + b·ID`, r²)
  - `fitts.ts` — `ID = log2(A/W + 1)`
  - `throughput.ts` — We (`4.133·SDx`), IDe, 유효 처리율 TP
  - `outliers.ts` — 중앙값 ±3·MAD 이상치 제거
  - `migrate.ts` — 스키마 버전 + 마이그레이션
- `src/ui/` — 소형 반응형 스토어(~50줄) + 해시 라우터(~50줄)
- `src/render/target-field.ts` — S2 측정 과제 Canvas: 원형 배열, 다음 타깃 로직,
  히트/미스, Pointer Events, 궤적 트레일 (`getCoalescedEvents`)
- `src/screens/` — 최소 홈 + S2 측정 화면 배선. 세션 완주 시 (a, b, r², TP) 계산·표시
- `src/i18n/` — `ko.ts` 채움 / `en.ts` 키만 (키 정합성 테스트)
- 접근성 기반: 포커스 링, `prefers-reduced-motion` 훅, 다크/라이트 토큰
- `docs/profile-format.md` — 프로파일 JSON 안정 계약 v1

Out of scope (이번에 하지 않음 — 주 3–4 이후):
- SC 화면 물리 보정, S1 측정 준비 상세, S3 결과 시각화(SVG 산점도·애니메이션),
  S4 적응, S5 카드, S6 교육 페이지, S0 홈 최종 디자인
- `src/ai/` (AI 해설), WebLLM, 규칙 기반 해설
- 히스토리/시점 비교, 좌우손 비대칭 UI, 프리셋 회귀선
- 결과 화면의 카피/해설, `en.ts` 번역 값

Done when:
- 마우스로 한 세션(빠른 측정, 조건 3개)을 완주하면 (a, b, r², TP)가 계산돼 화면에 표시된다.
- `npm run typecheck`, `npm test`, `npm run build` 세 명령이 모두 통과.
- `core/` 골든 케이스 테스트가 ISO 스펙 / MacKenzie Shannon 수식과 손계산 값에 대해 통과.
- GitHub Actions CI 워크플로가 위 세 단계를 실행하도록 구성돼 있다.

Priority: now

→ `project-eng`가 이어받는다.
