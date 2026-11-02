import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addDays } from "date-fns";
import { Plus } from "lucide-react";
import { useStore, type Task } from "@/lib/store";
import { isDone, isOverdue, occursOn, todayStr, ymd } from "@/lib/logic";
import { Empty, IconButton, Screen, Segmented } from "@/components/ui-kit";
import { TaskSheet } from "@/components/TaskSheet";
import { TaskItem } from "@/components/TaskItem";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Задачи — Мой день" },
      { name: "description", content: "Список задач с приоритетами, категориями и повторами." },
      { property: "og:title", content: "Задачи — Мой день" },
      { property: "og:description", content: "Список задач с приоритетами, категориями и повторами." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

type Filter = "active" | "overdue" | "done" | "all";

/** Each task appears once: its nearest relevant occurrence. */
function occurrence(t: Task): string {
  if (t.repeat === "none") return t.date;
  // most recent missed occurrence within 30 days, else next upcoming
  for (let i = 30; i >= 1; i--) { const s = ymd(addDays(new Date(), -i)); if (occursOn(t, s) && !isDone(t, s)) return s; }
  for (let i = 0; i < 400; i++) { const s = ymd(addDays(new Date(), i)); if (occursOn(t, s)) return s; }
  return t.date;
}

function TasksPage() {
  const tasks = useStore((s) => s.tasks);
  const [filter, setFilter] = useState<Filter>("active");
  const [sheet, setSheet] = useState<{ open: boolean; task?: Task | null }>({ open: false });
  const today = todayStr();
  const rows = tasks.map((t) => ({ t, date: occurrence(t) }))
    .filter(({ t, date }) => {
      const done = isDone(t, date);
      if (filter === "active") return !done;
      if (filter === "overdue") return isOverdue(t, date);
      if (filter === "done") return done;
      return true;
    })
    .sort((a, b) => (a.date + (a.t.time || "99")).localeCompare(b.date + (b.t.time || "99")));

  return (
    <Screen title="Задачи" action={<IconButton aria-label="Новая задача" onClick={() => setSheet({ open: true })}><Plus /></IconButton>}>
      <Segmented value={filter} onChange={setFilter} options={[
        { value: "active", label: "Активные" }, { value: "overdue", label: "Просроч." }, { value: "done", label: "Готово" }, { value: "all", label: "Все" }]} />
      <div className="mt-4 space-y-2">
        {rows.length === 0 ? <Empty>Здесь пока пусто</Empty>
          : rows.map(({ t, date }) => <TaskItem key={t.id} task={t} date={date} showDate onEdit={() => setSheet({ open: true, task: t })} />)}
      </div>
      <TaskSheet open={sheet.open} task={sheet.task} onClose={() => setSheet({ open: false })} />
    </Screen>
  );
}
