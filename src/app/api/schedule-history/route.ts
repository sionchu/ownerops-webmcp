import { NextRequest, NextResponse } from "next/server";
import { loadScheduleHistory } from "@/server/schedule-history-repository";
import { isSupabaseConfigured } from "@/server/supabase-rest";

export const dynamic = "force-dynamic";

const STORE_ID = /^[a-z0-9][a-z0-9:_-]{2,120}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId") ?? "";
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!STORE_ID.test(storeId) || !ISO_DATE.test(from) || !ISO_DATE.test(to) || from >= to) {
    return NextResponse.json({ error: "Invalid storeId or history date range." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ source: "unavailable", weeks: [] });
  try {
    const weeks = await loadScheduleHistory(storeId, from, to);
    return NextResponse.json({ source: weeks.length > 0 ? "database" : "unavailable", weeks });
  } catch (error) {
    console.error("OwnerOps schedule history read failed", error);
    return NextResponse.json({ source: "unavailable", degraded: true, weeks: [] });
  }
}
