import { beforeEach, describe, expect, it, vi } from "vitest";
const cloud = vi.hoisted(() => ({ rpc: vi.fn(), sessionOwner: "account-a", userOwner: "account-a", data: null as unknown }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cloud.data, error: null }) }) }) }),
  auth: { getSession: async () => ({ data: { session: { user: { id: cloud.sessionOwner }, access_token: "test-token" } }, error: null }), getUser: async () => ({ data: { user: { id: cloud.userOwner } }, error: null }) },
  rpc: (...args: unknown[]) => ({ setHeader: () => cloud.rpc(...args) }),
} }));
import { initial, plannerData, useStore, type PlannerData } from "@/lib/store";
import { parseBackup, prepareRestore } from "@/lib/backup";
import { openAccount, restoreBackup, useSync } from "@/lib/cloud-sync";

const task = (id: string) => ({ id, title: id, description: "", date: "2026-11-03", time: "", categoryId: null, priority: "low" as const, repeat: "none" as const, completedDates: [] });
const file: PlannerData = { ...initial, tasks: [task("new")] };
describe("Backup file rules", () => {
  it("accepts the current JSON export", () => expect(parseBackup(JSON.stringify(file))).toEqual(file));
  it("accepts old exports without schedules and gigs", () => {
    const { schedules, gigs, activeScheduleId, ...legacy } = file;
    expect(parseBackup(JSON.stringify(legacy))).toEqual({ ...legacy, schedules: [], gigs: [], activeScheduleId: null });
  });
  it("rejects broken JSON", () => expect(() => parseBackup("{broken")).toThrow());
  it("rejects missing required collections", () => expect(() => parseBackup('{"tasks":[]}')).toThrow());
  it("rejects incorrect types", () => expect(() => parseBackup(JSON.stringify({ ...file, gigs: [{ hours: "9" }] }))).toThrow());
  it("rejects duplicate IDs", () => expect(() => parseBackup(JSON.stringify({ ...file, tasks: [task("a"), task("a")] }))).toThrow());
  it("rejects missing IDs", () => expect(() => parseBackup(JSON.stringify({ ...file, tasks: [{ ...task("a"), id: "" }] }))).toThrow());
  it("rejects impossible dates", () => expect(() => parseBackup(JSON.stringify({ ...file, tasks: [{ ...task("a"), date: "2026-02-30" }] }))).toThrow());
  it("rejects unknown category references", () => expect(() => parseBackup(JSON.stringify({ ...file, tasks: [{ ...task("a"), categoryId: "missing" }] }))).toThrow());
  it("rejects unsupported format versions", () => expect(() => parseBackup(JSON.stringify({ formatVersion: 2, data: file }))).toThrow());
  it("merges only new IDs and keeps settings and existing rows", () => {
    const current = { ...initial, tasks: [{ ...task("new"), title: "Keep" }], settings: { ...initial.settings, theme: "light" as const } };
    const result = prepareRestore(current, { ...file, tasks: [task("new"), task("other")] }, "merge");
    expect(result.tasks.map((t) => t.title)).toEqual(["Keep", "other"]); expect(result.settings.theme).toBe("light");
  });
  it("replaces all collections and settings", () => {
    expect(prepareRestore({ ...initial, tasks: [task("old")] }, file, "replace")).toEqual(file);
  });
});
describe("Owner-bound atomic restore", () => {
  beforeEach(async () => {
    await openAccount(null); localStorage.clear(); useSync.setState({ ready: false });
    cloud.data = null; cloud.sessionOwner = "account-a"; cloud.userOwner = "account-a";
    cloud.rpc.mockReset(); cloud.rpc.mockResolvedValue({ data: 1, error: null });
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:test", revokeObjectURL: () => {} }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await openAccount("account-a");
  });
  it("commits a correct file and automatically retains the previous copy", async () => {
    const previous = plannerData(); const result = await restoreBackup(file, "replace", "account-a", JSON.stringify(previous));
    expect(plannerData().tasks[0]?.id).toBe("new");
    expect(JSON.parse(localStorage.getItem("moy-den-before-restore:account-a") ?? "{}")).toEqual(previous);
    expect(result.find((r) => r.key === "tasks")?.count).toBe(1);
    expect(cloud.rpc).toHaveBeenCalledWith("save_planner_state", { p_payload: file, p_revision: 0 });
  });
  it("rejects restoration after switching to another account", async () => {
    const expected = JSON.stringify(plannerData()); await openAccount("account-b");
    await expect(restoreBackup(file, "replace", "account-a", expected)).rejects.toThrow();
    expect(plannerData().tasks).toEqual([]); expect(cloud.rpc).not.toHaveBeenCalled();
  });
  it("rejects a different authenticated owner even if the screen is stale", async () => {
    cloud.sessionOwner = "account-b";
    await expect(restoreBackup(file, "replace", "account-a", JSON.stringify(plannerData()))).rejects.toThrow();
    expect(cloud.rpc).not.toHaveBeenCalled(); expect(plannerData().tasks).toEqual([]);
  });
  it("leaves all state and persisted data untouched when Cloud fails", async () => {
    const previous = plannerData(); const raw = localStorage.getItem("moy-den:account-a");
    cloud.rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(restoreBackup(file, "replace", "account-a", JSON.stringify(previous))).rejects.toThrow();
    expect(plannerData()).toEqual(previous); expect(localStorage.getItem("moy-den:account-a")).toBe(raw);
  });
  it("does not send any write when local safety-copy creation fails", async () => {
    const previous = plannerData(); const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await expect(restoreBackup(file, "replace", "account-a", JSON.stringify(previous))).rejects.toThrow();
    spy.mockRestore(); expect(plannerData()).toEqual(previous); expect(cloud.rpc).not.toHaveBeenCalled();
  });
  it("rejects state changes since the preview", async () => {
    const expected = JSON.stringify(plannerData()); useStore.setState({ tasks: [task("edited")] });
    await expect(restoreBackup(file, "replace", "account-a", expected)).rejects.toThrow();
    expect(plannerData().tasks[0]?.id).toBe("edited");
  });
  it("restores without sign-in only to this device", async () => {
    await openAccount(null); const expected = JSON.stringify(plannerData());
    await restoreBackup(file, "replace", null, expected);
    expect(plannerData().tasks[0]?.id).toBe("new"); expect(cloud.rpc).not.toHaveBeenCalled();
    expect(localStorage.getItem("moy-den-before-restore:local")).not.toBeNull();
  });
});