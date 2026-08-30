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
