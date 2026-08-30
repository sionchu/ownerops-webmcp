type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export type OwnerSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email?: string };
};

export class SupabaseAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const OWNEROPS_ACCESS_COOKIE = "ownerops_access";
export const OWNEROPS_REFRESH_COOKIE = "ownerops_refresh";

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.OWNEROPS_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.OWNEROPS_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

function publicHeaders(config: SupabasePublicConfig, accessToken?: string) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken ?? config.anonKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function checkedJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new SupabaseAuthError(response.status, fallback);
  return response.json() as Promise<T>;
}

export async function signInOwner(email: string, password: string, fetcher: typeof fetch = fetch): Promise<OwnerSession> {
  const config = getSupabasePublicConfig();
  if (!config) throw new SupabaseAuthError(503, "Owner authentication is not configured.");
  const response = await fetcher(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: publicHeaders(config),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const payload = await checkedJson<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email?: string };
  }>(response, "Email or password is incorrect.");
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    user: payload.user,
  };
}

export async function getOwnerUser(accessToken: string, fetcher: typeof fetch = fetch): Promise<{ id: string; email?: string }> {
  const config = getSupabasePublicConfig();
  if (!config) throw new SupabaseAuthError(503, "Owner authentication is not configured.");
  const response = await fetcher(`${config.url}/auth/v1/user`, {
    method: "GET",
    headers: publicHeaders(config, accessToken),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  return checkedJson(response, "Owner session is no longer valid.");
}

export async function updateOwnedStoreMaster(
  accessToken: string,
  storeId: string,
  master: unknown,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const config = getSupabasePublicConfig();
  if (!config) throw new SupabaseAuthError(503, "Owner authentication is not configured.");
  const response = await fetcher(`${config.url}/rest/v1/rpc/oo_update_owned_store_master`, {
    method: "POST",
    headers: publicHeaders(config, accessToken),
    body: JSON.stringify({ p_store_id: storeId, p_master: master }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  return checkedJson(response, response.status === 401 || response.status === 403
    ? "This owner session cannot edit the selected store."
    : "The store update could not be saved.");
}
