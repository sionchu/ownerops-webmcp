import type { CurrencyCode, InventoryUnit, MarketId, ReferenceFreshness, ReferenceObservation } from "@/domain/model";

export type CostDataSourceId =
  | "kamis"
  | "estat-retail-price"
  | "usda-mmn"
  | "eurostat"
  | "mercamadrid"
  | "shanghai-price-monitor"
  | "open-prices"
  | "square";

export type CostDataSourceKind = "official-api" | "official-download" | "official-page" | "crowdsourced-api" | "merchant-api";
export type CostDataAutomation = "direct" | "configured" | "download" | "document" | "merchant";
export type CostDataConfidence = "official" | "merchant" | "crowdsourced" | "derived";
export type PriceLevel = "retail" | "wholesale" | "merchant" | "index";
export type PriceConfidence = "high" | "medium" | "low";

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

/** Tier 1: immutable source evidence. */
export type RawPriceSnapshot<TPayload = unknown> = {
  schemaVersion: 1;
  sourceId: CostDataSourceId;
  markets: MarketId[];
  fetchedAt: string;
  status: "ok" | "skipped" | "failed";
  requestUrl: string | null;
  payload: TPayload | null;
  reason?: string | null;
};

/** Tier 2: one comparable price/quantity/unit/currency observation. */
export type PriceObservation = {
  id?: string;
  rawObservationId?: string;
  sourceId: CostDataSourceId;
  market: MarketId;
  observedAt: string;
  fetchedAt: string;
  productLabel: string;
  referenceKey: string;
  canonicalIngredientId?: string;
  geography?: string;
  price: number;
  currency: CurrencyCode;
  purchaseQuantity: number;
  purchaseUnit: InventoryUnit;
  baseUnit: InventoryUnit;
  pricePerBaseUnit: number;
  priceLevel: PriceLevel;
  sourceRecordId?: string;
  sourceUrl: string;
  confidence: PriceConfidence;
  freshness: ReferenceFreshness;
  metadata?: Record<string, unknown>;
};

/** Tier 3: usable reference cost after a specific procurement yield is applied. */
export type EffectiveIngredientPrice = PriceObservation & {
  canonicalIngredientId: string;
  procurementForm: string;
  edibleYield: number;
  usableUnitCost: number;
};

const UNIT_FAMILY: Record<InventoryUnit, "mass" | "volume" | "count" | "packaging"> = {
  g: "mass",
  kg: "mass",
  ml: "volume",
  l: "volume",
  ea: "count",
  pack: "packaging",
  box: "packaging",
};

const TO_BASE: Partial<Record<InventoryUnit, number>> = {
  g: 0.001,
  kg: 1,
  ml: 0.001,
  l: 1,
  ea: 1,
  pack: 1,
  box: 1,
};

export function parsePriceNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll(",", "");
  if (normalized === "" || normalized === "-" || normalized.toLowerCase() === "n/a") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function convertQuantity(quantity: number, from: InventoryUnit, to: InventoryUnit): number {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Quantity must be a non-negative finite number.");
  if (from === to) return quantity;
  if (UNIT_FAMILY[from] !== UNIT_FAMILY[to]) throw new Error(`Cannot convert ${from} to unrelated unit ${to}.`);
  if (UNIT_FAMILY[from] === "packaging") throw new Error(`Packaging units ${from} and ${to} require an explicit package-size mapping.`);
  const fromFactor = TO_BASE[from];
  const toFactor = TO_BASE[to];
  if (!fromFactor || !toFactor) throw new Error(`Unsupported unit conversion ${from} → ${to}.`);
  return quantity * fromFactor / toFactor;
}

export function normalizePrice(input: Omit<PriceObservation, "pricePerBaseUnit">): PriceObservation {
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Price must be a finite non-negative number.");
  if (!Number.isFinite(input.purchaseQuantity) || input.purchaseQuantity <= 0) throw new Error("Purchase quantity must be greater than zero.");
  const normalizedQuantity = convertQuantity(input.purchaseQuantity, input.purchaseUnit, input.baseUnit);
  if (normalizedQuantity <= 0) throw new Error("Normalized quantity must be greater than zero.");
  return { ...input, pricePerBaseUnit: input.price / normalizedQuantity };
}

export function calculateUsableUnitCost(pricePerBaseUnit: number, edibleYield = 1): number {
  if (!Number.isFinite(pricePerBaseUnit) || pricePerBaseUnit < 0) throw new Error("Unit price must be a finite non-negative number.");
  if (!Number.isFinite(edibleYield) || edibleYield <= 0 || edibleYield > 1) throw new Error("Edible yield must be greater than 0 and at most 1.");
  return pricePerBaseUnit / edibleYield;
}

export function toEffectiveIngredientPrice(
  observation: PriceObservation,
  canonicalIngredientId: string,
  procurementForm: string,
  edibleYield: number,
): EffectiveIngredientPrice {
  if (canonicalIngredientId.trim() === "") throw new Error("Canonical ingredient id is required.");
  return {
    ...observation,
    canonicalIngredientId,
    procurementForm,
    edibleYield,
    usableUnitCost: calculateUsableUnitCost(observation.pricePerBaseUnit, edibleYield),
  };
}

export function normalizedToReferenceObservation(observation: PriceObservation): ReferenceObservation {
  return {
    id: observation.id ?? `reference-${observation.sourceId}-${observation.market}-${observation.referenceKey}-${observation.observedAt}`,
    kind: "commodity_price",
    provider: observation.sourceId,
    referenceKey: observation.referenceKey,
    geography: observation.geography ?? observation.market,
    observedAt: observation.observedAt,
    fetchedAt: observation.fetchedAt,
    value: observation.pricePerBaseUnit,
    unit: observation.baseUnit,
    currency: observation.currency,
    sourceUrl: observation.sourceUrl,
    freshness: observation.freshness,
  };
}
