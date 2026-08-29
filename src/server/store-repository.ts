import type { StorePersistenceProjection } from "@/persistence/store-projection";
import { isSupabaseConfigured, supabaseRpc } from "./supabase-rest";

function isProjection(value: unknown): value is StorePersistenceProjection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StorePersistenceProjection>;
  return typeof candidate.storeId === "string"
    && typeof candidate.business === "object"
    && candidate.business !== null
    && Array.isArray(candidate.workers)
    && Array.isArray(candidate.shifts)
    && Array.isArray(candidate.inventory)
    && Array.isArray(candidate.menu);
}

export async function loadPersistedStoreProjection(storeId: string): Promise<StorePersistenceProjection | null> {
  if (!isSupabaseConfigured()) return null;
  const value = await supabaseRpc<unknown>("oo_get_working_store_projection", { p_store_id: storeId });
  if (value === null) return null;
  if (!isProjection(value)) throw new Error(`Persisted store projection '${storeId}' has an invalid shape.`);
  return value;
}

/**
 * Admin/server-only persistence path. Intentionally not exposed through a public browser route
 * until authenticated per-owner RLS exists.
 */
export async function replacePersistedStoreProjection(projection: StorePersistenceProjection): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase persistence is not configured.");
  const result = await supabaseRpc<unknown>("oo_replace_working_store_projection", { p_projection: projection });
  if (result === null) throw new Error("Store projection persistence returned no result.");
}
