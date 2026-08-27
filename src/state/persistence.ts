import type { AppState } from "@/domain/model";
import { parseSnapshot, serializeSnapshot } from "@/snapshot/snapshot";

export const STORAGE_KEY = "ownerops.app-state.v1";

export function loadPersistedState(storage: Pick<Storage, "getItem">): AppState | null {
  const value = storage.getItem(STORAGE_KEY);
  if (!value) return null;
  try {
    return parseSnapshot(value);
  } catch {
    return null;
  }
}

export function persistState(storage: Pick<Storage, "setItem">, state: AppState): void {
  storage.setItem(STORAGE_KEY, serializeSnapshot(state));
}
