from pathlib import Path

impact = Path('src/domain/impact.ts')
text = impact.read_text()
old = 'export function calculateImpact(state: AppState, shifts = state.shifts, baselineShifts = state.shifts): PlanImpact {'
new = '''export function decisionBaselineShifts(state: AppState): Shift[] {
  if (!state.incident) return state.shifts;
  return state.shifts.map((shift) => shift.id === state.incident?.shiftId
    ? { ...shift, workerId: state.incident.workerId, status: "scheduled" as const }
    : shift);
}

export function calculateImpact(state: AppState, shifts = state.shifts, baselineShifts = decisionBaselineShifts(state)): PlanImpact {'''
if old not in text:
    raise SystemExit('calculateImpact signature not found')
text = text.replace(old, new, 1)
impact.write_text(text)

for filename in ['src/domain/actions.ts', 'src/state/app-state.tsx', 'src/webmcp/register-tools.ts', 'tests/integration.test.ts']:
    path = Path(filename)
    text = path.read_text()
    text = text.replace('calculateImpact(state, applyChanges(state.shifts, changes), state.shifts)', 'calculateImpact(state, applyChanges(state.shifts, changes))')
    text = text.replace('calculateImpact(state, proposed, state.shifts)', 'calculateImpact(state, proposed)')
    text = text.replace('calculateImpact(state, planShifts, state.shifts)', 'calculateImpact(state, planShifts)')
    text = text.replace('calculateImpact(web.getState(), applyChanges(web.getState().shifts, previewBeforeReview.changes), web.getState().shifts)', 'calculateImpact(web.getState(), applyChanges(web.getState().shifts, previewBeforeReview.changes))')
    path.write_text(text)

market = Path('src/market/profiles.ts')
text = market.read_text()
old = '  workerNames: Record<string, string>;\n  wageReference: WageReference;'
new = '  workerNames: Record<string, string>;\n  workerContacts: Record<string, string>;\n  wageReference: WageReference;'
if old not in text:
    raise SystemExit('MarketProfile workerNames type not found')
text = text.replace(old, new, 1)
contacts = {
    'workerNames: { minsoo: "민수", jiyoung: "지영", younghee: "영희", chulsoo: "철수", hana: "하나" },': 'workerNames: { minsoo: "민수", jiyoung: "지영", younghee: "영희", chulsoo: "철수", hana: "하나" },\n    workerContacts: { minsoo: "010-••••-1042", jiyoung: "010-••••-2084", younghee: "010-••••-3168", chulsoo: "010-••••-4275", hana: "010-••••-5391" },',
    'workerNames: { minsoo: "Mason", jiyoung: "Jamie", younghee: "Taylor", chulsoo: "Chris", hana: "Hannah" },': 'workerNames: { minsoo: "Mason", jiyoung: "Jamie", younghee: "Taylor", chulsoo: "Chris", hana: "Hannah" },\n    workerContacts: { minsoo: "+1 (212) 555-0101", jiyoung: "+1 (212) 555-0102", younghee: "+1 (212) 555-0103", chulsoo: "+1 (212) 555-0104", hana: "+1 (212) 555-0105" },',
    'workerNames: { minsoo: "蓮", jiyoung: "葵", younghee: "美咲", chulsoo: "翔太", hana: "花" },': 'workerNames: { minsoo: "蓮", jiyoung: "葵", younghee: "美咲", chulsoo: "翔太", hana: "花" },\n    workerContacts: { minsoo: "090-••••-1042", jiyoung: "090-••••-2084", younghee: "090-••••-3168", chulsoo: "090-••••-4275", hana: "090-••••-5391" },',
    'workerNames: { minsoo: "Mateo", jiyoung: "Lucía", younghee: "Carmen", chulsoo: "Diego", hana: "Ana" },': 'workerNames: { minsoo: "Mateo", jiyoung: "Lucía", younghee: "Carmen", chulsoo: "Diego", hana: "Ana" },\n    workerContacts: { minsoo: "+34 600 ••• 142", jiyoung: "+34 600 ••• 284", younghee: "+34 600 ••• 368", chulsoo: "+34 600 ••• 475", hana: "+34 600 ••• 591" },',
    'workerNames: { minsoo: "明宇", jiyoung: "嘉怡", younghee: "雅婷", chulsoo: "子豪", hana: "欣怡" },': 'workerNames: { minsoo: "明宇", jiyoung: "嘉怡", younghee: "雅婷", chulsoo: "子豪", hana: "欣怡" },\n    workerContacts: { minsoo: "138 •••• 1042", jiyoung: "138 •••• 2084", younghee: "138 •••• 3168", chulsoo: "138 •••• 4275", hana: "138 •••• 5391" },',
}
for a, b in contacts.items():
    if a not in text:
        raise SystemExit('market workerNames block missing: ' + a[:40])
    text = text.replace(a, b, 1)
market.write_text(text)

dynamic = Path('src/i18n/dynamic.ts')
text = dynamic.read_text()
marker = 'export function unavailableLabel(locale: UiLocale, name: string): string {'
if marker not in text:
    raise SystemExit('dynamic insertion marker missing')
outreach = '''export function getOutreachCopy(locale: UiLocale) {
  switch (locale) {
    case "ko": return { prepare: "연락 준비", title: "대체 근무 연락 초안", demoContact: "예제 연락처", shiftPay: "대체근무 임금", originalPay: "원래 근무 임금", hourlyRate: "시급", copy: "문자 초안 복사", copied: "복사됨", draftOnly: "데모 초안만 생성됩니다. 실제 문자나 전화는 전송되지 않습니다.", wageBasis: "순 임금 영향은 이 데모에서 결근 시간을 무급으로 가정하고 원래 배정자 임금과 비교합니다." };
    case "ja": return { prepare: "連絡を準備", title: "代替勤務の連絡下書き", demoContact: "デモ連絡先", shiftPay: "代替シフト賃金", originalPay: "元のシフト賃金", hourlyRate: "時給", copy: "メッセージ下書きをコピー", copied: "コピー済み", draftOnly: "デモ用の下書きのみ作成します。実際のSMSや電話は送信されません。", wageBasis: "純賃金差は、このデモでは欠勤時間を無給として元の担当者の賃金と比較します。" };
    case "es": return { prepare: "Preparar contacto", title: "Borrador para cubrir el turno", demoContact: "Contacto de demo", shiftPay: "Coste del turno sustituto", originalPay: "Coste del turno original", hourlyRate: "Tarifa por hora", copy: "Copiar borrador", copied: "Copiado", draftOnly: "Solo se prepara un borrador de demo. No se envía ningún SMS ni llamada real.", wageBasis: "El impacto salarial neto supone, solo para esta demo, que las horas de ausencia no se pagan y se compara con el coste original." };
    case "zh-CN": return { prepare: "准备联系", title: "替班联系草稿", demoContact: "演示联系方式", shiftPay: "替班工资", originalPay: "原排班工资", hourlyRate: "时薪", copy: "复制短信草稿", copied: "已复制", draftOnly: "仅生成演示草稿，不会实际发送短信或拨打电话。", wageBasis: "净工资影响在本演示中假设缺勤时段不计薪，并与原排班员工工资进行比较。" };
    default: return { prepare: "Prepare contact", title: "Coverage outreach draft", demoContact: "Demo contact", shiftPay: "Replacement shift pay", originalPay: "Original shift pay", hourlyRate: "Hourly rate", copy: "Copy message draft", copied: "Copied", draftOnly: "Demo draft only. No real SMS or phone call is sent.", wageBasis: "Net wage impact assumes unpaid call-out hours in this demo and compares against the originally assigned worker." };
  }
}

export function outreachDraft(locale: UiLocale, businessName: string, workerName: string, dayLabel: string, start: string, end: string): string {
  switch (locale) {
    case "ko": return `${workerName}님, ${businessName}입니다. ${dayLabel} ${start}–${end} 대체 근무 가능하신가요? 가능 여부를 알려주세요.`;
    case "ja": return `${workerName}さん、${businessName}です。${dayLabel} ${start}–${end} の代替シフトに入れますか？対応可能か教えてください。`;
    case "es": return `Hola ${workerName}, soy de ${businessName}. ¿Puedes cubrir el turno del ${dayLabel}, de ${start} a ${end}? Confírmame si estás disponible.`;
    case "zh-CN": return `${workerName}，这里是${businessName}。你能否顶替 ${dayLabel} ${start}–${end} 的班次？请回复是否有空。`;
    default: return `Hi ${workerName}, this is ${businessName}. Can you cover the ${dayLabel} shift from ${start}–${end}? Please let me know if you're available.`;
  }
}

'''
text = text.replace(marker, outreach + marker, 1)
for a,b in {'Recovery cost':'Net wage impact','복구 비용':'순 임금 영향','復旧コスト':'純賃金差','Coste de recuperación':'Impacto salarial neto','恢复成本':'净工资影响'}.items():
    text = text.replace(a,b)
dynamic.write_text(text)

i18n = Path('src/i18n/index.ts')
text = i18n.read_text()
for a,b in {
    'addedPayroll: "Recovery cost"':'addedPayroll: "Net wage impact"',
    'addedPayroll: "복구 비용"':'addedPayroll: "순 임금 영향"',
    'addedPayroll: "復旧コスト"':'addedPayroll: "純賃金差"',
    'addedPayroll: "Coste de recuperación"':'addedPayroll: "Impacto salarial neto"',
    'addedPayroll: "恢复成本"':'addedPayroll: "净工资影响"',
    'addedPayroll: "Added payroll"':'addedPayroll: "Net wage impact"',
    'addedPayroll: "추가 인건비"':'addedPayroll: "순 임금 영향"',
    'addedPayroll: "追加人件費"':'addedPayroll: "純賃金差"',
    'addedPayroll: "Coste añadido"':'addedPayroll: "Impacto salarial neto"',
    'addedPayroll: "新增人工成本"':'addedPayroll: "净工资影响"',
    'recoveryCost: "Recovery cost"':'recoveryCost: "Net wage impact"',
    'recoveryCost: "복구 비용"':'recoveryCost: "순 임금 영향"',
    'recoveryCost: "復旧コスト"':'recoveryCost: "純賃金差"',
    'recoveryCost: "Coste de recuperación"':'recoveryCost: "Impacto salarial neto"',
    'recoveryCost: "恢复成本"':'recoveryCost: "净工资影响"',
    'payroll: "payroll"':'payroll: "net wage"',
    'payroll: "인건비"':'payroll: "순 임금"',
    'payroll: "人件費"':'payroll: "純賃金"',
    'payroll: "coste"':'payroll: "impacto salarial"',
    'payroll: "人工成本"':'payroll: "净工资"',
    'rankedBy: "Ranked by coverage, warnings, cost, and changes"':'rankedBy: "Ranked by coverage, warnings, net wage impact, and changes"',
}.items():
    text = text.replace(a,b)
i18n.write_text(text)

app = Path('src/components/ownerops-app.tsx')
text = app.read_text()
text = text.replace('import { applyChanges } from "@/domain/impact";', 'import { applyChanges, hoursBetween } from "@/domain/impact";', 1)
text = text.replace('import { disruptionBody, liveOperatingSummary, markUnavailableLabel, marketScheduleContext, minimumWageLabel, suggestedIncidentPrompt, unavailableLabel } from "@/i18n/dynamic";', 'import { disruptionBody, getOutreachCopy, liveOperatingSummary, markUnavailableLabel, marketScheduleContext, minimumWageLabel, outreachDraft, suggestedIncidentPrompt, unavailableLabel } from "@/i18n/dynamic";', 1)
old = '''function ScenarioPanel() {
  const { state, scenarios, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const incidentShift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  const incidentWorker = state.workers.find((worker) => worker.id === (state.incident?.workerId ?? "minsoo"));'''
new = '''function ScenarioPanel() {
  const { state, scenarios, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const market = getMarketProfile(state.business.market);
  const outreach = getOutreachCopy(locale);
  const [outreachScenarioId, setOutreachScenarioId] = useState<string | null>(null);
  const [outreachCopied, setOutreachCopied] = useState(false);
  const incidentShift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  const incidentWorker = state.workers.find((worker) => worker.id === (state.incident?.workerId ?? "minsoo"));'''
if old not in text:
    raise SystemExit('ScenarioPanel header not found')
text = text.replace(old, new, 1)
old = '''          const start = incidentShift ? formatTime(incidentShift.start) : "18:00";
          const end = incidentShift ? formatTime(incidentShift.end) : "22:00";
          return <article key={scenario.id} className={`scenario-row ${state.preview?.scenarioId === scenario.id ? "selected" : ""}`}>
            <div className="rank">{index + 1}</div><div className="scenario-main"><div><strong>{ui.scenario.coversShift(replacementName)}</strong>{index === 0 && <span className="recommended">{ui.scenario.recommended}</span>}</div><p>{ui.scenario.takesShift(replacementName, start, end)}</p><small>{ui.scenario.restoresCoverage(`${(scenario.impact.laborRatio * 100).toFixed(1)}%`)}</small></div>
            <div className="scenario-stat"><span>{ui.scenario.addedPayroll}</span><strong>{formatMoney(state, locale, scenario.impact.payrollDelta)}</strong></div>
            <div className="scenario-stat"><span>{ui.scenario.weeklyHours}</span><strong>{replacement ? `${scenario.impact.workerWeeklyHours[replacement.id]} h` : "—"}</strong></div>
            <div className="scenario-stat"><span>{profile.copy.peakLabel} {ui.scenario.gap}</span><strong>{scenario.impact.uncoveredPeakMinutes} min</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.warnings}</span><strong>{scenario.impact.warnings.length}</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.changes}</span><strong>{scenario.impact.scheduleChangeCount}</strong></div>
            <button className="secondary compact" onClick={() => runAction({ type: "preview_scenario", scenarioId: scenario.id })}>{state.preview?.scenarioId === scenario.id ? ui.scenario.previewing : ui.scenario.preview}</button>
          </article>;'''
new = '''          const start = incidentShift ? formatTime(incidentShift.start) : "18:00";
          const end = incidentShift ? formatTime(incidentShift.end) : "22:00";
          const shiftHours = incidentShift ? hoursBetween(incidentShift.start, incidentShift.end) : 0;
          const replacementShiftPay = replacement ? replacement.hourlyRate * shiftHours : 0;
          const originalShiftPay = incidentWorker ? incidentWorker.hourlyRate * shiftHours : 0;
          return <article key={scenario.id} className={`scenario-row ${state.preview?.scenarioId === scenario.id ? "selected" : ""}`}>
            <div className="rank">{index + 1}</div><div className="scenario-main"><div><strong>{ui.scenario.coversShift(replacementName)}</strong>{index === 0 && <span className="recommended">{ui.scenario.recommended}</span>}</div><p>{ui.scenario.takesShift(replacementName, start, end)}</p><div className="scenario-wage-context"><span>{outreach.hourlyRate} {replacement ? `${formatMoney(state, locale, replacement.hourlyRate)}/h` : "—"}</span><span>{outreach.shiftPay} {formatMoney(state, locale, replacementShiftPay)}</span><span>{outreach.originalPay} {formatMoney(state, locale, originalShiftPay)}</span></div><small>{ui.scenario.restoresCoverage(`${(scenario.impact.laborRatio * 100).toFixed(1)}%`)}</small></div>
            <div className="scenario-stat" title={outreach.wageBasis}><span>{ui.scenario.addedPayroll}</span><strong>{signedMoney(state, locale, scenario.impact.payrollDelta)}</strong></div>
            <div className="scenario-stat"><span>{ui.scenario.weeklyHours}</span><strong>{replacement ? `${scenario.impact.workerWeeklyHours[replacement.id]} h` : "—"}</strong></div>
            <div className="scenario-stat"><span>{profile.copy.peakLabel} {ui.scenario.gap}</span><strong>{scenario.impact.uncoveredPeakMinutes} min</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.warnings}</span><strong>{scenario.impact.warnings.length}</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.changes}</span><strong>{scenario.impact.scheduleChangeCount}</strong></div>
            <div className="scenario-actions"><button className="secondary compact" onClick={() => runAction({ type: "preview_scenario", scenarioId: scenario.id })}>{state.preview?.scenarioId === scenario.id ? ui.scenario.previewing : ui.scenario.preview}</button><button className="secondary compact outreach-button" onClick={() => { setOutreachScenarioId(scenario.id); setOutreachCopied(false); }}>{outreach.prepare}</button></div>
          </article>;'''
if old not in text:
    raise SystemExit('Scenario row block not found')
text = text.replace(old, new, 1)
old = '''      </div>
    </section>
  );
}

function ImpactStrip'''
new = '''      </div>
      {outreachScenarioId && (() => {
        const selected = scenarios.find((scenario) => scenario.id === outreachScenarioId);
        const replacementId = selected?.changes[0]?.workerId;
        const replacement = state.workers.find((worker) => worker.id === replacementId);
        if (!selected || !replacement || !incidentShift) return null;
        const start = formatTime(incidentShift.start);
        const end = formatTime(incidentShift.end);
        const dayLabel = formatDay(locale, shiftDay(incidentShift), { weekday: "long", month: "short", day: "numeric" });
        const message = outreachDraft(locale, state.business.name, replacement.name, dayLabel, start, end);
        const contact = market.workerContacts[replacement.id] ?? "—";
        return <section className="outreach-draft" aria-label={outreach.title}><div className="outreach-head"><div><span className="eyebrow">{outreach.demoContact}</span><h3>{outreach.title}</h3></div><strong>{replacement.name} · {contact}</strong></div><p>{message}</p><div className="outreach-footer"><small>{outreach.draftOnly}</small><button className="secondary compact" onClick={async () => { try { await navigator.clipboard.writeText(message); setOutreachCopied(true); } catch { setOutreachCopied(false); } }}>{outreachCopied ? outreach.copied : outreach.copy}</button></div></section>;
      })()}
    </section>
  );
}

function ImpactStrip'''
if old not in text:
    raise SystemExit('ScenarioPanel closing block not found')
text = text.replace(old, new, 1)
app.write_text(text)

css = Path('src/styles/locale-timeline.css')
text = css.read_text()
text += '''\n\n/* Decision evidence + outreach scaffold. */\n.scenario-wage-context { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 5px; font-size: 11px; color: var(--secondary); }\n.scenario-wage-context span { white-space: nowrap; }\n.scenario-actions { display: grid; gap: 6px; align-self: center; }\n.outreach-button { white-space: nowrap; }\n.outreach-draft { margin-top: 12px; padding: 16px 18px; border: 1px solid color-mix(in srgb, var(--oo-accent) 24%, var(--oo-border)); border-radius: var(--oo-radius-card); background: color-mix(in srgb, var(--oo-accent-soft) 32%, var(--oo-surface)); }\n.outreach-head, .outreach-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; }\n.outreach-head h3 { margin: 3px 0 0; font-size: 15px; }\n.outreach-head > strong { font-size: 12px; color: var(--oo-secondary-ink); }\n.outreach-draft > p { margin: 12px 0; font-size: 13px; line-height: 1.55; }\n.outreach-footer small { color: var(--secondary); line-height: 1.35; }\n@media (max-width: 900px) { .scenario-actions { grid-auto-flow: column; justify-content: start; } .outreach-head, .outreach-footer { align-items: flex-start; flex-direction: column; } }\n'''
css.write_text(text)

domain_test = Path('tests/domain.test.ts')
text = domain_test.read_text()
marker = '  it("ranks exactly three viable recovery scenarios", () => {'
test_block = '''  it("compares replacement wage against the originally assigned worker", () => {
    const original = createDemoState();
    const minsoo = original.workers.find((worker) => worker.id === "minsoo")!;
    const hana = original.workers.find((worker) => worker.id === "hana")!;
    const state = dispatchApplicationAction(original, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const hanaOption = getResponseOptions(state).find((option) => option.changes[0]?.workerId === "hana")!;
    expect(hanaOption.impact.payrollDelta).toBe((hana.hourlyRate - minsoo.hourlyRate) * 4);
    expect(hanaOption.impact.payrollDelta).toBe(-2_000);
  });

'''
if marker not in text:
    raise SystemExit('domain test insertion marker missing')
text = text.replace(marker, test_block + marker, 1)
domain_test.write_text(text)

i18n_test = Path('tests/i18n.test.ts')
text = i18n_test.read_text()
text = text.replace('import { liveOperatingSummary } from "@/i18n/dynamic";', 'import { getOutreachCopy, liveOperatingSummary, outreachDraft } from "@/i18n/dynamic";', 1)
marker = '  it("lets state-changing WebMCP tools carry UI locale separately from AppState", () => {'
test_block = '''  it("localizes a non-sending coverage outreach draft", () => {
    const copy = getOutreachCopy("ko");
    const draft = outreachDraft("ko", "Slice House", "하나", "8월 28일 금요일", "18:00", "22:00");
    expect(copy.draftOnly).toContain("전송되지");
    expect(draft).toContain("하나");
    expect(draft).toContain("18:00–22:00");
  });

'''
if marker not in text:
    raise SystemExit('i18n test insertion marker missing')
text = text.replace(marker, test_block + marker, 1)
i18n_test.write_text(text)
