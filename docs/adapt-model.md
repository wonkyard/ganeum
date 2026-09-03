# 적응 모델 노트 (adapt-model)

가늠의 "화면을 당신에게 맞춘다" 단계가 쓰는 수식·상수·프리셋 출처·한계를 한곳에 모은다.
심사위원용 참고 문서이자 S6 교육 페이지의 초안이다. 구현: `src/adapt/`.

이 문서가 다루는 범위는 **모델 core** 뿐이다 (brief-3B-a §2). 적응 UI(S4 모프 슬라이더,
키패드 샘플, "왜?" 해설)와 프리셋 보간·"나" 스냅은 3B-b 에서 붙인다.

---

## 1. 무엇을 계산하나

측정 단계에서 사용자의 **유효 너비 We** (CSS px)를 이미 구해 뒀다 (3A, `src/core/throughput.ts`).
적응 단계는 그 하나의 숫자에서 컨트롤의 **권장 히트 크기 W\*** 와 **권장 인접 간격**을 낸다.

목표 지표는 하나로 고정한다: **축별(1차원) 예측 오류율 ≤ 4%.**

> 조건 기하(측정 화면의 타깃 A·W)는 여전히 뷰포트 CSS px 에서만 파생한다. 화면 보정은
> 표시·보고(px ↔ mm)에만 영향을 준다 (brief-3A §8 C3). 보정/미보정 세션이 비교 가능해야
> 하기 때문이다.

---

## 2. 수식 (닫힌 식 — 탐색 루프 아님)

```
σ        = We / 4.133                      # 4.133 = √(2πe), Welford 엔트로피 등가 너비
W*_1d    = 2σ · Φ⁻¹(0.98) = 4.1075 · σ     # 축별 1D 예측 오류율 ≤ 4%
W*_2d    = σ · √(−2·ln 0.04) = 2.537 · σ   # 2D 원형 컨트롤(Rayleigh), 오류율 4% — 표시 전용

floor    = max(24, 44) CSS px  (+ 보정 시 9mm · pxPerMm)
ceil     = min( 뷰포트_최소변 · 0.25,  보정 시 25mm · pxPerMm, 그 외 +∞ )
W*       = clamp( max(W*_1d, floor), floor, ceil )
floored  = ( max(W*_1d, floor) == floor )     # 바닥값이 결정 → "나 위치에서 변화 없음"
clamped  = ( max(W*_1d, floor) >  ceil  )     # 상한 초과 → "측정 매우 불안정"

gap      = max( 8,  24 − W*,  W* · 0.35 )     # ADJACENCY_GAP_RATIO = 0.35 (휴리스틱)
```

예측 이동시간은 **별도로 표시되는 값**이다. a·b·A_c 는 W\* 산정에 들어가지 않는다.

```
predMT(W) = a + b · log2(A_c / W + 1)          # A_c = 그 컨트롤의 전형적 이동 거리 (px)
```

- `predictedMtDefault` = `predMT(We)` — 현재 유효 크기에서의 예상 이동시간
- `predictedMtAdapted` = `predMT(W*)` — 권장 크기에서의 예상 이동시간

### 왜 1D 기준인가 (정직성 수치)

W\*_1d 크기에서 실제 2D 오류율은 대략

```
exp( −(W*_1d / 2)² / (2σ²) )  ≈  12%
```

즉 1D 기준으로 잡은 크기는 2D 원형 타깃에서는 더 헐겁다. 이 모델은 **최적해가 아니라
방어 가능한 휴리스틱**이다. UI 의 "왜?" 해설은 1D 기준값과 2D Rayleigh 수치(`W*_2d`)를
나란히 보여준다 (3B-b).

### Φ⁻¹ 근사

`Φ⁻¹`(표준정규 역CDF)는 런타임 의존성 0 을 지키려고 Acklam(2003) 유리함수 근사로 직접
구현했다 (`src/adapt/inv-norm.ts`). 정의역 전체에서 절대오차 ~1.15e-9 — 브리프가 요구한
1e-4 를 크게 밑돈다. 상수 `Φ⁻¹(0.98) = 2.05375` 는 테스트로 고정.

---

## 3. 상수 (모두 `src/adapt/sizing.ts` 에 이름 있는 상수)

| 상수 | 값 | 의미 · 출처 |
|---|---|---|
| `WELFORD_ENTROPY_FACTOR` | 4.133 | √(2πe). Welford 엔트로피 등가 너비. ~3.9% 오류 기준과 0.6% 내 일치 (Soukoreff & MacKenzie 2004) |
| `WSTAR_1D_PER_SIGMA` | 4.1075 | 2·Φ⁻¹(0.98). 축별 1D 예측 오류율 ≤ 4% |
| `WSTAR_2D_PER_SIGMA` | 2.537 | √(−2·ln 0.04). Rayleigh, 2D 원형 컨트롤 오류율 4% |
| `ADJACENCY_GAP_RATIO` | 0.35 | 인접 오터치 방지 휴리스틱 (파생 주장 없음) |
| `WCAG_MIN_PX` | 24 | WCAG 2.5.8 최소 타깃 |
| `PLATFORM_MIN_PX` | 44 | 플랫폼 권장 최소 터치 타깃 |
| `CAL_FLOOR_MM` / `CAL_CEIL_MM` | 9 / 25 | 보정 시 물리 바닥값·상한 (mm) |
| `VIEWPORT_CEIL_RATIO` | 0.25 | 미보정 시 상한 = 뷰포트 최소변 × 이 값 |
| `DEFAULT_PX_PER_MM` | 3.8 | 미보정 mm→px 환산 기본값 (≈ 96.5 dpi). "미보정" 배지와 함께 |
| `DPR_MISMATCH_TOLERANCE` | 0.05 | `devicePixelRatio` 상대오차가 이보다 크면 재보정 권유 (브라우저 줌 오차는 무시) |

---

## 4. 인구 프리셋 (`src/adapt/presets.ts`)

Shannon 형 `MT = a + b·log2(A/W + 1)`. 값은 문헌(ms)을 **SI(초)로 변환**했다.
`endpointSdMm` 은 화면 보정과 무관한 명목 착지 산포다.

| id | a (s) | b (s/bit) | endpointSdMm | estimated | 출처 |
|---|---|---|---|---|---|
| young | −0.025 | 0.224 | 1.8 | false | Hertzum et al. 2010 |
| elderly | −0.071 | 0.333 | 3.8 | false | Hertzum et al. 2010 |
| tremor | −0.071 | 0.45 | 7.0 | **true** | 추정: elderly b × 1.35 (Keates & Trewin 2005 정성 근거) |

인용 문자열은 번역 대상이 아니므로 i18n 이 아니라 `src/adapt/citations.ts` 상수에 둔다.
라벨만 i18n 키(`adapt.preset.*`).

- **"나" 프리셋은 여기 없다** — 3B-b 에서 측정값으로 주입한다.
- 미보정 세션은 `endpointSdMm` 을 `DEFAULT_PX_PER_MM` 로 px 환산하고 "미보정" 배지를 붙인다.

---

## 5. 퇴화 입력 처리

| 입력 | 동작 |
|---|---|
| `we <= 0` (weSource="nominal-fallback") | `sizing()` 이 `null` 반환 → 호출부가 "측정 불안정" 렌더 |
| `b <= 0` | 막지 않는다. 예측 이동시간은 계산하되 3A 신뢰도 게이트(`SessionOk.confident`, `r² < 0.7 ‖ b ≤ 0`)가 단정 문구를 이미 억제 |
| `acPx <= 0` | `log2(0/W + 1) = 0` → `predMT = a`. NaN 아님 |
| 작은 뷰포트 + 큰 보정 바닥값 (`floor > ceil`) | `clamp` 이 `ceil` 로 수렴. `floored`·`clamped` 가 동시에 참일 수 있음 |

---

## 6. 한계

- 프리셋은 **데스크톱 마우스** 문헌이다. 터치스크린은 젊은 층에서 throughput 이 더 높고
  고령층은 비슷하거나 약간 낮다 — 현재는 보정하지 않는다.
- 손떨림 프리셋의 (a, b)는 발표된 Fitts 회귀가 아니라 방어 가능한 추정치다.
  파킨슨 아형(진전 우세 vs 무동-강직) 구분도 하지 않는다.
- 오류율 모델은 엔드포인트 분포를 정규(1D)/Rayleigh(2D)로 가정한다. 실제 분포는
  치우쳐 있을 수 있다.
- `A_c`(전형적 이동 거리)는 레이아웃에서 추정하는 값이고, 예측 이동시간의 정확도는
  그 추정에 민감하다. 예측 이동시간은 방향 감각용 표시 값이지 약속이 아니다.
- 이 모델은 최적화가 아니라 휴리스틱이다. 프로덕션 배포 전에는 코호트별 사용자 연구
  (코호트당 최소 n=10)로 검증·보정해야 한다.

---

## 참고문헌

- Hertzum, M., Andersen, A., Andersen, V., & Hansen, K. L. (2010). How Age Affects Pointing with Mouse and Touchpad. *International Journal of Human-Computer Interaction*, 26(8), 703–734.
- Soukoreff, R. W., & MacKenzie, I. S. (2004). Towards a standard for pointing device evaluation. *International Journal of Human-Computer Studies*, 61(6), 751–789.
- Keates, S., & Trewin, S. (2005). Effect of Age and Parkinson's Disease on Cursor Positioning Using a Mouse. *Proceedings of ASSETS '05*, 68–75.
- Acklam, P. J. (2003). An algorithm for computing the inverse normal cumulative distribution function.
