import { describe, expect, it } from "vitest";
import { partitionByOutlier, removeOutliers } from "./outliers";

describe("removeOutliers (중앙값 ±3·MAD)", () => {
  it("명백한 이상치를 버리고 나머지는 유지", () => {
    // [10,11,12,13,100]: median=12, MAD=median(|dev|)=median([2,1,0,1,88])=1
    // 경계 12±3 → [9,15]. 100 만 제거.
    const { kept, removed } = removeOutliers([10, 11, 12, 13, 100]);
    expect(kept).toEqual([10, 11, 12, 13]);
    expect(removed).toEqual([100]);
  });

  it("MAD=0 (값이 거의 동일) 이면 아무것도 제거하지 않음", () => {
    const { kept, removed } = removeOutliers([5, 5, 5, 9]);
    expect(kept).toEqual([5, 5, 5, 9]);
    expect(removed).toEqual([]);
  });

  it("빈 배열은 그대로", () => {
    expect(removeOutliers([])).toEqual({ kept: [], removed: [] });
  });
});

describe("partitionByOutlier", () => {
  it("숫자 키 콜백으로 객체 배열을 나눔", () => {
    const taps = [{ mt: 10 }, { mt: 11 }, { mt: 12 }, { mt: 13 }, { mt: 100 }];
    const { kept, removed } = partitionByOutlier(taps, (t) => t.mt);
    expect(kept.map((t) => t.mt)).toEqual([10, 11, 12, 13]);
    expect(removed).toEqual([{ mt: 100 }]);
  });
});
