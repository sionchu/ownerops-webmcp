export type WorkerRole = "barista" | "manager";

export type IndustryId = "diner" | "pizza" | "coffee" | "salon" | "sushi" | "curry";

export type MarketId = "kr-seoul" | "us-nyc" | "jp-tokyo" | "es-madrid" | "cn-shanghai";
export type CurrencyCode = "KRW" | "USD" | "JPY" | "EUR" | "CNY";

export type AvailabilityWindow = {
  start: string;
  end: string;
  available: boolean;
};

export type Worker = {
  id: string;
  name: string;
  role: WorkerRole;
  hourlyRate: number;
  availability?: AvailabilityWindow[];
};

export type Shift = {
  id: string;
  workerId: string | null;
  start: string;
  end: string;
  role: WorkerRole;
  status: "scheduled" | "uncovered";
};

export type PeakWindow = {
  day: string;
  start: string;
  end: string;
  minCoverage: number;
};

export type Business = {
  industry: IndustryId;
  market: MarketId;
  currency: CurrencyCode;
  name: string;
  employeeCount: number;
  targetLaborRatio: number;
  weeklyHourWarningThreshold: number;
  expectedSalesByDay: Record<string, number>;
  peakWindows: PeakWindow[];
};

export type DemandWindow = {
  day: string;
  expectedSales: number;
  start: string;
  end: string;
  minCoverage: number;
};

export type StaffingIncident = {
  type: "worker_unavailable";
  workerId: string;
  shiftId: string;
  reason?: string;
};

export type StaffingChange = {
  shiftId: string;
  workerId: string;
  start?: string;
  end?: string;
};

export type RuleWarning = {
  code: "weekly_hours" | "night_work" | "availability" | "role_mismatch" | "peak_coverage";
  severity: "info" | "warning";
  message: string;
  workerId?: string;
  shiftId?: string;
};

export type PlanImpact = {
  payrollDelta: number;
  projectedLaborCost: number;
  laborRatio: number;
  workerWeeklyHours: Record<string, number>;
  warnings: RuleWarning[];
  uncoveredPeakMinutes: number;
  scheduleChangeCount: number;
};

export type StaffingScenario = {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  changes: StaffingChange[];
  impact: PlanImpact;
};

export type StaffingPreview = {
  id: string;
  version: number;
  scenarioId: string;
  title: string;
  changes: StaffingChange[];
  impact: PlanImpact;
};

export type AssistantState = "idle" | "listening" | "checking" | "proposalReady" | "reviewNeeded" | "reviewed" | "warning" | "applied" | "error";

export type Activity = {
  state: AssistantState;
  message: string;
  detail?: string;
};

export type AppState = {
  schemaVersion: 1;
  business: Business;
  workers: Worker[];
  shifts: Shift[];
  demand: DemandWindow[];
  preview: StaffingPreview | null;
  incident: StaffingIncident | null;
  activity: Activity;
};

export type SnapshotState = Pick<AppState, "schemaVersion" | "business" | "workers" | "shifts" | "demand" | "incident">;
