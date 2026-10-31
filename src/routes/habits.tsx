import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Flame, Minus, Pencil, Plus } from "lucide-react";
import { useStore, type Habit } from "@/lib/store";
import { habitDone, habitProgress, isScheduled, streaks, todayStr, ymd, WEEKDAYS } from "@/lib/logic";
import { Empty, IconButton, Screen, Sheet, useCategory } from "@/components/ui-kit";
import { HabitSheet } from "@/components/HabitSheet";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "Привычки — Мой день" },
      { name: "description", content: "Обычные и количественные привычки, серии и история выполнения." },
      { property: "og:title", content: "Привычки — Мой день" },
      { property: "og:description", content: "Обычные и количественные привычки, серии и история выполнения." },
    ],
  }),
  component: HabitsPage,
});

function scheduleText(h: Habit) {
  if (h.schedule.type === "daily") return "Каждый день";
  if (h.schedule.type === "days") return h.schedule.days.map((d) => WEEKDAYS[d]).join(", ");
  return `${h.schedule.times} раз в неделю`;
}

function HabitCard({ h, onEdit, onHistory }: { h: Habit; onEdit: () => void; onHistory: () => void }) {
  const setValue = useStore((s) => s.setHabitValue);
  const cat = useCategory(h.categoryId);
  const t = todayStr();
  const v = h.log[t] ?? 0;
  const done = habitDone(h, t);
  const pct = habitProgress(h, t);
  const st = streaks(h);
  const scheduled = isScheduled(h, new Date());
  return (
    <div className={`rounded-2xl bg-card p-4 ${scheduled ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <button onClick={onHistory} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-elevated text-2xl">{h.icon}</button>
        <button onClick={onHistory} className="min-w-0 flex-1 text-left">
          <div className="truncate font-semibold">{h.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{scheduleText(h)}</span>
            {cat && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />{cat.name}</span>}
            <span className="flex items-center gap-0.5 text-warning"><Flame size={12} />{st.current} {st.unit}</span>
          </div>
        </button>
        <button aria-label="Редактировать" onClick={onEdit} className="p-1 text-muted-foreground"><Pencil size={16} /></button>
      </div>
      {h.kind === "check" ? (
        <button onClick={() => setValue(h.id, t, done ? 0 : 1)}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold transition ${done ? "bg-success text-success-foreground" : "bg-elevated"}`}>
          {done ? <><Check size={18} /> Выполнено</> : "Отметить выполнение"}
        </button>
      ) : (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <button aria-label="Уменьшить" onClick={() => setValue(h.id, t, v - 1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevated"><Minus size={18} /></button>
            <div className="flex-1 text-center">
              <span className="text-xl font-bold">{v}</span><span className="text-muted-foreground"> / {h.target} {h.unit}</span>
            </div>
            <button aria-label="Увеличить" onClick={() => setValue(h.id, t, v + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Plus size={18} /></button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
              <div className={`h-full rounded-full transition-all ${done ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-semibold">{pct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HistorySheet({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const [month, setMonth] = useState(new Date());
  const setValue = useStore((s) => s.setHabitValue);
  const h = useStore((s) => s.habits.find((x) => x.id === habit?.id)) ?? null;
  if (!h) return null;
  const start = startOfMonth(month);
  const days = eachDayOfInterval({ start, end: endOfMonth(month) });
  const offset = (start.getDay() + 6) % 7;
  const st = streaks(h);
  const today = todayStr();
  return (
    <Sheet open onClose={onClose} title={`${h.icon} ${h.name}`}>
      {h.description && <p className="text-sm text-muted-foreground">{h.description}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-elevated p-3"><div className="text-xs text-muted-foreground">Текущая серия</div><div className="text-xl font-bold">{st.current} {st.unit}</div></div>
        <div className="rounded-xl bg-elevated p-3"><div className="text-xs text-muted-foreground">Лучшая серия</div><div className="text-xl font-bold">{st.best} {st.unit}</div></div>
      </div>
      <div className="flex items-center justify-between">
        <button aria-label="Назад" onClick={() => setMonth(addMonths(month, -1))} className="rounded-full bg-elevated p-2"><ChevronLeft size={18} /></button>
        <span className="font-semibold capitalize">{format(month, "LLLL yyyy", { locale: ru })}</span>
        <button aria-label="Вперёд" onClick={() => setMonth(addMonths(month, 1))} className="rounded-full bg-elevated p-2"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => <div key={w} className="text-[11px] text-muted-foreground">{w}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={"e" + i} />)}
        {days.map((d) => {
          const s = ymd(d);
          const pct = habitProgress(h, s);
          const done = habitDone(h, s);
          const future = s > today;
          return (
            <button key={s} disabled={future}
              onClick={() => h.kind === "check" && setValue(h.id, s, done ? 0 : 1)}
              className={`aspect-square rounded-lg text-sm font-medium ${done ? "bg-success text-success-foreground" : pct > 0 ? "bg-accent text-accent-foreground" : isScheduled(h, d) ? "bg-elevated" : "bg-elevated/40 text-muted-foreground"} ${future ? "opacity-40" : ""} ${s === today ? "ring-2 ring-primary" : ""}`}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
      {h.kind === "check" && <p className="text-xs text-muted-foreground">Нажмите на прошедший день, чтобы отметить или снять выполнение.</p>}
    </Sheet>
  );
}

function HabitsPage() {
  const habits = useStore((s) => s.habits);
  const [edit, setEdit] = useState<{ open: boolean; habit?: Habit | null }>({ open: false });
  const [hist, setHist] = useState<Habit | null>(null);
  const now = new Date();
  const todays = habits.filter((h) => isScheduled(h, now));
  const doneCount = todays.filter((h) => habitDone(h, todayStr())).length;
  return (
    <Screen title="Привычки" action={<IconButton aria-label="Новая привычка" onClick={() => setEdit({ open: true })}><Plus /></IconButton>}>
      {habits.length > 0 && (
        <div className="mb-4 rounded-2xl bg-accent p-4 text-accent-foreground">
          <div className="text-sm">Сегодня, {format(now, "d MMMM", { locale: ru })}</div>
          <div className="text-2xl font-bold">{doneCount} из {todays.length} выполнено</div>
        </div>)}
      <div className="space-y-3">
        {habits.length === 0 ? <Empty>Добавьте первую привычку — например, «8 стаканов воды».</Empty>
          : [...habits].sort((a, b) => Number(isScheduled(b, now)) - Number(isScheduled(a, now))).map((h) =>
            <HabitCard key={h.id} h={h} onEdit={() => setEdit({ open: true, habit: h })} onHistory={() => setHist(h)} />)}
      </div>
      <HabitSheet open={edit.open} habit={edit.habit} onClose={() => setEdit({ open: false })} />
      {hist && <HistorySheet habit={hist} onClose={() => setHist(null)} />}
    </Screen>
  );
}
