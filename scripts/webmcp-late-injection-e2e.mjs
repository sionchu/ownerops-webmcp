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
  if (condition) return;
  throw new Error(`${message}${detail === undefined ? "" : `\n${JSON.stringify(detail, null, 2)}`}`);
}

async function openWithoutModelContext(browser, toolBucketName) {
  const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const page = await context.newPage();
  await page.addInitScript((bucket) => {
    Object.defineProperty(window, bucket, { configurable: true, value: Object.create(null) });
  }, toolBucketName);

  const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
  assert(response?.ok(), "OwnerOps Preview did not open.", response?.status());
  await page.locator(".app-shell.hydrated").waitFor({ state: "visible", timeout: 20_000 });
  return { context, page };
}

async function injectModelContext(page, toolBucketName) {
  await page.evaluate((bucket) => {
    const tools = window[bucket];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: async (tool) => {
          tools[tool.name] = tool;
        },
      },
    });
  }, toolBucketName);
}

async function registeredToolNames(page, toolBucketName) {
  return page.evaluate((bucket) => Object.keys(window[bucket] ?? {}).sort(), toolBucketName);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    console.log("[webmcp-late] late injection after the old retry window");
    {
      const bucket = "__owneropsLateTools";
      const { context, page } = await openWithoutModelContext(browser, bucket);
      try {
        // The old RE0 hook permanently gave up at ~2.6 s. Inject after that
        // boundary and verify the extended retry window still discovers WebMCP.
        await page.waitForTimeout(3200);
        assert(await page.locator(".connection-state.connected").count() === 0, "Agent connected before modelContext existed.");
        await injectModelContext(page, bucket);
        await page.waitForFunction((name) => Object.keys(window[name] ?? {}).length === 9, bucket, { timeout: 6000 });
        await page.locator(".connection-state.connected").waitFor({ state: "visible", timeout: 6000 });
        const names = await registeredToolNames(page, bucket);
        assert(JSON.stringify(names) === JSON.stringify(EXPECTED_TOOLS), "Late injection did not register the canonical nine tools.", names);
      } finally {
        await context.close();
      }
    }

    console.log("[webmcp-late] recover after disconnected state on host resume/focus");
    {
      const bucket = "__owneropsResumeTools";
      const { context, page } = await openWithoutModelContext(browser, bucket);
      try {
        // Let the complete fast retry sequence expire so the UI can settle on
        // disconnected, then simulate the host attaching WebMCP on tab resume.
        await page.waitForTimeout(7600);
        assert(await page.locator(".connection-state.connected").count() === 0, "Agent connected before resumed modelContext existed.");
        await injectModelContext(page, bucket);
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await page.waitForFunction((name) => Object.keys(window[name] ?? {}).length === 9, bucket, { timeout: 4000 });
        await page.locator(".connection-state.connected").waitFor({ state: "visible", timeout: 4000 });
        const names = await registeredToolNames(page, bucket);
        assert(JSON.stringify(names) === JSON.stringify(EXPECTED_TOOLS), "Resume recheck did not register the canonical nine tools.", names);
      } finally {
        await context.close();
      }
    }

    console.log(JSON.stringify({ ok: true, url: BASE_URL, lateInjectionRecovered: true, resumeRecovered: true }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
