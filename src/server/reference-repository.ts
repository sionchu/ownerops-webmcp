import type { MarketId, ReferenceFreshness, ReferenceObservation } from "@/domain/model";
import { isSupabaseConfigured, supabaseSelect } from "./supabase-rest";

type LatestReferenceRow = {
  id: string;
  source_id: string;
  reference_key: string;
  market_id: MarketId;
  geography: string | null;
  price_level: string;
  original_label: string | null;
  original_currency: string;
  price_per_base_unit: number | string;
  base_unit: string;
  confidence: number | string;
  observed_at: string;
  fetched_at: string;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
};

function freshnessFor(row: LatestReferenceRow, now = Date.now()): ReferenceFreshness {
  const observed = new Date(row.observed_at).getTime();
  if (!Number.isFinite(observed)) return "stale";
  const ageHours = Math.max(0, now - observed) / 3_600_000;
  if (ageHours <= 36) return "recent";
  if (ageHours <= 24 * 7) return "cached";
  return "stale";
}

export async function loadCachedCommodityReferences(market: MarketId): Promise<ReferenceObservation[]> {
  if (!isSupabaseConfigured()) return [];
  const select = [
    "id",
    "source_id",
    "reference_key",
    "market_id",
    "geography",
    "price_level",
    "original_label",
    "original_currency",
    "price_per_base_unit",
    "base_unit",
    "confidence",
    "observed_at",
    "fetched_at",
    "source_url",
    "metadata",
  ].join(",");
  const rows = await supabaseSelect<LatestReferenceRow>(
    "oo_latest_reference_prices",
    `market_id=eq.${encodeURIComponent(market)}&select=${select}&order=observed_at.desc&limit=100`,
  );
  return rows
    .map((row) => {
      const value = Number(row.price_per_base_unit);
      if (!Number.isFinite(value)) return null;
      return {
        id: `db-${row.id}`,
        kind: "commodity_price" as const,
        provider: row.source_id,
        referenceKey: row.reference_key,
        geography: row.geography ?? market,
        observedAt: row.observed_at,
        fetchedAt: row.fetched_at,
        value,
        unit: row.base_unit,
        currency: row.original_currency as ReferenceObservation["currency"],
        sourceUrl: row.source_url ?? undefined,
        freshness: freshnessFor(row),
      } satisfies ReferenceObservation;
    })
    .filter((value): value is ReferenceObservation => value !== null);
}
