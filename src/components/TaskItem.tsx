import { Check, Repeat as RepeatIcon } from "lucide-react";
import { useStore, type Task } from "@/lib/store";
import { isDone, isOverdue } from "@/lib/logic";
import { useCategory } from "./ui-kit";

const prioDot = { low: "bg-muted-foreground", medium: "bg-warning", high: "bg-destructive" };

export function TaskItem({ task, date, onEdit, showDate }: { task: Task; date: string; onEdit: () => void; showDate?: boolean }) {
  const toggle = useStore((s) => s.toggleTask);
  const cat = useCategory(task.categoryId);
  const done = isDone(task, date);
  const overdue = isOverdue(task, date);
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-card p-3 ${overdue ? "ring-1 ring-destructive/60" : ""}`}>
      <button aria-label="Отметить" onClick={() => toggle(task.id, date)}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${done ? "border-success bg-success text-success-foreground" : "border-muted-foreground/50"}`}>
        {done && <Check size={16} strokeWidth={3} />}
      </button>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className={`truncate font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{task.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${prioDot[task.priority]}`} />
          {showDate && <span>{date.split("-").reverse().slice(0, 2).join(".")}</span>}
          {task.time && <span>{task.time}</span>}
          {cat && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />{cat.name}</span>}
          {task.repeat !== "none" && <RepeatIcon size={12} />}
          {overdue && <span className="font-semibold text-destructive">Просрочено</span>}
        </div>
      </button>
    </div>
  );
}
