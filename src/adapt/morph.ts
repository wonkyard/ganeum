/**
 * 모프 슬라이더 축 — 인구 프리셋 + 측정된 "나" 를 하나의 We(CSS px) 축에 놓고,
 * 정규화 슬라이더 위치 `t ∈ [0, 1]` 에서 `(a, b, We)` 를 선형 보간한다 (brief-3B-b §1).
 *
 * 왜 We 축인가: 슬라이더가 훑는 물리량은 "손의 유효 너비"(착지 산포)다. 프리셋의
 * 명목 산포 `endpointSdMm` 를 `We = 4.133·SD` 로 환산하면(px 는 보정값 있으면 그걸로,
 * 없으면 `DEFAULT_PX_PER_MM`) 축상 순서가 자연히 young < elderly < tremor 가 된다.
 *
 * "나" 지점은 이번 세션의 측정값(`SessionOk.we`)이다. 축상 위치는 브래킷하는 두
 * 프리셋 사이 선형 보간, 양 끝 밖이면 클램프한다. `weSource="nominal-fallback"`
 * (착지 산포를 못 구해 명목 너비로 폴백한 세션)이면 "나" 를 비활성화한다 —
 * 내 프로파일로는 맞출 수 없고, 프리셋만으로 슬라이더가 동작한다.
 *
 * 순수 함수만. DOM 을 모른다. UI(MorphSlider/S4)는 이 결과를 그린다.
 */
import { ADAPT_PRESETS, endpointSdPx, type AdaptPreset } from "./presets";
import { WELFORD_ENTROPY_FACTOR } from "./sizing";
import type { CitationKey } from "./citations";

/** We 의 출처 — `src/core/types.ts` 와 같은 의미. 여기서 재선언해 core 에 의존하지 않는다. */
export type MorphWeSource = "measured" | "nominal-fallback";

/** 축 위의 한 지점 (프리셋 3종 + 선택적 "나"). */
export interface MorphStop {
  id: "young" | "elderly" | "tremor" | "me";
  /** 라벨 i18n 키 (인용은 `citations.ts`). */
  labelKey: string;
  /** 절편 a (초). */
  a: number;
  /** 기울기 b (초/bit). */
  b: number;
  /** 유효 너비 We (CSS px) — 축 좌표. */
  we: number;
  /** 축상 정규화 위치 [0, 1]. */
  pos: number;
  /** 발표된 Fitts 회귀가 아니라 방어 가능한 추정치인가. */
  estimated: boolean;
  /** 프리셋이면 인용 키, "나" 면 null. */
  citationKey: CitationKey | null;
}

/** `morphAt(t)` 결과 — 슬라이더 위치에서 보간된 파라미터. */
export interface MorphPoint {
  a: number;
  b: number;
  we: number;
  /** 가까운 스톱의 라벨 i18n 키. */
  labelKey: string;
  /** tremor 쪽 세그먼트에 걸쳐 추정 구간인가. */
  estimated: boolean;
}

/** 측정된 "나" 입력 — 3A 세션 분석 결과에서 온다. */
export interface MorphMeInput {
  a: number;
  b: number;
  we: number;
  weSource: MorphWeSource;
  /** 3A 신뢰도 게이트 (`r² ≥ 0.7 && b > 0`). */
  confident: boolean;
}

export interface MorphAxisInput {
  /** 측정된 "나". 없거나(마이그레이션 프로파일 등) 퇴화면 "나" 비활성. */
  me: MorphMeInput | null;
  /** 화면 보정값 (CSS px per mm). 없으면 프리셋 mm→px 는 문서화된 기본값. */
  calibrationPxPerMm: number | null;
}

export interface MorphAxis {
  /** 축상 위치 오름차순 정렬. 프리셋 3개 + (활성이면) "나". */
  stops: MorphStop[];
  /** 축 양 끝의 We (CSS px) — 항상 프리셋 min/max. */
  weMin: number;
  weMax: number;
  /** "나" 가 비활성인가 (`nominal-fallback` 또는 `we ≤ 0`). */
  meDisabled: boolean;
  /** "나" 의 축상 정규화 위치 [0, 1] (클램프됨). 비활성이면 null. */
  meAt: number | null;
  /** "나" 의 신뢰도 (게이트 미통과면 UI 가 부드러운 주의 문구). null = "나" 없음. */
  meConfident: boolean | null;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/** 프리셋의 명목 산포(mm)를 유효 너비 We(CSS px)로. `We = 4.133·SD`. */
export function presetWe(preset: AdaptPreset, calibrationPxPerMm: number | null): number {
  return endpointSdPx(preset, calibrationPxPerMm) * WELFORD_ENTROPY_FACTOR;
}

/**
 * 프리셋 + 측정된 "나" 로 모프 슬라이더 축을 구성한다.
 *
 * 축 양 끝(`weMin`/`weMax`)은 **항상 프리셋의 min/max** 다 — "나" 가 밖으로 나가면
 * 위치만 클램프하고 축은 늘리지 않는다(비교 기준이 흔들리면 안 되므로).
 */
export function buildMorphAxis(input: MorphAxisInput): MorphAxis {
  const cal = input.calibrationPxPerMm;

  const presetStops: MorphStop[] = ADAPT_PRESETS.map((p) => ({
    id: p.id,
    labelKey: p.labelKey,
    a: p.a,
    b: p.b,
    we: presetWe(p, cal),
    pos: 0, // 아래에서 채움
    estimated: p.estimated,
    citationKey: p.citationKey,
  }));

  const weValues = presetStops.map((s) => s.we);
  const weMin = Math.min(...weValues);
  const weMax = Math.max(...weValues);
  const span = weMax - weMin || 1;
  const toPos = (we: number): number => clamp((we - weMin) / span, 0, 1);
  for (const s of presetStops) s.pos = toPos(s.we);

  const me = input.me;
  const meDisabled = !me || me.weSource === "nominal-fallback" || !(me.we > 0);

  const stops = [...presetStops];
  let meAt: number | null = null;
  let meConfident: boolean | null = null;

  if (me && !meDisabled) {
    meAt = toPos(me.we);
    meConfident = me.confident;
    stops.push({
      id: "me",
      labelKey: "adapt.preset.me",
      a: me.a,
      b: me.b,
      we: clamp(me.we, weMin, weMax),
      pos: meAt,
      estimated: false,
      citationKey: null,
    });
  } else if (me) {
    meConfident = me.confident;
  }

  stops.sort((x, y) => x.pos - y.pos || rank(x.id) - rank(y.id));

  return { stops, weMin, weMax, meDisabled, meAt, meConfident };
}

/** 동률 위치일 때 프리셋을 "나" 보다 앞에 둔다 → 축 끝점이 항상 프리셋. */
function rank(id: MorphStop["id"]): number {
  return id === "me" ? 1 : 0;
}

/**
 * 슬라이더 위치 `t ∈ [0, 1]` 에서 `(a, b, We)` 를 선형 보간한다.
 *
 * 폭이 0 인 세그먼트("나" 가 프리셋과 겹칠 때)는 건너뛴다. `t` 가 유효 세그먼트
 * 밖이면 가장 가까운 끝 스톱으로 스냅한다 → `morphAt(axis, 0)` 은 정확히 최소
 * 프리셋 값, `morphAt(axis, 1)` 은 정확히 최대 프리셋 값.
 */
export function morphAt(axis: MorphAxis, tRaw: number): MorphPoint {
  const t = clamp(Number.isFinite(tRaw) ? tRaw : 0, 0, 1);
  const stops = axis.stops;

  let seg: [MorphStop, MorphStop] | null = null;
  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i];
    const hi = stops[i + 1];
    if (hi.pos <= lo.pos) continue;
    if (t >= lo.pos - 1e-9 && t <= hi.pos + 1e-9) seg = [lo, hi];
  }

  if (!seg) {
    const s = t <= stops[0].pos ? stops[0] : stops[stops.length - 1];
    return { a: s.a, b: s.b, we: s.we, labelKey: s.labelKey, estimated: s.estimated };
  }

  const [lo, hi] = seg;
  const frac = clamp((t - lo.pos) / (hi.pos - lo.pos), 0, 1);
  return {
    a: lerp(lo.a, hi.a, frac),
    b: lerp(lo.b, hi.b, frac),
    we: lerp(lo.we, hi.we, frac),
    labelKey: frac < 0.5 ? lo.labelKey : hi.labelKey,
    estimated: lo.estimated || hi.estimated,
  };
}

/** "나" 의 축상 위치를 슬라이더 초기값으로 쓸 때: 비활성이면 elderly 위치로 폴백. */
export function initialMorphT(axis: MorphAxis): number {
  if (axis.meAt != null) return axis.meAt;
  const elderly = axis.stops.find((s) => s.id === "elderly");
  return elderly ? elderly.pos : 0.5;
}
