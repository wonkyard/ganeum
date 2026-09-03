# Changelog

가늠(Ganeum) 변경 이력. 날짜는 작업 완료 기준.

## [Unreleased] — 5-6-b: 정밀 측정 + 좌우손 비교 + 히스토리 비교

작업 브랜치 `w56b-precise-hands-history`. 회사 브리프 `IDEA-20260901-1455/brief-5-6-b.md`.
데모 3막(빠른 측정 → 결과 → 적응)은 그대로 두고, 그 위에 "정밀" 경로와 시점 비교를 얹는
순수 추가형 라운드. `src/adapt/*` 미변경, 빠른 측정 경로 회귀 없음.

### 1. 정밀 측정 모드 (조건 9개)

- `src/core/task.ts` — `designConditions("precise", …)` 는 이미 9조건 격자
  (A ∈ {0.3,0.5,0.7}·ref × W ∈ {1,2,4}·minHit)를 만든다. 이번 라운드는 반환을
  **ID 오름차순**(쉬움 → 어려움 램프)으로 고정. 포인터타입 바닥값(touch 24 / mouse
  12 CSS px)은 유지. 골든 테스트 추가(`task.test.ts` — 격자 온전성 / 정렬 / 바닥값).
- `src/ui/screens/s1-setup.ts` — "정밀 측정" 카드 **활성화**(기존 "준비 중" 제거).
  카드 택1 실제 토글(`aria-pressed` + `is-selected`). 정밀 선택 시 "양손 비교"
  체크박스 노출. 카드에 포커스가 있을 때 스페이스는 카드 선택용(측정 시작 아님).
- `src/ui/screens/s2-measure.ts` — 조건 수 = 모드별(quick 3 / precise 9). 진행
  도트가 9개 반영. "가장 어려운 조건" 힌트는 quick 전용.
- `src/ui/session-store.ts` — `bothHands: boolean` 추가.

### 2. 좌우손 비교 (정밀 모드에서만)

- `src/core/asymmetry.ts` (신규) — `computeAsymmetry(right, left)` 순수 함수
  = (R.TP − L.TP) / mean. 한 손이라도 유효 처리율이 없으면 `null`. 골든 테스트
  (`asymmetry.test.ts` — screen-design 예시값 16% 검산, 부호, null 경로).
- `s2-measure.ts` — 양손 세션은 `runHand()` 를 손마다 반복한다. 첫 손 9조건 완주 →
  **인앱 "손을 바꾸세요" 인터스티셜**(`.screen-interstitial`, 브라우저 dialog 금지,
  `aria-live` 안내 + 제목 포커스) → "준비됐어요" → 둘째 손 9조건 → 결과.
  두 Profile 은 공유 `sessionId` 로 저장(배열 상한 20 유지)되고, 완주 후 두 Profile
  의 `asymmetry` 필드를 채워 다시 저장한다.
- `src/ui/screens/s3-results.ts` — `deriveHandComparison()` 이 `sessionId` 로 형제
  Profile 을 찾아 좌우 처리율 + 비대칭을 구한다(저장된 `asymmetry` 우선, 없으면
  두 처리율로 계산).
- `WithinSubjectPanel` — `handComparison` 옵션이 있으면 "왼손 X / 오른손 Y ·
  비대칭 N%" 라인(`.wsp-hand-compare`). 한 손만 유효하면 안내 문구.

### 3. S3 "지난 측정 대비" — 시점 비교

- `s3-results.ts` — `deriveHistory()` 가 저장된 Profile 중 **같은 `hand` + 같은
  `mode`** 이면서 이번 측정보다 먼저인 다른 세션을 찾는다. 직전 세션 = 그중 가장 최근.
- `WithinSubjectPanel` — `history` 옵션:
  - `FittsChart` 오버레이에 **직전 세션 회귀선** 추가 + 토글 칩(`prev`, 날짜 라벨).
  - "지난 측정 대비 처리율 ±X bits/초 (↑/↓)" 한 줄(`.wsp-history-delta`), 0 근처는
    "거의 같아요".
  - 측정 3회 이상(현재 포함)이면 자체 SVG **처리율 추이 스파크라인**(라이브러리 0,
    날짜순 3~10점). `weSource="nominal-fallback"` / 회귀 게이트 미통과 점은 회색 +
    "신뢰도 낮음" 표기. 직전 세션이 저신뢰면 비교 경고 문구.
- `FittsChartOverlay` 를 `s3-results` 가 직접 조립(`presetOverlays()` + 선택적
  `prev`).

### 데이터 모델 / 문서

- 저장 스키마(Profile) **형태 불변** — `sessionId`·`asymmetry` 는 v2 필드 그대로.
  `docs/profile-format.md` 에 "양손 세션 = 두 Profile 공유 `sessionId`" 규칙 명시.

### i18n

- 새 문자열 전부 `src/i18n/ko.ts` 키(`setup.bothHands*`, `measure.switchHands*`,
  `measure.conditionProgressHand`, `result.handCompare*`, `result.asymmetry*`,
  `result.history*`). `en` 키 파리티 유지(값은 ko 폴백 — 번역은 주 7–8).

### 테스트

- 단위(vitest): `asymmetry.test.ts`(신규 6), `task.test.ts`(정밀 5),
  `within-subject-panel.test.ts`(좌우손 3 + 시점 6). core 커버리지 게이트 유지
  (100 / 93 / 100 / 100).
- Playwright: `precise-hands-history.spec.ts`(신규 3 — 정밀 9조건 완주 / 양손
  인터스티셜 + sessionId 연결 / 과거 세션 시드 후 델타·오버레이·스파크라인).
  기존 7개 그대로 초록. 폰 뷰포트.

## [Unreleased] — 5-6-a: 교육 페이지(S6) + 적응 샘플 UI 2개

작업 브랜치 `w56a-education-samples`. 회사 브리프 `IDEA-20260901-1455/brief-5-6-a.md`.
하드 MVP(3B-b) 위에 심사위원용 교육 페이지와 적응 데모 샘플 2개를 얹는 순수 추가형
라운드 — 측정/저장/적응 core 로직은 미변경.

### S6 교육 페이지 `src/ui/screens/s6-about.ts` + `#/about`

- 스크롤 문서 7섹션(Fitts의 법칙 / ISO 9241-411 태핑 과제 / 왜 '평균'은 실패하나 +
  적응 모델 근거 / 화면 보정 / AI·서버 없이 어떻게 / 한계 / 인용). 본문 720px, `aria`
  랜드마크 + 목차 `nav`, 각 섹션 제목 포커스 가능.
- `src/ui/components/fitts-widget.ts` — 자체 구현 SVG 인터랙티브 위젯(라이브러리 0,
  옵션객체 + `destroy()`). 타깃 드래그(수평=거리 A, 수직=크기 W) + **키보드 대체 경로**
  (슬라이더 2개 + 타깃 `role="slider"` 화살표키). `MT = a + b·log2(A/W+1)` 예측값
  실시간 갱신. `predictFitts()` 는 `src/core/fitts.ts` 재사용, 순수 함수로 분리(테스트).
  reduced-motion 이면 타깃 트랜지션만 끄고 값 갱신은 유지.
- 섹션 2 축소 삽화 — 원형 8타깃 + criss-cross 진행 순서(정적 SVG).
- `src/ui/router.ts` — 해시 안의 두 번째 `#`(`#/about#adapt-model`)를 화면 내 앵커로
  분리. `routeAnchor()` 추가. S3 "이게 무슨 뜻이죠?" / S4 "왜?" 해설에서 관련 S6
  섹션으로 딥링크 → 해당 섹션으로 스크롤 + 제목 포커스.
- S0 "가늠이란?" 링크 활성화(스텁 제거) → `#/about`.
- `src/adapt/citations.ts` — MacKenzie 1992 · ISO 9241-411 · WCAG 2.5.5/2.5.8 인용
  추가(add-only, 번역 아님). 프리셋은 이 3건을 참조하지 않는다.

### 적응 샘플 UI 2개 `src/ui/components/sample-ui.ts`

- `kind: "keypad" | "login" | "toolbar"` 분기, 공통 폰 프레임·CSS 변수 구동 재사용.
  - **로그인 폼**: 이메일/비번 입력 + [로그인] + "비밀번호 찾기" 링크. 필드 높이·버튼·
    링크 히트 영역이 `--hit-size`/`--gap` 를 따른다.
  - **미디어 툴바**: 아이콘 버튼 6개(이전/재생·일시정지/다음/볼륨/음소거/전체화면).
    크기·간격이 `--hit-size`/`--gap` 를 따른다. 재생 버튼은 실제 토글.
- 같은 250ms 트랜지션, reduced-motion 즉시. 기존 키패드 API(`applySizing`/`setMode`/
  `getMode`/`destroy`) 그대로 + `getKind()` 추가.
- S4 에 `[키패드][로그인 폼][미디어 툴바]` 탭(`role="tab"`). 전환 시 현재 모드·sizing
  유지. "원래대로↔맞춤" 토글은 선택된 샘플에 적용.

### i18n

- S6·샘플 새 문자열 전부 `src/i18n` 키(`about.*`, `adapt.sampleTab.*`, `adapt.login*`,
  `adapt.toolbar*`, `result.explainMore`). `en` 키 파리티 유지(값은 ko 폴백).

### 테스트

- jsdom: `fitts-widget.test.ts`(예측 계산 손검산 + 슬라이더/화살표키 갱신 + 클램프),
  `sample-ui.test.ts` 확장(로그인·툴바 렌더 + 3종 CSS 변수 반영).
- Playwright: `tests/e2e/about.spec.ts`(폰 — `#/about` 7섹션 + 위젯 슬라이더 예측값
  변화 + S0 링크 + 딥링크 포커스). `adapt.spec.ts` 에 S4 샘플 탭 전환 검증 추가.
  기존 4개 그대로 초록.

## [Unreleased] — 3B-b: 적응 화면(S4) + S3 비교 패널 + 배선

작업 브랜치 `w3b-b-adapt-ui`. 회사 브리프 `IDEA-20260901-1455/brief-3B-b.md`.
3B-a 가 깐 모델 core 위에 사용자 대면 적응 UI 를 얹는다 — 데모 3막(측정→결과→적응) 완성.
UI 표면은 S4 한 화면 + S3 패널 하나 + 배선. `src/adapt/{sizing,presets,inv-norm}.ts` API 유지.

### 프리셋 보간 core `src/adapt/morph.ts` (UI 없음, 순수 함수 + 골든 테스트)

- 슬라이더 축 = 유효 너비 We(CSS px), 오름차순. 프리셋 `endpointSdMm` → `We = 4.133·SD`
  환산(px 는 보정값 있으면 그걸로, 없으면 `DEFAULT_PX_PER_MM`). 축상 순서 young < elderly < tremor.
- `buildMorphAxis({ me, calibrationPxPerMm })` — 프리셋 3종 + 측정된 "나" 를 한 축에.
  "나" 위치 = 브래킷 프리셋 사이 선형 보간, 밖이면 클램프. 축 끝점은 항상 프리셋(늘리지 않음).
- `weSource="nominal-fallback"` 또는 `we ≤ 0` → "나" 비활성(`meDisabled`), 프리셋만으로 슬라이더 동작.
- `morphAt(axis, t)` → `{ a, b, we, label, estimated }`. 인접 스톱 선형 보간, 폭 0 세그먼트 건너뜀.
  `estimated` 는 tremor 쪽 세그먼트에 걸치면 true. `morphAt(0/1)` 은 정확히 min/max 프리셋 값.
- `src/adapt/citations.ts` — `CITATION_URLS`(DOI/링크) + `ADAPT_MODEL_DOC_URL` 추가(번역 아님).

### S4 적응 화면 `src/ui/screens/s4-adapt.ts` + `#/adapt/:id`

- `src/ui/components/morph-slider.ts` — `MorphSlider`(옵션객체 + `destroy()`). 4지점 눈금을
  축상 We 위치대로 배치, 드래그/화살표키(네이티브 range), "나" 스냅 마커, `aria-valuetext` 라벨.
- `src/ui/components/sample-ui.ts` — `SampleUI`(키패드 1개만). 실제 눌리는 숫자 목업.
  적응은 **CSS 변수만** 바꿔 일어남: `--hit-size`/`--gap`/`--pad` 를 `sizing()` 결과에서 설정,
  250ms 트랜지션, reduced-motion 이면 `--adapt-transition: 0ms`.
- 변경 수치 실시간: 보정됨이면 px + mm, 미보정이면 상대 배율(×1.0 → ×N) + "미보정" 배지.
  `floored`/`clamped` 안내 문구.
- `Disclosure`(3A) 재사용 "▸ 왜 이렇게 바뀌나요?": `sizing()` 공식 한 줄 + 2D 정직성 수치
  (`exp(−(W*/2)²/2σ²)` → "실제 2차원 버튼에선 약 N% 오류") + `docs/adapt-model.md` 링크.
- "원래대로 ↔ 나에게 맞춤" 토글 (체감 비교, 숫자 주장 없음). `ABMiniTest` 는 안 만듦(범위 밖).
- 하단: 프로파일 JSON 저장(3A `exportProfileJSON` 재사용) · 결과 카드(S5).

### S3 피험자 내 비교 패널 `src/ui/components/within-subject-panel.ts`

- 3A 예약 슬롯을 채움. `FittsChart` 에 프리셋 회귀선 오버레이(점선) 추가 —
  `FittsChartOptions.overlays` + `chart.setOverlay(id, visible)` (add-only, 자가 드로잉).
- `[나] [20대] [손떨림] [고령]` 토글 칩. "나"(내장 회귀선) 기본 켜짐, 프리셋 기본 꺼짐.
- 프리셋 회귀선 = 회색 점선. "참고" 라벨 + 출처 링크 상시(`CITATIONS`/`CITATION_URLS`).
- **인구 백분위 없음, "상위 N%" 없음**(spec §5). 좌우손·시점 추이는 슬롯 밖(주 5–6).
- `weSource="nominal-fallback"` 또는 `!confident` 면 "비교가 부정확할 수 있어요" 표기.

### 배선

- S3 "이 결과로 화면 맞춰보기 →" 버튼 활성화(3A 비활성 "준비 중") → `#/adapt/:id`.
- `s2-measure` 가 저장하는 `Profile.calibrated` / `viewport.pxPerMm` 를 실제
  `ganeum.calibration` 값으로 채운다(3B-a 잔여). 조건 기하는 여전히 뷰포트 CSS px 전용.

### i18n

- S4·비교 패널 새 문자열 전부 `src/i18n` 키(`adapt.*`, `result.compare*`). `en` 키 파리티 유지.
- 미사용 키 `result.comparisonReserved` 제거.

### 테스트

- 골든: `src/adapt/morph.test.ts` — 끝점=프리셋 값, 중간 보간, "나" 스냅/클램프, 퇴화 경로.
- jsdom 컴포넌트: `MorphSlider` / `SampleUI` / `WithinSubjectPanel`.
- Playwright: 기존 3개 + `tests/e2e/adapt.spec.ts`(폰) — 측정→S3 오버레이 토글→S4,
  슬라이더 이동 시 `--hit-size` 실제 증가 + "나" 마커 존재 + "원래대로" 토글.

## [Unreleased] — 3B-a: 화면 보정(SC) + 적응 모델 core

작업 브랜치 `w3b-a-calibration-adapt-core`. 회사 브리프 `IDEA-20260901-1455/brief-3B-a.md`.
UI 표면은 SC 화면 하나. S4 적응 UI·MorphSlider·SampleUI·S3 비교 패널은 3B-b.

### 화면 물리 보정 (SC)

- `src/ui/components/card-calibrator.ts` — `CardCalibrator` (옵션 객체 + `destroy()`).
  ISO/IEC 7810 ID-1 카드(85.60 × 53.98mm) 고정비 사각형 + 슬라이더(화살표키 미세조정)
  + 숫자 직접 입력. 실시간 `X.XX px/mm` + 대각 인치 추정
  (`hypot(w_px, h_px) / (pxPerMm × 25.4)`).
- `src/ui/screens/sc-calibrate.ts` + `#/calibrate` 라우트 — [이대로 저장] / [보정 없이 계속].
- `src/storage/profiles.ts` — `ganeum.calibration = { pxPerMm, dpr, ts }` (pxPerMm 은
  **CSS px per mm**). `loadCalibration` / `saveCalibration` / `clearCalibration` /
  `isCalibrationStale`(dpr 상대오차 > 0.05 → 모니터 변경 추정). `deleteAllData` 가 함께 지움.
- `ganeum.prefs.calibrationPrompted` 추가 — 첫 측정 직전(S1) 1회 권유, 스킵해도 재권유 없음.
- S0 보정 상태 줄을 실제 상태로 배선 (3A 스텁 대체): 미보정 / `● 화면 보정됨 (X.XX px/mm)`
  / `⚠ 모니터가 바뀐 것 같아요`. 항상 `#/calibrate` 링크.

### 적응 모델 core `src/adapt/` (UI 없음, 순수 함수 + 골든 테스트)

- `inv-norm.ts` — `Φ⁻¹` Acklam 근사 (런타임 의존성 0, 절대오차 ~1e-9). `PHI_INV_098 = 2.05375`.
- `presets.ts` — young / elderly / tremor 프리셋을 **SI(초)** 로. 손떨림은 `estimated: true`
  (문헌 공백). `DEFAULT_PX_PER_MM = 3.8`.
- `citations.ts` — 참고문헌 문자열(번역 안 함, i18n 아님).
- `sizing.ts` — 닫힌 식 `W*_1d = 4.1075·σ`, 표시용 `W*_2d = 2.537·σ`, 예측 이동시간,
  간격(`ADJACENCY_GAP_RATIO = 0.35`), 바닥값/상한, `floored`/`clamped` 플래그,
  퇴화 입력 가드(`we ≤ 0` → `null`). a·b·A_c 는 W\* 산정에 안 들어감(brief-3A §8 정정).
- `docs/adapt-model.md` — 수식·상수·프리셋 출처·한계 (심사위원용, S6 초안).

### i18n

- SC·S0·S1 새 문자열 전부 `src/i18n` 키 (`calibrate.*`, `home.calibration*`,
  `setup.calibratePrompt*`, `adapt.preset.*`). `en` 키 파리티 유지.

### 테스트

- 골든: `src/adapt/inv-norm.test.ts`(분위수·꼬리·정의역), `sizing.test.ts`(σ/W\* 손계산,
  바닥값·상한, gap, 단조성, 퇴화 가드), `presets.test.ts`(값·부호·estimated·citation).
- `src/storage/profiles.test.ts` — 보정 저장/로드/스테일/삭제.
- `src/ui/components/card-calibrator.test.ts` — 슬라이더·직접입력·클램프·readout·destroy.
- Playwright: `tests/e2e/calibrate.spec.ts` — 폰 뷰포트, `#/calibrate` 저장 → S0 반영 +
  스킵은 저장 안 함 + 새로고침 유지. 기존 flow 2개 그대로 초록.

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
