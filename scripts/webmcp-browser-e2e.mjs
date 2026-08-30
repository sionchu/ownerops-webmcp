import { chromium } from "playwright";

const BASE_URL = process.env.OWNEROPS_E2E_URL ?? "https://ownerops-webmcp-git-re0-ai-store-manager-sionchu1-4343.vercel.app/";
const EXPECTED_TOOLS = [
  "apply_store_plan",
  "configure_demo_store",
  "evaluate_current_plan",
  "get_daily_brief",
  "get_store_state",
  "plan_store_actions",
  "preview_store_plan",
  "record_operating_event",
  "restore_store_snapshot",
].sort();

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail === undefined ? "" : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ko-KR" });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    const tools = Object.create(null);
    Object.defineProperty(window, "__owneropsWebMcpTools", {
      configurable: false,
      enumerable: false,
      value: tools,
      writable: false,
    });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      enumerable: false,
      value: {
        registerTool: async (tool) => {
          tools[tool.name] = tool;
        },
      },
      writable: true,
    });
  });

  let lastNavigationError = null;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (response?.ok()) {
        lastNavigationError = null;
        break;
      }
      lastNavigationError = new Error(`Preview returned HTTP ${response?.status() ?? "unknown"}.`);
    } catch (error) {
      lastNavigationError = error;
    }
    await page.waitForTimeout(5_000);
  }
  if (lastNavigationError) throw lastNavigationError;

  await page.locator(".app-shell.hydrated").waitFor({ state: "visible", timeout: 45_000 });
  await page.waitForFunction(() => Object.keys(window.__owneropsWebMcpTools ?? {}).length === 9, null, { timeout: 30_000 });
  await page.locator(".connection-state.connected").waitFor({ state: "visible", timeout: 15_000 });

  const toolNames = await page.evaluate(() => Object.keys(window.__owneropsWebMcpTools ?? {}).sort());
  assert(JSON.stringify(toolNames) === JSON.stringify(EXPECTED_TOOLS), "Browser must expose exactly the nine canonical OwnerOps tools.", toolNames);

  const invoke = (name, input = {}) => page.evaluate(async ({ name, input }) => {
    const tool = window.__owneropsWebMcpTools?.[name];
    if (!tool) throw new Error(`WebMCP tool ${name} is not registered.`);
    return tool.execute(input, { signal: new AbortController().signal });
  }, { name, input });

  const apiEvidence = await page.evaluate(async () => {
    const [storeResponse, referenceResponse] = await Promise.all([
      fetch("/api/store-state?storeId=demo-kr-seoul-coffee", { cache: "no-store" }),
      fetch("/api/references?market=kr-seoul", { cache: "no-store" }),
    ]);
    return {
      store: { status: storeResponse.status, body: await storeResponse.json() },
      references: { status: referenceResponse.status, body: await referenceResponse.json() },
    };
  });
  assert(apiEvidence.store.status === 200 && apiEvidence.store.body?.source === "database", "Stable Preview must hydrate store truth from the database.", apiEvidence.store);
  assert(apiEvidence.references.status === 200 && apiEvidence.references.body?.source === "database-cache", "Stable Preview must hydrate cached reference evidence from the database.", apiEvidence.references);

  const overview = await invoke("get_store_state", { focus: "overview" });
  assert(overview?.business?.market === "kr-seoul", "E2E must run against the Seoul demo store.", overview?.business);
  assert(finite(overview?.metrics?.foodCostRatio) && overview.metrics.foodCostRatio >= 0 && overview.metrics.foodCostRatio < 1, "Live food cost ratio must remain finite and unit-safe.", overview?.metrics);
  const brief = await invoke("get_daily_brief", { limit: 5 });
  assert(Array.isArray(brief?.items) && brief.items.length >= 3 && brief.items.length <= 5, "Daily Brief must return a short prioritized operating brief.", brief);

  let stock = null;
  let milk = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    stock = await invoke("get_store_state", { focus: "stock" });
    milk = stock?.inventoryCostAnalysis?.find((entry) => entry?.item?.id === "whole-milk") ?? null;
    if (milk?.reference && finite(milk?.differenceRate)) break;
    await page.waitForTimeout(500);
  }
  assert(milk, "Whole milk must be available in focused stock evidence.", stock?.inventoryCostAnalysis);
  assert(finite(milk.actualPurchaseUnitCost) && milk.actualPurchaseUnitCost > 0, "Whole milk must expose the store's actual purchase unit cost.", milk);
  assert(finite(milk.daysOfCover) && milk.daysOfCover > 0, "Whole milk must expose finite days of cover.", milk);
  assert(milk.reference && finite(milk.referenceUnitCost) && finite(milk.differenceRate), "Whole milk must expose separate market-reference evidence and comparison.", milk);
  const baselineMilk = stock.inventory.find((item) => item.id === "whole-milk");
  const baselineMilkOnHand = baselineMilk?.onHand;
  const baselinePurchaseOrderCount = stock.purchaseOrders?.length ?? 0;
  assert(finite(baselineMilkOnHand), "Whole milk on-hand truth is required for apply integrity checks.", baselineMilk);

  const people = await invoke("get_store_state", { focus: "people" });
  const calloutShift = people?.shifts?.find((shift) => shift.id === "fri-minsoo-18" && shift.workerId === "minsoo")
    ?? people?.shifts?.find((shift) => shift.workerId === "minsoo" && String(shift.start).startsWith("2026-08-28"));
  assert(calloutShift, "A committed Friday Minsoo shift is required for the call-out E2E.", people?.shifts);
  await invoke("record_operating_event", {
    eventType: "worker_unavailable",
    workerId: "minsoo",
    shiftId: calloutShift.id,
    reason: "Browser E2E call-out",
    uiLocale: "ko",
  });

  const planResult = await invoke("plan_store_actions", { objective: "prepare_today" });
  const plan = planResult?.plans?.[0];
  assert(plan && Array.isArray(plan.changes), "prepare_today must return a deterministic StorePlan after the call-out.", planResult);
  const staffingChange = plan.changes.find((change) => change.type === "staffing" && change.shiftId === calloutShift.id);
  const purchaseChange = plan.changes.find((change) => change.type === "purchase");
  assert(staffingChange, "prepare_today must include staffing recovery for the active call-out.", plan.changes);
  assert(purchaseChange, "prepare_today must include at least one bounded purchase action when stock is at risk.", plan.changes);

  const preview = await invoke("preview_store_plan", {
    planId: plan.id,
    title: plan.title,
    changes: plan.changes,
    uiLocale: "ko",
  });
  assert(preview?.storePlan?.state === "preview", "StorePlan must remain uncommitted after preview.", preview?.storePlan);
  await page.locator("button.shift-chip.preview").first().waitFor({ state: "visible", timeout: 15_000 });

  const stockDuringPreview = await invoke("get_store_state", { focus: "stock" });
  assert((stockDuringPreview.purchaseOrders?.length ?? 0) === baselinePurchaseOrderCount, "Preview must not create a purchase order.", stockDuringPreview.purchaseOrders);
  assert(stockDuringPreview.inventory.find((item) => item.id === "whole-milk")?.onHand === baselineMilkOnHand, "Preview must not change physical on-hand inventory.", stockDuringPreview.inventory.find((item) => item.id === "whole-milk"));

  const proposedWorker = staffingChange.workerId;
  const humanWorker = proposedWorker === "hana" ? "chulsoo" : "hana";
  await page.locator("button.shift-chip.preview").first().click();
  const editor = page.locator(".shift-editor");
  await editor.waitFor({ state: "visible", timeout: 10_000 });
  await editor.locator("select").first().selectOption(humanWorker);
  await editor.locator("button.primary").click();
  await page.locator(".candidate-card.candidate-human-edit").waitFor({ state: "visible", timeout: 10_000 });

  const edited = await invoke("get_store_state", { focus: "people" });
  const editedPlan = edited?.activeStorePlan;
  const editedStaffing = editedPlan?.changes?.find((change) => change.type === "staffing" && change.shiftId === calloutShift.id);
  assert(editedPlan?.state === "preview" && editedStaffing?.workerId === humanWorker, "Human schedule edit must update the exact StorePlan candidate before review.", editedPlan);
  assert(editedPlan.version > preview.storePlan.version, "Human edit must advance the StorePlan version.", { before: preview.storePlan.version, after: editedPlan.version });

  const reviewed = await invoke("evaluate_current_plan", {});
  const reviewedPlan = reviewed?.storePlan;
  const reviewedStaffing = reviewedPlan?.changes?.find((change) => change.type === "staffing" && change.shiftId === calloutShift.id);
  assert(reviewedPlan?.state === "reviewed" && reviewedStaffing?.workerId === humanWorker, "evaluate_current_plan must review the exact human-edited candidate.", reviewedPlan);
  await page.locator(".candidate-card.candidate-reviewed").waitFor({ state: "visible", timeout: 10_000 });

  const applied = await invoke("apply_store_plan", {
    planId: reviewedPlan.id,
    version: reviewedPlan.version,
    uiLocale: "ko",
  });
  assert(applied?.state?.activeStorePlan == null, "Applied StorePlan must clear the active candidate.", applied?.state?.activeStorePlan);

  const [peopleAfter, stockAfter] = await Promise.all([
    invoke("get_store_state", { focus: "people" }),
    invoke("get_store_state", { focus: "stock" }),
  ]);
  const appliedShift = peopleAfter.shifts.find((shift) => shift.id === calloutShift.id);
  assert(appliedShift?.workerId === humanWorker && appliedShift?.status === "scheduled", "Reviewed human-edited staffing assignment must be committed.", appliedShift);
  assert(peopleAfter.activeIncident == null, "Resolved call-out must no longer be active after reviewed apply.", peopleAfter.activeIncident);
  assert(peopleAfter.incidents.some((incident) => incident.type === "worker_unavailable" && incident.shiftId === calloutShift.id && incident.status === "resolved"), "Resolved call-out history must be retained.", peopleAfter.incidents);

  const appliedOrder = stockAfter.purchaseOrders.find((order) => order.inventoryItemId === purchaseChange.inventoryItemId && order.status === "planned");
  assert(appliedOrder, "Applied purchase action must create a planned purchase order.", stockAfter.purchaseOrders);
  assert(stockAfter.inventory.find((item) => item.id === "whole-milk")?.onHand === baselineMilkOnHand, "Planned purchase must not fake physical receipt or on-hand inventory.", stockAfter.inventory.find((item) => item.id === "whole-milk"));

  const finalToolNames = await page.evaluate(() => Object.keys(window.__owneropsWebMcpTools ?? {}).sort());
  assert(JSON.stringify(finalToolNames) === JSON.stringify(EXPECTED_TOOLS), "The canonical tool surface must remain exactly nine tools after the full flow.", finalToolNames);
  assert(pageErrors.length === 0, "Browser page errors occurred during WebMCP E2E.", pageErrors);
  assert(consoleErrors.length === 0, "Browser console errors occurred during WebMCP E2E.", consoleErrors);

  console.log(JSON.stringify({
    ok: true,
    url: BASE_URL,
    tools: finalToolNames,
    storeSource: apiEvidence.store.body.source,
    referenceSource: apiEvidence.references.body.source,
    foodCostRatio: overview.metrics.foodCostRatio,
    milk: {
      daysOfCover: milk.daysOfCover,
      actualPurchaseUnitCost: milk.actualPurchaseUnitCost,
      referenceUnitCost: milk.referenceUnitCost,
      differenceRate: milk.differenceRate,
    },
    calloutShift: calloutShift.id,
    proposedWorker,
    humanWorker,
    reviewedVersion: reviewedPlan.version,
    plannedPurchaseOrder: appliedOrder.id,
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
