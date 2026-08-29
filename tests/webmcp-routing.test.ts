import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/model";
import type { UiLocale } from "@/i18n";
import { registerOwnerOpsTools } from "@/webmcp/register-tools";

function bridge() {
  let state: AppState = createDemoState();
  let locale: UiLocale = "en";
  return {
    getState: () => state,
    getLocale: () => locale,
    setLocale: (next: UiLocale) => { locale = next; },
    runAction: (action: Parameters<typeof dispatchApplicationAction>[1]) => (state = dispatchApplicationAction(state, action)),
  };
}

describe("WebMCP routing guidance", () => {
  it("prefers live state planning and reserves snapshots for explicit restore", async () => {
    const registrations: Array<{ name: string; title?: string; description: string }> = [];
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        modelContext: {
          registerTool: async (tool: { name: string; title?: string; description: string }) => {
            registrations.push(tool);
          },
        },
      },
    });

    const registration = registerOwnerOpsTools(bridge());
    await Promise.resolve();

    const liveState = registrations.find((tool) => tool.name === "get_business_state");
    const planning = registrations.find((tool) => tool.name === "get_response_options");
    const preview = registrations.find((tool) => tool.name === "preview_staffing_change");
    const snapshot = registrations.find((tool) => tool.name === "import_schedule_snapshot");

    expect(liveState?.description).toMatch(/PRIMARY READ PATH/);
    expect(liveState?.description).toMatch(/Do not .*Snapshot UI/i);
    expect(planning?.description).toMatch(/PRIMARY PLANNING PATH/);
    expect(planning?.description).toMatch(/never use a snapshot/i);
    expect(preview?.description).toMatch(/Do not round-trip through Snapshot/i);
    expect(snapshot?.title).toBe("Restore provided OwnerOps snapshot");
    expect(snapshot?.description).toMatch(/BACKUP\/RESTORE ONLY/);
    expect(snapshot?.description).toMatch(/only when the user explicitly asks/i);
    expect(registrations).toHaveLength(8);

    registration.dispose();
    delete (globalThis as { document?: unknown }).document;
  });
});
