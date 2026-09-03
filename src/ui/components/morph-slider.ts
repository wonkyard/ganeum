/**
 * `MorphSlider` — S4 적응 화면의 4지점 프리셋 슬라이더 (screen-design S4 · brief-3B-b §2).
 *
 * 축 = 유효 너비 We (CSS px), 오름차순. 눈금은 축상 위치대로 배치한다
 * (일반적으로 young < elderly < tremor). 측정된 "나" 는 스냅 마커로 표시하되,
 * 퇴화 세션(`axis.meDisabled`)이면 마커를 숨긴다.
 *
 * 드래그·화살표키는 네이티브 `<input type="range">` 가 처리한다. 값이 바뀌면
 * 정규화 위치 `t ∈ [0, 1]` 를 `onChange` 로 넘긴다. 옵션 객체 + `destroy()`.
 */
import { el } from "../dom";
import { t, type MessageKey } from "../../i18n";
import { morphAt, type MorphAxis } from "../../adapt/morph";

/** 프리셋/모프 스톱의 `labelKey` 는 문자열 타입이지만 값은 항상 유효한 i18n 키다. */
const tKey = (key: string): string => t(key as MessageKey);

export interface MorphSliderOptions {
  host: HTMLElement;
  axis: MorphAxis;
  /** 시작 위치 (0..1). 기본 0.5. */
  initialT?: number;
  /** 슬라이더가 움직일 때마다 정규화 위치를 넘긴다. */
  onChange: (tValue: number) => void;
}

/** 화살표키 한 번에 축의 1% 이동. */
const STEP = 0.01;

export class MorphSlider {
  private readonly root: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly axis: MorphAxis;
  private readonly onChange: (t: number) => void;

  constructor(opts: MorphSliderOptions) {
    this.axis = opts.axis;
    this.onChange = opts.onChange;
    const start = clamp01(opts.initialT ?? 0.5);

    this.input = el("input", {
      type: "range",
      class: "morph-slider-input",
      min: 0,
      max: 1,
      step: STEP,
      value: start,
      "aria-label": t("adapt.sliderLabel"),
    }) as HTMLInputElement;
    this.syncValueText(start);

    this.input.addEventListener("input", () => {
      const v = clamp01(Number(this.input.value));
      this.syncValueText(v);
      this.onChange(v);
    });

    // 축상 위치대로 놓는 눈금 라벨.
    const ticks = el("div", { class: "morph-slider-ticks", "aria-hidden": "true" });
    for (const stop of this.axis.stops) {
      if (stop.id === "me") continue; // "나" 는 별도 마커
      ticks.append(
        el(
          "span",
          { class: "morph-slider-tick", style: `left:${(stop.pos * 100).toFixed(2)}%` },
          tKey(stop.labelKey),
        ),
      );
    }

    const track = el("div", { class: "morph-slider-track" }, this.input, ticks);

    if (this.axis.meAt != null) {
      track.append(
        el(
          "span",
          {
            class: "morph-slider-me",
            style: `left:${(this.axis.meAt * 100).toFixed(2)}%`,
          },
          t("adapt.me"),
        ),
      );
    }

    this.root = el("div", { class: "morph-slider" }, track);
    opts.host.append(this.root);
  }

  /** 현재 정규화 위치. */
  get value(): number {
    return clamp01(Number(this.input.value));
  }

  /** 프로그램적으로 위치를 옮긴다 (예: "나에게 맞춤" 버튼). onChange 도 부른다. */
  setT(tValue: number): void {
    const v = clamp01(tValue);
    this.input.value = String(v);
    this.syncValueText(v);
    this.onChange(v);
  }

  private syncValueText(v: number): void {
    // 스크린리더가 "0.42" 대신 가까운 스톱 라벨을 읽도록.
    this.input.setAttribute("aria-valuetext", tKey(morphAt(this.axis, v).labelKey));
  }

  destroy(): void {
    this.root.remove();
  }
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
}
