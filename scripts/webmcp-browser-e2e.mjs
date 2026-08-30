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
const MARKETS = [
  { id: "us-nyc", currency: "USD" },
  { id: "jp-tokyo", currency: "JPY" },
  { id: "es-madrid", currency: "EUR" },
  { id: "cn-shanghai", currency: "CNY" },
  { id: "kr-seoul", currency: "KRW" },
];

function assert(condition, message, detail) {
  if (condition) return;
  throw new Error(`${message}${detail === undefined ? "" : `\n${JSON.stringify(detail, null, 2)}`}`);
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function step(message) {
  console.log(`[webmcp-e2e] ${message}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.addInitScript(() => {
      const tools = Object.create(null);
      Object.defineProperty(window, "__owneropsWebMcpTools", { value: tools });
      Object.defineProperty(document, "modelContext", {
        configurable: true,
        value: { registerTool: async (tool) => { tools[tool.name] = tool; } },
      });
    });

    step(`open ${BASE_URL}`);
    let opened = false;
    let lastError = null;
    for (let attempt = 1; attempt <= 6 && !opened; attempt += 1) {
      try {
        const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
        opened = Boolean(response?.ok());
        if (!opened) lastError = new Error(`HTTP ${response?.status() ?? "unknown"}`);
      } catch (error) {
        lastError = error;
      }
      if (!opened) await page.waitForTimeout(2_000);
    }
    if (!opened) throw lastError ?? new Error("Stable Preview could not be opened.");

    await page.locator(".app-shell.hydrated").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForFunction(() => Object.keys(window.__owneropsWebMcpTools ?? {}).length === 9, null, { timeout: 20_000 });
    await page.locator(".connection-state.connected").waitFor({ state: "visible", timeout: 10_000 });

    const invoke = (name, input = {}) => page.evaluate(async ({ name, input }) => {
      const tool = window.__owneropsWebMcpTools?.[name];
      if (!tool) throw new Error(`Missing WebMCP tool: ${name}`);
      return tool.execute(input, { signal: new AbortController().signal });
    }, { name, input });

    const waitForDbMarket = async (market) => {
      let overview = null;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        overview = await invoke("get_store_state", { focus: "overview" });
        const provenance = overview?.business?.dataProvenance;
        if (overview?.business?.market === market && provenance?.storeTruth === "database" && provenance?.referenceEvidence === "database-benchmark-cache") return overview;
        await page.waitForTimeout(500);
      }
      throw new Error(`Market ${market} did not reach DB-backed + benchmark-cache provenance.\n${JSON.stringify(overview?.business, null, 2)}`);
    };

    step("verify nine registered tools and compact owner controls");
    const toolNames = await page.evaluate(() => Object.keys(window.__owneropsWebMcpTools ?? {}).sort());
    assert(JSON.stringify(toolNames) === JSON.stringify(EXPECTED_TOOLS), "Expected exactly nine canonical tools.", toolNames);
    const marketSelect = page.getByTestId("market-select");
    const storeStatus = page.getByTestId("store-truth-status");
    const referenceStatus = page.getByTestId("reference-status");
    const resetButton = page.getByTestId("demo-reset");
    await marketSelect.waitFor({ state: "visible", timeout: 10_000 });
    await storeStatus.waitFor({ state: "visible", timeout: 10_000 });
    await referenceStatus.waitFor({ state: "visible", timeout: 10_000 });
    await resetButton.waitFor({ state: "visible", timeout: 10_000 });

    step("verify all five markets via rendered selector and compact provenance icons");
    const marketEvidence = [];
    for (const market of MARKETS) {
      await marketSelect.selectOption(market.id);
      const overview = await waitForDbMarket(market.id);
      assert(overview.business.currency === market.currency, `Currency mismatch for ${market.id}.`, overview.business);
      assert(overview.business.dataProvenance?.disclosure?.includes("not a live provider quote"), `Missing non-live reference disclosure for ${market.id}.`, overview.business.dataProvenance);
      assert((await storeStatus.getAttribute("title"))?.includes("DB"), `DB status icon missing for ${market.id}.`);
      assert((await referenceStatus.getAttribute("aria-label")) === "Reference benchmark", `Benchmark status icon missing for ${market.id}.`);
      assert(finite(overview.metrics?.foodCostRatio) && overview.metrics.foodCostRatio >= 0 && overview.metrics.foodCostRatio < 1, `Food-cost ratio is invalid for ${market.id}.`, overview.metrics);

      const sales = await invoke("get_store_state", { focus: "sales" });
      assert(sales.menu?.length > 0 && sales.menu.every((item) => finite(item.price) && item.price > 0), `Menu price collapsed for ${market.id}.`, sales.menu);
      assert(sales.menuCostAnalysis?.every((item) => item.foodCostRatio === null || finite(item.foodCostRatio)), `Menu cost analysis is invalid for ${market.id}.`, sales.menuCostAnalysis);

      const api = await page.evaluate(async ({ marketId }) => {
        const storeId = `demo-${marketId}-coffee`;
        const [storeResponse, referenceResponse] = await Promise.all([
          fetch(`/api/store-state?storeId=${encodeURIComponent(storeId)}`, { cache: "no-store" }),
          fetch(`/api/references?market=${encodeURIComponent(marketId)}`, { cache: "no-store" }),
        ]);
        return {
          store: { status: storeResponse.status, body: await storeResponse.json() },
          references: { status: referenceResponse.status, body: await referenceResponse.json() },
        };
      }, { marketId: market.id });
      assert(api.store.status === 200 && api.store.body?.source === "database", `Store API is not DB-backed for ${market.id}.`, api.store);
      assert(api.references.status === 200 && api.references.body?.source === "database-benchmark-cache" && api.references.body?.referenceOrigin === "benchmark-template", `Reference provenance mismatch for ${market.id}.`, api.references);
      assert(api.references.body.references?.some((reference) => reference.referenceKey === "milk" && reference.provider === "fnb-master-2026" && reference.freshness === "seed"), `DB benchmark milk reference missing for ${market.id}.`, api.references.body.references);

      marketEvidence.push({
        market: market.id,
        currency: market.currency,
        storeSource: api.store.body.source,
        referenceSource: api.references.body.source,
        lattePrice: sales.menu.find((item) => item.id === "latte")?.price,
        foodCostRatio: overview.metrics.foodCostRatio,
      });
    }

    step("verify month to week schedule hierarchy");
    await page.getByTestId("schedule-view-month").click();
    await page.getByTestId("schedule-month-overview").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator("[data-testid^=month-week-]").filter({ hasText: /h/ }).first().click();

    step("continue full reviewed-apply flow on Seoul");
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
    assert(apiEvidence.store.status === 200 && apiEvidence.store.body?.source === "database", "Seoul Store API is not DB-backed.", apiEvidence.store);
    assert(apiEvidence.references.status === 200 && apiEvidence.references.body?.source === "database-benchmark-cache", "Seoul reference API is not DB benchmark-backed.", apiEvidence.references);

    step("read Daily Brief and unit-safe Seoul overview");
    const overview = await waitForDbMarket("kr-seoul");
    const brief = await invoke("get_daily_brief", { limit: 5 });
    assert(Array.isArray(brief?.items) && brief.items.length >= 3 && brief.items.length <= 5, "Daily Brief is not a short priority list.", brief);

    step("verify sales evidence and split data/operation semantics");
    const salesTool = await invoke("get_store_state", { focus: "sales" });
    assert(salesTool.salesEvidence?.daily?.length === 7 && salesTool.salesEvidence?.menu?.length >= 4, "Sales evidence missing from semantic tool surface.", salesTool.salesEvidence);
    assert(salesTool.salesEvidence.daily.every((item) => item.source === "demo"), "Demo sales evidence must not be presented as live.", salesTool.salesEvidence.daily);
    assert(Math.abs(salesTool.salesEvidence.totals.unallocatedSales) / salesTool.salesEvidence.totals.netSales < 0.03, "Live DB menu evidence does not reconcile closely enough to headline sales.", salesTool.salesEvidence.totals);
    assert(salesTool.salesEvidence.menu.find((item) => item.menuItemId === "croissant-menu")?.foodCost > 0, "Croissant food-cost evidence is missing from live DB state.", salesTool.salesEvidence.menu);
    assert(await page.getByTestId("sales-evidence").count() === 1, "Sales evidence UI missing.");
    const analysisText = await page.getByTestId("cost-analysis").textContent();
    assert(!String(analysisText).includes("데이터 확인 필요"), "Data quality is still mixed into operational status.", analysisText);

    step("read milk stock, cover, actual price and benchmark reference");
    let stock;
    let milk;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      stock = await invoke("get_store_state", { focus: "stock" });
      milk = stock?.inventoryCostAnalysis?.find((entry) => entry?.item?.id === "whole-milk");
      if (milk?.reference?.provider === "fnb-master-2026" && finite(milk?.differenceRate)) break;
      await page.waitForTimeout(500);
    }
    assert(milk, "Whole milk stock analysis is missing.", stock?.inventoryCostAnalysis);
    assert(finite(milk.actualPurchaseUnitCost) && milk.actualPurchaseUnitCost > 0, "Actual milk purchase price is missing.", milk);
    assert(finite(milk.daysOfCover) && milk.daysOfCover > 0, "Milk days-of-cover is missing.", milk);
    assert(milk.reference?.provider === "fnb-master-2026" && milk.reference?.freshness === "seed" && finite(milk.referenceUnitCost) && finite(milk.differenceRate), "Milk benchmark comparison provenance is missing.", milk);
    const baselineMilk = stock.inventory.find((item) => item.id === "whole-milk");
    const baselineMilkOnHand = baselineMilk?.onHand;
    const baselinePurchaseOrders = stock.purchaseOrders?.length ?? 0;
    assert(finite(baselineMilkOnHand), "Milk on-hand truth is missing.", baselineMilk);

    step("record Minsoo Friday call-out");
    const people = await invoke("get_store_state", { focus: "people" });
    const calloutShift = people?.shifts?.find((shift) => shift.id === "fri-minsoo-18" && shift.workerId === "minsoo")
      ?? people?.shifts?.find((shift) => shift.workerId === "minsoo" && String(shift.start).startsWith("2026-08-28"));
    assert(calloutShift, "Committed Friday Minsoo shift is missing.", people?.shifts);
    await invoke("record_operating_event", {
      eventType: "worker_unavailable",
      workerId: "minsoo",
      shiftId: calloutShift.id,
      reason: "Browser E2E call-out",
      uiLocale: "ko",
    });
    const calloutOverview = await invoke("get_store_state", { focus: "overview" });
    assert(calloutOverview.metrics.uncoveredPeakMinutes === 120, "Expected only the Friday two-hour peak gap.", calloutOverview.metrics);

    step("plan and preview combined prepare_today StorePlan");
    const planResult = await invoke("plan_store_actions", { objective: "prepare_today" });
    const plan = planResult?.plans?.[0];
    assert(plan?.changes, "prepare_today did not return a StorePlan.", planResult);
    const staffingChange = plan.changes.find((change) => change.type === "staffing" && change.shiftId === calloutShift.id);
    const purchaseChange = plan.changes.find((change) => change.type === "purchase");
    assert(staffingChange, "Combined plan is missing call-out recovery.", plan.changes);
    assert(purchaseChange, "Combined plan is missing bounded purchase action.", plan.changes);

    const preview = await invoke("preview_store_plan", { planId: plan.id, title: plan.title, changes: plan.changes, uiLocale: "ko" });
    assert(preview?.storePlan?.state === "preview", "StorePlan committed during preview.", preview?.storePlan);
    await page.locator("button.shift-chip.preview").first().waitFor({ state: "visible", timeout: 10_000 });
    const stockPreview = await invoke("get_store_state", { focus: "stock" });
    assert((stockPreview.purchaseOrders?.length ?? 0) === baselinePurchaseOrders, "Preview created a purchase order.", stockPreview.purchaseOrders);
    assert(stockPreview.inventory.find((item) => item.id === "whole-milk")?.onHand === baselineMilkOnHand, "Preview changed physical stock.");
    const coveredOverview = await invoke("get_store_state", { focus: "overview" });
    assert(coveredOverview.metrics.uncoveredPeakMinutes === 0, "Replacement preview must clear the peak gap.", coveredOverview.metrics);

    step("human edits preview shift in rendered schedule UI");
    const proposedWorker = staffingChange.workerId;
    const humanWorker = proposedWorker === "hana" ? "chulsoo" : "hana";
    await page.locator("button.shift-chip.preview").first().click();
    const editor = page.locator(".shift-editor");
    await editor.waitFor({ state: "visible", timeout: 10_000 });
    await editor.locator("select").first().selectOption(humanWorker);
    await editor.getByTestId("shift-end-time").fill("21:30");
    await editor.locator("button.primary").click();
    await page.locator(".candidate-card.candidate-human-edit").waitFor({ state: "visible", timeout: 10_000 });

    const edited = await invoke("get_store_state", { focus: "people" });
    const editedPlan = edited?.activeStorePlan;
    const editedStaffing = editedPlan?.changes?.find((change) => change.type === "staffing" && change.shiftId === calloutShift.id);
    assert(editedPlan?.state === "preview" && editedStaffing?.workerId === humanWorker && String(editedStaffing?.end).includes("21:30"), "Human worker/time edit did not update the canonical candidate.", editedPlan);
    assert(editedPlan.version > preview.storePlan.version, "Human edit did not advance plan version.");

    step("evaluate exact human-edited candidate and apply reviewed plan");
    const reviewed = await invoke("evaluate_current_plan", {});
    const reviewedPlan = reviewed?.storePlan;
    const reviewedStaffing = reviewedPlan?.changes?.find((change) => change.type === "staffing" && change.shiftId === calloutShift.id);
    assert(reviewedPlan?.state === "reviewed" && reviewedStaffing?.workerId === humanWorker, "Review did not use exact human edit.", reviewedPlan);
    await page.locator(".candidate-card.candidate-reviewed").waitFor({ state: "visible", timeout: 10_000 });
    await invoke("apply_store_plan", { planId: reviewedPlan.id, version: reviewedPlan.version, uiLocale: "ko" });

    step("verify committed staffing, planned PO, no fake receipt, retained incident history");
    const peopleAfter = await invoke("get_store_state", { focus: "people" });
    const stockAfter = await invoke("get_store_state", { focus: "stock" });
    const appliedShift = peopleAfter.shifts.find((shift) => shift.id === calloutShift.id);
    assert(appliedShift?.workerId === humanWorker && appliedShift?.status === "scheduled" && String(appliedShift?.end).includes("21:30"), "Human-edited staffing/time was not committed.", appliedShift);
    assert(peopleAfter.activeIncident == null, "Call-out stayed active after reviewed apply.");
    assert(peopleAfter.incidents.some((incident) => incident.type === "worker_unavailable" && incident.shiftId === calloutShift.id && incident.status === "resolved"), "Resolved incident history was lost.", peopleAfter.incidents);
    const appliedOrder = stockAfter.purchaseOrders.find((order) => order.inventoryItemId === purchaseChange.inventoryItemId && order.status === "planned");
    assert(appliedOrder, "Purchase action did not create a planned PO.", stockAfter.purchaseOrders);
    assert(stockAfter.inventory.find((item) => item.id === "whole-milk")?.onHand === baselineMilkOnHand, "Planned PO faked a physical receipt.");

    step("reset icon reloads the current canonical DB store");
    await resetButton.click();
    const resetOverview = await waitForDbMarket("kr-seoul");
    const resetPeople = await invoke("get_store_state", { focus: "people" });
    const resetStock = await invoke("get_store_state", { focus: "stock" });
    const restoredShift = resetPeople.shifts.find((shift) => shift.id === calloutShift.id);
    assert(restoredShift?.workerId === "minsoo" && restoredShift?.status === "scheduled", "Demo reset did not restore committed DB schedule.", restoredShift);
    assert(resetPeople.activeIncident == null, "Demo reset retained a local incident.");
    assert((resetStock.purchaseOrders?.length ?? 0) === baselinePurchaseOrders, "Demo reset retained local planned purchase orders.", resetStock.purchaseOrders);
    assert(resetOverview.business.dataProvenance?.storeTruth === "database", "Demo reset did not return to DB-backed truth.", resetOverview.business.dataProvenance);
    assert((await storeStatus.getAttribute("title"))?.includes("DB"), "Store status icon did not return to DB state.");
    assert((await referenceStatus.getAttribute("aria-label")) === "Reference benchmark", "Reference status icon did not return to benchmark state.");

    const finalNames = await page.evaluate(() => Object.keys(window.__owneropsWebMcpTools ?? {}).sort());
    assert(JSON.stringify(finalNames) === JSON.stringify(EXPECTED_TOOLS), "Tool surface drifted during E2E.", finalNames);
    assert(pageErrors.length === 0, "Page errors occurred.", pageErrors);
    assert(consoleErrors.length === 0, "Console errors occurred.", consoleErrors);

    console.log(JSON.stringify({
      ok: true,
      url: BASE_URL,
      tools: finalNames,
      markets: marketEvidence,
      resetRestoredDatabase: true,
      seoul: {
        storeSource: apiEvidence.store.body.source,
        referenceSource: apiEvidence.references.body.source,
        referenceOrigin: apiEvidence.references.body.referenceOrigin,
        foodCostRatio: overview.metrics.foodCostRatio,
        provenance: overview.business.dataProvenance,
        milk: { daysOfCover: milk.daysOfCover, actualPurchaseUnitCost: milk.actualPurchaseUnitCost, referenceUnitCost: milk.referenceUnitCost, differenceRate: milk.differenceRate },
        calloutShift: calloutShift.id,
        proposedWorker,
        humanWorker,
        reviewedVersion: reviewedPlan.version,
        plannedPurchaseOrder: appliedOrder.id,
      },
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});