# ganeum — backlog

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
