from pathlib import Path

# Keep the domain rationale aligned with the owner-facing wage semantics.
actions = Path('src/domain/actions.ts')
text = actions.read_text()
old = 'rationale: `Restores peak coverage with one schedule change; estimated labor ratio ${(impact.laborRatio * 100).toFixed(1)}%.`,'
new = 'rationale: `Restores peak coverage with one schedule change; net wage impact is calculated against the originally assigned worker.`,'
if old not in text:
    raise SystemExit('scenario rationale not found')
text = text.replace(old, new, 1)
actions.write_text(text)

# Expose only masked/demo contact data through the existing read tool; no new send tool.
webmcp = Path('src/webmcp/register-tools.ts')
text = webmcp.read_text()
old = '''    workers: state.workers.map((worker) => ({
      ...worker,
      displayName: displayName(worker),
      roleLabel: profile.roleLabels[worker.role],
      weeklyHours: impact.workerWeeklyHours[worker.id] ?? 0,
    })),'''
new = '''    workers: state.workers.map((worker) => ({
      ...worker,
      displayName: displayName(worker),
      roleLabel: profile.roleLabels[worker.role],
      demoContact: market.workerContacts[worker.id] ?? null,
      weeklyHours: impact.workerWeeklyHours[worker.id] ?? 0,
    })),'''
if old not in text:
    raise SystemExit('businessState worker mapping not found')
text = text.replace(old, new, 1)
text = text.replace('including UI language, labor market, currency, wage reference, workers, shifts, incident, preview, labor estimate, weekly hours, and warnings.', 'including UI language, labor market, currency, wage reference, masked demo contacts, workers, shifts, incident, preview, labor estimate, weekly hours, and warnings.', 1)
webmcp.write_text(text)

# Give the two action buttons enough room on desktop without overriding the mobile grid.
css = Path('src/styles/locale-timeline.css')
text = css.read_text()
addon = '''\n@media (min-width: 901px) {\n  .scenario-row { grid-template-columns: 28px minmax(220px, 1.8fr) repeat(5, minmax(67px, .55fr)) minmax(116px, .8fr); }\n}\n'''
if addon.strip() not in text:
    text += addon
css.write_text(text)

# Verify the masked contact is available to agents without changing the tool count.
integration = Path('tests/integration.test.ts')
text = integration.read_text()
old = 'expect(spanishNyc.workers.find((worker) => worker.id === "minsoo")?.name).toBe("Mason");'
new = 'expect(spanishNyc.workers.find((worker) => worker.id === "minsoo")?.name).toBe("Mason");\n    expect(spanishNyc.workers.find((worker) => worker.id === "minsoo")?.demoContact).toContain("555");'
if old not in text:
    raise SystemExit('integration contact insertion point not found')
text = text.replace(old, new, 1)
integration.write_text(text)
