# ADR 0001 — 런타임 의존성 0, 프레임워크 없음

- 상태: 채택 (주 1–2)
- 맥락: 공모전 출품작. 상시 비용 0, 백엔드 없음, 오프라인 동작, 정적 배포.

## 결정

런타임 의존성을 두지 않는다. 차트는 직접 그리고(Canvas/SVG), 통계는 직접 구현하며
(`src/core/`), 상태 관리·라우팅은 자체 소형 모듈(`src/ui/store.ts`, `src/ui/router.ts`)로
해결한다. 개발 의존성만 둔다: `vite`, `typescript`, `vitest`, `@playwright/test`,
`@vitest/coverage-v8`, `jsdom`.

## 근거

- 번들 크기와 콜드 스타트를 최소화 → 부스 wifi 없이도 즉시 로드.
- `src/core/` 를 프레임워크 무관 순수 함수로 유지하면 골든 테스트가 쉽고, 향후
  `@ganeum/fitts-core` 로 추출 가능.
- 의존성 CVE·breaking change 추적 부담 제거.

## 재검토 조건

컴포넌트 스프롤이 심해지면 Preact(3KB) + htm 도입을 다시 논의한다(빌드타임 컴파일 없음).
그 시점에 새 ADR 로 기록한다.
