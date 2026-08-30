import type { AppState } from "@/domain/model";
import {
  inventoryAtRisk,
  occupancyMetrics,
  purchaseReferenceComparison,
  storeCostMetrics,
  type DailyBriefItem,
} from "@/domain/store-ops";
import { INTL_LOCALE, type UiLocale } from "@/i18n";

type BriefCopy = {
  ariaLabel: string;
  eyebrow: string;
  currentWeek: string;
  metrics: {
    sales: string;
    food: string;
    labor: string;
    weeklyBep: string;
  };
  resolvedIncident: string;
  resolvedIncidentDetail: string;
  plan: {
    changes: (changeCount: number, reviewCount: number) => string;
    reject: string;
    applyReviewed: string;
    reviewRequired: string;
    applyTitle: string;
    reviewTitle: string;
    purchaseNote: string;
    states: Record<string, string>;
    metrics: {
      labor: string;
      foodCost: string;
      purchaseCash: string;
      wasteExposure: string;
      breakEvenSales: string;
    };
  };
  analysis: {
    title: string;
    menu: string;
    inventory: string;
    item: string;
    status: string;
    sellingPrice: string;
    foodCost: string;
    foodCostRatio: string;
    target: string;
    aboveTarget: string;
    foodCostOnlyMargin: string;
    currentInventory: string;
    parLevel: string;
    daysOfCover: string;
    reorderRecommendation: string;
    actualPurchaseUnitCost: string;
    marketReference: string;
    versusReference: string;
    unitIssue: string;
    complete: string;
    dataIssue: string;
    noReference: string;
    noData: string;
  };
  domains: Record<DailyBriefItem["domain"], string>;
  severities: Record<DailyBriefItem["severity"], string>;
};

const COPY: Record<UiLocale, BriefCopy> = {
  en: {
    ariaLabel: "OwnerOps operating command center",
    eyebrow: "OwnerOps · operating brief",
    currentWeek: "Current week",
    metrics: { sales: "Sales", food: "Food", labor: "Labor", weeklyBep: "Weekly BEP" },
    resolvedIncident: "Resolved incident",
    resolvedIncidentDetail: "Call-out remains recorded as an availability exception/history; recovery is complete.",
    plan: {
      changes: (changes, reviews) => `${changes} changes · ${reviews} review flags`,
      reject: "Reject",
      applyReviewed: "Apply reviewed plan",
      reviewRequired: "Agent review required",
      applyTitle: "Apply the reviewed cross-domain plan",
      reviewTitle: "Ask the agent to evaluate the current plan first",
      purchaseNote: "purchases become planned POs until receipt",
      states: { draft: "DRAFT", reviewed: "REVIEWED", applied: "APPLIED", rejected: "REJECTED" },
      metrics: { labor: "Labor", foodCost: "Food cost", purchaseCash: "Purchase cash", wasteExposure: "Waste exposure", breakEvenSales: "Break-even sales" },
    },
    analysis: {
      title: "STOCK · COST ANALYSIS",
      menu: "Menu costing",
      inventory: "Inventory · purchasing",
      item: "Menu item",
      status: "Status",
      sellingPrice: "Selling price",
      foodCost: "Ingredient cost",
      foodCostRatio: "Food-cost %",
      target: "Target",
      aboveTarget: "Above target",
      foodCostOnlyMargin: "Food-cost-only margin",
      currentInventory: "On hand",
      parLevel: "Par",
      daysOfCover: "Days of cover",
      reorderRecommendation: "Reorder recommendation",
      actualPurchaseUnitCost: "Actual purchase unit cost",
      marketReference: "Market reference",
      versusReference: "Vs reference",
      unitIssue: "Unit check required",
      complete: "Complete",
      dataIssue: "Data check required",
      noReference: "No reference",
      noData: "—",
    },
    domains: { people: "PEOPLE", stock: "STOCK", sales: "SALES", operations: "OPERATIONS", context: "CONTEXT", costs: "COSTS" },
    severities: { info: "INFO", attention: "ATTENTION", urgent: "URGENT" },
  },
  ko: {
    ariaLabel: "OwnerOps 운영 커맨드 센터",
    eyebrow: "OwnerOps · 운영 브리프",
    currentWeek: "이번 주",
    metrics: { sales: "매출", food: "식재료비", labor: "인건비", weeklyBep: "주간 손익분기 매출" },
    resolvedIncident: "해결된 이슈",
    resolvedIncidentDetail: "결근 기록은 가용시간 예외/이력으로 유지되며 대응은 완료되었습니다.",
    plan: {
      changes: (changes, reviews) => `변경 ${changes}건 · 검토 ${reviews}건`,
      reject: "거절",
      applyReviewed: "검토된 계획 적용",
      reviewRequired: "에이전트 검토 필요",
      applyTitle: "검토된 통합 운영 계획 적용",
      reviewTitle: "먼저 에이전트에게 현재 계획을 검토하도록 요청하세요",
      purchaseNote: "구매안은 실제 입고 전까지 계획 발주로만 기록됩니다",
      states: { draft: "제안", reviewed: "검토 완료", applied: "적용됨", rejected: "거절됨" },
      metrics: { labor: "인건비", foodCost: "식재료비", purchaseCash: "구매 현금지출", wasteExposure: "폐기 손실", breakEvenSales: "손익분기 매출" },
    },
    analysis: {
      title: "재고 · 원가 분석",
      menu: "메뉴 원가",
      inventory: "재고 · 매입",
      item: "항목",
      status: "상태",
      sellingPrice: "판매가",
      foodCost: "식재료 원가",
      foodCostRatio: "원가율",
      target: "목표",
      aboveTarget: "목표 초과",
      foodCostOnlyMargin: "식재료비 차감 마진",
      currentInventory: "현재 재고",
      parLevel: "적정재고",
      daysOfCover: "재고 커버",
      reorderRecommendation: "발주 권고",
      actualPurchaseUnitCost: "실제 매입단가",
      marketReference: "시장 기준",
      versusReference: "기준 대비",
      unitIssue: "단위 확인 필요",
      complete: "완료",
      dataIssue: "데이터 확인 필요",
      noReference: "기준 없음",
      noData: "—",
    },
    domains: { people: "인력", stock: "재고", sales: "매출", operations: "운영", context: "외부 상황", costs: "비용" },
    severities: { info: "참고", attention: "확인 필요", urgent: "긴급" },
  },
  ja: {
    ariaLabel: "OwnerOps オペレーションコマンドセンター",
    eyebrow: "OwnerOps · オペレーション概要",
    currentWeek: "今週",
    metrics: { sales: "売上", food: "食材費", labor: "人件費", weeklyBep: "週間損益分岐売上" },
    resolvedIncident: "解決済みの事象",
    resolvedIncidentDetail: "欠勤記録は稼働可能時間の例外・履歴として残り、復旧対応は完了しています。",
    plan: {
      changes: (changes, reviews) => `変更 ${changes}件 · 確認 ${reviews}件`,
      reject: "却下",
      applyReviewed: "確認済みプランを適用",
      reviewRequired: "エージェント確認が必要",
      applyTitle: "確認済みの統合運用プランを適用",
      reviewTitle: "まずエージェントに現在のプランを確認させてください",
      purchaseNote: "購入は入荷するまで計画発注として扱われます",
      states: { draft: "提案", reviewed: "確認済み", applied: "適用済み", rejected: "却下済み" },
      metrics: { labor: "人件費", foodCost: "食材費", purchaseCash: "仕入現金支出", wasteExposure: "廃棄損失", breakEvenSales: "損益分岐売上" },
    },
    analysis: {
      title: "在庫 · 原価分析",
      menu: "メニュー原価",
      inventory: "在庫 · 仕入れ",
      item: "メニュー",
      status: "状態",
      sellingPrice: "販売価格",
      foodCost: "食材原価",
      foodCostRatio: "原価率",
      target: "目標",
      aboveTarget: "目標超過",
      foodCostOnlyMargin: "食材費控除後マージン",
      currentInventory: "現在庫",
      parLevel: "適正在庫",
      daysOfCover: "在庫カバー",
      reorderRecommendation: "発注推奨",
      actualPurchaseUnitCost: "実仕入単価",
      marketReference: "市場基準",
      versusReference: "基準差",
      unitIssue: "単位確認が必要",
      complete: "完了",
      dataIssue: "データ確認が必要",
      noReference: "基準なし",
      noData: "—",
    },
    domains: { people: "人員", stock: "在庫", sales: "売上", operations: "運用", context: "外部状況", costs: "コスト" },
    severities: { info: "参考", attention: "要確認", urgent: "緊急" },
  },
  es: {
    ariaLabel: "Centro de mando operativo de OwnerOps",
    eyebrow: "OwnerOps · resumen operativo",
    currentWeek: "Semana actual",
    metrics: { sales: "Ventas", food: "Coste de alimentos", labor: "Mano de obra", weeklyBep: "Punto de equilibrio semanal" },
    resolvedIncident: "Incidencia resuelta",
    resolvedIncidentDetail: "La ausencia queda registrada como excepción/historial de disponibilidad; la recuperación está completa.",
    plan: {
      changes: (changes, reviews) => `${changes} cambios · ${reviews} revisiones`,
      reject: "Rechazar",
      applyReviewed: "Aplicar plan revisado",
      reviewRequired: "Revisión del agente requerida",
      applyTitle: "Aplicar el plan operativo revisado",
      reviewTitle: "Pide primero al agente que evalúe el plan actual",
      purchaseNote: "las compras siguen como pedidos planificados hasta su recepción",
      states: { draft: "PROPUESTA", reviewed: "REVISADO", applied: "APLICADO", rejected: "RECHAZADO" },
      metrics: { labor: "Mano de obra", foodCost: "Coste de alimentos", purchaseCash: "Caja de compras", wasteExposure: "Exposición a merma", breakEvenSales: "Ventas de equilibrio" },
    },
    analysis: {
      title: "INVENTARIO · ANÁLISIS DE COSTES",
      menu: "Coste del menú",
      inventory: "Inventario · compras",
      item: "Menú",
      status: "Estado",
      sellingPrice: "Precio de venta",
      foodCost: "Coste de ingredientes",
      foodCostRatio: "% de coste de alimentos",
      target: "Objetivo",
      aboveTarget: "Sobre el objetivo",
      foodCostOnlyMargin: "Margen tras ingredientes",
      currentInventory: "Existencias",
      parLevel: "Nivel par",
      daysOfCover: "Días de cobertura",
      reorderRecommendation: "Recomendación de pedido",
      actualPurchaseUnitCost: "Coste unitario real",
      marketReference: "Referencia de mercado",
      versusReference: "Frente a referencia",
      unitIssue: "Revisar unidad",
      complete: "Completo",
      dataIssue: "Revisar datos",
      noReference: "Sin referencia",
      noData: "—",
    },
    domains: { people: "PERSONAS", stock: "INVENTARIO", sales: "VENTAS", operations: "OPERACIONES", context: "CONTEXTO", costs: "COSTES" },
    severities: { info: "INFO", attention: "ATENCIÓN", urgent: "URGENTE" },
  },
  "zh-CN": {
    ariaLabel: "OwnerOps 运营指挥中心",
    eyebrow: "OwnerOps · 运营简报",
    currentWeek: "本周",
    metrics: { sales: "销售额", food: "食材成本", labor: "人工成本", weeklyBep: "每周盈亏平衡销售额" },
    resolvedIncident: "已解决事项",
    resolvedIncidentDetail: "缺勤仍作为可用时间例外/历史记录保留，恢复处理已完成。",
    plan: {
      changes: (changes, reviews) => `${changes} 项变更 · ${reviews} 项待复核`,
      reject: "拒绝",
      applyReviewed: "应用已复核方案",
      reviewRequired: "需要智能体复核",
      applyTitle: "应用已复核的综合运营方案",
      reviewTitle: "请先让智能体评估当前方案",
      purchaseNote: "采购在实际收货前仅作为计划订单记录",
      states: { draft: "提案", reviewed: "已复核", applied: "已应用", rejected: "已拒绝" },
      metrics: { labor: "人工成本", foodCost: "食材成本", purchaseCash: "采购现金支出", wasteExposure: "报废损失", breakEvenSales: "盈亏平衡销售额" },
    },
    analysis: {
      title: "库存 · 成本分析",
      menu: "菜单成本",
      inventory: "库存 · 采购",
      item: "菜单",
      status: "状态",
      sellingPrice: "售价",
      foodCost: "食材成本",
      foodCostRatio: "食材成本率",
      target: "目标",
      aboveTarget: "超过目标",
      foodCostOnlyMargin: "扣除食材后的毛利",
      currentInventory: "当前库存",
      parLevel: "适量库存",
      daysOfCover: "库存覆盖",
      reorderRecommendation: "建议补货",
      actualPurchaseUnitCost: "实际采购单价",
      marketReference: "市场参考",
      versusReference: "相对参考",
      unitIssue: "需要确认单位",
      complete: "完整",
      dataIssue: "需要检查数据",
      noReference: "无参考",
      noData: "—",
    },
    domains: { people: "人员", stock: "库存", sales: "销售", operations: "运营", context: "外部情况", costs: "成本" },
    severities: { info: "参考", attention: "需关注", urgent: "紧急" },
  },
};

export function getOperatingBriefCopy(locale: UiLocale): BriefCopy {
  return COPY[locale];
}

export function operatingBriefMoney(locale: UiLocale, currency: string, value: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" || currency === "JPY" ? 0 : 2,
  }).format(value);
}

function number(locale: UiLocale, value: number, digits = 1): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function unit(locale: UiLocale, value: string): string {
  if (locale === "ko" && value === "ea") return "개";
  if (locale === "ja" && value === "ea") return "個";
  if (locale === "zh-CN" && value === "ea") return "个";
  return value;
}

function pick(locale: UiLocale, values: Record<UiLocale, string>): string {
  return values[locale];
}

export type LocalizedDailyBriefItem = Pick<DailyBriefItem, "id" | "sourceType" | "score" | "nextIntent"> & {
  domain: string;
  severity: string;
  title: string;
  evidence: string;
  estimatedImpact?: string;
};

export function localizeDailyBriefItem(locale: UiLocale, state: AppState, item: DailyBriefItem): LocalizedDailyBriefItem {
  const copy = getOperatingBriefCopy(locale);
  const base = {
    id: item.id,
    domain: copy.domains[item.domain],
    severity: copy.severities[item.severity],
    sourceType: item.sourceType,
    score: item.score,
    nextIntent: item.nextIntent,
  };

  if (item.nextIntent === "staff_recovery") {
    const incident = (state.incidents ?? []).find((value) => `brief-${value.id}` === item.id);
    const worker = state.workers.find((value) => value.id === incident?.workerId);
    const shift = state.shifts.find((value) => value.id === incident?.shiftId);
    const name = worker?.name ?? pick(locale, { en: "Worker", ko: "직원", ja: "スタッフ", es: "Empleado", "zh-CN": "员工" });
    const window = shift ? `${shift.start.slice(0, 10)} ${shift.start.slice(11, 16)}–${shift.end.slice(11, 16)}` : "";
    return {
      ...base,
      title: pick(locale, {
        en: `${name} unavailable`,
        ko: `${name} 결근`,
        ja: `${name}が欠勤`,
        es: `${name} no está disponible`,
        "zh-CN": `${name}无法出勤`,
      }),
      evidence: shift ? pick(locale, {
        en: `${window} is uncovered.`,
        ko: `${window}에 인력 공백이 있습니다.`,
        ja: `${window}の人員が未配置です。`,
        es: `${window} está sin cobertura.`,
        "zh-CN": `${window}存在人员缺口。`,
      }) : pick(locale, {
        en: "A staffing incident is still open.",
        ko: "아직 해결되지 않은 인력 이슈가 있습니다.",
        ja: "未解決の人員問題があります。",
        es: "Hay una incidencia de personal aún abierta.",
        "zh-CN": "仍有未解决的人员问题。",
      }),
    };
  }

  if (item.nextIntent === "inventory_reorder") {
    const risk = inventoryAtRisk(state).find((value) => `brief-stock-${value.item.id}` === item.id);
    if (risk) {
      const itemUnit = unit(locale, risk.item.unit);
      const cover = risk.daysOfCover === null
        ? pick(locale, { en: "usage history is limited", ko: "사용 이력이 부족함", ja: "使用履歴が不足", es: "historial de uso limitado", "zh-CN": "使用记录有限" })
        : pick(locale, {
          en: `${number(locale, risk.daysOfCover)} days of cover`,
          ko: `재고 커버 ${number(locale, risk.daysOfCover)}일`,
          ja: `在庫カバー ${number(locale, risk.daysOfCover)}日`,
          es: `${number(locale, risk.daysOfCover)} días de cobertura`,
          "zh-CN": `库存可支撑 ${number(locale, risk.daysOfCover)} 天`,
        });
      return {
        ...base,
        title: pick(locale, {
          en: `${risk.item.name} needs attention`,
          ko: `${risk.item.name} 재고 확인 필요`,
          ja: `${risk.item.name}の在庫確認が必要`,
          es: `Revisar inventario de ${risk.item.name}`,
          "zh-CN": `需要检查 ${risk.item.name} 库存`,
        }),
        evidence: pick(locale, {
          en: `${risk.item.onHand} ${risk.item.unit} on hand · ${cover} · ${risk.item.leadTimeDays} day lead time.`,
          ko: `보유 ${risk.item.onHand} ${itemUnit} · ${cover} · 리드타임 ${risk.item.leadTimeDays}일.`,
          ja: `在庫 ${risk.item.onHand} ${itemUnit} · ${cover} · リードタイム ${risk.item.leadTimeDays}日。`,
          es: `${risk.item.onHand} ${itemUnit} disponibles · ${cover} · plazo ${risk.item.leadTimeDays} días.`,
          "zh-CN": `现有 ${risk.item.onHand} ${itemUnit} · ${cover} · 交期 ${risk.item.leadTimeDays} 天。`,
        }),
        estimatedImpact: risk.reorderQuantity > 0 ? pick(locale, {
          en: `Reorder-to-par: ${number(locale, risk.reorderQuantity)} ${risk.item.unit}`,
          ko: `적정재고까지 발주: ${number(locale, risk.reorderQuantity)} ${itemUnit}`,
          ja: `適正在庫まで発注: ${number(locale, risk.reorderQuantity)} ${itemUnit}`,
          es: `Pedido hasta par: ${number(locale, risk.reorderQuantity)} ${itemUnit}`,
          "zh-CN": `补至目标库存: ${number(locale, risk.reorderQuantity)} ${itemUnit}`,
        }) : undefined,
      };
    }
  }

  if (item.nextIntent === "reduce_waste") {
    const inventoryItemId = item.id.replace("brief-waste-", "");
    const inventoryItem = (state.inventory ?? []).find((value) => value.id === inventoryItemId);
    const records = (state.waste ?? []).filter((value) => value.inventoryItemId === inventoryItemId).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    if (records.length >= 2) {
      const latest = records[0].quantity;
      const previous = records[1].quantity;
      const change = previous > 0 ? (latest / previous - 1) * 100 : 0;
      const itemUnit = unit(locale, inventoryItem?.unit ?? "units");
      const name = inventoryItem?.name ?? pick(locale, { en: "Inventory", ko: "재고", ja: "在庫", es: "Inventario", "zh-CN": "库存" });
      return {
        ...base,
        title: pick(locale, {
          en: `${name} waste increased`,
          ko: `${name} 폐기량 증가`,
          ja: `${name}の廃棄量が増加`,
          es: `Aumentó la merma de ${name}`,
          "zh-CN": `${name} 报废量增加`,
        }),
        evidence: pick(locale, {
          en: `${number(locale, latest)} vs ${number(locale, previous)} ${itemUnit} in the previous record (+${number(locale, change, 0)}%).`,
          ko: `최근 ${number(locale, latest)} ${itemUnit} · 이전 ${number(locale, previous)} ${itemUnit} 대비 +${number(locale, change, 0)}%.`,
          ja: `直近 ${number(locale, latest)} ${itemUnit} · 前回 ${number(locale, previous)} ${itemUnit}比 +${number(locale, change, 0)}%。`,
          es: `${number(locale, latest)} ${itemUnit} frente a ${number(locale, previous)} ${itemUnit} anteriormente (+${number(locale, change, 0)}%).`,
          "zh-CN": `最近 ${number(locale, latest)} ${itemUnit} · 上次 ${number(locale, previous)} ${itemUnit}，增加 ${number(locale, change, 0)}%。`,
        }),
      };
    }
  }

  if (item.nextIntent === "review_purchase_cost") {
    const inventoryItemId = item.id.replace("brief-reference-", "");
    const inventoryItem = (state.inventory ?? []).find((value) => value.id === inventoryItemId);
    const comparison = inventoryItem ? purchaseReferenceComparison(state, inventoryItem) : null;
    if (inventoryItem && comparison) {
      const actual = operatingBriefMoney(locale, state.business.currency, comparison.actualUnitCost);
      const referenceCurrency = comparison.reference.currency ?? state.business.currency;
      const reference = operatingBriefMoney(locale, referenceCurrency, Number(comparison.reference.value));
      return {
        ...base,
        title: pick(locale, {
          en: `${inventoryItem.name} purchase cost is above reference`,
          ko: `${inventoryItem.name} 매입가가 기준가보다 높음`,
          ja: `${inventoryItem.name}の仕入価格が基準価格を上回っています`,
          es: `El coste de compra de ${inventoryItem.name} supera la referencia`,
          "zh-CN": `${inventoryItem.name} 采购价高于参考价`,
        }),
        evidence: pick(locale, {
          en: `Store actual ${actual}/${inventoryItem.unit} vs ${comparison.reference.provider} reference ${reference}/${inventoryItem.unit} (+${number(locale, comparison.differenceRate * 100)}%).`,
          ko: `매장 실제 ${actual}/${unit(locale, inventoryItem.unit)} · ${comparison.reference.provider} 기준 ${reference}/${unit(locale, inventoryItem.unit)} · +${number(locale, comparison.differenceRate * 100)}%.`,
          ja: `店舗実績 ${actual}/${unit(locale, inventoryItem.unit)} · ${comparison.reference.provider}基準 ${reference}/${unit(locale, inventoryItem.unit)} · +${number(locale, comparison.differenceRate * 100)}%。`,
          es: `Real tienda ${actual}/${inventoryItem.unit} · referencia ${comparison.reference.provider} ${reference}/${inventoryItem.unit} · +${number(locale, comparison.differenceRate * 100)}%.`,
          "zh-CN": `门店实际 ${actual}/${unit(locale, inventoryItem.unit)} · ${comparison.reference.provider} 参考 ${reference}/${unit(locale, inventoryItem.unit)} · +${number(locale, comparison.differenceRate * 100)}%。`,
        }),
      };
    }
  }

  if (item.nextIntent === "review_cost_structure") {
    const costs = storeCostMetrics(state);
    return {
      ...base,
      title: pick(locale, {
        en: "Food + labor cost needs review",
        ko: "식재료비 + 인건비 구조 확인 필요",
        ja: "食材費 + 人件費の確認が必要",
        es: "Revisar coste de alimentos + mano de obra",
        "zh-CN": "需要检查食材 + 人工成本结构",
      }),
      evidence: pick(locale, {
        en: `FL Cost ${number(locale, costs.flCostRatio * 100)}% · food ${number(locale, costs.foodCostRatio * 100)}% · labor ${number(locale, costs.laborCostRatio * 100)}%.`,
        ko: `FL Cost ${number(locale, costs.flCostRatio * 100)}% · 식재료비 ${number(locale, costs.foodCostRatio * 100)}% · 인건비 ${number(locale, costs.laborCostRatio * 100)}%.`,
        ja: `FL Cost ${number(locale, costs.flCostRatio * 100)}% · 食材費 ${number(locale, costs.foodCostRatio * 100)}% · 人件費 ${number(locale, costs.laborCostRatio * 100)}%。`,
        es: `FL Cost ${number(locale, costs.flCostRatio * 100)}% · alimentos ${number(locale, costs.foodCostRatio * 100)}% · mano de obra ${number(locale, costs.laborCostRatio * 100)}%.`,
        "zh-CN": `FL Cost ${number(locale, costs.flCostRatio * 100)}% · 食材 ${number(locale, costs.foodCostRatio * 100)}% · 人工 ${number(locale, costs.laborCostRatio * 100)}%。`,
      }),
      estimatedImpact: pick(locale, {
        en: `Weekly break-even sales ${operatingBriefMoney(locale, state.business.currency, costs.weeklyBreakEvenSales)}`,
        ko: `주간 손익분기 매출 ${operatingBriefMoney(locale, state.business.currency, costs.weeklyBreakEvenSales)}`,
        ja: `週間損益分岐売上 ${operatingBriefMoney(locale, state.business.currency, costs.weeklyBreakEvenSales)}`,
        es: `Ventas semanales de equilibrio ${operatingBriefMoney(locale, state.business.currency, costs.weeklyBreakEvenSales)}`,
        "zh-CN": `每周盈亏平衡销售额 ${operatingBriefMoney(locale, state.business.currency, costs.weeklyBreakEvenSales)}`,
      }),
    };
  }

  if (item.nextIntent === "respond_to_weather" && state.context?.weather) {
    const weather = state.context.weather;
    const precipitation = number(locale, (weather.precipitationProbability ?? 0) * 100, 0);
    return {
      ...base,
      title: pick(locale, {
        en: "Rain may change the operating mix",
        ko: "비가 운영 패턴에 영향을 줄 수 있음",
        ja: "雨で運営パターンが変わる可能性があります",
        es: "La lluvia puede cambiar la operación",
        "zh-CN": "降雨可能改变运营节奏",
      }),
      evidence: pick(locale, {
        en: `${weather.summary} · ${precipitation}% precipitation probability · ${weather.provider}.`,
        ko: `${weather.summary} · 강수확률 ${precipitation}% · ${weather.provider}.`,
        ja: `${weather.summary} · 降水確率 ${precipitation}% · ${weather.provider}.`,
        es: `${weather.summary} · probabilidad de precipitación ${precipitation}% · ${weather.provider}.`,
        "zh-CN": `${weather.summary} · 降水概率 ${precipitation}% · ${weather.provider}.`,
      }),
    };
  }

  if (item.nextIntent === "occupancy_pressure") {
    const metrics = occupancyMetrics(state);
    return {
      ...base,
      title: pick(locale, {
        en: "Occupancy cost is a meaningful fixed-cost load",
        ko: "임차·점유비가 주요 고정비 부담",
        ja: "店舗占有コストが大きな固定費負担です",
        es: "El coste de ocupación supone una carga fija relevante",
        "zh-CN": "场地占用成本构成明显固定成本压力",
      }),
      evidence: pick(locale, {
        en: `Estimated occupancy-to-sales ${number(locale, metrics.occupancyToSales * 100)}% using the current weekly sales run-rate.`,
        ko: `현재 주간 매출 추세 기준 점유비/매출 비율 ${number(locale, metrics.occupancyToSales * 100)}%.`,
        ja: `現在の週間売上ペース基準で占有費/売上比率 ${number(locale, metrics.occupancyToSales * 100)}%。`,
        es: `Relación estimada ocupación/ventas ${number(locale, metrics.occupancyToSales * 100)}% con el ritmo semanal actual.`,
        "zh-CN": `按当前周销售趋势估算，占用成本/销售额为 ${number(locale, metrics.occupancyToSales * 100)}%。`,
      }),
      estimatedImpact: pick(locale, {
        en: `Monthly break-even sales: ${operatingBriefMoney(locale, state.business.currency, metrics.monthlyBreakEvenSales)}`,
        ko: `월 손익분기 매출: ${operatingBriefMoney(locale, state.business.currency, metrics.monthlyBreakEvenSales)}`,
        ja: `月間損益分岐売上: ${operatingBriefMoney(locale, state.business.currency, metrics.monthlyBreakEvenSales)}`,
        es: `Ventas mensuales de equilibrio: ${operatingBriefMoney(locale, state.business.currency, metrics.monthlyBreakEvenSales)}`,
        "zh-CN": `月度盈亏平衡销售额: ${operatingBriefMoney(locale, state.business.currency, metrics.monthlyBreakEvenSales)}`,
      }),
    };
  }

  return {
    ...base,
    title: item.title,
    evidence: item.evidence,
    estimatedImpact: item.estimatedImpact,
  };
}
