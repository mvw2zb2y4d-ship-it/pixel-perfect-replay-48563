import { addDays, format, getDay, parseISO, startOfWeek, differenceInCalendarDays, differenceInCalendarMonths } from "date-fns";
import type { Habit, Task } from "./store";

export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export const todayStr = () => ymd(new Date());

export function occursOn(t: Task, date: string): boolean {
  if (date < t.date) return false;
  if (t.repeat === "none") return date === t.date;
  if (t.repeat === "daily") return true;
  const a = parseISO(t.date), b = parseISO(date);
  if (t.repeat === "weekly") return differenceInCalendarDays(b, a) % 7 === 0;
  return a.getDate() === b.getDate() && differenceInCalendarMonths(b, a) >= 0;
}
export const isDone = (t: Task, date: string) => t.completedDates.includes(date);
export function isOverdue(t: Task, date: string, now = new Date()): boolean {
  if (isDone(t, date)) return false;
  const today = ymd(now);
  if (date < today) return true;
  if (date === today && t.time) return t.time < format(now, "HH:mm");
  return false;
}
export const tasksOn = (tasks: Task[], date: string) =>
  tasks.filter((t) => occursOn(t, date)).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));

/* Habits */
const dow = (d: Date) => (getDay(d) + 6) % 7; // 0 = Monday
export function isScheduled(h: Habit, d: Date): boolean {
  if (h.schedule.type === "days") return h.schedule.days.includes(dow(d));
  return true; // daily, and "times per week" can be done any day
}
export const habitDone = (h: Habit, date: string) =>
  (h.log[date] ?? 0) >= (h.kind === "count" ? Math.max(1, h.target) : 1);
export const habitProgress = (h: Habit, date: string) =>
  Math.min(100, Math.round(((h.log[date] ?? 0) / (h.kind === "count" ? Math.max(1, h.target) : 1)) * 100));

function weekDone(h: Habit, weekStart: Date) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (habitDone(h, ymd(addDays(weekStart, i)))) n++;
  return n;
}

/** Returns streaks; for "times per week" habits the unit is weeks. */
export function streaks(h: Habit, now = new Date()): { current: number; best: number; unit: "дн." | "нед." } {
  const start = parseISO(h.createdAt);
  if (h.schedule.type === "times") {
    const target = Math.max(1, h.schedule.times);
    let best = 0, run = 0, current = 0;
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    for (let w = startOfWeek(start, { weekStartsOn: 1 }); w <= thisWeek; w = addDays(w, 7)) {
      const ok = weekDone(h, w) >= target;
      if (ok) { run++; best = Math.max(best, run); }
      else if (w.getTime() !== thisWeek.getTime()) run = 0;
    }
    current = run;
    return { current, best, unit: "нед." };
  }
  let best = 0, run = 0;
  const today = ymd(now);
  for (let d = start; ymd(d) <= today; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    const s = ymd(d);
    if (habitDone(h, s)) { run++; best = Math.max(best, run); }
    else if (s !== today) run = 0;
  }
  return { current: run, best, unit: "дн." };
}

/** Percent of scheduled occurrences completed between createdAt and today. */
export function adherence(h: Habit, now = new Date()): number {
  const start = parseISO(h.createdAt);
  const today = ymd(now);
  if (h.schedule.type === "times") {
    let need = 0, got = 0;
    for (let w = startOfWeek(start, { weekStartsOn: 1 }); w <= now; w = addDays(w, 7)) {
      need += h.schedule.times; got += Math.min(h.schedule.times, weekDone(h, w));
    }
    return need ? Math.round((got / need) * 100) : 0;
  }
  let need = 0, got = 0;
  for (let d = start; ymd(d) <= today; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    const s = ymd(d);
    if (s === today && !habitDone(h, s)) continue;
    need++; if (habitDone(h, s)) got++;
  }
  return need ? Math.round((got / need) * 100) : 0;
}
export const totalCompletions = (h: Habit) => Object.keys(h.log).filter((d) => habitDone(h, d)).length;

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const PRIORITY_LABEL = { low: "Низкий", medium: "Средний", high: "Высокий" } as const;
export const REPEAT_LABEL = { none: "Не повторять", daily: "Каждый день", weekly: "Каждую неделю", monthly: "Каждый месяц" } as const;
