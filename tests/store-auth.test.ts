import { afterEach, describe, expect, it, vi } from "vitest";
import { getOwnerUser, signInOwner, SupabaseAuthError, updateOwnedStoreMaster } from "@/server/supabase-auth";

const originalUrl = process.env.OWNEROPS_SUPABASE_URL;
const originalAnon = process.env.OWNEROPS_SUPABASE_ANON_KEY;

afterEach(() => {
  process.env.OWNEROPS_SUPABASE_URL = originalUrl;
  process.env.OWNEROPS_SUPABASE_ANON_KEY = originalAnon;
});

describe("authenticated Store Master boundary", () => {
  it("uses the anon key for auth and the owner token for RLS RPC", async () => {
    process.env.OWNEROPS_SUPABASE_URL = "https://ownerops.example";
    process.env.OWNEROPS_SUPABASE_ANON_KEY = "public-anon";
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "owner-jwt", refresh_token: "refresh", expires_in: 3600, user: { id: "owner-1", email: "owner@example.com" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "owner-1", email: "owner@example.com" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ storeId: "demo-kr-seoul-coffee" }), { status: 200 })) as unknown as typeof fetch;

    const session = await signInOwner("owner@example.com", "not-logged-secret", fetcher);
    await getOwnerUser(session.accessToken, fetcher);
    await updateOwnedStoreMaster(session.accessToken, "demo-kr-seoul-coffee", { business: { name: "OwnerOps" } }, fetcher);

    const authHeaders = new Headers((vi.mocked(fetcher).mock.calls[0]?.[1] as RequestInit).headers);
    const rpcHeaders = new Headers((vi.mocked(fetcher).mock.calls[2]?.[1] as RequestInit).headers);
    expect(authHeaders.get("apikey")).toBe("public-anon");
    expect(rpcHeaders.get("apikey")).toBe("public-anon");
    expect(rpcHeaders.get("authorization")).toBe("Bearer owner-jwt");
    expect(JSON.stringify(vi.mocked(fetcher).mock.calls)).not.toContain("SERVICE_ROLE");
  });

  it("fails closed when public auth configuration is absent", async () => {
    delete process.env.OWNEROPS_SUPABASE_URL;
    delete process.env.OWNEROPS_SUPABASE_ANON_KEY;
    await expect(signInOwner("owner@example.com", "password123")).rejects.toMatchObject({ status: 503 } satisfies Partial<SupabaseAuthError>);
  });
});
