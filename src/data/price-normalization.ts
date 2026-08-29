import type { CurrencyCode, InventoryUnit, MarketId, ReferenceFreshness, ReferenceObservation } from "@/domain/model";

export type ExternalPriceProviderId =
  | "kamis"
  | "estat-jp"
  | "usda-mmn"
  | "bls"
  | "fooddata-central"
  | "eurostat"
  | "mapa"
  | "china-moa"
  | "square"
  | "toast"
  | "public-web";

export type PriceConfidence = "high" | "medium" | "low";

export type RawPriceObservation = {
  id: string;
  provider: ExternalPriceProviderId;
  providerRecordId?: string;
  market: MarketId;
  ingredientKey: string;
  geography: string;
  rawItemName: string;
  rawPrice: number;
  currency: CurrencyCode;
  purchaseQuantity: number;
  purchaseUnit: InventoryUnit;
  rawUnitLabel?: string;
  observedAt: string;
  fetchedAt: string;
  sourceUrl?: string;
};

export type NormalizedPriceObservation = {
  id: string;
  rawObservationId: string;
  provider: ExternalPriceProviderId;
  market: MarketId;
  ingredientKey: string;
  geography: string;
  pricePerBaseUnit: number;
  baseUnit: InventoryUnit;
  currency: CurrencyCode;
  observedAt: string;
  fetchedAt: string;
  sourceUrl?: string;
  confidence: PriceConfidence;
  freshness: ReferenceFreshness;
  normalizationNote?: string;
};

export type EffectiveIngredientPrice = {
  ingredientKey: string;
  value: number;
  unit: InventoryUnit;
  currency: CurrencyCode;
  basis: "store_actual" | "supplier_history" | "external_reference" | "seed";
  sourceObservationId?: string;
  observedAt?: string;
  confidence: PriceConfidence;
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

export function normalizePriceObservation(
  raw: RawPriceObservation,
  baseUnit: InventoryUnit,
  options: { confidence?: PriceConfidence; freshness?: ReferenceFreshness; note?: string } = {},
): NormalizedPriceObservation {
  if (!Number.isFinite(raw.rawPrice) || raw.rawPrice < 0) throw new Error("Raw price must be a non-negative finite number.");
  if (!Number.isFinite(raw.purchaseQuantity) || raw.purchaseQuantity <= 0) throw new Error("Purchase quantity must be greater than zero.");
  const normalizedQuantity = convertQuantity(raw.purchaseQuantity, raw.purchaseUnit, baseUnit);
  if (normalizedQuantity <= 0) throw new Error("Normalized purchase quantity must be greater than zero.");

  return {
    id: `normalized-${raw.id}`,
    rawObservationId: raw.id,
    provider: raw.provider,
    market: raw.market,
    ingredientKey: raw.ingredientKey,
    geography: raw.geography,
    pricePerBaseUnit: raw.rawPrice / normalizedQuantity,
    baseUnit,
    currency: raw.currency,
    observedAt: raw.observedAt,
    fetchedAt: raw.fetchedAt,
    sourceUrl: raw.sourceUrl,
    confidence: options.confidence ?? "medium",
    freshness: options.freshness ?? "recent",
    normalizationNote: options.note,
  };
}

export function usablePricePerBaseUnit(normalized: NormalizedPriceObservation, edibleYield = 1): number {
  const yieldRate = Math.max(0.05, Math.min(1, edibleYield));
  return normalized.pricePerBaseUnit / yieldRate;
}

export function normalizedToReferenceObservation(normalized: NormalizedPriceObservation): ReferenceObservation {
  return {
    id: normalized.id,
    kind: "commodity_price",
    provider: normalized.provider,
    referenceKey: normalized.ingredientKey,
    geography: normalized.geography,
    observedAt: normalized.observedAt,
    fetchedAt: normalized.fetchedAt,
    value: normalized.pricePerBaseUnit,
    unit: normalized.baseUnit,
    currency: normalized.currency,
    sourceUrl: normalized.sourceUrl,
    freshness: normalized.freshness,
  };
}

/**
 * Costing truth prefers store/supplier evidence. Public reference is an explicit estimate only when actual cost is absent.
 */
export function resolveEffectiveIngredientPrice(input: {
  ingredientKey: string;
  unit: InventoryUnit;
  currency: CurrencyCode;
  storeActual?: { value: number; observedAt?: string } | null;
  supplierHistory?: { value: number; observedAt?: string } | null;
  external?: NormalizedPriceObservation | null;
}): EffectiveIngredientPrice | null {
  if (input.storeActual && input.storeActual.value >= 0) {
    return {
      ingredientKey: input.ingredientKey,
      value: input.storeActual.value,
      unit: input.unit,
      currency: input.currency,
      basis: "store_actual",
      observedAt: input.storeActual.observedAt,
      confidence: "high",
    };
  }

  if (input.supplierHistory && input.supplierHistory.value >= 0) {
    return {
      ingredientKey: input.ingredientKey,
      value: input.supplierHistory.value,
      unit: input.unit,
      currency: input.currency,
      basis: "supplier_history",
      observedAt: input.supplierHistory.observedAt,
      confidence: "high",
    };
  }

  if (input.external) {
    if (input.external.currency !== input.currency) return null;
    const value = input.external.baseUnit === input.unit
      ? input.external.pricePerBaseUnit
      : input.external.pricePerBaseUnit / convertQuantity(1, input.unit, input.external.baseUnit);
    return {
      ingredientKey: input.ingredientKey,
      value,
      unit: input.unit,
      currency: input.currency,
      basis: input.external.freshness === "seed" ? "seed" : "external_reference",
      sourceObservationId: input.external.id,
      observedAt: input.external.observedAt,
      confidence: input.external.confidence,
    };
  }

  return null;
}
