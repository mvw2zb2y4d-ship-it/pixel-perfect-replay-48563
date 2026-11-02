import { beforeEach, describe, expect, it, vi } from "vitest";
const cloud = vi.hoisted(() => ({ data: null as null | { payload: Record<string, unknown>; revision: number }, error: null as null | { message: string }, rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cloud.data, error: cloud.error }) }) }) }),
  rpc: cloud.rpc,
} }));
import { openAccount, importLegacy, useSync } from "@/lib/cloud-sync";
import { initial, plannerData, useStore } from "@/lib/store";
const task = { id: "legacy-task", title: "Existing", description: "", date: "2027-03-01", time: "", categoryId: null, priority: "low", repeat: "none", completedDates: [] };
describe("Account storage boundaries", () => {
  beforeEach(async () => {
    await openAccount(null); localStorage.clear(); useSync.setState({ ready: false });
    useStore.setState({ ...initial }); cloud.data = null; cloud.error = null;
    cloud.rpc.mockReset(); cloud.rpc.mockResolvedValue({ data: 1, error: null });
  });
  it("new account never automatically inherits legacy tasks", async () => {
    localStorage.setItem("moy-den", JSON.stringify({ version: 1, state: { ...initial, tasks: [task] } }));
    await openAccount("account-a");
    expect(plannerData().tasks).toEqual([]);
    expect(JSON.parse(localStorage.getItem("moy-den") ?? "{}").state.tasks[0].id).toBe("legacy-task");
  });
  it("account switching loads only the selected owner's cloud rows", async () => {
    cloud.data = { payload: { ...initial, tasks: [task] }, revision: 1 };
    await openAccount("account-a"); expect(plannerData().tasks[0]?.id).toBe("legacy-task");
    cloud.data = null; await openAccount("account-b"); expect(plannerData().tasks).toEqual([]);
  });
  it("offline reopen retains dirty local hours and earnings", async () => {
    localStorage.setItem("moy-den:account-a", JSON.stringify({ version: 1, state: { ...initial, gigs: [{ id: "gig", date: "2027-03-01", start: "22:00", end: "06:00", hours: 9, manualHours: true, client: "Client", earnings: 5000, comment: "" }] } }));
    localStorage.setItem("moy-den-meta:account-a", JSON.stringify({ revision: 3, dirty: true }));
    cloud.error = { message: "offline" }; await openAccount("account-a");
    expect(plannerData().gigs[0]?.hours).toBe(9); expect(plannerData().gigs[0]?.earnings).toBe(5000);
  });
  it("explicit legacy import is idempotent and keeps the source copy", async () => {
    localStorage.setItem("moy-den", JSON.stringify({ version: 1, state: { ...initial, tasks: [task] } }));
    await openAccount("account-a"); importLegacy(); importLegacy();
    expect(plannerData().tasks).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("moy-den") ?? "{}").state.tasks).toHaveLength(1);
  });
  it("stale local state never overwrites newer cloud data automatically", async () => {
    localStorage.setItem("moy-den:account-a", JSON.stringify({ version: 1, state: { ...initial, tasks: [task] } }));
    localStorage.setItem("moy-den-meta:account-a", JSON.stringify({ revision: 1, dirty: true }));
    cloud.data = { payload: initial, revision: 2 }; await openAccount("account-a");
    useStore.getState().activateSchedule(null);
    expect(cloud.rpc).not.toHaveBeenCalled(); expect(plannerData().tasks[0]?.id).toBe("legacy-task"); expect(useSync.getState().status).toContain("Конфликт");
  });
});