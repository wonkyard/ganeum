# 프로파일 JSON 포맷 — 안정 계약 v1

가늠이 `localStorage` 에 저장하고, 사용자가 내보내기/가져오기 하는 프로파일의 형태.
이 문서는 **안정 계약**이다 — v1 필드의 의미는 바뀌지 않는다. 형태가 바뀌면
`schema` 를 올리고 `src/core/migrate.ts` 에 업그레이드 단계를 추가한다.

## 최상위

| 필드 | 타입 | 의미 |
|---|---|---|
| `schema` | `1` | 스키마 버전. 없으면 v0 으로 간주하고 마이그레이션한다. |
| `id` | string | 프로파일 ID. `<base36 ms>-<8 hex>` — 사전순 = 생성순. |
| `createdAt` | string (ISO 8601) | 측정 시각. |
| `pointerType` | `"mouse" \| "touch" \| "pen"` | Pointer Events 의 `pointerType`. |
| `hand` | `"right" \| "left"` | 측정에 쓴 손. |
| `mode` | `"quick" \| "precise"` | 측정 종류. |
| `calibrated` | boolean | 화면 물리 보정 여부. false 면 절대 mm 수치는 "미보정". |
| `viewport` | object | `{ w, h, dpr, pxPerMm }`. `pxPerMm` 은 미보정이면 `null`. |
| `conditions` | array | 조건별 원시 탭. 아래 참조. |
| `fitts` | object | `{ a, b, r2 }` — `MT = a + b·ID` 최소제곱 적합. |
| `throughput` | number | 유효 처리율 (bits/s). |
| `errorRate` | number | 타깃 밖 탭 비율 (0–1). |
| `consistencySD` | number | 조건 내 MT 표준편차의 평균 (s). |
| `asymmetry` | number \| null | (오른손 TP − 왼손 TP) / 평균. 정밀 측정에서만, 아니면 `null`. |

## `conditions[]`

| 필드 | 타입 | 의미 |
|---|---|---|
| `A` | number | 진폭(이동 거리), px. |
| `W` | number | 타깃 너비, px. |
| `ID` | number | `log2(A / W + 1)` (bits). 저장 시 채우지만 재계산 가능. |
| `taps[]` | array | `{ mt, dx, dy, error }` — `mt` 초 단위 이동시간, `dx/dy` 타깃 중심 기준 착지 오차 px, `error` 타깃 밖 여부. |

## 호환성 규칙

- 알 수 없는 최상위 필드는 보존한다(미래 버전의 데이터를 깨지 않기 위해).
- `schema` 가 현재 앱보다 높으면 가져오기를 거부하고 안내한다(`FutureSchemaError`).
- 모든 `localStorage` 접근은 `try/catch` 로 감싸고, 실패해도 세션 메모리로 동작한다.
