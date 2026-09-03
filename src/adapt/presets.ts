/**
 * 인구 프리셋 — Fitts Shannon 형 `MT = a + b·log2(A/W + 1)` 의 (a, b) 와 명목 착지 산포.
 *
 * 값은 문헌(`reports/IDEA-20260901-1455/adaptation-presets.md`)에서 가져와 **SI(초)로
 * 변환**했다(문헌은 ms). 손떨림 프리셋은 발표된 Fitts 회귀가 없어 `estimated: true`.
 *
 * `endpointSdMm` 은 화면 보정과 무관한 명목 값(mm). 미보정 세션은 문서화된 기본
 * `DEFAULT_PX_PER_MM` 으로 px 환산하고 "미보정" 배지를 함께 보인다.
 * "나"(측정값) 프리셋은 3B-b 에서 실측으로 주입되므로 여기 없다.
 */
import type { CitationKey } from "./citations";

export interface AdaptPreset {
  id: "young" | "elderly" | "tremor";
  /** i18n 키 (라벨만 번역, 인용은 `citations.ts`). */
  labelKey: string;
  /** 절편 a (초). */
  a: number;
  /** 기울기 b (초/bit). */
  b: number;
  /** 명목 엔드포인트 산포 SD (mm) — 보정 무관. */
  endpointSdMm: number;
  /** 발표된 Fitts 회귀가 아니라 방어 가능한 추정치인가(문헌 공백). */
  estimated: boolean;
  citationKey: CitationKey;
}

/**
 * 미보정 세션에서 mm → px 환산에 쓰는 문서화된 기본값(CSS px per mm).
 * 대략 96.5 dpi (≈ 3.8 px/mm) — 흔한 데스크톱 모니터의 근사. 브리프에 핀됨.
 */
export const DEFAULT_PX_PER_MM = 3.8;

export const ADAPT_PRESETS: readonly AdaptPreset[] = [
  {
    id: "young",
    labelKey: "adapt.preset.young",
    a: -0.025, // −25 ms
    b: 0.224, // 224 ms/bit
    endpointSdMm: 1.8,
    estimated: false,
    citationKey: "hertzum2010",
  },
  {
    id: "elderly",
    labelKey: "adapt.preset.elderly",
    a: -0.071, // −71 ms
    b: 0.333, // 333 ms/bit
    endpointSdMm: 3.8,
    estimated: false,
    citationKey: "hertzum2010",
  },
  {
    id: "tremor",
    labelKey: "adapt.preset.tremor",
    a: -0.071, // elderly 절편 유지
    b: 0.45, // 추정: elderly b(0.333) × 1.35 ≈ 0.45 (Keates & Trewin 2005 정성 근거)
    endpointSdMm: 7.0,
    estimated: true,
    citationKey: "keatesTrewin2005",
  },
];

/** id 로 프리셋 조회. */
export function getPreset(id: AdaptPreset["id"]): AdaptPreset {
  const preset = ADAPT_PRESETS.find((p) => p.id === id);
  if (!preset) throw new RangeError(`알 수 없는 프리셋: ${id}`);
  return preset;
}

/** 프리셋 산포(mm)를 px 로 — 보정값이 있으면 그것을, 없으면 문서화된 기본을 쓴다. */
export function endpointSdPx(preset: AdaptPreset, calibrationPxPerMm: number | null): number {
  return preset.endpointSdMm * (calibrationPxPerMm ?? DEFAULT_PX_PER_MM);
}
