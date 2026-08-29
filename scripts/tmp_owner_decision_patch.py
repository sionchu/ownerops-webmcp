from pathlib import Path

app = Path('src/components/ownerops-app.tsx')
text = app.read_text()
old = '''function ImpactStrip({ impact }: { impact: PlanImpact }) {
  const { state, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const fridaySales = state.business.expectedSalesByDay["2026-08-28"];
  return <section className="impact-strip" aria-label={ui.top.liveSharedState}><Metric label={ui.metrics.estimatedWeeklyLabor} value={formatMoney(state, locale, impact.projectedLaborCost)} hint={`${impact.payrollDelta >= 0 ? "+" : ""}${formatMoney(state, locale, impact.payrollDelta)} · ${ui.metrics.currentComparison}`} /><Metric label={ui.metrics.fridayExpectedSales} value={formatMoney(state, locale, fridaySales)} hint={`${profile.copy.peakLabel} · 19:00–21:00`}/><Metric label={ui.metrics.estimatedLaborRatio} value={`${(impact.laborRatio * 100).toFixed(1)}%`} hint={`${(state.business.targetLaborRatio * 100).toFixed(0)}% ${ui.metrics.target}`} tone={impact.laborRatio > state.business.targetLaborRatio ? "warning" : "good"}/><Metric label={`${profile.copy.coverageLabel} ${ui.metrics.coverageStatus}`} value={impact.uncoveredPeakMinutes ? `${impact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.metrics.peakCovered} hint={`${impact.warnings.length} ${ui.metrics.reviewFlag}`} tone={impact.uncoveredPeakMinutes ? "warning" : "good"}/></section>;
}'''
new = '''function ImpactStrip({ impact }: { impact: PlanImpact }) {
  const { state, locale } = useAppState();
  const ui = getUiCopy(locale);
  const hasCandidate = Boolean(state.preview);
  const applied = state.activity.state === "applied";
  const recoveryCost = hasCandidate ? signedMoney(state, locale, impact.payrollDelta) : applied ? ui.metrics.committed : "—";
  const changeValue = hasCandidate ? String(impact.scheduleChangeCount) : applied ? ui.metrics.committed : "0";
  return <section className="impact-strip decision-strip" aria-label={ui.top.liveSharedState}>
    <Metric label={ui.metrics.coverage} value={impact.uncoveredPeakMinutes ? `${impact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.metrics.covered} hint={impact.uncoveredPeakMinutes ? ui.metrics.actionNeeded : ui.metrics.noGap} tone={impact.uncoveredPeakMinutes ? "warning" : "good"}/>
    <Metric label={ui.metrics.recoveryCost} value={recoveryCost} hint={hasCandidate ? ui.metrics.candidateImpact : applied ? ui.metrics.appliedPlan : ui.metrics.selectOption}/>
    <Metric label={ui.metrics.scheduleChanges} value={changeValue} hint={hasCandidate ? ui.metrics.candidateImpact : applied ? ui.metrics.appliedPlan : ui.metrics.liveSchedule}/>
    <Metric label={ui.metrics.reviewFlags} value={String(impact.warnings.length)} hint={impact.warnings.length ? ui.metrics.needsReview : ui.metrics.clear} tone={impact.warnings.length ? "warning" : "good"}/>
  </section>;
}'''
if old not in text:
    raise SystemExit('ImpactStrip source did not match expected master')
text = text.replace(old, new, 1)
text = text.replace('''    warningCount: visibleImpact.warnings.length,\n    laborRatio: visibleImpact.laborRatio,\n    incidentWindow: ui.timeline.fridayGap,''','''    warningCount: visibleImpact.warnings.length,\n    payrollDelta: visibleImpact.payrollDelta,\n    scheduleChangeCount: visibleImpact.scheduleChangeCount,\n    currencyCode: state.business.currency,\n    incidentWindow: ui.timeline.fridayGap,''', 1)
text = text.replace('''<div><Icon name="wallet"/><span>{ui.rail.laborRatio}</span><strong>{(visibleImpact.laborRatio * 100).toFixed(1)}%</strong></div>''','''<div><Icon name="refresh"/><span>{ui.scenario.changes}</span><strong>{visibleImpact.scheduleChangeCount}</strong></div>''', 1)
app.write_text(text)

dynamic = Path('src/i18n/dynamic.ts')
text = dynamic.read_text()
text = text.replace('''import type { AssistantState } from "@/domain/model";''','''import type { AssistantState, CurrencyCode } from "@/domain/model";''', 1)
text = text.replace('''  warningCount: number;\n  laborRatio: number;\n  incidentWindow: string;''','''  warningCount: number;\n  payrollDelta: number;\n  scheduleChangeCount: number;\n  currencyCode: CurrencyCode;\n  incidentWindow: string;''', 1)
start = text.index('function metricDetail(')
end = text.index('\n}\n\nexport function liveOperatingSummary', start) + 2
replacement = '''function metricDetail(locale: UiLocale, input: LiveOperatingSummaryInput): string {
  const currency = new Intl.NumberFormat(SUMMARY_INTL[locale], {
    style: "currency",
    currency: input.currencyCode,
    maximumFractionDigits: input.currencyCode === "KRW" || input.currencyCode === "JPY" ? 0 : 2,
  });
  const cost = `${input.payrollDelta >= 0 ? "+" : "−"}${currency.format(Math.abs(input.payrollDelta))}`;

  if (input.hasPreview) {
    switch (locale) {
      case "ko": return `피크 공백 ${input.uncoveredPeakMinutes}분 · 복구 비용 ${cost} · 변경 ${input.scheduleChangeCount}건 · 검토 ${input.warningCount}건`;
      case "ja": return `ピーク不足 ${input.uncoveredPeakMinutes}分 · 復旧コスト ${cost} · 変更 ${input.scheduleChangeCount}件 · レビュー ${input.warningCount}件`;
      case "es": return `Brecha punta ${input.uncoveredPeakMinutes} min · Coste de recuperación ${cost} · ${input.scheduleChangeCount} cambio${input.scheduleChangeCount === 1 ? "" : "s"} · ${input.warningCount} revisión${input.warningCount === 1 ? "" : "es"}`;
      case "zh-CN": return `高峰缺口 ${input.uncoveredPeakMinutes} 分钟 · 恢复成本 ${cost} · ${input.scheduleChangeCount} 项变更 · ${input.warningCount} 项待复核`;
      default: return `Peak gap ${input.uncoveredPeakMinutes} min · Recovery cost ${cost} · ${input.scheduleChangeCount} change${input.scheduleChangeCount === 1 ? "" : "s"} · ${input.warningCount} review item${input.warningCount === 1 ? "" : "s"}`;
    }
  }

  if (input.activityState === "applied") {
    switch (locale) {
      case "ko": return `피크 공백 ${input.uncoveredPeakMinutes}분 · 검토 ${input.warningCount}건 · 계획 확정`;
      case "ja": return `ピーク不足 ${input.uncoveredPeakMinutes}分 · レビュー ${input.warningCount}件 · プラン確定`;
      case "es": return `Brecha punta ${input.uncoveredPeakMinutes} min · ${input.warningCount} revisión${input.warningCount === 1 ? "" : "es"} · Plan confirmado`;
      case "zh-CN": return `高峰缺口 ${input.uncoveredPeakMinutes} 分钟 · ${input.warningCount} 项待复核 · 方案已提交`;
      default: return `Peak gap ${input.uncoveredPeakMinutes} min · ${input.warningCount} review item${input.warningCount === 1 ? "" : "s"} · Plan committed`;
    }
  }

  switch (locale) {
    case "ko": return `피크 공백 ${input.uncoveredPeakMinutes}분 · 검토 ${input.warningCount}건`;
    case "ja": return `ピーク不足 ${input.uncoveredPeakMinutes}分 · レビュー ${input.warningCount}件`;
    case "es": return `Brecha punta ${input.uncoveredPeakMinutes} min · ${input.warningCount} revisión${input.warningCount === 1 ? "" : "es"}`;
    case "zh-CN": return `高峰缺口 ${input.uncoveredPeakMinutes} 分钟 · ${input.warningCount} 项待复核`;
    default: return `Peak gap ${input.uncoveredPeakMinutes} min · ${input.warningCount} review item${input.warningCount === 1 ? "" : "s"}`;
  }
}'''
text = text[:start] + replacement + text[end:]
dynamic.write_text(text)

i18n = Path('src/i18n/index.ts')
text = i18n.read_text()
old_type = '''  metrics: {\n    estimatedWeeklyLabor: string;\n    currentComparison: string;\n    fridayExpectedSales: string;\n    estimatedLaborRatio: string;\n    target: string;\n    coverageStatus: string;\n    peakCovered: string;\n    reviewFlag: string;\n  };'''
new_type = '''  metrics: {\n    coverage: string;\n    recoveryCost: string;\n    scheduleChanges: string;\n    reviewFlags: string;\n    covered: string;\n    noGap: string;\n    actionNeeded: string;\n    candidateImpact: string;\n    selectOption: string;\n    committed: string;\n    appliedPlan: string;\n    liveSchedule: string;\n    needsReview: string;\n    clear: string;\n  };'''
if old_type not in text:
    raise SystemExit('UiCopy metrics type did not match expected master')
text = text.replace(old_type, new_type, 1)
repls = {
'''metrics: { estimatedWeeklyLabor: "Estimated weekly labor", currentComparison: "in current comparison", fridayExpectedSales: "Friday expected sales", estimatedLaborRatio: "Estimated labor ratio", target: "target", coverageStatus: "status", peakCovered: "Peak covered", reviewFlag: "review flag" }''': '''metrics: { coverage: "Coverage", recoveryCost: "Recovery cost", scheduleChanges: "Schedule changes", reviewFlags: "Review flags", covered: "Covered", noGap: "No peak gap", actionNeeded: "Action needed", candidateImpact: "Current candidate", selectOption: "Select a recovery option", committed: "Committed", appliedPlan: "Applied plan", liveSchedule: "Live schedule", needsReview: "Needs review", clear: "Clear" }''',
'''metrics: { estimatedWeeklyLabor: "예상 주간 인건비", currentComparison: "현재 비교안 기준", fridayExpectedSales: "금요일 예상 매출", estimatedLaborRatio: "예상 인건비 비율", target: "목표", coverageStatus: "상태", peakCovered: "피크 커버 완료", reviewFlag: "검토 항목" }''': '''metrics: { coverage: "커버리지", recoveryCost: "복구 비용", scheduleChanges: "스케줄 변경", reviewFlags: "검토 항목", covered: "커버 완료", noGap: "피크 공백 없음", actionNeeded: "조치 필요", candidateImpact: "현재 후보 기준", selectOption: "대응 옵션을 선택하세요", committed: "확정", appliedPlan: "적용된 계획", liveSchedule: "현재 스케줄", needsReview: "검토 필요", clear: "이상 없음" }''',
'''metrics: { estimatedWeeklyLabor: "推定週間人件費", currentComparison: "現在の比較案", fridayExpectedSales: "金曜の予想売上", estimatedLaborRatio: "推定人件費率", target: "目標", coverageStatus: "ステータス", peakCovered: "ピークをカバー", reviewFlag: "レビュー項目" }''': '''metrics: { coverage: "カバレッジ", recoveryCost: "復旧コスト", scheduleChanges: "スケジュール変更", reviewFlags: "レビュー項目", covered: "対応済み", noGap: "ピーク不足なし", actionNeeded: "対応が必要", candidateImpact: "現在の候補", selectOption: "対応案を選択", committed: "確定済み", appliedPlan: "適用済みプラン", liveSchedule: "現在のスケジュール", needsReview: "確認が必要", clear: "問題なし" }''',
'''metrics: { estimatedWeeklyLabor: "Coste laboral semanal estimado", currentComparison: "en la comparación actual", fridayExpectedSales: "Ventas esperadas del viernes", estimatedLaborRatio: "Ratio laboral estimado", target: "objetivo", coverageStatus: "estado", peakCovered: "Pico cubierto", reviewFlag: "elemento a revisar" }''': '''metrics: { coverage: "Cobertura", recoveryCost: "Coste de recuperación", scheduleChanges: "Cambios de horario", reviewFlags: "Alertas de revisión", covered: "Cubierto", noGap: "Sin brecha punta", actionNeeded: "Requiere acción", candidateImpact: "Candidato actual", selectOption: "Elige una opción de recuperación", committed: "Confirmado", appliedPlan: "Plan aplicado", liveSchedule: "Horario actual", needsReview: "Requiere revisión", clear: "Sin alertas" }''',
'''metrics: { estimatedWeeklyLabor: "预计每周人工成本", currentComparison: "当前比较方案", fridayExpectedSales: "周五预计销售额", estimatedLaborRatio: "预计人工成本率", target: "目标", coverageStatus: "状态", peakCovered: "高峰已覆盖", reviewFlag: "审核项" }''': '''metrics: { coverage: "覆盖情况", recoveryCost: "恢复成本", scheduleChanges: "排班变更", reviewFlags: "复核项", covered: "已覆盖", noGap: "高峰无缺口", actionNeeded: "需要处理", candidateImpact: "当前方案", selectOption: "请选择恢复方案", committed: "已提交", appliedPlan: "已应用方案", liveSchedule: "当前排班", needsReview: "需要复核", clear: "无异常" }''',
}
for a,b in repls.items():
    if a not in text:
        raise SystemExit('Missing metrics locale block: ' + a[:50])
    text = text.replace(a,b,1)

copy_repls = {
'''restoresCoverage: (ratio) => `Restores peak coverage with one schedule change; estimated labor ratio ${ratio}.`''': '''restoresCoverage: (_ratio) => `Restores peak coverage with one schedule change.`''',
'''restoresCoverage: (ratio) => `한 번의 스케줄 변경으로 피크 커버리지를 복구합니다. 예상 인건비 비율 ${ratio}.`''': '''restoresCoverage: (_ratio) => `한 번의 스케줄 변경으로 피크 커버리지를 복구합니다.`''',
'''restoresCoverage: (ratio) => `1回の変更でピークをカバー。推定人件費率 ${ratio}。`''': '''restoresCoverage: (_ratio) => `1回の変更でピークをカバーします。`''',
'''restoresCoverage: (ratio) => `Recupera la cobertura punta con un cambio; ratio estimado ${ratio}.`''': '''restoresCoverage: (_ratio) => `Recupera la cobertura punta con un solo cambio.`''',
'''restoresCoverage: (ratio) => `通过一次排班变更恢复高峰覆盖；预计人工成本率 ${ratio}。`''': '''restoresCoverage: (_ratio) => `通过一次排班变更恢复高峰覆盖。`''',
}
for a,b in copy_repls.items():
    if a not in text:
        raise SystemExit('Missing restoresCoverage locale block')
    text = text.replace(a,b,1)
i18n.write_text(text)

css = Path('src/styles/locale-timeline.css')
text = css.read_text()
text += '''\n\n/* Owner decision surface: prioritize scan speed over decorative motion. */\n.decision-strip { gap: 14px; margin-bottom: 22px; }\n.decision-strip .metric > span { font-weight: 800; letter-spacing: .045em; text-transform: uppercase; }\n.decision-strip .metric strong { font-size: clamp(22px, 2.15vw, 30px); }\n.decision-strip .metric small { margin-top: 3px; }\n.scenario-row { animation-duration: 180ms; }\n.scenario-row:nth-child(2) { animation-delay: 25ms; }\n.scenario-row:nth-child(3) { animation-delay: 50ms; }\n.shift-chip.preview { animation-duration: 150ms; }\n.shift-chip.preview.candidate-human-edit { animation-duration: 150ms; }\n.shift-chip.preview.candidate-reviewed { animation-duration: 180ms; }\n@media (max-width: 650px) { .decision-strip { gap: 12px; margin-bottom: 18px; } }\n'''
css.write_text(text)

test = Path('tests/i18n.test.ts')
text = test.read_text()
text = text.replace('''warningCount: 1,\n      laborRatio: 0.158,\n      incidentWindow: "金 18:00–22:00",''','''warningCount: 1,\n      payrollDelta: 0,\n      scheduleChangeCount: 0,\n      currencyCode: "JPY",\n      incidentWindow: "金 18:00–22:00",''')
text = text.replace('''warningCount: 2,\n      laborRatio: 0.171,\n      incidentWindow: "vie 18:00–22:00",''','''warningCount: 2,\n      payrollDelta: 0,\n      scheduleChangeCount: 0,\n      currencyCode: "EUR",\n      incidentWindow: "vie 18:00–22:00",''')
text = text.replace('''warningCount: 1,\n      laborRatio: 0.164,\n      incidentWindow: "금 18:00–22:00",''','''warningCount: 1,\n      payrollDelta: 84000,\n      scheduleChangeCount: 1,\n      currencyCode: "KRW",\n      incidentWindow: "금 18:00–22:00",''')
text = text.replace('''expect(stable.detail).toContain("人件費率");''','''expect(stable.detail).not.toContain("人件費率");\n    expect(stable.detail).toContain("レビュー");''')
text = text.replace('''expect(reviewed.detail).toContain("승인 전까지");''','''expect(reviewed.detail).toContain("복구 비용");''')
test.write_text(text)
