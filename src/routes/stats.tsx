import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addDays, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useStore } from "@/lib/store";
import { adherence, habitDone, habitProgress, isDone, isOverdue, streaks, tasksOn, totalCompletions, ymd } from "@/lib/logic";
import { Empty, Screen, Segmented } from "@/components/ui-kit";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Статистика — Мой день" },
      { name: "description", content: "Статистика выполнения задач и соблюдения привычек." },
      { property: "og:title", content: "Статистика — Мой день" },
      { property: "og:description", content: "Статистика выполнения задач и соблюдения привычек." },
    ],
  }),
  component: StatsPage,
});

type Period = "day" | "week" | "month";
const LEN = { day: 1, week: 7, month: 30 };

const Stat = ({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) => (
  <div className="rounded-2xl bg-card p-3"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-2xl font-bold ${tone}`}>{value}</div></div>
);

function TaskStats() {
  const tasks = useStore((s) => s.tasks);
  const [p, setP] = useState<Period>("week");
  const days = Array.from({ length: LEN[p] }, (_, i) => addDays(new Date(), i - LEN[p] + 1));
  let planned = 0, done = 0, overdue = 0;
  const chart = days.map((d) => {
    const s = ymd(d); const list = tasksOn(tasks, s);
    const dn = list.filter((t) => isDone(t, s)).length;
    planned += list.length; done += dn; overdue += list.filter((t) => isOverdue(t, s)).length;
    return { name: format(d, p === "month" ? "d" : "EEEEEE", { locale: ru }), Запланировано: list.length, Выполнено: dn };
  });
  return (
    <section className="space-y-3">
      <Segmented value={p} onChange={setP} options={[{ value: "day", label: "День" }, { value: "week", label: "Неделя" }, { value: "month", label: "Месяц" }]} />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Запланировано" value={planned} />
        <Stat label="Выполнено" value={done} tone="text-success" />
        <Stat label="Просрочено" value={overdue} tone="text-destructive" />
        <Stat label="Процент выполнения" value={`${planned ? Math.round((done / planned) * 100) : 0}%`} tone="text-primary" />
      </div>
      {p !== "day" && (
        <div className="h-48 rounded-2xl bg-card p-2">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={24} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "none", borderRadius: 12 }} cursor={{ fill: "var(--elevated)" }} />
              <Bar dataKey="Запланировано" fill="var(--elevated)" radius={4} />
              <Bar dataKey="Выполнено" fill="var(--success)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>)}
    </section>
  );
}

function HabitStats() {
  const habits = useStore((s) => s.habits);
  if (!habits.length) return <Empty>Пока нет привычек</Empty>;
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13));
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Всего выполнений" value={habits.reduce((n, h) => n + totalCompletions(h), 0)} tone="text-success" />
        <Stat label="Соблюдение расписания" value={`${Math.round(habits.reduce((n, h) => n + adherence(h), 0) / habits.length)}%`} tone="text-primary" />
      </div>
      {habits.map((h) => {
        const st = streaks(h);
        const data = days.map((d) => ({ name: format(d, "d"), v: habitProgress(h, ymd(d)), done: habitDone(h, ymd(d)) }));
        return (
          <div key={h.id} className="rounded-2xl bg-card p-4">
            <div className="flex items-center gap-2 font-semibold"><span className="text-xl">{h.icon}</span>{h.name}</div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
              <div><div className="text-base font-bold text-foreground">{totalCompletions(h)}</div>выполн.</div>
              <div><div className="text-base font-bold text-foreground">{adherence(h)}%</div>соблюд.</div>
              <div><div className="text-base font-bold text-foreground">{st.current}</div>серия, {st.unit}</div>
              <div><div className="text-base font-bold text-foreground">{st.best}</div>лучшая</div>
            </div>
            <div className="mt-3 h-24">
              <ResponsiveContainer>
                <BarChart data={data}>
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis hide domain={[0, 100]} />
                  <Bar dataKey="v" fill="var(--primary)" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-muted-foreground">Прогресс за 14 дней, %</div>
          </div>
        );
      })}
    </section>
  );
}

function StatsPage() {
  const [tab, setTab] = useState<"tasks" | "habits">("tasks");
  return (
    <Screen title="Статистика">
      <div className="mb-4"><Segmented value={tab} onChange={setTab} options={[{ value: "tasks", label: "Задачи" }, { value: "habits", label: "Привычки" }]} /></div>
      {tab === "tasks" ? <TaskStats /> : <HabitStats />}
    </Screen>
  );
}
