import type { InventoryUnit } from "./model";

const MASS_FACTORS: Partial<Record<InventoryUnit, number>> = { g: 1, kg: 1_000 };
const VOLUME_FACTORS: Partial<Record<InventoryUnit, number>> = { ml: 1, l: 1_000 };

function family(unit: InventoryUnit): "mass" | "volume" | "count" {
  if (unit in MASS_FACTORS) return "mass";
  if (unit in VOLUME_FACTORS) return "volume";
  return "count";
}

/**
 * Converts a recipe/purchase quantity without guessing across incompatible units.
 * Count-like units (ea, pack, box) intentionally only support identity conversion.
 */
export function convertInventoryQuantity(
  quantity: number,
  fromUnit: InventoryUnit,
  toUnit: InventoryUnit,
): number | null {
  if (!Number.isFinite(quantity)) return null;
  if (fromUnit === toUnit) return quantity;
  if (family(fromUnit) !== family(toUnit)) return null;
  if (family(fromUnit) === "mass") return quantity * (MASS_FACTORS[fromUnit]! / MASS_FACTORS[toUnit]!);
  if (family(fromUnit) === "volume") return quantity * (VOLUME_FACTORS[fromUnit]! / VOLUME_FACTORS[toUnit]!);
  return null;
}

export function isInventoryUnit(value: string | undefined): value is InventoryUnit {
  return value === "g" || value === "kg" || value === "ml" || value === "l" || value === "ea" || value === "pack" || value === "box";
}
