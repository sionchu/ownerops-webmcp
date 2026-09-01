import { describe, expect, it } from "vitest";
import { SUPPORTED_UI_LOCALES } from "@/i18n";
import { getStoreSurfaceCopy } from "@/i18n/store-surface";

describe("Store Master i18n", () => {
  it("has complete owner navigation, editing, and P&L copy for every locale", () => {
    for (const locale of SUPPORTED_UI_LOCALES) {
      const copy = getStoreSurfaceCopy(locale);
      for (const key of ["today", "schedule", "analysis", "store", "basic", "menu", "inventory", "suppliers", "costs", "edit", "review", "save", "pnl", "profit", "bep"] as const) {
        expect(copy[key], `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it("keeps the Korean operating-cost hierarchy explicit", () => {
    const copy = getStoreSurfaceCopy("ko");
    expect([copy.sales, copy.food, copy.labor, copy.variable, copy.occupancy, copy.fixed, copy.profit]).toEqual([
      "매출", "직접 식재료비", "예상 스케줄 임금", "변동 운영비", "임차비", "기타 고정비", "추정 운영이익",
    ]);
  });
});
