import type { ReferenceObservation } from "@/domain/model";
import { INTL_LOCALE, type UiLocale } from "@/i18n";

export type EvidenceState = "db" | "live" | "recent" | "cached" | "benchmark" | "stale" | "missing" | "demo";

type Copy = {
  data: string;
  operation: string;
  states: Record<EvidenceState, string>;
  observed: string;
  fetched: string;
  stored: string;
  salesEvidence: string;
  dailySales: string;
  menuMix: string;
  source: string;
  date: string;
  netSales: string;
  orders: string;
  soldQty: string;
  foodCost: string;
  foodCostRatio: string;
  wasteCost: string;
  lossRate: string;
  reconciliation: string;
};

const COPY: Record<UiLocale, Copy> = {
  en: { data: "Data", operation: "Operation", states: { db: "DB", live: "LIVE", recent: "RECENT", cached: "CACHE", benchmark: "BENCH", stale: "STALE", missing: "—", demo: "DEMO" }, observed: "Observed", fetched: "Fetched", stored: "Stored", salesEvidence: "Sales evidence", dailySales: "Daily sales", menuMix: "Menu mix", source: "Source", date: "Date", netSales: "Net sales", orders: "Orders", soldQty: "Sold", foodCost: "Food cost", foodCostRatio: "Food cost %", wasteCost: "Waste cost", lossRate: "Loss %", reconciliation: "Unallocated sales" },
  ko: { data: "데이터", operation: "운영", states: { db: "DB", live: "LIVE", recent: "최근", cached: "CACHE", benchmark: "기준", stale: "오래됨", missing: "—", demo: "DEMO" }, observed: "관측", fetched: "수집", stored: "저장", salesEvidence: "매출 근거", dailySales: "일별 매출", menuMix: "메뉴 판매", source: "출처", date: "일자", netSales: "순매출", orders: "주문", soldQty: "판매수량", foodCost: "식재료비", foodCostRatio: "식재료비율", wasteCost: "로스 비용", lossRate: "로스율", reconciliation: "미배분 매출" },
  ja: { data: "データ", operation: "運営", states: { db: "DB", live: "LIVE", recent: "直近", cached: "CACHE", benchmark: "基準", stale: "古い", missing: "—", demo: "DEMO" }, observed: "観測", fetched: "取得", stored: "保存", salesEvidence: "売上根拠", dailySales: "日別売上", menuMix: "メニュー販売", source: "出典", date: "日付", netSales: "純売上", orders: "注文", soldQty: "販売数", foodCost: "食材費", foodCostRatio: "食材費率", wasteCost: "ロス費用", lossRate: "ロス率", reconciliation: "未配分売上" },
  es: { data: "Datos", operation: "Operación", states: { db: "DB", live: "LIVE", recent: "RECIENTE", cached: "CACHE", benchmark: "REF", stale: "ANTIGUO", missing: "—", demo: "DEMO" }, observed: "Observado", fetched: "Recogido", stored: "Guardado", salesEvidence: "Evidencia de ventas", dailySales: "Ventas diarias", menuMix: "Venta por menú", source: "Fuente", date: "Fecha", netSales: "Ventas netas", orders: "Pedidos", soldQty: "Vendidos", foodCost: "Coste comida", foodCostRatio: "% coste", wasteCost: "Merma", lossRate: "% merma", reconciliation: "Venta no asignada" },
  "zh-CN": { data: "数据", operation: "运营", states: { db: "DB", live: "LIVE", recent: "近期", cached: "CACHE", benchmark: "基准", stale: "过期", missing: "—", demo: "DEMO" }, observed: "观测", fetched: "采集", stored: "保存", salesEvidence: "销售依据", dailySales: "每日销售", menuMix: "菜单销售", source: "来源", date: "日期", netSales: "净销售额", orders: "订单", soldQty: "销量", foodCost: "食材成本", foodCostRatio: "食材成本率", wasteCost: "损耗成本", lossRate: "损耗率", reconciliation: "未分配销售额" },
};

export function getEvidenceCopy(locale: UiLocale) {
  return COPY[locale];
}

export function referenceEvidenceState(reference: ReferenceObservation | null | undefined): EvidenceState {
  if (!reference) return "missing";
  if (reference.provider === "fnb-master-2026" || reference.freshness === "seed") return "benchmark";
  if (reference.freshness === "live") return "live";
  if (reference.freshness === "recent") return "recent";
  if (reference.freshness === "cached") return "cached";
  return "stale";
}

export function formatEvidenceTime(locale: UiLocale, value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
