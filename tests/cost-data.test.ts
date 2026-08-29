import { describe, expect, it } from "vitest";
import { calculateUsableUnitCost, normalizePrice, parsePriceNumber, toEffectiveIngredientPrice } from "@/cost-data/model";
import { COST_DATA_SOURCES, getCostDataSourcesForMarket, validateCostDataSources } from "@/cost-data/sources";
import type { MarketId } from "@/domain/model";

const SUPPORTED_MARKETS: MarketId[] = ["kr-seoul", "us-nyc", "jp-tokyo", "es-madrid", "cn-shanghai"];

describe("OwnerOps F&B cost-data foundation", () => {
  it("keeps the source registry structurally valid", () => {
    expect(validateCostDataSources()).toEqual([]);
  });

  it("covers every supported market with at least one non-merchant source", () => {
    for (const market of SUPPORTED_MARKETS) {
      const sources = getCostDataSourcesForMarket(market);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some((source) => source.kind !== "merchant-api")).toBe(true);
    }
  });

  it("keeps merchant actuals separate from public market-price sources", () => {
    const square = COST_DATA_SOURCES.find((source) => source.id === "square");
    expect(square?.kind).toBe("merchant-api");
    expect(square?.automation).toBe("merchant");
  });

  it("normalizes purchase quantity before applying procurement yield", () => {
    const normalized = normalizePrice({
      sourceId: "kamis",
      market: "kr-seoul",
      observedAt: "2026-08-30T00:00:00+09:00",
      fetchedAt: "2026-08-30T05:00:00+09:00",
      productLabel: "광어",
      referenceKey: "flatfish",
      geography: "Seoul",
      price: 24_000,
      currency: "KRW",
      purchaseQuantity: 1,
      purchaseUnit: "kg",
      baseUnit: "g",
      priceLevel: "wholesale",
      sourceUrl: "https://www.kamis.or.kr/",
      confidence: "high",
      freshness: "recent",
    });
    expect(normalized.pricePerBaseUnit).toBe(24);
    expect(calculateUsableUnitCost(normalized.pricePerBaseUnit, 0.48)).toBe(50);
  });

  it("creates an effective reference with explicit procurement form", () => {
    const normalized = normalizePrice({
      sourceId: "kamis",
      market: "kr-seoul",
      observedAt: "2026-08-30T00:00:00+09:00",
      fetchedAt: "2026-08-30T05:00:00+09:00",
      productLabel: "광어",
      referenceKey: "flatfish",
      price: 24_000,
      currency: "KRW",
      purchaseQuantity: 1_000,
      purchaseUnit: "g",
      baseUnit: "g",
      priceLevel: "wholesale",
      sourceUrl: "https://www.kamis.or.kr/",
      confidence: "high",
      freshness: "recent",
    });
    const effective = toEffectiveIngredientPrice(normalized, "flatfish", "whole_raw", 0.48);
    expect(effective.usableUnitCost).toBe(50);
    expect(effective.procurementForm).toBe("whole_raw");
    expect(normalized).not.toHaveProperty("usableUnitCost");
  });

  it("rejects impossible yield inputs", () => {
    expect(() => calculateUsableUnitCost(-1, 0.8)).toThrow();
    expect(() => calculateUsableUnitCost(1, 0)).toThrow();
    expect(() => calculateUsableUnitCost(1, 1.1)).toThrow();
  });

  it("parses common source price strings without inventing missing values", () => {
    expect(parsePriceNumber("59,000")).toBe(59_000);
    expect(parsePriceNumber(" 27.41 ")).toBe(27.41);
    expect(parsePriceNumber("-")).toBeNull();
    expect(parsePriceNumber("N/A")).toBeNull();
    expect(parsePriceNumber(undefined)).toBeNull();
  });
});
