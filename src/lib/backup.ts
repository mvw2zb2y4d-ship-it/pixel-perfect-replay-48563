import { z } from "zod";
import { initial, type PlannerData } from "./store";

const id = z.string().trim().min(1).max(256).refine((s) => !["__proto__", "prototype", "constructor"].includes(s));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
});
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const optionalTime = z.union([time, z.literal("")]);
const number = z.number().finite().nonnegative();
const unique = <T extends z.ZodTypeAny>(schema: T) => z.array(schema).superRefine((rows, ctx) => {
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    if (seen.has(row.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: "Повторяющийся ID" });
    seen.add(row.id);
  });
});
const shift = z.object({ id, name: z.string(), kind: z.enum(["day", "night", "regular", "custom"]), start: optionalTime, end: optionalTime, off: z.boolean() }).refine((s) => s.off || (!!s.start && !!s.end));
const schedule = z.object({
  id, name: z.string(), mode: z.enum(["weekly", "cycle", "manual"]), startDate: z.union([date, z.literal("")]),
  shifts: unique(shift), pattern: z.array(id.nullable()), overrides: z.record(date, shift.nullable()),
}).superRefine((s, ctx) => {
  if (s.pattern.some((v) => v !== null && !s.shifts.some((x) => x.id === v))) ctx.addIssue({ code: "custom", path: ["pattern"], message: "Неизвестная смена" });
  if ((s.mode === "weekly" && s.pattern.length !== 7) || (s.mode === "cycle" && !s.pattern.length)) ctx.addIssue({ code: "custom", path: ["pattern"], message: "Некорректный цикл" });
});
const schema = z.object({
  categories: unique(z.object({ id, name: z.string(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })),
  tasks: unique(z.object({ id, title: z.string(), description: z.string(), date, time: optionalTime, categoryId: id.nullable(), priority: z.enum(["low", "medium", "high"]), repeat: z.enum(["none", "daily", "weekly", "monthly"]), completedDates: z.array(date) })),
  habits: unique(z.object({ id, name: z.string(), description: z.string(), icon: z.string(), categoryId: id.nullable(), schedule: z.object({ type: z.enum(["daily", "days", "times"]), days: z.array(z.number().int().min(0).max(6)), times: z.number().int().min(1).max(7) }), reminder: z.object({ enabled: z.boolean(), time: optionalTime }), kind: z.enum(["check", "count"]), target: z.number().finite().positive(), unit: z.string(), log: z.record(date, number), createdAt: date })),
  settings: z.object({ theme: z.enum(["dark", "light"]), notifications: z.boolean(), weekStartsMonday: z.boolean() }),
  schedules: unique(schedule).default([]), activeScheduleId: id.nullable().default(null),
  gigs: unique(z.object({ id, date, start: time, end: time, hours: number, manualHours: z.boolean(), client: z.string(), earnings: number, comment: z.string() })).default([]),
}).superRefine((data, ctx) => {
  if (data.activeScheduleId !== null && !data.schedules.some((s) => s.id === data.activeScheduleId)) ctx.addIssue({ code: "custom", path: ["activeScheduleId"], message: "Неизвестный график" });
  for (const group of ["tasks", "habits"] as const) data[group].forEach((row, i) => {
    if (row.categoryId !== null && !data.categories.some((c) => c.id === row.categoryId)) ctx.addIssue({ code: "custom", path: [group, i, "categoryId"], message: "Неизвестная категория" });
  });
});

export type RestoreMode = "replace" | "merge";
export const recordGroups = ["categories", "tasks", "habits", "schedules", "gigs"] as const;
export const groupLabels = { categories: "Категории", tasks: "Задачи", habits: "Привычки", schedules: "Графики", gigs: "Халтуры" };

export function parseBackup(text: string): PlannerData {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("Файл повреждён: не удалось прочитать JSON. Данные не изменены."); }
  // Exports remain the original plain planner object. Versioned envelopes are reserved for future copies.
  if (raw && typeof raw === "object" && "formatVersion" in raw) {
    const envelope = z.object({ formatVersion: z.literal(1), data: z.unknown() }).safeParse(raw);
    if (!envelope.success) throw new Error("Версия резервной копии не поддерживается. Данные не изменены.");
    raw = envelope.data.data;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const path = result.error.issues[0]?.path.join(".") || "содержимое";
    throw new Error(`Неверный формат резервной копии (${path}). Проверьте поля, типы и ID. Данные не изменены.`);
  }
  return { ...initial, ...result.data };
}

export function prepareRestore(current: PlannerData, incoming: PlannerData, mode: RestoreMode): PlannerData {
  if (mode === "replace") return structuredClone(incoming);
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))];
  return structuredClone({ ...current,
    categories: merge(current.categories, incoming.categories), tasks: merge(current.tasks, incoming.tasks),
    habits: merge(current.habits, incoming.habits), schedules: merge(current.schedules, incoming.schedules), gigs: merge(current.gigs, incoming.gigs),
  });
}

export function restoreCounts(current: PlannerData, incoming: PlannerData, mode: RestoreMode) {
  return recordGroups.map((key) => ({ key, label: groupLabels[key], count: mode === "replace" ? incoming[key].length : incoming[key].filter((row) => !current[key].some((x) => x.id === row.id)).length }));
}