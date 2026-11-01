import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useStore, type Task } from "@/lib/store";
import { tasksOn, todayStr, ymd, WEEKDAYS } from "@/lib/logic";
import { Empty, IconButton, Screen, Segmented } from "@/components/ui-kit";
import { TaskSheet } from "@/components/TaskSheet";
import { TaskItem } from "@/components/TaskItem";
import { GigSheet } from "@/components/GigSheet";
import { GigItem } from "@/components/GigItem";
import { ShiftDay } from "@/components/ShiftDay";
import { Button } from "@/components/ui/button";
import { shiftOn, endDate } from "@/lib/logic";
import type { Gig } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Календарь — Мой день" },
      { name: "description", content: "Личный планировщик задач и привычек: календарь на месяц, неделю и день." },
      { property: "og:title", content: "Календарь — Мой день" },
      { property: "og:description", content: "Личный планировщик задач и привычек." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

type View = "month" | "week" | "day";

function CalendarPage() {
  const tasks = useStore((s) => s.tasks);
  const cats = useStore((s) => s.categories);
  const schedules = useStore((s) => s.schedules);
  const active = useStore((s) => s.activeScheduleId);
  const gigs = useStore((s) => s.gigs);
  const schedule = schedules.find((s) => s.id === active);
  const [gigEdit, setGigEdit] = useState<{ open: boolean; gig?: Gig | null }>({ open: false });
  const [view, setView] = useState<View>("month");
  const [sel, setSel] = useState(todayStr());
  const [sheet, setSheet] = useState<{ open: boolean; task?: Task | null; date?: string }>({ open: false });
  const d = parseISO(sel);
  const today = todayStr();

  const days = useMemo(() => {
    if (view === "month") return eachDayOfInterval({ start: startOfWeek(startOfMonth(d), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(d), { weekStartsOn: 1 }) });
    if (view === "week") return eachDayOfInterval({ start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) });
    return [d];
  }, [view, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const shift = (n: number) => setSel(ymd(view === "month" ? addMonths(d, n) : view === "week" ? addWeeks(d, n) : addDays(d, n)));
  const title = view === "day" ? format(d, "d MMMM, EEEE", { locale: ru }) : format(d, "LLLL yyyy", { locale: ru });
  const dayTasks = tasksOn(tasks, sel);
  const dayGigs = gigs.filter((g) => g.date === sel);
  const previous = ymd(addDays(d, -1));
  const previousShift = shiftOn(schedule, previous);
  const continuingGigs = gigs.filter((g) => g.date === previous && endDate(g.date, g.start, g.end) === sel);
  const color = (id: string | null) => cats.find((c) => c.id === id)?.color ?? "var(--muted-foreground)";

  return (
    <Screen title="Календарь" action={<IconButton aria-label="Новая задача" onClick={() => setSheet({ open: true, date: sel })}><Plus /></IconButton>}>
      <Segmented value={view} onChange={setView} options={[{ value: "month", label: "Месяц" }, { value: "week", label: "Неделя" }, { value: "day", label: "День" }]} />
      <div className="mt-4 flex items-center justify-between">
        <button aria-label="Назад" onClick={() => shift(-1)} className="rounded-full bg-card p-2"><ChevronLeft size={20} /></button>
        <button onClick={() => setSel(today)} className="text-base font-semibold capitalize">{title}</button>
        <button aria-label="Вперёд" onClick={() => shift(1)} className="rounded-full bg-card p-2"><ChevronRight size={20} /></button>
      </div>

      {view !== "day" && (
        <div className="mt-3 rounded-2xl bg-card p-2">
          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">{WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const s = ymd(day);
              const list = tasksOn(tasks, s);
              const work = shiftOn(schedule, s);
              const hasGigs = gigs.some((g) => g.date === s);
              const isSel = s === sel;
              return (
                <button key={s} onClick={() => setSel(s)} onDoubleClick={() => setSheet({ open: true, date: s })}
                  className={`flex flex-col items-center rounded-xl py-1.5 ${view === "week" ? "min-h-20" : "min-h-12"} ${isSel ? "bg-primary text-primary-foreground" : s === today ? "bg-accent text-accent-foreground" : ""} ${view === "month" && !isSameMonth(day, d) ? "opacity-35" : ""}`}>
                  <span className="text-sm font-semibold">{day.getDate()}</span>
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5 px-1">
                    {work && <span title={work.name} className={`h-1.5 w-1.5 rounded-full ${work.off ? "bg-muted-foreground" : work.kind === "night" ? "bg-warning" : "bg-primary"}`} />}
                    {hasGigs && <span title="Халтура" className="h-1.5 w-1.5 rounded-full bg-success" />}
                    {list.slice(0, view === "week" ? 6 : 3).map((t) => <span key={t.id} className="h-1.5 w-1.5 rounded-full" style={{ background: color(t.categoryId) }} />)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <h2 className="font-semibold capitalize">{format(d, "d MMMM, EEEE", { locale: ru })}</h2>
        <button onClick={() => setSheet({ open: true, date: sel })} className="text-sm font-medium text-primary">+ Задача</button>
      </div>
      <div className="mt-2 space-y-2">
        {schedule && <ShiftDay schedule={schedule} date={sel} />}
        {previousShift && !previousShift.off && endDate(previous, previousShift.start, previousShift.end) === sel && <p className="rounded-xl border-l-4 border-warning bg-card p-3 text-sm">Окончание смены «{previousShift.name}» от {previous} · сегодня до {previousShift.end}</p>}
        {continuingGigs.map((g) => <p key={g.id} className="rounded-xl border-l-4 border-success bg-card p-3 text-sm">Окончание халтуры от {g.date} · {g.client || "Халтура"} · сегодня до {g.end}</p>)}
        <div className="flex flex-wrap items-center justify-between gap-2 py-1"><h3 className="text-sm font-semibold">Халтуры{dayGigs.length ? ` · ${dayGigs.reduce((n, g) => n + g.hours, 0)} ч · ${dayGigs.reduce((n, g) => n + g.earnings, 0).toLocaleString("ru-RU")} ₽` : ""}</h3><Button variant="ghost" size="sm" className="text-success" onClick={() => setGigEdit({ open: true })}><Plus />Халтура</Button></div>
        {dayGigs.map((gig) => <GigItem key={gig.id} gig={gig} onEdit={() => setGigEdit({ open: true, gig })} />)}
        {dayTasks.length === 0 ? (!schedule && !dayGigs.length && !continuingGigs.length ? <Empty>Нет событий на этот день</Empty> : null)
          : dayTasks.map((t) => <TaskItem key={t.id} task={t} date={sel} onEdit={() => setSheet({ open: true, task: t })} />)}
      </div>
      <TaskSheet open={sheet.open} task={sheet.task} date={sheet.date} onClose={() => setSheet({ open: false })} />
      <GigSheet open={gigEdit.open} gig={gigEdit.gig} date={sel} onClose={() => setGigEdit({ open: false })} />
    </Screen>
  );
}
