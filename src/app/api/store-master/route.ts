import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OWNEROPS_ACCESS_COOKIE, SupabaseAuthError, updateOwnedStoreMaster } from "@/server/supabase-auth";

export const dynamic = "force-dynamic";

const STORE_ID = /^[a-z0-9][a-z0-9:_-]{2,120}$/i;

export async function POST(request: Request) {
  const token = (await cookies()).get(OWNEROPS_ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  try {
    const body = await request.json() as { storeId?: unknown; master?: unknown };
    if (typeof body.storeId !== "string" || !STORE_ID.test(body.storeId) || !body.master || typeof body.master !== "object") {
      return NextResponse.json({ error: "Invalid store update." }, { status: 400 });
    }
    const result = await updateOwnedStoreMaster(token, body.storeId, body.master);
    return NextResponse.json({ saved: true, result });
  } catch (error) {
    const status = error instanceof SupabaseAuthError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Store update failed." }, { status });
  }
}
