import { describe, expect, it } from "vitest";
import { calculateUsableUnitCost, parsePriceNumber } from "@/cost-data/model";
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
    const square = COST_DATA_SOURCES.find((source) => source.id === "square-mcp");
    expect(square?.kind).toBe("merchant-api");
    expect(square?.automation).toBe("merchant");
  });

  it("calculates usable unit cost after edible-yield loss", () => {
    expect(calculateUsableUnitCost(30_000, 1_000, 0.8)).toBe(37.5);
    expect(calculateUsableUnitCost(12, 1_000)).toBe(0.012);
  });

  it("rejects impossible cost inputs", () => {
    expect(() => calculateUsableUnitCost(-1, 1_000, 0.8)).toThrow();
    expect(() => calculateUsableUnitCost(1_000, 0, 0.8)).toThrow();
    expect(() => calculateUsableUnitCost(1_000, 1_000, 0)).toThrow();
    expect(() => calculateUsableUnitCost(1_000, 1_000, 1.1)).toThrow();
  });

  it("parses common source price strings without inventing missing values", () => {
    expect(parsePriceNumber("59,000")).toBe(59_000);
    expect(parsePriceNumber(" 27.41 ")).toBe(27.41);
    expect(parsePriceNumber("-")).toBeNull();
    expect(parsePriceNumber("N/A")).toBeNull();
    expect(parsePriceNumber(undefined)).toBeNull();
  });
});
