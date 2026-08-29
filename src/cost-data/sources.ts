import { isMarketId } from "@/market/profiles";
import type { MarketId } from "@/domain/model";
import rawCatalog from "./source-catalog.json";
import type { CostDataSource, CostDataSourceId } from "./model";

export const COST_DATA_SOURCES = rawCatalog as unknown as CostDataSource[];

export function getCostDataSource(id: CostDataSourceId): CostDataSource {
  const source = COST_DATA_SOURCES.find((candidate) => candidate.id === id);
  if (!source) throw new Error(`Unknown cost-data source: ${id}.`);
  return source;
}

export function getCostDataSourcesForMarket(market: MarketId): CostDataSource[] {
  return COST_DATA_SOURCES.filter((source) => source.markets.includes(market));
}

export function validateCostDataSources(sources: CostDataSource[] = COST_DATA_SOURCES): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const source of sources) {
    if (ids.has(source.id)) errors.push(`Duplicate source id: ${source.id}`);
    ids.add(source.id);

    if (!source.endpoint.startsWith("https://")) errors.push(`${source.id}: endpoint must use HTTPS.`);
    if (!source.sourceUrl.startsWith("https://")) errors.push(`${source.id}: sourceUrl must use HTTPS.`);
    if (source.markets.length === 0) errors.push(`${source.id}: at least one market is required.`);
    for (const market of source.markets) {
      if (!isMarketId(market)) errors.push(`${source.id}: unsupported market ${String(market)}.`);
    }

    for (const envName of source.configEnv) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(envName)) errors.push(`${source.id}: invalid environment variable name ${envName}.`);
    }
  }

  return errors;
}
