import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/fixtures";
import { getDailyBrief } from "@/domain/store-ops";
import { getOperatingBriefCopy, localizeDailyBriefItem } from "@/i18n/operating-brief";

describe("Operating Brief localization", () => {
  it("uses Korean shell labels for the Korean locale", () => {
    const copy = getOperatingBriefCopy("ko");
    expect(copy.eyebrow).toBe("OwnerOps · 운영 브리프");
    expect(copy.metrics.sales).toBe("매출");
    expect(copy.metrics.food).toBe("식재료비");
    expect(copy.metrics.weeklyBep).toBe("주간 손익분기 매출");
    expect(copy.domains.stock).toBe("재고");
    expect(copy.severities.urgent).toBe("긴급");
    expect(copy.severities.attention).toBe("확인 필요");
    expect(copy.analysis).toMatchObject({
      title: "재고 · 원가 분석",
      menu: "메뉴 원가",
      inventory: "재고 · 매입",
      sellingPrice: "판매가",
      foodCost: "식재료 원가",
      foodCostRatio: "원가율",
      target: "목표",
      aboveTarget: "목표 초과",
      foodCostOnlyMargin: "식재료비 차감 마진",
      currentInventory: "현재 재고",
      parLevel: "적정재고",
      daysOfCover: "재고 커버",
      reorderRecommendation: "발주 권고",
      actualPurchaseUnitCost: "실제 매입단가",
      marketReference: "시장 기준",
      versusReference: "기준 대비",
      unitIssue: "단위 확인 필요",
    });
  });

  it("localizes diner Daily Brief copy instead of leaking English UI sentences", () => {
    const state = createDemoState("diner", "kr-seoul");
    const localized = getDailyBrief(state, 3).map((item) => localizeDailyBriefItem("ko", state, item));
    const text = localized.map((item) => `${item.domain} ${item.severity} ${item.title} ${item.evidence} ${item.estimatedImpact ?? ""}`).join("\n");

    expect(text).toContain("재고");
    expect(text).not.toContain("needs attention");
    expect(text).not.toContain("waste increased");
    expect(text).not.toContain("Food + labor cost needs review");
    expect(text).not.toContain("Weekly break-even sales");
  });
});
