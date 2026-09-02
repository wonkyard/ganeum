/**
 * 규칙 기반 해설 — 이 모듈이 **주장(claim)의 원천**이다 (스펙 §11 가드레일).
 * 3B 이후 로컬 LLM 백엔드가 붙어도 주장은 여기서 나오고 LLM 은 표현만 바꾼다.
 *
 * 반환은 i18n 키 + 파라미터. 렌더 레이어가 `t()` 로 문장을 만든다 → 사용자 대면
 * 리터럴이 이 파일에 하나도 없다 (brief-3A §4 i18n).
 */
import type { MessageKey } from "../i18n";

export interface RuleClaim {
  key: MessageKey;
  params?: Record<string, string | number>;
}

export interface ExplainInput {
  /** `MT = a + b·ID`, a/b 초 단위. */
  fit: { a: number; b: number; r2: number };
  errorRate: number;
  weSource: "measured" | "nominal-fallback";
  /** 신뢰도 게이트(brief-3A P0-5) 통과 여부. */
  confident: boolean;
}

/** 기울기 b(초/bit)가 이보다 크면 "가파른" 것으로 본다 (≈ 120 ms/bit). */
const STEEP_SLOPE_S = 0.12;
/** 놓친 타깃 비율이 이보다 크면 "정확도 주의". */
const HIGH_ERROR_RATE = 0.1;

export function explainResult(input: ExplainInput): RuleClaim[] {
  // 신뢰도 게이트 미통과 → 단정 문구 억제, "다시 측정" 만 제안.
  if (!input.confident) return [{ key: "rules.lowConfidence" }];

  const claims: RuleClaim[] = [];
  const slopeMs = Math.round(input.fit.b * 1000);

  claims.push(
    input.fit.b >= STEEP_SLOPE_S
      ? { key: "rules.steepSlope", params: { b: slopeMs } }
      : { key: "rules.shallowSlope" },
  );

  const errPct = Math.round(input.errorRate * 100);
  const accPct = Math.round((1 - input.errorRate) * 100);
  claims.push(
    input.errorRate >= HIGH_ERROR_RATE
      ? { key: "rules.highError", params: { rate: errPct } }
      : { key: "rules.lowError", params: { accuracy: accPct } },
  );

  if (input.weSource === "nominal-fallback") claims.push({ key: "rules.unstable" });

  claims.push({ key: "rules.baseline" });
  return claims;
}
