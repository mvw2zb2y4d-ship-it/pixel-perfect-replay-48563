import { useEffect, useState } from "react";
import { useStore, type Habit, type ScheduleType } from "@/lib/store";
import { WEEKDAYS } from "@/lib/logic";
import { CategorySelect, Label, PrimaryButton, Segmented, Sheet } from "./ui-kit";

const ICONS = ["💧", "🏃", "📚", "🧘", "🍎", "💤", "💊", "✍️", "🚶", "🏋️", "🎯", "🌿"];
type Draft = Omit<Habit, "id" | "log" | "createdAt">;
const blank: Draft = {
  name: "", description: "", icon: "🎯", categoryId: null,
  schedule: { type: "daily", days: [0, 1, 2, 3, 4], times: 3 },
  reminder: { enabled: false, time: "09:00" }, kind: "check", target: 8, unit: "раз",
};

export function HabitSheet({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit | null | undefined }) {
  const save = useStore((s) => s.saveHabit);
  const del = useStore((s) => s.deleteHabit);
  const [f, setF] = useState<Draft>(blank);
  useEffect(() => { if (open) setF(habit ? { ...habit } : blank); }, [open, habit?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sch = (p: Partial<Draft["schedule"]>) => setF({ ...f, schedule: { ...f.schedule, ...p } });

  return (
    <Sheet open={open} onClose={onClose} title={habit ? "Редактировать привычку" : "Новая привычка"}>
      <div><Label>Иконка</Label>
        <div className="flex flex-wrap gap-2">{ICONS.map((i) => (
          <button key={i} type="button" onClick={() => setF({ ...f, icon: i })}
            className={`h-10 w-10 rounded-xl text-xl ${f.icon === i ? "bg-primary" : "bg-elevated"}`}>{i}</button>))}</div></div>
      <label className="block"><Label>Название</Label><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Например, пить воду" /></label>
      <label className="block"><Label>Описание</Label><textarea className="field min-h-16" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <div><Label>Категория</Label><CategorySelect value={f.categoryId} onChange={(v) => setF({ ...f, categoryId: v })} /></div>
      <div><Label>Тип учёта</Label>
        <Segmented value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={[{ value: "check", label: "Обычная" }, { value: "count", label: "Количественная" }]} /></div>
      {f.kind === "count" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><Label>Цель</Label><input type="number" min={1} inputMode="numeric" className="field" value={f.target} onChange={(e) => setF({ ...f, target: Math.max(1, Number(e.target.value) || 1) })} /></label>
          <label className="block"><Label>Единица</Label><input className="field" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="стаканов" /></label>
        </div>)}
      <div><Label>Расписание</Label>
        <Segmented<ScheduleType> value={f.schedule.type} onChange={(v) => sch({ type: v })}
          options={[{ value: "daily", label: "Каждый день" }, { value: "days", label: "Дни недели" }, { value: "times", label: "Раз в нед." }]} /></div>
      {f.schedule.type === "days" && (
        <div className="flex gap-1">{WEEKDAYS.map((w, i) => (
          <button key={w} type="button" onClick={() => sch({ days: f.schedule.days.includes(i) ? f.schedule.days.filter((x) => x !== i) : [...f.schedule.days, i].sort() })}
            className={`flex-1 rounded-lg py-2 text-sm ${f.schedule.days.includes(i) ? "bg-success text-success-foreground" : "bg-elevated"}`}>{w}</button>))}</div>)}
      {f.schedule.type === "times" && (
        <label className="block"><Label>Сколько раз в неделю</Label>
          <input type="number" min={1} max={7} className="field" value={f.schedule.times} onChange={(e) => sch({ times: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })} /></label>)}
      <div className="flex items-center justify-between rounded-xl bg-elevated p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={f.reminder.enabled} onChange={(e) => setF({ ...f, reminder: { ...f.reminder, enabled: e.target.checked } })} />Напоминание</label>
        <input type="time" disabled={!f.reminder.enabled} className="rounded-lg bg-card px-2 py-1 disabled:opacity-40" value={f.reminder.time} onChange={(e) => setF({ ...f, reminder: { ...f.reminder, time: e.target.value } })} />
      </div>
      <PrimaryButton disabled={!f.name.trim() || (f.schedule.type === "days" && f.schedule.days.length === 0)}
        onClick={() => { save({ ...f, name: f.name.trim(), id: habit?.id }); onClose(); }}>Сохранить</PrimaryButton>
      {habit && <button className="w-full py-2 text-sm font-medium text-destructive" onClick={() => { if (confirm("Удалить привычку и её историю?")) { del(habit.id); onClose(); } }}>Удалить привычку</button>}
    </Sheet>
  );
}
