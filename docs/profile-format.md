# 프로파일 JSON 포맷 — 안정 계약

가늠이 `localStorage` 에 저장하고, 사용자가 내보내기 하는 프로파일의 형태.
v1 필드의 **의미는 바뀌지 않는다**. 형태가 바뀌면 `schema` 를 올리고
`src/core/migrate.ts` 에 업그레이드 단계를 추가한다. 저장 계층
(`src/storage/profiles.ts`)은 로드할 때마다 `migrateProfile()` 을 통과시킨다.

현재 스키마: **v2** (brief-3A P0-8).

## 내보내기 봉투 (export)

```json
{ "format": "ganeum-profile", "version": 1, "profile": { …Profile } }
```

`version` 은 내보내기 봉투의 버전이며, 안쪽 `profile.schema` 와 별개다.
가져오기(import)는 3A 범위 밖 — 화면이 없다.

## 최상위 (Profile)

| 필드 | 타입 | 도입 | 의미 |
|---|---|---|---|
| `schema` | `1 \| 2` | v1 | 스키마 버전. 없으면 v0 으로 간주하고 마이그레이션. |
| `id` | string | v1 | `<base36 ms>-<8 hex>` — 사전순 = 생성순. |
| `sessionId` | string | **v2** | 이 측정이 속한 세션. 3B 양손 대비용. 없으면 `id` 로 채움. |
| `appVersion` | string | **v2** | 이 프로파일을 만든 앱 버전(package.json). 마이그레이션 시 `"unknown"`. |
| `createdAt` | string (ISO 8601) | v1 | 측정 시각. |
| `pointerType` | `"mouse" \| "touch" \| "pen"` | v1 | Pointer Events 의 `pointerType`. |
| `hand` | `"right" \| "left"` | v1 | 측정에 쓴 손. |
| `mode` | `"quick" \| "precise"` | v1 | 측정 종류. 3A 는 `quick` 만. |
| `calibrated` | boolean | v1 | 화면 물리 보정 여부. 3A 는 항상 false (SC 는 3B). |
| `viewport` | object | v1 | `{ w, h, dpr, pxPerMm }`. `pxPerMm` 은 미보정이면 `null`. |
| `conditions` | array | v1 | 조건별 원시 탭. 아래 참조. |
| `fitts` | object | v1 | `{ a, b, r2 }` — `MT = a + b·ID` 최소제곱 적합. **a, b 는 초 / 초·bit⁻¹** (엔진 단위, 표시 직전 ×1000). |
| `throughput` | number | v1 | 유효 처리율 (bits/s). ISO `mean(IDe/MT)`. |
| `we` | number | **v2** | 유효 너비 We (CSS px). 정의 = 전 조건 축투영 오차 pooled 표본SD × 4.133. |
| `weSource` | `"measured" \| "nominal-fallback"` | **v2** | We 를 실측했는지, 표본 부족으로 명목 너비로 폴백했는지. |
| `errorRate` | number | v1 | **놓친 타깃 수 / 전체 타깃 수** (탭 수 아님, brief-3A P0-4). 0–1. |
| `consistencySD` | number | v1 | 조건 내 MT 표준편차의 평균 (초). |
| `asymmetry` | number \| null | v1 | (오른손 TP − 왼손 TP) / 평균. 정밀 측정에서만, 아니면 `null` (3B). |

## `conditions[]`

| 필드 | 타입 | 도입 | 의미 |
|---|---|---|---|
| `A` | number | v1 | 명목 진폭(조건 설계값), CSS px. |
| `displayedA` | number | **v2** | 화면에 실제로 그려진 진폭 (뷰포트 클램프 후). |
| `Ae` | number | **v2** | 측정된 실제 이동 거리 평균 (연속 착지점 간 거리). ISO 9241-411 은 이 값을 쓴다. |
| `W` | number | v1 | 타깃 너비, CSS px. |
| `ID` | number | v1 | `log2(A / W + 1)` (bits). 재계산 가능. |
| `taps[]` | array | v1 | 아래 참조. **타깃당 1개** (첫 press = 엔드포인트, brief-3A P0-4). |

### `conditions[].taps[]`

| 필드 | 타입 | 도입 | 의미 |
|---|---|---|---|
| `mt` | number | v1 | 이동시간(초). 직전 타깃의 첫 press → 이번 타깃의 첫 press (press→press). |
| `dx`, `dy` | number | v1 | 타깃 중심 기준 착지 오차 (CSS px). 카드 시각화·디버그용. |
| `devAxis` | number | **v2** | 접근 축(직전 타깃 → 이번 타깃)에 투영한 1차원 오차. **유효 너비 계산은 이 값을 쓴다** (brief-3A P0-1). |
| `devOrtho` | number | **v2** | 접근 축에 직교하는(접선) 오차. |
| `error` | boolean | v1 | 이 타깃의 **첫 탭**이 타깃 밖에 떨어졌는지. |

첫 타깃(직전 타깃 없음)은 워밍업이라 분석에서 제외되며 `devAxis = dx, devOrtho = dy` 로 둔다.

## 마이그레이션

| 단계 | 처리 |
|---|---|
| v0 → v1 | 버전 필드 없는 초기 데이터에 기본값 채움. |
| v1 → v2 | `sessionId`(= `id`), `appVersion`(= `"unknown"`), `conditions[].displayedA/Ae`(= `A`), `taps[].devAxis/devOrtho`(= `dx`/`dy` 폴백), `we`/`weSource`(저장된 taps 로 재계산 시도, 표본 부족 시 `nominal-fallback`). |

## 호환성 규칙

- 알 수 없는 최상위 필드는 보존한다.
- `schema` 가 현재 앱보다 높으면 가져오기를 거부하고 안내한다(`FutureSchemaError`).
- 모든 `localStorage` 접근은 `try/catch`. 실패해도 세션 메모리로 동작 + 배지.
- 배열 상한 20 (초과 시 가장 오래된 것 삭제). 쿼터 초과 시 오래된 것 삭제 후 1회 재시도.
- 서버 전송 일절 없음.
