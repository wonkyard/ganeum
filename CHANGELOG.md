# Changelog

가늠(Ganeum) 변경 이력. 날짜는 작업 완료 기준.

## [Unreleased] — 3A: 측정 → 결과 → 카드 (+ 엔진/저장 수정)

작업 브랜치 `w3a-measure-results`. 회사 브리프 `IDEA-20260901-1455/brief-3A.md`.

### 엔진/데이터 정확성 (Phase 0)

- **P0-1** 착지 오차를 접근 축에 투영 (`Tap.devAxis` / `Tap.devOrtho`). 유효 너비
  계산이 이제 축방향 산포만 쓴다 — main 에 있던 "원시 dx" 버그 수정.
- **P0-2** 유효 너비 `We` 를 노출·저장. 정의 고정: 전 조건 축투영 오차 pooled 표본SD
  × 4.133. `SessionAnalysis`·`Profile` 에 `we` / `weSource` 추가.
- **P0-3** 조건에 `displayedA`(그려진 진폭) 와 `Ae`(실측 이동 거리 평균) 기록. 처리율은
  명목 A 대신 `Ae` 를 쓴다.
- **P0-4** 타깃당 엔드포인트 1개. 재시도 탭은 MT·회귀를 오염시키지 않고 `errorRate`
  에만 기여. `errorRate = 놓친 타깃 / 전체 타깃`. 타이밍 press→press.
- **P0-5** `analyzeSession` 은 throw 하지 않는다 → `{ status: "insufficient" }`.
  신뢰도 게이트(`r² < 0.7 || b ≤ 0` → 단정 문구 억제). 축투영 오차에도 ±3·MAD
  이상치 제거. `app.ts` 최상위 에러 경계 + "다시 측정" 복구.
- **P0-6** core 는 SI(초), 표시 경계에서 ×1000(ms). S3 처리율 캡션 추가.
- **P0-7** 포인터 타입별 조건 세트. touch 는 타깃 너비 바닥값 ≥ 24 CSS px.
- **P0-8** 스키마 v1 → v2 + 마이그레이션. `Tap.devAxis/devOrtho`,
  `Profile.we/weSource/sessionId/appVersion`, `Condition.displayedA/Ae`.
  저장 계층이 로드마다 `migrateProfile()` 호출.
- **P0-9** 조건 진행 중 정사각 크기 고정 (안드로이드 주소창 대응). `visualViewport` 사용.

### 저장 계층 (Phase 1) — 신규 `src/storage/profiles.ts`

- `ganeum.profiles`(Profile[], 최대 20), `ganeum.lastProfileId`, `ganeum.prefs`.
- 모든 접근 try/catch. 쿼터 초과 시 가장 오래된 것 삭제 후 1회 재시도 → 실패 시
  세션 메모리 + 눈에 보이는 배지.
- "내 데이터 전부 삭제"(`deleteAllData`), 프로파일 JSON 내보내기
  (`{ format, version: 1, profile }`). 가져오기는 3A 범위 밖.

### 화면 (Phase 2)

- S0 홈 재작성 — 상단바(테마/언어 토글), "지난 결과 (n)", 보정 상태 줄.
- S1 측정 준비 + 3-2-1 카운트다운(디짓당 700ms). "정밀 측정" 은 비활성("준비 중").
- S2 측정 — 진행 도트, 중단 확인(`AppModal`), SR 안내.
- S3 결과 — `FittsChart`(SVG, 회귀선 자가 드로잉 400/800ms) + `CountUpNumber`(900ms)
  + `StatTile`×3 + 규칙 기반 `Disclosure`. `WithinSubjectPanel` 자리는 예약 슬롯(3B).
- S5 결과 카드 — `ResultCard` canvas 1080×1350 → PNG, iOS 폴백, 프로파일 JSON 내보내기.
- `src/app.ts` 는 라우터 배선 + 에러 경계만. 화면은 `src/ui/screens/*` 로 분리.

### 크로스커팅

- **i18n** — 사용자 대면 리터럴을 전부 `src/i18n` 으로 이관. `en.ts` 키는 `ko` 에서
  파생(파리티 보장). 숫자·날짜는 `Intl` 로 locale-aware.
- **reduced-motion** — 모션 제거가 아니라 즉시 상태 변화로 대체. `onReducedMotionChange`
  를 앱에 연결.
- **오프라인** — `vite.config.ts` 플러그인이 빌드 산출 에셋 목록을 `sw.js` 에 주입,
  캐시 이름에 빌드 해시. 캐시 우선 + 백그라운드 갱신.
- **폰트** — JetBrains Mono(OFL) 서브셋 WOFF2 를 `src/assets/fonts/` 에 자가 호스팅
  (`font-display: swap`). CDN 없음. 본문은 시스템 스택(한글 웹폰트 self-host 는 이후).
- **안드로이드 터치 위생** — `overscroll-behavior: none`, 챔버 `user-select: none`.
- `src/ai/rules.ts` — 규칙 기반 해설(주장의 원천). LLM 백엔드는 3B 이후.

### 테스트/CI

- 골든 테스트: P0-1(축 투영), P0-2(pooled We), P0-3(Ae 실측), P0-4(타깃당 1엔드포인트),
  P0-8(v1→v2 마이그레이션).
- Playwright: 폰 390×844 + 데스크톱 1280×800 각각 홈→측정→결과→카드 완주(실클릭).
