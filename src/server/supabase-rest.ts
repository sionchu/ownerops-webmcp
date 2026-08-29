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

export async function supabaseSelect<T>(tableOrView: string, query: string): Promise<T[]> {
  const config = getSupabaseConfig();
  if (!config) return [];
  const response = await fetch(`${config.url}/rest/v1/${tableOrView}?${query}`, {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Supabase ${tableOrView}: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T[]>;
}
