import { useState } from "react";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { uid, useStore, type WorkSchedule, type ShiftType } from "@/lib/store";
import { scheduleTemplate, todayStr, WEEKDAYS } from "@/lib/logic";
import { Sheet, Label, PrimaryButton } from "./ui-kit";
import { Button } from "./ui/button";

const TEMPLATES = ["5/2", "2/2", "1/3", "Сутки через трое", "Сменный график", "Собственный график"];
export function ScheduleSection() {
  const schedules = useStore((s) => s.schedules); const active = useStore((s) => s.activeScheduleId);
  const [edit, setEdit] = useState<WorkSchedule | null>(null);
  return <div className="space-y-3">
    <label className="block"><Label>Активный график</Label><select className="field" value={active ?? ""} onChange={(e) => useStore.getState().activateSchedule(e.target.value || null)}><option value="">Без графика</option>{schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    {schedules.map((s) => <div key={s.id} className="flex items-center gap-1"><span className="min-w-0 flex-1 break-words text-sm">{s.name}</span><Button size="icon" variant="ghost" aria-label={`Изменить график ${s.name}`} onClick={() => setEdit(structuredClone(s))}><Pencil /></Button><Button size="icon" variant="ghost" aria-label={`Копировать график ${s.name}`} onClick={() => setEdit({ ...structuredClone(s), id: uid(), name: `${s.name} — копия`, overrides: {} })}><Copy /></Button><Button size="icon" variant="ghost" aria-label={`Удалить график ${s.name}`} onClick={() => confirm(`Удалить график «${s.name}»?`) && useStore.getState().deleteSchedule(s.id)}><Trash2 /></Button></div>)}
    <Button className="w-full" onClick={() => setEdit({ ...scheduleTemplate("Собственный график", todayStr()), startDate: "", id: uid() })}><Plus />Создать график</Button>
    {edit && <ScheduleEditor value={edit} onClose={() => setEdit(null)} />}
  </div>;
}
function ScheduleEditor({ value, onClose }: { value: WorkSchedule; onClose: () => void }) {
  const [f, setF] = useState(value);
  function patchShift(id: string, patch: Partial<ShiftType>) { setF({ ...f, shifts: f.shifts.map((s) => s.id === id ? { ...s, ...patch } : s) }); }
  const valid = f.name.trim() && f.startDate && f.shifts.every((s) => s.name.trim() && (s.off || (s.start && s.end))) && (f.mode === "manual" || f.pattern.length > 0);
  return <Sheet open onClose={onClose} title="Мой рабочий график">
    <label className="block"><Label>Быстрый шаблон</Label><select className="field" value="" onChange={(e) => { if (!e.target.value) return; const template = scheduleTemplate(e.target.value, f.startDate); setF({ ...template, id: f.id, overrides: f.overrides }); }}><option value="">Выбрать шаблон</option>{TEMPLATES.map((name) => <option key={name}>{name}</option>)}</select></label>
    <label className="block"><Label>Название графика</Label><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
    <label className="block"><Label>Дата начала</Label><input type="date" className="field" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
    <h3 className="font-semibold">Типы смен</h3>
    {f.shifts.map((s, i) => <div key={s.id} className="space-y-2 border-b pb-3">
      <div className="flex items-end gap-2"><label className="min-w-0 flex-1"><Label>Название смены {i + 1}</Label><input className="field" value={s.name} onChange={(e) => patchShift(s.id, { name: e.target.value })} /></label><Button size="icon" variant="ghost" aria-label={`Удалить тип смены ${i + 1}`} onClick={() => setF({ ...f, shifts: f.shifts.filter((x) => x.id !== s.id), pattern: f.pattern.map((id) => id === s.id ? null : id) })}><Trash2 /></Button></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.off} onChange={(e) => patchShift(s.id, { off: e.target.checked })} />Выходной день</label>
      {!s.off && <><label className="block"><Label>Тип смены</Label><select className="field" value={s.kind} onChange={(e) => patchShift(s.id, { kind: e.target.value as ShiftType["kind"] })}><option value="day">Дневная</option><option value="night">Ночная</option><option value="regular">Обычная</option><option value="custom">Пользовательская</option></select></label><div className="grid grid-cols-2 gap-2"><label className="min-w-0"><Label>Начало смены</Label><input type="time" className="field" value={s.start} onChange={(e) => patchShift(s.id, { start: e.target.value })} /></label><label className="min-w-0"><Label>Конец смены</Label><input type="time" className="field" value={s.end} onChange={(e) => patchShift(s.id, { end: e.target.value })} /></label></div></>}
    </div>)}
    <Button variant="secondary" onClick={() => setF({ ...f, shifts: [...f.shifts, { id: uid(), name: "Новая смена", kind: "regular", start: "09:00", end: "18:00", off: false }] })}><Plus />Добавить тип смены</Button>
    <label className="block"><Label>Повторение</Label><select className="field" value={f.mode} onChange={(e) => { const mode = e.target.value as WorkSchedule["mode"]; setF({ ...f, mode, pattern: mode === "weekly" ? Array.from({ length: 7 }, (_, i) => f.pattern[i] ?? null) : f.pattern }); }}><option value="weekly">По дням недели</option><option value="cycle">Повторяющийся цикл</option><option value="manual">Вручную по календарю</option></select></label>
    {f.mode !== "manual" && <><h3 className="font-semibold">{f.mode === "weekly" ? "Дни недели" : `Цикл · ${f.pattern.length} дней`}</h3>{f.pattern.map((id, i) => <div key={i} className="flex items-center gap-2"><span className="w-14 shrink-0 text-sm">{f.mode === "weekly" ? WEEKDAYS[i] : `День ${i + 1}`}</span><select aria-label={`Смена ${f.mode === "weekly" ? WEEKDAYS[i] : `день ${i + 1}`}`} className="field" value={id ?? ""} onChange={(e) => setF({ ...f, pattern: f.pattern.map((v, n) => n === i ? e.target.value || null : v) })}><option value="">Без смены</option>{f.shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{f.mode === "cycle" && <Button size="icon" variant="ghost" aria-label={`Удалить день ${i + 1}`} onClick={() => setF({ ...f, pattern: f.pattern.filter((_, n) => n !== i) })}><Trash2 /></Button>}</div>)}{f.mode === "cycle" && <Button variant="secondary" onClick={() => setF({ ...f, pattern: [...f.pattern, null] })}><Plus />Добавить день цикла</Button>}</>}
    <PrimaryButton disabled={!valid} onClick={() => { useStore.getState().saveSchedule({ ...f, name: f.name.trim() }); onClose(); }}>Сохранить график</PrimaryButton>
  </Sheet>;
}