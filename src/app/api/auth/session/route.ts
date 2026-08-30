import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOwnerUser, OWNEROPS_ACCESS_COOKIE, OWNEROPS_REFRESH_COOKIE, SupabaseAuthError } from "@/server/supabase-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(OWNEROPS_ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });
  try {
    return NextResponse.json({ user: await getOwnerUser(token) });
  } catch (error) {
    const status = error instanceof SupabaseAuthError ? error.status : 500;
    return NextResponse.json({ user: null }, { status });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ user: null });
  response.cookies.set(OWNEROPS_ACCESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(OWNEROPS_REFRESH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
