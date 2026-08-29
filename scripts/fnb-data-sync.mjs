#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(join(repoRoot, "src", "cost-data", "source-catalog.json"), "utf8"));
const aliases = JSON.parse(await readFile(join(repoRoot, "src", "cost-data", "ingredient-aliases.json"), "utf8"));
const args = process.argv.slice(2);
const redactedParams = new Set(["p_cert_key", "p_cert_id", "appId"]);

function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function printUsage() {
  console.log(`Usage:\n  node scripts/fnb-data-sync.mjs --list\n  node scripts/fnb-data-sync.mjs --source <source-id>\n  node scripts/fnb-data-sync.mjs --all\n\nOptional:\n  --out <directory>   Raw/normalized snapshot directory (default: .cache/fnb)\n\nDB cache (optional):\n  OWNEROPS_SUPABASE_URL\n  OWNEROPS_SUPABASE_SERVICE_ROLE_KEY`);
}

function listSources() {
  for (const source of catalog) {
    const config = source.configEnv.length > 0 ? source.configEnv.join(", ") : "none";
    console.log(`${source.id.padEnd(23)} ${source.automation.padEnd(10)} ${source.markets.join(", ").padEnd(48)} config: ${config}`);
  }
}

function missingEnv(names) {
  return names.filter((name) => !process.env[name]);
}

function redactUrl(urlString) {
  const url = new URL(urlString);
  for (const name of redactedParams) {
    if (url.searchParams.has(name)) url.searchParams.set(name, "REDACTED");
  }
  return url.toString();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return { contentType: response.headers.get("content-type") ?? "", text: await response.text() };
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll(",", "");
  if (!normalized || normalized === "-" || normalized.toLowerCase() === "n/a") return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function buildKamisParams(action) {
  return new URLSearchParams({
    action,
    p_cert_key: process.env.KAMIS_CERT_KEY,
    p_cert_id: process.env.KAMIS_CERT_ID,
    p_returntype: "json",
  });
}

async function syncKamis(source) {
  const required = ["KAMIS_CERT_KEY", "KAMIS_CERT_ID"];
  const missing = missingEnv(required);
  if (missing.length > 0) return { status: "skipped", reason: `missing ${missing.join(", ")}` };

  const itemCode = process.env.KAMIS_ITEM_CODE?.trim();
  const categoryCode = process.env.KAMIS_CATEGORY_CODE ?? (itemCode ? "" : "200");
  const productClass = process.env.KAMIS_PRODUCT_CLASS ?? "02";
  const countryCode = process.env.KAMIS_COUNTRY_CODE ?? "1101";
  const regday = process.env.KAMIS_REGDAY;

  if (itemCode) {
    if (!categoryCode) return { status: "skipped", reason: "KAMIS_CATEGORY_CODE is required when KAMIS_ITEM_CODE is set" };
    const params = buildKamisParams("ItemInfo");
    params.set("p_productclscode", productClass);
    params.set("p_itemcategorycode", categoryCode);
    params.set("p_itemcode", itemCode);
    params.set("p_kindcode", process.env.KAMIS_KIND_CODE ?? "00");
    params.set("p_productrankcode", process.env.KAMIS_RANK_CODE ?? "04");
    params.set("p_countycode", countryCode);
    if (regday) params.set("p_regday", regday);
    const requestUrl = `${source.endpoint}?${params}`;
    return { status: "ok", requestUrl, metadata: { mode: "item", itemCode, categoryCode, productClass, countryCode }, payload: await fetchJson(requestUrl) };
  }

  const params = buildKamisParams("dailyPriceByCategoryList");
  params.set("p_product_cls_code", productClass);
  params.set("p_item_category_code", categoryCode);
  params.set("p_country_code", countryCode);
  params.set("p_convert_kg_yn", "Y");
  if (regday) params.set("p_regday", regday);
  const requestUrl = `${source.endpoint}?${params}`;
  return { status: "ok", requestUrl, metadata: { mode: "category", categoryCode, productClass, countryCode, convertedToKg: true }, payload: await fetchJson(requestUrl) };
}

async function syncEstat(source) {
  const required = ["ESTAT_APP_ID", "ESTAT_STATS_DATA_ID"];
  const missing = missingEnv(required);
  if (missing.length > 0) return { status: "skipped", reason: `missing ${missing.join(", ")}` };
  const params = new URLSearchParams({ appId: process.env.ESTAT_APP_ID, statsDataId: process.env.ESTAT_STATS_DATA_ID, lang: "E" });
  const requestUrl = `${source.endpoint}?${params}`;
  return { status: "ok", requestUrl, payload: await fetchJson(requestUrl) };
}

async function syncUsda(source) {
  const missing = missingEnv(["USDA_MMN_API_KEY"]);
  if (missing.length > 0) return { status: "skipped", reason: `missing ${missing.join(", ")}` };
  const reportId = process.env.USDA_MMN_REPORT_ID?.trim();
  const requestUrl = reportId ? `${source.endpoint}/${encodeURIComponent(reportId)}` : source.endpoint;
  const authorization = Buffer.from(`${process.env.USDA_MMN_API_KEY}:`).toString("base64");
  return { status: "ok", requestUrl, payload: await fetchJson(requestUrl, { headers: { Authorization: `Basic ${authorization}`, Accept: "application/json" } }) };
}

async function syncEurostat(source) {
  const dataset = process.env.EUROSTAT_DATASET_CODE ?? "prc_hicp_midx";
  const defaultQuery = "format=JSON&lang=en&geo=ES&coicop=CP01&unit=I15&lastTimePeriod=3";
  const query = (process.env.EUROSTAT_QUERY ?? defaultQuery).replace(/^\?/, "");
  const requestUrl = `${source.endpoint}/${encodeURIComponent(dataset)}?${query}`;
  return { status: "ok", requestUrl, payload: await fetchJson(requestUrl) };
}

async function syncOpenPrices(source) {
  const query = (process.env.OPEN_PRICES_QUERY ?? "size=20").replace(/^\?/, "");
  const requestUrl = `${source.endpoint}?${query}`;
  return { status: "ok", requestUrl, payload: await fetchJson(requestUrl) };
}

async function syncShanghai(source) {
  const requestedUrl = process.env.SHANGHAI_PRICE_URL;
  if (!requestedUrl) return { status: "skipped", reason: "missing SHANGHAI_PRICE_URL" };
  const url = new URL(requestedUrl);
  const allowedHosts = new Set(["nyncw.sh.gov.cn", "www.shanghai.gov.cn", "shanghai.gov.cn", "www.shcm.gov.cn", "shcm.gov.cn"]);
  if (!allowedHosts.has(url.hostname)) throw new Error(`Unsupported Shanghai price host: ${url.hostname}`);
  return { status: "ok", requestUrl: url.toString(), payload: await fetchText(url.toString()) };
}

async function syncSource(source) {
  switch (source.id) {
    case "kamis": return syncKamis(source);
    case "estat-retail-price": return syncEstat(source);
    case "usda-mmn": return syncUsda(source);
    case "eurostat": return syncEurostat(source);
    case "open-prices": return syncOpenPrices(source);
    case "shanghai-price-monitor": return syncShanghai(source);
    case "mercamadrid": return { status: "skipped", reason: "public download/page adapter; no stable documented REST API verified" };
    case "square": return { status: "skipped", reason: "merchant OAuth source; not a public reference sync" };
    default: throw new Error(`No sync adapter for ${source.id}.`);
  }
}

function flattenKamisRows(payload) {
  const candidates = [payload?.data?.item, payload?.data, payload?.item, payload?.price, payload?.result?.item];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function parseKamisObservedAt(row, fetchedAt) {
  const raw = row?.day1 ?? row?.regday ?? row?.date ?? row?.yyyy_mm_dd;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return `${raw.trim()}T00:00:00+09:00`;
  return fetchedAt;
}

function normalizeKamis(payload, metadata, fetchedAt, source) {
  const rows = flattenKamisRows(payload);
  const priceLevel = metadata?.productClass === "01" ? "retail" : "wholesale";
  const observations = [];
  for (const row of rows) {
    const itemName = String(row?.item_name ?? row?.itemName ?? row?.product_name ?? "").trim();
    if (!itemName) continue;
    const alias = aliases.find((candidate) => candidate.sourceId === "kamis" && candidate.market === "kr-seoul" && candidate.alias === itemName);
    if (!alias) continue;
    const price = parseNumber(row?.dpr1 ?? row?.price ?? row?.value);
    if (price === null || price < 0) continue;

    // Category sync requests p_convert_kg_yn=Y, so defensibly mapped mass commodities are 1 kg.
    // Count commodities (eggs) retain the published unit when it can be parsed.
    const unitLabel = String(row?.unit ?? row?.unit_name ?? "").trim();
    let purchaseQuantity = 1;
    let purchaseUnit = alias.baseUnit;
    if (alias.baseUnit === "ea") {
      const countMatch = unitLabel.match(/(\d+(?:\.\d+)?)\s*(개|과|마리|판)/);
      purchaseQuantity = countMatch ? Number(countMatch[1]) : 1;
      purchaseUnit = "ea";
    } else if (!metadata?.convertedToKg) {
      const kgMatch = unitLabel.match(/(\d+(?:\.\d+)?)\s*kg/i);
      const gMatch = unitLabel.match(/(\d+(?:\.\d+)?)\s*g/i);
      if (kgMatch) { purchaseQuantity = Number(kgMatch[1]); purchaseUnit = "kg"; }
      else if (gMatch) { purchaseQuantity = Number(gMatch[1]) / 1000; purchaseUnit = "kg"; }
    } else {
      purchaseQuantity = 1;
      purchaseUnit = "kg";
    }

    const pricePerBaseUnit = price / purchaseQuantity;
    observations.push({
      source_id: "kamis",
      ingredient_id: alias.ingredientId,
      reference_key: alias.referenceKey,
      market_id: "kr-seoul",
      geography: String(row?.county_name ?? row?.countyname ?? row?.county ?? "Seoul"),
      price_level: priceLevel,
      original_label: itemName,
      original_price: price,
      original_currency: "KRW",
      original_quantity: purchaseQuantity,
      original_unit: purchaseUnit,
      price_per_base_unit: pricePerBaseUnit,
      base_unit: alias.baseUnit,
      confidence: 0.95,
      observed_at: parseKamisObservedAt(row, fetchedAt),
      fetched_at: fetchedAt,
      source_url: source.sourceUrl,
      metadata: { sourceUnitLabel: unitLabel || null, kind: row?.kind_name ?? row?.kindname ?? null, rank: row?.rank ?? null },
    });
  }
  return observations;
}

function dbConfig() {
  const url = process.env.OWNEROPS_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.OWNEROPS_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function dbInsert(table, rows, { returnRows = false } = {}) {
  const config = dbConfig();
  if (!config || !rows || (Array.isArray(rows) && rows.length === 0)) return null;
  const response = await fetch(`${config.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: returnRows ? "return=representation" : "return=minimal",
    },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Supabase ${table}: ${response.status} ${await response.text()}`);
  return returnRows ? response.json() : true;
}

async function writeSnapshots(outDir, source, result) {
  const fetchedAt = new Date().toISOString();
  const safeStamp = fetchedAt.replaceAll(":", "-");
  const requestUrl = result.requestUrl ? redactUrl(result.requestUrl) : null;
  const snapshot = {
    schemaVersion: 1,
    sourceId: source.id,
    markets: source.markets,
    fetchedAt,
    status: result.status,
    reason: result.reason ?? null,
    requestUrl,
    metadata: result.metadata ?? null,
    payload: result.payload ?? null,
  };
  await mkdir(outDir, { recursive: true });
  const rawPath = join(outDir, `${source.id}-${safeStamp}.json`);
  await writeFile(rawPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  let normalized = [];
  if (source.id === "kamis" && result.status === "ok") normalized = normalizeKamis(result.payload, result.metadata, fetchedAt, source);
  let normalizedPath = null;
  if (normalized.length > 0) {
    normalizedPath = join(outDir, `${source.id}-normalized-${safeStamp}.json`);
    await writeFile(normalizedPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  }
  return { fetchedAt, rawPath, normalizedPath, normalized, snapshot };
}

async function persistSnapshots(source, written) {
  const config = dbConfig();
  if (!config) return { db: "not-configured", normalized: 0 };
  const payloadText = JSON.stringify(written.snapshot.payload ?? null);
  const rawRows = await dbInsert("oo_raw_price_observations", [{
    source_id: source.id,
    market_id: source.markets[0],
    fetched_at: written.fetchedAt,
    observed_at: null,
    request_url: written.snapshot.requestUrl,
    parser_version: "ownerops-sync-v1",
    status: written.snapshot.status,
    error_message: written.snapshot.reason,
    payload: written.snapshot.payload,
    payload_hash: createHash("sha256").update(payloadText).digest("hex"),
  }], { returnRows: true });
  const rawId = Array.isArray(rawRows) ? rawRows[0]?.id : null;
  if (written.normalized.length > 0) {
    await dbInsert("oo_normalized_price_observations", written.normalized.map((row) => ({ ...row, raw_observation_id: rawId ?? null })));
  }
  return { db: "persisted", normalized: written.normalized.length };
}

async function main() {
  if (args.includes("--list")) { listSources(); return; }
  const requestedId = argValue("--source");
  const runAll = args.includes("--all");
  if (!requestedId && !runAll) { printUsage(); process.exitCode = 1; return; }

  const outArg = argValue("--out");
  const outDir = outArg ? (isAbsolute(outArg) ? outArg : resolve(repoRoot, outArg)) : join(repoRoot, ".cache", "fnb");
  const selected = runAll ? catalog : catalog.filter((source) => source.id === requestedId);
  if (selected.length === 0) throw new Error(`Unknown source id: ${requestedId}`);

  let failures = 0;
  for (const source of selected) {
    try {
      const result = await syncSource(source);
      const written = await writeSnapshots(outDir, source, result);
      const persisted = await persistSnapshots(source, written);
      console.log(`${source.id}: ${result.status}${result.reason ? ` (${result.reason})` : ""} -> ${written.rawPath}${written.normalizedPath ? ` + ${written.normalizedPath}` : ""} · ${persisted.db}${persisted.normalized ? ` (${persisted.normalized} normalized)` : ""}`);
    } catch (error) {
      failures += 1;
      console.error(`${source.id}: failed - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures > 0) process.exitCode = 1;
}

await main();
