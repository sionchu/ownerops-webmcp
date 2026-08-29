#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const dryRun = args.includes("--dry-run");

function usage() {
  console.log(`Usage:\n  node scripts/import-fnb-master.mjs --file <canonical-market.json> [--dry-run]\n\nThe JSON is an exported market template from the supplied global F&B master workbook.\nThis command is admin-only and requires OWNEROPS_SUPABASE_URL + OWNEROPS_SUPABASE_SERVICE_ROLE_KEY unless --dry-run is used.`);
}

if (fileIndex < 0 || !args[fileIndex + 1]) {
  usage();
  process.exitCode = 1;
} else {
  await main(args[fileIndex + 1]);
}

const MARKET_IDS = new Set(["kr-seoul", "us-nyc", "jp-tokyo", "es-madrid", "cn-shanghai"]);

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function validateDocument(doc) {
  if (!doc || typeof doc !== "object") throw new Error("Import document must be an object.");
  if (doc.schemaVersion !== 1) throw new Error("Unsupported master template schemaVersion.");
  if (!MARKET_IDS.has(doc.marketId)) throw new Error(`Unsupported marketId: ${String(doc.marketId)}.`);
  if (!doc.cityAssumption || typeof doc.cityAssumption !== "object") throw new Error("cityAssumption is required.");
  for (const key of ["ingredients", "yieldBenchmarks", "prepItems", "prepBom", "menus", "menuBom", "laborTemplates", "reference31Qa"]) requireArray(doc[key], key);
  return doc;
}

function config() {
  const url = process.env.OWNEROPS_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.OWNEROPS_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function headers(db, prefer) {
  return {
    apikey: db.key,
    Authorization: `Bearer ${db.key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function deleteMarket(db, table, marketId) {
  const response = await fetch(`${db.url}/rest/v1/${table}?market_id=eq.${encodeURIComponent(marketId)}`, {
    method: "DELETE",
    headers: headers(db),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${table} delete failed: ${response.status} ${await response.text()}`);
}

async function insertRows(db, table, rows) {
  if (rows.length === 0) return;
  const response = await fetch(`${db.url}/rest/v1/${table}`, {
    method: "POST",
    headers: headers(db, "return=minimal"),
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${table} insert failed: ${response.status} ${await response.text()}`);
}

function transformationParts(text) {
  const parts = String(text ?? "").split(/→|->/).map((value) => value.trim()).filter(Boolean);
  return { procurementForm: parts[0] ?? "unknown", useForm: parts[1] ?? "usable" };
}

function rowsFor(doc) {
  const market = doc.marketId;
  const city = doc.cityAssumption;
  return {
    oo_market_planning_profiles: [{
      market_id: market,
      country_name: city.country,
      currency_code: city.currency,
      vat_sales_tax_rate: city.vatSalesTaxRate,
      card_fee_rate: city.cardFeeRate,
      delivery_sales_mix: city.deliverySalesMix,
      delivery_commission_rate: city.deliveryCommissionRate,
      monthly_rent_assumption: city.monthlyRentAssumption,
      monthly_utilities_assumption: city.monthlyUtilitiesAssumption,
      other_fixed_cost_assumption: city.otherFixedCostAssumption,
      legal_wage_floor: city.legalWageFloor,
      wage_unit: city.wageUnit,
      wage_source_url: city.wageSourceUrl,
      notes: city.notes,
      source_dataset: "fnb-master-2026",
    }],
    oo_ingredient_benchmarks: doc.ingredients.map((item) => ({
      market_id: market,
      item_id: item.itemId,
      ingredient_name: item.name,
      category: item.category,
      base_unit: item.baseUnit,
      procurement_form: item.procurementForm,
      pack_quantity: item.packQuantity,
      pack_price: item.packPrice,
      edible_yield: item.edibleYield,
      source_type: item.sourceType,
      source_url: item.sourceUrl,
      notes: item.notes,
      input_status: item.inputStatus,
      source_dataset: "fnb-master-2026",
    })),
    oo_yield_benchmarks: doc.yieldBenchmarks.map((item) => {
      const forms = transformationParts(item.transformation);
      return {
        ingredient_id: null,
        market_id: market,
        material_label: item.material,
        procurement_form: forms.procurementForm,
        use_form: forms.useForm,
        yield_rate: item.yieldRate,
        source_label: item.reference,
        source_url: null,
        confidence: item.reference === "User reference dataset" ? 0.7 : 0.85,
        note: item.note,
      };
    }),
    oo_prep_benchmarks: doc.prepItems.map((item) => ({
      market_id: market,
      prep_id: item.prepId,
      prep_name: item.name,
      batch_yield_quantity: item.batchYieldQuantity,
      output_unit: item.unit,
      source_url: item.sourceUrl,
      source_dataset: "fnb-master-2026",
    })),
    oo_prep_benchmark_bom: doc.prepBom.map((line) => ({
      market_id: market,
      prep_id: line.prepId,
      item_id: line.itemId,
      ingredient_name: line.ingredient,
      quantity: line.quantity,
      unit: line.unit,
      source_dataset: "fnb-master-2026",
    })),
    oo_menu_benchmarks: doc.menus.map((item) => ({
      market_id: market,
      menu_id: item.menuId,
      concept: item.concept,
      menu_name: item.name,
      local_name: item.localName,
      currency_code: item.currency,
      selling_price: item.sellingPrice,
      price_basis: item.priceBasis,
      menu_source_url: item.menuSourceUrl,
      recipe_source_url: item.recipeSourceUrl,
      waste_buffer_rate: item.wasteBufferRate,
      benchmark_type: item.benchmarkType,
      source_dataset: "fnb-master-2026",
    })),
    oo_menu_benchmark_bom: doc.menuBom.map((line) => ({
      market_id: market,
      menu_id: line.menuId,
      component_type: line.componentType,
      component_id: line.componentId,
      component_name: line.componentName,
      quantity: line.quantity,
      unit: line.unit,
      source_dataset: "fnb-master-2026",
    })),
    oo_labor_templates: doc.laborTemplates.map((item) => ({
      market_id: market,
      concept: item.concept,
      role: item.role,
      headcount_fte: item.headcountFte,
      hours_per_week_per_person: item.hoursPerWeekPerPerson,
      hourly_wage: item.hourlyWage,
      wage_source_url: item.wageSourceUrl,
      source_dataset: "fnb-master-2026",
    })),
    oo_reference_menu_qa: doc.reference31Qa.map((item) => ({
      market_id: market,
      reference_menu: item.referenceMenu,
      sale_price_krw: item.salePriceKrw,
      declared_cost_krw: item.declaredCostKrw,
      declared_food_cost_rate: item.declaredFoodCostRate,
      yield_note: item.yieldNote,
      listed_components: item.listedComponents,
      component_values: item.componentValues,
      listed_component_sum: item.listedComponentSum,
      difference_from_declared: item.differenceFromDeclared,
      qa_flag: item.qaFlag,
      reference_origin: item.referenceOrigin,
      recommended_use: item.recommendedUse,
      source_dataset: "user-reference-31",
    })),
  };
}

async function main(file) {
  const path = resolve(process.cwd(), file);
  const doc = validateDocument(JSON.parse(await readFile(path, "utf8")));
  const tables = rowsFor(doc);
  const summary = Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length]));

  if (dryRun) {
    console.log(JSON.stringify({ marketId: doc.marketId, sourceWorkbook: doc.sourceWorkbook, tables: summary }, null, 2));
    return;
  }

  const db = config();
  if (!db) throw new Error("OWNEROPS_SUPABASE_URL and OWNEROPS_SUPABASE_SERVICE_ROLE_KEY are required.");

  // Replace one market's benchmark/template rows as one admin operation sequence.
  // Store actual tables are never touched here.
  for (const table of Object.keys(tables)) await deleteMarket(db, table, doc.marketId);
  for (const [table, rows] of Object.entries(tables)) await insertRows(db, table, rows);
  console.log(JSON.stringify({ imported: true, marketId: doc.marketId, tables: summary }, null, 2));
}
