import type { CurrencyCode, MarketId } from "@/domain/model";

export type CostDataSourceId =
  | "kamis"
  | "estat-retail-price"
  | "usda-mmn"
  | "eurostat"
  | "mercamadrid"
  | "shanghai-price-monitor"
  | "open-prices"
  | "square-mcp";

export type CostDataSourceKind = "official-api" | "official-download" | "official-page" | "crowdsourced-api" | "merchant-api";
export type CostDataAutomation = "direct" | "configured" | "download" | "document" | "merchant";
export type CostDataConfidence = "official" | "merchant" | "crowdsourced" | "derived";
export type PriceLevel = "retail" | "wholesale" | "merchant" | "index";
export type PurchaseUnit = "g" | "kg" | "ml" | "l" | "ea" | "pack";

export type CostDataSource = {
  id: CostDataSourceId;
  label: string;
  markets: MarketId[];
  kind: CostDataSourceKind;
  automation: CostDataAutomation;
  endpoint: string;
  sourceUrl: string;
  configEnv: string[];
  notes: string;
};

export type PriceObservation = {
  sourceId: CostDataSourceId;
  market: MarketId;
  observedAt: string;
  productLabel: string;
  canonicalIngredientId?: string;
  price: number;
  currency: CurrencyCode;
  purchaseQuantity: number;
  purchaseUnit: PurchaseUnit;
  priceLevel: PriceLevel;
  locationLabel?: string;
  sourceRecordId?: string;
  sourceUrl: string;
  confidence: CostDataConfidence;
};

export function calculateUsableUnitCost(price: number, purchaseQuantity: number, edibleYield = 1): number {
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be a finite non-negative number.");
  if (!Number.isFinite(purchaseQuantity) || purchaseQuantity <= 0) throw new Error("Purchase quantity must be greater than zero.");
  if (!Number.isFinite(edibleYield) || edibleYield <= 0 || edibleYield > 1) throw new Error("Edible yield must be greater than 0 and at most 1.");
  return price / purchaseQuantity / edibleYield;
}

export function parsePriceNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll(",", "");
  if (normalized === "" || normalized === "-" || normalized.toLowerCase() === "n/a") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
