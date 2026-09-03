# ganeum — backlog

## 2026-09-03 — 3B-b: 적응 화면(S4) + S3 비교 패널 + 배선 · 작업 브랜치 `w3b-b-adapt-ui`

Why: 회사 브리프 `reports/IDEA-20260901-1455/brief-3B-b.md`. 3B-a 가 깐 모델 core
(`src/adapt/`) 위에 마침내 사용자 대면 적응 UI 를 얹는다. 이 라운드가 끝나면 데모
3막(측정→결과→**적응**)이 완성된다 — 슬라이더를 "손떨림"으로 당기면 키패드가 커지고
벌어진다. 이게 앱의 진짜 목적. 3B-a 처럼 UI 표면 최소로 유지 (S4 한 화면 + S3 패널 하나).

Scope (이번 브랜치 — 딱 네 항목):

1. `src/adapt/morph.ts` — 프리셋 보간 + "나" 스냅 (순수 함수 + 골든 테스트):
   - 축 = We(CSS px) 오름차순. 프리셋 `endpointSdMm` → We 환산 (보정값 있으면 그걸로,
     없으면 `DEFAULT_PX_PER_MM`). 축상 순서 young < elderly < tremor.
   - "나" = 이번 세션 `SessionOk.we` (측정값). 축상 위치 = 프리셋 사이 선형 보간, 밖이면 클램프.
     `weSource="nominal-fallback"` 이면 "나" 비활성 + 안내(퇴화 경로).
   - `morphAt(t)` → `{ a, b, we, label, estimated }`. 인접 스톱 사이 선형 보간.
     `estimated` 는 tremor 쪽 세그먼트에 걸치면 true.
2. S4 적응 화면 `src/ui/screens/s4-adapt.ts` + `#/adapt/:id` 라우트 (전체 폭):
   - `MorphSlider` (4지점 We 순서, 드래그/화살표키, "나" 스냅 마커, 옵션객체 + `destroy()`).
   - `SampleUI` — 키패드 1개만. 실제 눌리는 목업. CSS 변수(`--hit-size`/`--gap`/`--pad`)만
     `sizing()` 결과에서 설정, 250ms 트랜지션, reduced-motion 이면 즉시.
   - 변경 수치 실시간: 보정됨이면 px(+mm), 미보정이면 상대 배율 + "미보정" 배지.
   - `Disclosure`(3A) 재사용 "▸ 왜 이렇게 바뀌나요?": `sizing()` 공식 한 줄 + 2D 정직성
     수치(`wStar2dNote` 기반) + `docs/adapt-model.md` 링크.
   - "원래대로 ↔ 나에게 맞춤" 토글 (체감 비교, 숫자 주장 없음). ABMiniTest 안 만듦.
   - 하단: 프로파일 JSON 저장(3A 재사용) · 결과 카드(S5).
3. S3 `WithinSubjectPanel` — 3A 예약 슬롯을 채움:
   - `FittsChart` 위 프리셋 회귀선 오버레이 (`[나][20대][손떨림][고령]` 토글 칩).
     프리셋 선 = 회색 점선 + "참고" 라벨. 출처 링크 상시.
   - 인구 백분위 없음, "상위 N%" 없음. 좌우손·시점 추이는 슬롯 밖(주 5–6).
   - `weSource="nominal-fallback"` 또는 `!confident` 면 "비교가 부정확할 수 있어요" 표기.
4. 배선:
   - S3 "이 결과로 화면 맞춰보기 →" 버튼 활성화 (3A 비활성) → `#/adapt/:id`.
   - `s2-measure` 가 저장하는 `Profile.calibrated` / `viewport.pxPerMm` 를 실제
     `ganeum.calibration` 값으로 채운다 (3B-a 잔여, 지금 항상 false/null).

Out of scope (주 5–6 이후): `ABMiniTest`, SampleUI 추가 목업(로그인 폼/미디어 툴바),
S3 좌우손 비교·시점 추이, S6 교육 페이지, AI 해설, 정밀 측정 모드. 조건 기하·
`src/core/*` 측정 로직 변경 금지. `src/adapt/{sizing,presets,inv-norm}.ts` API 유지(추가만).

Done when:
- 측정 완주 → S3 "화면 맞춰보기 →" → S4: 슬라이더를 "손떨림"으로 → 키패드 버튼이
  커지고 간격이 벌어짐(250ms). "나" 지점에서 측정값 반영. "원래대로↔맞춤" 토글 동작.
  "왜?" 펼치면 근거 + 2D 수치.
- S3 비교 패널: 프리셋 회귀선 오버레이 토글, 출처 링크 상시.
- `src/adapt/morph.ts` 순수 함수 + 골든 테스트 초록.
- `npm run typecheck` / `test` / `build` 초록. core 커버리지 게이트 유지.
- Playwright: 기존 3개 + 신규 1개(측정→S3→S4, 슬라이더 이동 시 `--hit-size` 실제 변경 +
  "나" 마커 존재, 폰 뷰포트).
- 사용자 대면 리터럴 0개, i18n `ko`+`en` 키 파리티 초록.
- `weSource="nominal-fallback"` 세션에서 S4 "나" 비활성 + 안내.

Priority: now

→ `project-eng` 가 이어받는다.

## 2026-09-03 — 3B-a: 화면 보정(SC) + 적응 모델 core · 작업 브랜치 `w3b-a-calibration-adapt-core`

Why: 회사 브리프 `reports/IDEA-20260901-1455/brief-3B-a.md`. 로드맵 주 3–4 하드 MVP
후반(3B)을 3B-a(보정 화면 + 모델 core + 테스트)와 3B-b(적응 UI)로 쪼갠 첫 절반.
이전 3A 빌드가 55분 걸려 의도적으로 작게 잡음 — 이 라운드 UI 표면은 SC 하나.

Scope (이번 브랜치 — 딱 세 항목 + 문서):

1. SC 화면 물리 보정 (선택, 건너뛰기 가능):
   - `CardCalibrator` 컴포넌트(옵션 객체 + `destroy()`). ISO ID-1 카드 85.60:53.98 고정비
     사각형 + 슬라이더(화살표키) + 숫자 직접입력. 실시간 `X.XX px/mm` + 대각 인치 추정.
   - `sc-calibrate` 화면 + `#/calibrate` 라우트. [이대로 저장] / [보정 없이 계속].
   - `ganeum.calibration = { pxPerMm(CSS px per mm), dpr, ts }` 저장 계층.
   - dpr 상대오차 > 0.05 → 모니터 변경 감지(정확 일치 비교 금지).
   - `ganeum.prefs.calibrationPrompted` — 첫 측정 직전(S1) 1회 권유, 스킵해도 재권유 없음.
2. `src/adapt/` 모델 core (UI 없음, 순수 함수 + 골든 테스트):
   - `presets.ts` — young/elderly/tremor 프리셋 SI(초), 손떨림 `estimated: true`.
   - `sizing.ts` — 닫힌 식 W*_1d = 4.1075·σ, 표시용 W*_2d = 2.537·σ, 예측 MT,
     gap(ADJACENCY_GAP_RATIO = 0.35), 바닥값/상한, floored/clamped, 퇴화 가드.
   - `inv-norm.ts` — Φ⁻¹ Acklam 근사, 런타임 의존성 0, Φ⁻¹(0.98) = 2.05375.
   - `citations.ts` — 참고문헌 상수(번역 안 함).
3. S0 보정 상태 줄 실제 배선 (3A 스텁 대체).
   + `docs/adapt-model.md` (수식·상수·출처·한계).

Out of scope (3B-b): S4 화면, MorphSlider, SampleUI, ABMiniTest, S3 WithinSubjectPanel,
프리셋 보간·"나" 스냅, S3 "화면 맞춰보기 →" 버튼 활성화. 조건 기하 변경 금지
(보정은 표시/보고에만 — brief-3A §8 C3).

Done when:
- `#/calibrate` 카드로 폭 맞추기 → 저장 → S0 "● 화면 보정됨 (X.XX px/mm)".
  "보정 없이 계속"도 정상 진행. 슬라이더·직접입력 동작.
- `src/adapt/` 순수 함수 + 골든 테스트 전부 초록. Φ⁻¹ 오차 1e-4 내.
- `npm run typecheck` / `npm test` / `npm run build` 초록. core 커버리지 게이트 유지.
- Playwright: 기존 flow 2개 + `#/calibrate` 저장→S0 반영 1개(폰 뷰포트).
- 사용자 대면 리터럴 0개, i18n `ko`+`en` 키 파리티 초록.

Priority: now

→ `project-eng` 가 이어받는다.

## 2026-09-03 — 3A: 측정 → 결과 → 카드 (+ 엔진/저장 수정) · 작업 브랜치 `w3a-measure-results`

Why: 회사 브리프 `reports/IDEA-20260901-1455/brief-3A.md` (스펙 정정본). 로드맵 주
3–4 하드 MVP를 3A/3B로 쪼갠 첫 절반. 3A 끝 = 노트북+안드로이드폰에서 무선 없이
홈→빠른 측정→결과(회귀선 자가 드로잉·처리율 카운트업)→카드 저장을 완주할 수 있는
완결·시연 가능한 출품작.

Scope (이번 브랜치):

Phase 0 — 엔진/데이터 정확성 (순수 core/render + 골든 테스트, UI 전에 완료):
- P0-1 착지 오차를 접근 축에 투영 (`devAxis`/`devOrtho`). main 라이브 버그, 최우선.
- P0-2 유효 너비 We 노출·저장. 정의 = 전 조건 축투영 오차 pooled 표본SD × 4.133.
  `weSource: "measured" | "nominal-fallback"`. `SessionAnalysis`·`Profile` 에 추가.
- P0-3 표시된 실제 진폭 기록(`displayedA`), `Ae` 는 실제 착지점 간 거리 평균.
- P0-4 타깃당 엔드포인트 1개. 재시도 탭은 errorRate 에만. `errorRate = 놓친 타깃/전체 타깃`.
  타이밍 press→press.
- P0-5 퇴화 입력 가드 + 신뢰도 게이트(`r²<0.7 || b<=0`) + `analyzeSession` 은
  throw 대신 `{ status: "insufficient" }`. `app.ts` 최상위 에러 경계.
- P0-6 단위: core SI, 표시 경계에서 ×1000. S3 캡션(유효 처리율 ≠ 1/b).
- P0-7 포인터 타입별 조건 세트. touch: W 바닥값 ≥ 24 CSS px.
- P0-8 스키마 v1→v2 + 마이그레이션. `Tap.devAxis/devOrtho`, `Profile.we/weSource/
  sessionId/appVersion`. 저장 계층에서 `migrateProfile` 실제 호출. 골든 테스트.
- P0-9 조건 진행 중 정사각 고정. `visualViewport` 사용.

Phase 1 — 저장 계층 `src/storage/`:
- `profiles.ts` — `ganeum.profiles`(Profile[], 최대 20), `ganeum.lastProfileId`,
  `ganeum.prefs`. 모든 접근 try/catch. 쿼터 초과 → 오래된 것 삭제 후 1회 재시도 →
  실패 시 세션 메모리 + 배지. 로드 시 `migrateProfile` 통과.
- `prefs` 형태: `{ theme, locale, sound, reducedMotionOverride }`.
- "내 데이터 전부 삭제" (모든 `ganeum.*` 키). export 만 (`{ format, version:1, profile }`).

Phase 2 — 화면 (S0/S1/S3/S5) + 컴포넌트:
- `src/ui/screens/{s0-home,s1-setup,s2-measure,s3-results,s5-card}.ts`,
  `src/ui/components/{app-modal,countdown,count-up-number,stat-tile,disclosure,
  theme-toggle,lang-toggle}.ts`, `src/render/{fitts-chart,result-card}.ts`.
  `src/app.ts` = 라우터 배선 + 에러 경계만.
- S1 3-2-1 카운트다운(디짓당 700ms). "정밀 측정" 비활성("준비 중").
- S3: `FittsChart`(SVG, 회귀선 자가 드로잉 400/800ms) + `CountUpNumber`(900ms) +
  `StatTile`×3 + 규칙 기반 `Disclosure`. `WithinSubjectPanel` 자리는 예약(빈 슬롯).
  "이 결과로 화면 맞춰보기" 버튼 비활성("준비 중").
- S5: `ResultCard` canvas 1080×1350 → PNG + 프로파일 JSON export.

Cross-cutting:
- i18n: 사용자 대면 리터럴 0개(`src/i18n` 밖), `en.ts` 키 파리티. `Intl` 로 숫자/날짜.
- reduced-motion: 모션 제거 대신 즉시 상태+색. `onReducedMotionChange` 연결.
- 오프라인: `public/sw.js` 빌드 산출 에셋 목록 precache, 캐시명에 빌드 해시.
- 안드로이드: `overscroll-behavior: none`, 챔버 `user-select: none`.
- 폰트: `@font-face` + `font-display: swap` + `document.fonts.ready`. (WOFF2 바이너리
  에셋은 별도 반입 필요 — 아래 Done-when 참조.)
- `src/ai/rules.ts` = 규칙 기반 해설의 주장 원천 (LLM 백엔드는 3B 이후).
- `docs/profile-format.md` + `CHANGELOG.md` 같은 커밋 갱신.

Out of scope (3B / 이후 — 건드리지 않음):
- SC 화면 보정, `src/adapt/`, S4 적응, S3 `WithinSubjectPanel` 내용, S6 교육 페이지,
  정밀 측정 모드, 양손 비교, `ABMiniTest`, AI LLM 백엔드(WebLLM/Ollama).

Done when:
- Founder 데모: 노트북(마우스)+안드로이드폰, 비행기 모드에서 홈→빠른 측정 완주→
  결과(회귀선 자가 드로잉·처리율 카운트업)→카드 PNG 저장→홈 "지난 결과 (1)".
  새로고침해도 프로파일 유지.
- `npm run typecheck` / `npm test` / `npm run build` 초록.
- 골든 테스트: P0-1/2/3/4/8 각각.
- Playwright: 폰 390×844 + 데스크톱 1280×800 각각 홈→측정→결과→카드 완주 + 결과
  4수치 + 회귀선 path 확인. 실클릭.
- 사용자 대면 리터럴 i18n 0개, `en.ts` 키 파리티 테스트 초록.
- 비행기 모드 새로고침 두 기기 동작 (수동 확인 항목으로 보고에 기재).

Priority: now

→ `project-eng` 가 이어받는다.

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
