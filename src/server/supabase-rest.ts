type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.OWNEROPS_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.OWNEROPS_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

function headers(config: SupabaseConfig) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function supabaseSelect<T>(tableOrView: string, query: string): Promise<T[]> {
  const config = getSupabaseConfig();
  if (!config) return [];
  const response = await fetch(`${config.url}/rest/v1/${tableOrView}?${query}`, {
    method: "GET",
    headers: headers(config),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Supabase ${tableOrView}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T[]>;
}

/** Server-only. Never call this adapter from client components. */
export async function supabaseRpc<T>(functionName: string, body: Record<string, unknown>): Promise<T | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: headers(config),
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Supabase RPC ${functionName}: ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}
