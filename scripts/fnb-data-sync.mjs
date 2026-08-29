#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(repoRoot, "src", "cost-data", "source-catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const args = process.argv.slice(2);
const redactedParams = new Set(["p_cert_key", "p_cert_id", "appId"]);

function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function printUsage() {
  console.log(`Usage:\n  node scripts/fnb-data-sync.mjs --list\n  node scripts/fnb-data-sync.mjs --source <source-id>\n  node scripts/fnb-data-sync.mjs --all\n\nOptional:\n  --out <directory>   Snapshot output directory (default: .cache/fnb)`);
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
    return {
      status: "ok",
      requestUrl,
      metadata: { mode: "item", itemCode, categoryCode, productClass, countryCode },
      payload: await fetchJson(requestUrl),
    };
  }

  const params = buildKamisParams("dailyPriceByCategoryList");
  params.set("p_product_cls_code", productClass);
  params.set("p_item_category_code", categoryCode);
  params.set("p_country_code", countryCode);
  params.set("p_convert_kg_yn", "Y");
  if (regday) params.set("p_regday", regday);

  const requestUrl = `${source.endpoint}?${params}`;
  return {
    status: "ok",
    requestUrl,
    metadata: { mode: "category", categoryCode, productClass, countryCode },
    payload: await fetchJson(requestUrl),
  };
}

async function syncEstat(source) {
  const required = ["ESTAT_APP_ID", "ESTAT_STATS_DATA_ID"];
  const missing = missingEnv(required);
  if (missing.length > 0) return { status: "skipped", reason: `missing ${missing.join(", ")}` };

  const params = new URLSearchParams({
    appId: process.env.ESTAT_APP_ID,
    statsDataId: process.env.ESTAT_STATS_DATA_ID,
    lang: "E",
  });
  const requestUrl = `${source.endpoint}?${params}`;
  return { status: "ok", requestUrl, payload: await fetchJson(requestUrl) };
}

async function syncUsda(source) {
  const missing = missingEnv(["USDA_MMN_API_KEY"]);
  if (missing.length > 0) return { status: "skipped", reason: `missing ${missing.join(", ")}` };

  const reportId = process.env.USDA_MMN_REPORT_ID?.trim();
  const requestUrl = reportId ? `${source.endpoint}/${encodeURIComponent(reportId)}` : source.endpoint;
  const authorization = Buffer.from(`${process.env.USDA_MMN_API_KEY}:`).toString("base64");
  return {
    status: "ok",
    requestUrl,
    payload: await fetchJson(requestUrl, { headers: { Authorization: `Basic ${authorization}`, Accept: "application/json" } }),
  };
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
    case "mercamadrid": return { status: "skipped", reason: "public Excel/web export; no stable documented REST API verified" };
    case "square-mcp": return { status: "skipped", reason: "merchant OAuth/MCP source; not an offline public-price sync" };
    default: throw new Error(`No sync adapter for ${source.id}.`);
  }
}

async function writeSnapshot(outDir, source, result) {
  const fetchedAt = new Date().toISOString();
  const safeStamp = fetchedAt.replaceAll(":", "-");
  const snapshot = {
    schemaVersion: 1,
    sourceId: source.id,
    markets: source.markets,
    fetchedAt,
    status: result.status,
    reason: result.reason ?? null,
    requestUrl: result.requestUrl ? redactUrl(result.requestUrl) : null,
    metadata: result.metadata ?? null,
    payload: result.payload ?? null,
  };
  await mkdir(outDir, { recursive: true });
  const path = join(outDir, `${source.id}-${safeStamp}.json`);
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return path;
}

async function main() {
  if (args.includes("--list")) {
    listSources();
    return;
  }

  const requestedId = argValue("--source");
  const runAll = args.includes("--all");
  if (!requestedId && !runAll) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const outArg = argValue("--out");
  const outDir = outArg ? (isAbsolute(outArg) ? outArg : resolve(repoRoot, outArg)) : join(repoRoot, ".cache", "fnb");
  const selected = runAll ? catalog : catalog.filter((source) => source.id === requestedId);
  if (selected.length === 0) throw new Error(`Unknown source id: ${requestedId}`);

  let failures = 0;
  for (const source of selected) {
    try {
      const result = await syncSource(source);
      const path = await writeSnapshot(outDir, source, result);
      console.log(`${source.id}: ${result.status}${result.reason ? ` (${result.reason})` : ""} -> ${path}`);
    } catch (error) {
      failures += 1;
      console.error(`${source.id}: failed - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures > 0) process.exitCode = 1;
}

await main();
