from pathlib import Path

# Final clean-v0 pass after the main decision-surface patch.
app = Path('src/components/ownerops-app.tsx')
text = app.read_text()
text = text.replace(
    '<div className="workspace"><div className="primary-workspace"><ImpactStrip impact={visibleImpact}/><ScheduleGrid/><ScenarioPanel/></div><AssistantRail supported={supported}/></div>',
    '<div className="workspace"><div className="primary-workspace"><ImpactStrip impact={visibleImpact}/><ScenarioPanel/><ScheduleGrid/></div><AssistantRail supported={supported}/></div>',
    1,
)
app.write_text(text)

dynamic = Path('src/i18n/dynamic.ts')
text = dynamic.read_text()
start = text.find('function percent(')
if start != -1:
    end = text.index('\n}\n\nfunction metricDetail', start) + 2
    text = text[:start] + text[end+2:]
dynamic.write_text(text)

i18n = Path('src/i18n/index.ts')
text = i18n.read_text()
for old, new in [
    ('addedPayroll: "Added payroll"', 'addedPayroll: "Recovery cost"'),
    ('addedPayroll: "추가 인건비"', 'addedPayroll: "복구 비용"'),
    ('addedPayroll: "追加人件費"', 'addedPayroll: "復旧コスト"'),
    ('addedPayroll: "Coste añadido"', 'addedPayroll: "Coste de recuperación"'),
    ('addedPayroll: "新增人工成本"', 'addedPayroll: "恢复成本"'),
]:
    if old in text:
        text = text.replace(old, new, 1)
i18n.write_text(text)

css = Path('src/styles/locale-timeline.css')
text = css.read_text()
text += '''\n.decision-strip + .scenario-panel { margin-top: 0; }\n.scenario-panel + .schedule-panel { margin-top: 20px; border-top: 1px solid var(--oo-border, var(--line)); }\n'''
css.write_text(text)
