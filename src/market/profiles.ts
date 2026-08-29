import type { CurrencyCode, MarketId, Worker } from "@/domain/model";
import type { UiLocale } from "@/i18n";

export type WageReference = {
  hourly: number;
  basis: "statutory-hourly-minimum" | "derived-general-smi" | "part-time-hourly-minimum";
  effectiveFrom: string;
  checkedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  note?: string;
};

export type MarketProfile = {
  id: MarketId;
  currency: CurrencyCode;
  intlLocale: string;
  locationLabels: Record<UiLocale, string>;
  workerDisplayNames: Record<string, string>;
  wageReference: WageReference;
  wageRounding: number;
  salesRounding: number;
};

const CHECKED_AT = "2026-08-29";

export const MARKET_PROFILES: Record<MarketId, MarketProfile> = {
  "kr-seoul": {
    id: "kr-seoul",
    currency: "KRW",
    intlLocale: "ko-KR",
    locationLabels: { en: "Seoul", ko: "서울", ja: "ソウル", es: "Seúl", "zh-CN": "首尔" },
    workerDisplayNames: { minsoo: "민수", jiyoung: "지영", younghee: "영희", chulsoo: "철수", hana: "하나" },
    wageReference: {
      hourly: 10320,
      basis: "statutory-hourly-minimum",
      effectiveFrom: "2026-01-01",
      checkedAt: CHECKED_AT,
      sourceLabel: "Minimum Wage Council, Republic of Korea — 2026 minimum wage",
      sourceUrl: "https://www.minimumwage.go.kr/",
    },
    wageRounding: 500,
    salesRounding: 100000,
  },
  "us-nyc": {
    id: "us-nyc",
    currency: "USD",
    intlLocale: "en-US",
    locationLabels: { en: "New York City", ko: "뉴욕", ja: "ニューヨーク", es: "Nueva York", "zh-CN": "纽约" },
    workerDisplayNames: { minsoo: "Mason", jiyoung: "Jamie", younghee: "Taylor", chulsoo: "Chris", hana: "Hannah" },
    wageReference: {
      hourly: 17,
      basis: "statutory-hourly-minimum",
      effectiveFrom: "2026-01-01",
      checkedAt: CHECKED_AT,
      sourceLabel: "New York State Department of Labor — New York City minimum wage",
      sourceUrl: "https://dol.ny.gov/minimum-wage",
      note: "General NYC minimum wage; tipped and certain industry-specific rates can differ.",
    },
    wageRounding: 0.25,
    salesRounding: 50,
  },
  "jp-tokyo": {
    id: "jp-tokyo",
    currency: "JPY",
    intlLocale: "ja-JP",
    locationLabels: { en: "Tokyo", ko: "도쿄", ja: "東京", es: "Tokio", "zh-CN": "东京" },
    workerDisplayNames: { minsoo: "蓮", jiyoung: "葵", younghee: "美咲", chulsoo: "翔太", hana: "花" },
    wageReference: {
      hourly: 1226,
      basis: "statutory-hourly-minimum",
      effectiveFrom: "2025-10-03",
      checkedAt: CHECKED_AT,
      sourceLabel: "Japan Ministry of Health, Labour and Welfare — Tokyo regional minimum wage",
      sourceUrl: "https://saiteichingin.mhlw.go.jp/table/page_list_nationallist.html",
      note: "Tokyo's 2026 council recommended ¥1,280, but as of 2026-08-29 the currently effective rate remains ¥1,226 until the new rate takes effect.",
    },
    wageRounding: 10,
    salesRounding: 10000,
  },
  "es-madrid": {
    id: "es-madrid",
    currency: "EUR",
    intlLocale: "es-ES",
    locationLabels: { en: "Madrid", ko: "마드리드", ja: "マドリード", es: "Madrid", "zh-CN": "马德里" },
    workerDisplayNames: { minsoo: "Mateo", jiyoung: "Lucía", younghee: "Carmen", chulsoo: "Diego", hana: "Ana" },
    wageReference: {
      hourly: 8.22,
      basis: "derived-general-smi",
      effectiveFrom: "2026-01-01",
      checkedAt: CHECKED_AT,
      sourceLabel: "Spain BOE, Real Decreto 126/2026 — 2026 SMI",
      sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-3815",
      note: "Spain sets the general 2026 SMI at €17,094/year (€1,221 × 14). OwnerOps derives €8.22/hour using 40 hours/week × 52 weeks only as a demo planning reference, not as a universal statutory hourly quote.",
    },
    wageRounding: 0.1,
    salesRounding: 50,
  },
  "cn-shanghai": {
    id: "cn-shanghai",
    currency: "CNY",
    intlLocale: "zh-CN",
    locationLabels: { en: "Shanghai", ko: "상하이", ja: "上海", es: "Shanghái", "zh-CN": "上海" },
    workerDisplayNames: { minsoo: "明宇", jiyoung: "嘉怡", younghee: "雅婷", chulsoo: "子豪", hana: "欣怡" },
    wageReference: {
      hourly: 25,
      basis: "part-time-hourly-minimum",
      effectiveFrom: "2025-07-01",
      checkedAt: CHECKED_AT,
      sourceLabel: "Shanghai Municipal Human Resources and Social Security Bureau — minimum wage standard",
      sourceUrl: "https://www.shanghai.gov.cn/gwk/search/content/t0035_1434097",
      note: "Shanghai's ¥25/hour statutory minimum applies to non-full-time employment; the full-time minimum is monthly. OwnerOps uses the hourly figure because this demo models hourly shifts.",
    },
    wageRounding: 0.5,
    salesRounding: 100,
  },
};

export const MARKET_BY_UI_LOCALE: Record<UiLocale, MarketId> = {
  en: "us-nyc",
  ko: "kr-seoul",
  ja: "jp-tokyo",
  es: "es-madrid",
  "zh-CN": "cn-shanghai",
};

const BASE_KRW_REFERENCE = 10320;
const BASE_SALES_KRW: Record<string, number> = {
  "2026-08-24": 1300000,
  "2026-08-25": 1400000,
  "2026-08-26": 1450000,
  "2026-08-27": 1600000,
  "2026-08-28": 2400000,
  "2026-08-29": 2600000,
  "2026-08-30": 2100000,
};

const WORKER_MULTIPLIERS: Record<string, number> = {
  minsoo: 1.26,
  jiyoung: 1.16,
  younghee: 1.45,
  chulsoo: 1.16,
  hana: 1.21,
};

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

export function isMarketId(value: unknown): value is MarketId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MARKET_PROFILES, value);
}

export function getMarketProfile(market: MarketId): MarketProfile {
  return MARKET_PROFILES[market];
}

export function marketForUiLocale(locale: UiLocale): MarketId {
  return MARKET_BY_UI_LOCALE[locale];
}

export function getMarketLocation(market: MarketId, locale: UiLocale): string {
  return MARKET_PROFILES[market].locationLabels[locale];
}

export function getWorkerDisplayName(market: MarketId, workerId: string, fallback?: string): string {
  return MARKET_PROFILES[market].workerDisplayNames[workerId] ?? fallback ?? workerId;
}

export function createMarketWorkers(market: MarketId): Worker[] {
  const profile = MARKET_PROFILES[market];
  const rate = (workerId: string) => roundTo(profile.wageReference.hourly * WORKER_MULTIPLIERS[workerId], profile.wageRounding);
  return [
    { id: "minsoo", name: "Minsoo", role: "barista", hourlyRate: rate("minsoo") },
    { id: "jiyoung", name: "Jiyoung", role: "barista", hourlyRate: rate("jiyoung") },
    { id: "younghee", name: "Younghee", role: "manager", hourlyRate: rate("younghee") },
    { id: "chulsoo", name: "Chulsoo", role: "barista", hourlyRate: rate("chulsoo") },
    { id: "hana", name: "Hana", role: "barista", hourlyRate: rate("hana") },
  ];
}

export function createMarketSales(market: MarketId): Record<string, number> {
  const profile = MARKET_PROFILES[market];
  const scale = profile.wageReference.hourly / BASE_KRW_REFERENCE;
  return Object.fromEntries(Object.entries(BASE_SALES_KRW).map(([day, value]) => [day, roundTo(value * scale, profile.salesRounding)]));
}
