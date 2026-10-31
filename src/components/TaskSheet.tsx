import { useEffect, useState } from "react";
import { useStore, type Task, type Priority, type Repeat } from "@/lib/store";
import { PRIORITY_LABEL, REPEAT_LABEL, todayStr } from "@/lib/logic";
import { CategorySelect, Label, PrimaryButton, Segmented, Sheet } from "./ui-kit";

export function TaskSheet({ open, onClose, task, date }: { open: boolean; onClose: () => void; task?: Task | null; date?: string }) {
  const saveTask = useStore((s) => s.saveTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const blank = { title: "", description: "", date: date ?? todayStr(), time: "", categoryId: null as string | null, priority: "medium" as Priority, repeat: "none" as Repeat };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(task ? { ...task } : blank); }, [open, task?.id, date]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onClose={onClose} title={task ? "Редактировать задачу" : "Новая задача"}>
      <label className="block"><Label>Название</Label>
        <input className="field" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Что нужно сделать?" /></label>
      <label className="block"><Label>Описание</Label>
        <textarea className="field min-h-20" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><Label>Дата</Label><input type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <label className="block"><Label>Время</Label><input type="time" className="field" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
      </div>
      <div><Label>Категория</Label><CategorySelect value={f.categoryId} onChange={(v) => setF({ ...f, categoryId: v })} /></div>
      <div><Label>Приоритет</Label>
        <Segmented value={f.priority} onChange={(v) => setF({ ...f, priority: v })}
          options={(["low", "medium", "high"] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} /></div>
      <label className="block"><Label>Повтор</Label>
        <select className="field" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value as Repeat })}>
          {(Object.keys(REPEAT_LABEL) as Repeat[]).map((r) => <option key={r} value={r}>{REPEAT_LABEL[r]}</option>)}
        </select></label>
      <PrimaryButton disabled={!f.title.trim() || !f.date} onClick={() => { saveTask({ ...f, title: f.title.trim(), id: task?.id }); onClose(); }}>Сохранить</PrimaryButton>
      {task && <button className="w-full py-2 text-sm font-medium text-destructive" onClick={() => { if (confirm("Удалить задачу?")) { deleteTask(task.id); onClose(); } }}>Удалить задачу</button>}
    </Sheet>
  );
}
