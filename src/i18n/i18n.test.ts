import { afterEach, describe, expect, it } from "vitest";
import { ko } from "./ko";
import { en } from "./en";
import { setLocale, t } from "./index";

afterEach(() => setLocale("ko"));

describe("i18n 카탈로그", () => {
  it("en 은 ko 와 정확히 같은 키 집합을 가진다", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
  });

  it("모든 ko 값은 비어있지 않다", () => {
    for (const [key, value] of Object.entries(ko)) {
      expect(value, key).not.toBe("");
    }
  });
});

describe("t()", () => {
  it("파라미터 치환", () => {
    expect(t("measure.conditionProgress", { current: 2, total: 5 })).toBe("조건 2 / 5");
  });

  it("빈 en 값은 ko 로 폴백", () => {
    setLocale("en");
    expect(t("home.start")).toBe(ko["home.start"]);
  });

  it("알 수 없는 파라미터는 원형 유지", () => {
    expect(t("result.regression", { a: "0.2" })).toBe("MT = 0.2 + {b}·ID");
  });
});
