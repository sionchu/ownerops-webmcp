import { NextRequest, NextResponse } from "next/server";
import { isMarketId } from "@/market/profiles";
import { loadCachedCommodityReferences } from "@/server/reference-repository";
import { isSupabaseConfigured } from "@/server/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const market = request.nextUrl.searchParams.get("market");
  if (!isMarketId(market)) {
    return NextResponse.json({ error: "Unsupported or missing market." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      source: "seed-fallback",
      referenceOrigin: "deterministic-seed",
      databaseConfigured: false,
      references: [],
    });
  }
  try {
    const references = await loadCachedCommodityReferences(market);
    if (references.length === 0) {
      return NextResponse.json({
        source: "seed-fallback",
        referenceOrigin: "deterministic-seed",
        databaseConfigured: true,
        databaseCacheEmpty: true,
        references: [],
      });
    }
    const benchmarkOnly = references.every((reference) => reference.provider === "fnb-master-2026");
    return NextResponse.json({
      source: benchmarkOnly ? "database-benchmark-cache" : "database-provider-cache",
      referenceOrigin: benchmarkOnly ? "benchmark-template" : "provider-cache",
      databaseConfigured: true,
      references,
    });
  } catch (error) {
    console.error("OwnerOps reference cache read failed", error);
    return NextResponse.json({
      source: "seed-fallback",
      referenceOrigin: "deterministic-seed",
      databaseConfigured: true,
      degraded: true,
      references: [],
    });
  }
}
