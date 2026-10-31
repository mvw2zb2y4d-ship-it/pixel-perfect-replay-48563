import type { Habit } from "./store";
import { habitDone, isScheduled, todayStr } from "./logic";

export type NotifStatus = "unsupported" | "default" | "granted" | "denied";

export function notifStatus(): NotifStatus {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifStatus;
}
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

/** Must be called only from a user gesture. */
export async function requestPermission(): Promise<NotifStatus> {
  if (notifStatus() === "unsupported") return "unsupported";
  try { return (await Notification.requestPermission()) as NotifStatus; } catch { return notifStatus(); }
}

export async function registerSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("/sw.js"); } catch { return null; }
}

async function show(title: string, body: string) {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(title, { body, icon: "/icon-192.png" });
  else new Notification(title, { body });
}

let timers: number[] = [];
/** Schedules today's reminders while the app is open. Server push is not configured yet. */
export function scheduleReminders(habits: Habit[], enabled: boolean) {
  timers.forEach(clearTimeout); timers = [];
  if (!enabled || notifStatus() !== "granted") return;
  const now = new Date();
  for (const h of habits) {
    if (!h.reminder.enabled || !isScheduled(h, now) || habitDone(h, todayStr())) continue;
    const [hh, mm] = h.reminder.time.split(":").map(Number);
    const at = new Date(now); at.setHours(hh, mm, 0, 0);
    const ms = at.getTime() - now.getTime();
    if (ms > 0) timers.push(window.setTimeout(() => show(`${h.icon} ${h.name}`, "Время для привычки"), ms));
  }
}
