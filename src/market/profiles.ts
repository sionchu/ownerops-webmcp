import type { AvailabilityRule, CurrencyCode, MarketId, OccupancyCost, Worker } from "@/domain/model";
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
  timezone: string;
  locationLabels: Record<UiLocale, string>;
  workerNames: Record<string, string>;
  workerContacts: Record<string, string>;
  wageReference: WageReference;
  wageRounding: number;
  salesRounding: number;
  defaultOccupancy: OccupancyCost;
  referenceProviders: {
    commodity: string;
    commoditySourceUrl: string;
    rent: string;
    rentSourceUrl?: string;
    weather: string;
  };
};

const CHECKED_AT = "2026-08-29";

export const MARKET_PROFILES: Record<MarketId, MarketProfile> = {
  "kr-seoul": {
    id: "kr-seoul",
    currency: "KRW",
    intlLocale: "ko-KR",
    timezone: "Asia/Seoul",
    locationLabels: { en: "Seoul", ko: "서울", ja: "ソウル", es: "Seúl", "zh-CN": "首尔" },
    workerNames: { minsoo: "민수", jiyoung: "지영", younghee: "영희", chulsoo: "철수", hana: "하나" },
    workerContacts: { minsoo: "010-••••-1042", jiyoung: "010-••••-2084", younghee: "010-••••-3168", chulsoo: "010-••••-4275", hana: "010-••••-5391" },
    wageReference: {
      hourly: 10320,
      basis: "statutory-hourly-minimum",
      effectiveFrom: "2026-01-01",
      checkedAt: CHECKED_AT,
      sourceLabel: "Minimum Wage Council, Republic of Korea — 2026 minimum wage",
      sourceUrl: "https://www.minimumwage.go.kr/",
    },
    wageRounding: 500,
    salesRounding: 50000,
    defaultOccupancy: { baseRentMonthly: 3000000, recurringFeesMonthly: 420000, deposit: 30000000, leaseStart: "2026-04-01", leaseEnd: "2027-03-31", nextEscalationDate: "2027-01-01", nextEscalationRate: 0.05 },
    referenceProviders: {
      commodity: "KAMIS",
      commoditySourceUrl: "https://www.kamis.or.kr/customer/reference/openapi_list.do",
      rent: "Korea Real Estate Board / KOSIS",
      rentSourceUrl: "https://www.reb.or.kr/reb/cm/cntnts/cntntsView.do?cntntsId=1052",
      weather: "OpenWeather or deterministic seed",
    },
  },
  "us-nyc": {
    id: "us-nyc",
    currency: "USD",
    intlLocale: "en-US",
    timezone: "America/New_York",
    locationLabels: { en: "New York City", ko: "뉴욕", ja: "ニューヨーク", es: "Nueva York", "zh-CN": "纽约" },
    workerNames: { minsoo: "Mason", jiyoung: "Jamie", younghee: "Taylor", chulsoo: "Chris", hana: "Hannah" },
    workerContacts: { minsoo: "+1 (212) 555-0101", jiyoung: "+1 (212) 555-0102", younghee: "+1 (212) 555-0103", chulsoo: "+1 (212) 555-0104", hana: "+1 (212) 555-0105" },
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
    defaultOccupancy: { baseRentMonthly: 7500, recurringFeesMonthly: 850, deposit: 15000, leaseStart: "2026-04-01", leaseEnd: "2027-03-31", nextEscalationDate: "2027-01-01", nextEscalationRate: 0.04 },
    referenceProviders: {
      commodity: "USDA AMS MyMarketNews",
      commoditySourceUrl: "https://mymarketnews.ams.usda.gov/mymarketnews-api",
      rent: "Seeded commercial benchmark until a stable local provider is wired",
      weather: "OpenWeather or deterministic seed",
    },
  },
  "jp-tokyo": {
    id: "jp-tokyo",
    currency: "JPY",
    intlLocale: "ja-JP",
    timezone: "Asia/Tokyo",
    locationLabels: { en: "Tokyo", ko: "도쿄", ja: "東京", es: "Tokio", "zh-CN": "东京" },
    workerNames: { minsoo: "蓮", jiyoung: "葵", younghee: "美咲", chulsoo: "翔太", hana: "花" },
    workerContacts: { minsoo: "090-••••-1042", jiyoung: "090-••••-2084", younghee: "090-••••-3168", chulsoo: "090-••••-4275", hana: "090-••••-5391" },
    wageReference: {
      hourly: 1226,
      basis: "statutory-hourly-minimum",
      effectiveFrom: "2025-10-03",
      checkedAt: CHECKED_AT,
      sourceLabel: "Japan Ministry of Health, Labour and Welfare — Tokyo regional minimum wage",
      sourceUrl: "https://saiteichingin.mhlw.go.jp/table/page_list_nationallist.html",
    },
    wageRounding: 10,
    salesRounding: 10000,
    defaultOccupancy: { baseRentMonthly: 620000, recurringFeesMonthly: 75000, deposit: 2500000, leaseStart: "2026-04-01", leaseEnd: "2027-03-31", nextEscalationDate: "2027-01-01", nextEscalationRate: 0.04 },
    referenceProviders: {
      commodity: "Japan MAFF wholesale market statistics",
      commoditySourceUrl: "https://www.maff.go.jp/j/tokei/syohi/shikyou/index.html",
      rent: "Seeded commercial benchmark until a stable local provider is wired",
      weather: "OpenWeather or deterministic seed",
    },
  },
  "es-madrid": {
    id: "es-madrid",
    currency: "EUR",
    intlLocale: "es-ES",
    timezone: "Europe/Madrid",
    locationLabels: { en: "Madrid", ko: "마드리드", ja: "マドリード", es: "Madrid", "zh-CN": "马德里" },
    workerNames: { minsoo: "Mateo", jiyoung: "Lucía", younghee: "Carmen", chulsoo: "Diego", hana: "Ana" },
    workerContacts: { minsoo: "+34 600 ••• 142", jiyoung: "+34 600 ••• 284", younghee: "+34 600 ••• 368", chulsoo: "+34 600 ••• 475", hana: "+34 600 ••• 591" },
    wageReference: {
      hourly: 8.22,
      basis: "derived-general-smi",
      effectiveFrom: "2026-01-01",
      checkedAt: CHECKED_AT,
      sourceLabel: "Spain BOE, Real Decreto 126/2026 — 2026 SMI",
      sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2026-3815",
      note: "OwnerOps derives a planning hourly reference from the general annual SMI; it is not a universal statutory hourly quote.",
    },
    wageRounding: 0.1,
    salesRounding: 50,
    defaultOccupancy: { baseRentMonthly: 3200, recurringFeesMonthly: 360, deposit: 6400, leaseStart: "2026-04-01", leaseEnd: "2027-03-31", nextEscalationDate: "2027-01-01", nextEscalationRate: 0.04 },
    referenceProviders: {
      commodity: "MAPA Observatorio de la Cadena Alimentaria",
      commoditySourceUrl: "https://www.mapa.gob.es/es/alimentacion/temas/observatorio-cadena/cadenas-valor/sistema-de-precios-om",
      rent: "Seeded commercial benchmark until a stable local provider is wired",
      weather: "OpenWeather or deterministic seed",
    },
  },
  "cn-shanghai": {
    id: "cn-shanghai",
    currency: "CNY",
    intlLocale: "zh-CN",
    timezone: "Asia/Shanghai",
    locationLabels: { en: "Shanghai", ko: "상하이", ja: "上海", es: "Shanghái", "zh-CN": "上海" },
    workerNames: { minsoo: "明宇", jiyoung: "嘉怡", younghee: "雅婷", chulsoo: "子豪", hana: "欣怡" },
    workerContacts: { minsoo: "138 •••• 1042", jiyoung: "138 •••• 2084", younghee: "138 •••• 3168", chulsoo: "138 •••• 4275", hana: "138 •••• 5391" },
    wageReference: {
      hourly: 25,
      basis: "part-time-hourly-minimum",
      effectiveFrom: "2025-07-01",
      checkedAt: CHECKED_AT,
      sourceLabel: "Shanghai Municipal Human Resources and Social Security Bureau — minimum wage standard",
      sourceUrl: "https://www.shanghai.gov.cn/gwk/search/content/t0035_1434097",
      note: "The hourly statutory reference applies to non-full-time employment; the full-time minimum is monthly.",
    },
    wageRounding: 0.5,
    salesRounding: 100,
    defaultOccupancy: { baseRentMonthly: 28000, recurringFeesMonthly: 3200, deposit: 56000, leaseStart: "2026-04-01", leaseEnd: "2027-03-31", nextEscalationDate: "2027-01-01", nextEscalationRate: 0.05 },
    referenceProviders: {
      commodity: "China Ministry of Agriculture and Rural Affairs wholesale data",
      commoditySourceUrl: "https://data.moa.gov.cn/nyb/pc/index.jsp",
      rent: "Seeded commercial benchmark until a stable local provider is wired",
      weather: "OpenWeather or deterministic seed",
    },
  },
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

const availability = (rules: Array<[number, string, string]>): AvailabilityRule[] => rules.map(([weekday, start, end]) => ({ weekday: weekday as AvailabilityRule["weekday"], start, end, available: true }));

const WORKER_AVAILABILITY: Record<string, AvailabilityRule[]> = {
  minsoo: availability([[1, "07:00", "15:00"], [3, "07:00", "15:00"], [5, "17:00", "23:00"], [0, "08:00", "18:00"]]),
  jiyoung: availability([[1, "13:00", "21:00"], [3, "13:00", "21:00"], [5, "09:00", "19:00"], [0, "11:00", "21:00"]]),
  younghee: availability([[1, "09:00", "23:00"], [2, "09:00", "23:00"], [3, "09:00", "23:00"], [4, "09:00", "23:00"], [5, "09:00", "23:00"], [6, "09:00", "23:00"]]),
  chulsoo: availability([[2, "07:00", "15:00"], [4, "07:00", "15:00"], [5, "11:00", "19:00"], [6, "13:00", "23:00"]]),
  hana: availability([[2, "13:00", "21:00"], [4, "13:00", "21:00"], [6, "07:00", "17:00"], [0, "13:00", "23:00"]]),
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

export function getMarketLocation(market: MarketId, locale: UiLocale): string {
  return MARKET_PROFILES[market].locationLabels[locale];
}

export function getMarketCostScale(market: MarketId): number {
  return MARKET_PROFILES[market].wageReference.hourly / BASE_KRW_REFERENCE;
}

export function createMarketWorkers(market: MarketId): Worker[] {
  const profile = MARKET_PROFILES[market];
  const rate = (workerId: string) => roundTo(profile.wageReference.hourly * WORKER_MULTIPLIERS[workerId], profile.wageRounding);
  const name = (workerId: string) => profile.workerNames[workerId];
  const worker = (id: string, role: Worker["role"], preferredWeeklyHours: number, maxWeeklyHours: number): Worker => ({
    id,
    name: name(id),
    role,
    hourlyRate: rate(id),
    employmentType: role === "manager" ? "manager" : "hourly_part_time",
    regularAvailability: structuredClone(WORKER_AVAILABILITY[id]),
    availabilityExceptions: [],
    preferredWeeklyHours,
    maxWeeklyHours,
  });
  return [
    worker("minsoo", "barista", 24, 32),
    worker("jiyoung", "barista", 28, 36),
    worker("younghee", "manager", 40, 40),
    worker("chulsoo", "barista", 26, 36),
    worker("hana", "barista", 28, 36),
  ];
}

export function createMarketSales(market: MarketId): Record<string, number> {
  const profile = MARKET_PROFILES[market];
  const scale = profile.wageReference.hourly / BASE_KRW_REFERENCE;
  return Object.fromEntries(Object.entries(BASE_SALES_KRW).map(([day, value]) => [day, roundTo(value * scale, profile.salesRounding)]));
}
