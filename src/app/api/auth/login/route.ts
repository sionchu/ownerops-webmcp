import { NextResponse } from "next/server";
import { OWNEROPS_ACCESS_COOKIE, OWNEROPS_REFRESH_COOKIE, signInOwner, SupabaseAuthError } from "@/server/supabase-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    if (typeof body.email !== "string" || typeof body.password !== "string" || !body.email.includes("@") || body.password.length < 8) {
      return NextResponse.json({ error: "Valid owner credentials are required." }, { status: 400 });
    }
    const session = await signInOwner(body.email.trim(), body.password);
    const response = NextResponse.json({ user: session.user });
    const cookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    response.cookies.set(OWNEROPS_ACCESS_COOKIE, session.accessToken, { ...cookie, maxAge: session.expiresIn });
    response.cookies.set(OWNEROPS_REFRESH_COOKIE, session.refreshToken, { ...cookie, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    const status = error instanceof SupabaseAuthError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sign-in failed." }, { status });
  }
}
