import { NextRequest, NextResponse } from "next/server";
import { loadPersistedStoreProjection } from "@/server/store-repository";
import { isSupabaseConfigured } from "@/server/supabase-rest";

export const dynamic = "force-dynamic";

const STORE_ID = /^[a-z0-9][a-z0-9:_-]{2,120}$/i;

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId") ?? "";
  if (!STORE_ID.test(storeId)) {
    return NextResponse.json({ error: "Invalid or missing storeId." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ source: "seed-fallback", databaseConfigured: false, projection: null });
  }
  try {
    const projection = await loadPersistedStoreProjection(storeId);
    return NextResponse.json({
      source: projection ? "database" : "seed-fallback",
      databaseConfigured: true,
      projection,
    });
  } catch (error) {
    console.error("OwnerOps persisted store read failed", error);
    return NextResponse.json({ source: "seed-fallback", databaseConfigured: true, degraded: true, projection: null });
  }
}
