import { getIndustryProfile, isIndustryId } from "@/industry/profiles";
import { createMarketSales, createMarketWorkers, getMarketProfile, isMarketId } from "@/market/profiles";
import type { AppState, IndustryId, MarketId, Shift, Worker } from "./model";

export const DEMO_WEEK = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30"];

export const DEMO_WORKERS: Worker[] = createMarketWorkers("kr-seoul");

const shift = (id: string, workerId: string, day: string, start: string, end: string, role: "barista" | "manager" = "barista"): Shift => ({
  id,
  workerId,
  start: `${day}T${start}:00`,
  end: `${day}T${end}:00`,
  role,
  status: "scheduled",
});

export const DEMO_SHIFTS: Shift[] = [
  shift("mon-minsoo-open", "minsoo", DEMO_WEEK[0], "08:00", "14:00"),
  shift("mon-jiyoung-close", "jiyoung", DEMO_WEEK[0], "14:00", "20:00"),
  shift("mon-younghee", "younghee", DEMO_WEEK[0], "10:00", "18:00", "manager"),
  shift("tue-chulsoo-open", "chulsoo", DEMO_WEEK[1], "08:00", "14:00"),
  shift("tue-hana-close", "hana", DEMO_WEEK[1], "14:00", "20:00"),
  shift("tue-younghee", "younghee", DEMO_WEEK[1], "10:00", "18:00", "manager"),
  shift("wed-minsoo-open", "minsoo", DEMO_WEEK[2], "08:00", "14:00"),
  shift("wed-jiyoung-close", "jiyoung", DEMO_WEEK[2], "14:00", "20:00"),
  shift("wed-younghee", "younghee", DEMO_WEEK[2], "10:00", "18:00", "manager"),
  shift("thu-chulsoo-open", "chulsoo", DEMO_WEEK[3], "08:00", "14:00"),
  shift("thu-hana-close", "hana", DEMO_WEEK[3], "14:00", "20:00"),
  shift("thu-younghee", "younghee", DEMO_WEEK[3], "10:00", "18:00", "manager"),
  shift("fri-jiyoung-day", "jiyoung", DEMO_WEEK[4], "10:00", "18:00"),
  shift("fri-chulsoo-day", "chulsoo", DEMO_WEEK[4], "12:00", "18:00"),
  shift("fri-minsoo-18", "minsoo", DEMO_WEEK[4], "18:00", "22:00"),
  shift("fri-younghee", "younghee", DEMO_WEEK[4], "14:00", "22:00", "manager"),
  shift("sat-hana-open", "hana", DEMO_WEEK[5], "08:00", "16:00"),
  shift("sat-chulsoo-close", "chulsoo", DEMO_WEEK[5], "14:00", "22:00"),
  shift("sat-younghee", "younghee", DEMO_WEEK[5], "12:00", "20:00", "manager"),
  shift("sun-minsoo", "minsoo", DEMO_WEEK[6], "09:00", "17:00"),
  shift("sun-jiyoung", "jiyoung", DEMO_WEEK[6], "12:00", "20:00"),
  shift("sun-hana", "hana", DEMO_WEEK[6], "14:00", "22:00"),
];

export function createDemoState(industry: IndustryId = "diner", market: MarketId = "kr-seoul"): AppState {
  if (!isIndustryId(industry)) throw new Error(`Unsupported industry profile: ${String(industry)}.`);
  if (!isMarketId(market)) throw new Error(`Unsupported market profile: ${String(market)}.`);
  const profile = getIndustryProfile(industry);
  const marketProfile = getMarketProfile(market);
  const workers = createMarketWorkers(market);
  const expectedSalesByDay = createMarketSales(market);
  const peakWindows = [
    { day: "2026-08-28", start: "19:00", end: "21:00", minCoverage: 2 },
    { day: "2026-08-29", start: "14:00", end: "18:00", minCoverage: 2 },
  ];
  return {
    schemaVersion: 1,
    business: {
      industry: profile.id,
      market: marketProfile.id,
      currency: marketProfile.currency,
      name: profile.businessName,
      employeeCount: workers.length,
      targetLaborRatio: 0.22,
      weeklyHourWarningThreshold: 40,
      expectedSalesByDay,
      peakWindows,
    },
    workers,
    shifts: structuredClone(DEMO_SHIFTS),
    demand: peakWindows.map((peak) => ({ ...peak, expectedSales: expectedSalesByDay[peak.day] })),
    preview: null,
    incident: null,
    activity: { state: "idle", message: "Schedule ready for review." },
  };
}
