import { beforeEach, describe, expect, it } from "vitest";
import { scheduleTemplate, shiftOn, workedHours, endDate, tasksOn } from "@/lib/logic";
import { initial, plannerData, useStore, type WorkSchedule, type Gig } from "@/lib/store";

const make = (name: string): WorkSchedule => ({ ...scheduleTemplate(name, "2027-03-01"), id: name });
describe("Рабочий график и халтуры", () => {
  beforeEach(() => useStore.setState({ ...initial }));
  it("5/2 assigns five weekdays and two days off", () => {
    const s = make("5/2");
    expect(Array.from({ length: 7 }, (_, i) => shiftOn(s, `2027-03-0${i + 1}`)?.off)).toEqual([false, false, false, false, false, true, true]);
  });
  it("2/2 repeats two work and two off days", () => {
    const s = make("2/2");
    expect(Array.from({ length: 8 }, (_, i) => shiftOn(s, `2027-03-0${i + 1}`)?.off)).toEqual([false, false, true, true, false, false, true, true]);
  });
  it("custom cycle uses all days and the user's start date", () => {
    const s = { ...make("Собственный график"), startDate: "2027-03-04", pattern: ["off", "work", "work", "off", "work"] };
    expect(shiftOn(s, "2027-03-03")).toBeNull();
    expect(shiftOn(s, "2027-03-04")?.off).toBe(true);
    expect(shiftOn(s, "2027-03-08")?.off).toBe(false);
    expect(shiftOn(s, "2027-03-09")?.off).toBe(true);
  });
  it("night shift and gig end on the following calendar date", () => {
    expect(workedHours("22:00", "06:30")).toBe(8.5);
    expect(endDate("2027-03-31", "22:00", "06:30")).toBe("2027-04-01");
  });
  it("equal start and end represent a 24-hour shift", () => {
    expect(workedHours("08:00", "08:00")).toBe(24);
    expect(endDate("2027-03-01", "08:00", "08:00")).toBe("2027-03-02");
  });
  it("manual changes survive template edits and can be restored", () => {
    const s = make("2/2"); useStore.getState().saveSchedule(s);
    const manual = { id: "manual", name: "Ночная", kind: "night" as const, start: "20:00", end: "08:00", off: false };
    useStore.getState().overrideShift(s.id, "2027-03-01", manual);
    const updated = useStore.getState().schedules[0];
    if (!updated) throw new Error("Missing schedule");
    useStore.getState().saveSchedule({ ...updated, pattern: ["off"] });
    expect(shiftOn(useStore.getState().schedules[0], "2027-03-01")).toEqual(manual);
    useStore.getState().overrideShift(s.id, "2027-03-01", undefined);
    expect(shiftOn(useStore.getState().schedules[0], "2027-03-01")?.off).toBe(true);
  });
  it("multiple templates switch without deleting other templates", () => {
    useStore.getState().saveSchedule(make("5/2")); useStore.getState().saveSchedule(make("2/2"));
    useStore.getState().activateSchedule("2/2");
    expect(useStore.getState().activeScheduleId).toBe("2/2"); expect(useStore.getState().schedules).toHaveLength(2);
  });
  it("manual schedule has only explicitly entered dates", () => {
    const s: WorkSchedule = { ...make("2/2"), mode: "manual" };
    expect(shiftOn(s, "2027-03-01")).toBeNull();
    s.overrides["2027-03-01"] = s.shifts[0] ?? null;
    expect(shiftOn(s, "2027-03-01")?.off).toBe(false);
    expect(shiftOn(s, "2027-03-02")).toBeNull();
  });
  it("gig editing updates hours and earnings without duplicate entries", () => {
    const g: Gig = { id: "g", date: "2027-03-01", start: "22:00", end: "06:00", hours: 8, manualHours: false, client: "Наряд", earnings: 4000, comment: "" };
    useStore.getState().saveGig(g); useStore.getState().saveGig({ ...g, hours: 9.5, manualHours: true, earnings: 5000 });
    expect(useStore.getState().gigs).toHaveLength(1); expect(useStore.getState().gigs[0]?.hours).toBe(9.5); expect(useStore.getState().gigs[0]?.earnings).toBe(5000);
  });
  it("schedule and gig do not replace existing tasks or habits", () => {
    useStore.getState().saveTask({ title: "Задача", description: "", date: "2027-03-01", time: "12:00", categoryId: null, priority: "low", repeat: "none" });
    useStore.getState().saveSchedule(make("5/2"));
    useStore.getState().saveGig({ id: "g", date: "2027-03-01", start: "19:00", end: "21:00", hours: 2, manualHours: false, client: "Наряд", earnings: 1000, comment: "" });
    expect(tasksOn(useStore.getState().tasks, "2027-03-01")).toHaveLength(1);
    expect(shiftOn(useStore.getState().schedules[0], "2027-03-01")?.name).toBe("Рабочая смена");
    expect(useStore.getState().gigs).toHaveLength(1);
  });
  it("new planner data has no preset schedule or cycle date", () => {
    expect(plannerData().schedules).toEqual([]); expect(plannerData().activeScheduleId).toBeNull();
  });
});