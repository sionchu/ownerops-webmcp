# 06 — Data Model and Rules

## Canonical AppState
Keep the model intentionally small.

```ts
type AppState = {
  schemaVersion: 1;
  business: Business;
  workers: Worker[];
  shifts: Shift[];
  demand: DemandWindow[];
  preview: StaffingPreview | null;
  incident: StaffingIncident | null;
  activity: Activity;
};

type IndustryId = 'diner' | 'pizza' | 'coffee' | 'salon' | 'sushi' | 'curry';
```

## Worker
```ts
type Worker = {
  id: string;
  name: string;
  role: 'barista' | 'manager';
  hourlyRate: number;
  availability?: AvailabilityWindow[];
};
```

## Shift
```ts
type Shift = {
  id: string;
  workerId: string | null;
  start: string;
  end: string;
  role: Worker['role'];
  status: 'scheduled' | 'uncovered';
};
```

## Business
```ts
type Business = {
  industry: IndustryId;
  name: string;
  employeeCount: number;
  targetLaborRatio: number;
  expectedSalesByDay: Record<string, number>;
  peakWindows: Array<{ day: string; start: string; end: string; minCoverage: number }>;
};
```

The six industry profiles are presentation context stored on the canonical business object. They do not alter the staffing fixture, internal worker-role keys, calculations, or rule semantics. The default new demo is `diner`; a v1 snapshot without `business.industry` migrates to `coffee` because it represents the legacy Paperthin Cafe fixture. Unsupported present values are rejected transactionally.

## Incident
```ts
type StaffingIncident = {
  type: 'worker_unavailable';
  workerId: string;
  shiftId: string;
  reason?: string;
};
```

## Impact output
```ts
type PlanImpact = {
  payrollDelta: number;
  projectedLaborCost: number;
  laborRatio: number;
  workerWeeklyHours: Record<string, number>;
  warnings: RuleWarning[];
  uncoveredPeakMinutes: number;
  scheduleChangeCount: number;
};
```

## MVP rules
These are product warnings/estimates, not a legal-compliance engine.

Implement only what is necessary to produce a credible canonical demo:
1. Weekly hours per worker.
2. Configured weekly-hour warning threshold (demo can use 40/52 context, but wording must not assert universal illegality).
3. Night-work indicator if a shift overlaps 22:00–06:00.
4. Availability conflict if the worker is explicitly unavailable.
5. Role mismatch.
6. Peak coverage shortfall.
7. Estimated wages from scheduled hours and hourly rate; optional simple overtime premium only if it is explicit, tested, and well-labeled as an estimate.

## Scenario ranking
Do not introduce a general optimization solver. Generate a small bounded candidate set and rank deterministically using:
1. invalid role/availability → reject,
2. uncovered peak minutes,
3. warnings,
4. payroll delta,
5. schedule change count.

Return exactly three useful response options for the demo fixture when possible.

## Calculation truth
All UI summaries, scenario cards, WebMCP responses, and snapshots that contain computed values must derive from the same deterministic functions.
