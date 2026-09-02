import { describe, expect, it } from "vitest";
import { explainResult } from "./rules";

const base = {
  fit: { a: 0.2, b: 0.1, r2: 0.95 },
  errorRate: 0.03,
  weSource: "measured" as const,
  confident: true,
};

describe("explainResult — 규칙 기반 해설 (주장의 원천)", () => {
  it("신뢰도 게이트 미통과 → lowConfidence 만", () => {
    expect(explainResult({ ...base, confident: false })).toEqual([{ key: "rules.lowConfidence" }]);
  });

  it("가파른 기울기 → steepSlope (ms 로 환산한 b 파라미터)", () => {
    const claims = explainResult({ ...base, fit: { a: 0.18, b: 0.15, r2: 0.98 } });
    expect(claims[0]).toEqual({ key: "rules.steepSlope", params: { b: 150 } });
  });

  it("완만한 기울기 → shallowSlope", () => {
    const claims = explainResult({ ...base, fit: { a: 0.2, b: 0.05, r2: 0.9 } });
    expect(claims[0]).toEqual({ key: "rules.shallowSlope" });
  });

  it("오류율 높으면 highError, 낮으면 lowError", () => {
    expect(explainResult({ ...base, errorRate: 0.2 })[1]).toEqual({
      key: "rules.highError",
      params: { rate: 20 },
    });
    expect(explainResult({ ...base, errorRate: 0.02 })[1]).toEqual({
      key: "rules.lowError",
      params: { accuracy: 98 },
    });
  });

  it("nominal-fallback 이면 unstable 주장을 추가", () => {
    const keys = explainResult({ ...base, weSource: "nominal-fallback" }).map((c) => c.key);
    expect(keys).toContain("rules.unstable");
  });

  it("항상 baseline 주장으로 끝난다", () => {
    const claims = explainResult(base);
    expect(claims[claims.length - 1]).toEqual({ key: "rules.baseline" });
  });
});
