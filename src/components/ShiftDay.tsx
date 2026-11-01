import { useEffect, useState } from "react";
import { Moon, Briefcase, Pencil, RotateCcw } from "lucide-react";
import { useStore, type WorkSchedule, type ShiftType } from "@/lib/store";
import { endDate, shiftOn, workedHours } from "@/lib/logic";
import { Button } from "./ui/button";
import { Label, Sheet, PrimaryButton } from "./ui-kit";

export function ShiftDay({ schedule, date }: { schedule: WorkSchedule; date: string }) {
  const shift = shiftOn(schedule, date); const manual = Object.prototype.hasOwnProperty.call(schedule.overrides, date);
  const [open, setOpen] = useState(false); const [f, setF] = useState<ShiftType>({ id: "manual", name: "Смена", kind: "regular", start: "09:00", end: "18:00", off: false });
  useEffect(() => { if (open) setF(shift ? { ...shift } : { id: "manual", name: "Смена", kind: "regular", start: "09:00", end: "18:00", off: false }); }, [open]);
  return <>
    <article className={`rounded-xl border-l-4 bg-card p-3 ${shift?.off ? "border-muted-foreground" : shift?.kind === "night" ? "border-warning" : "border-primary"}`}>
      <div className="flex items-center gap-2">{shift?.kind === "night" ? <Moon className="text-warning" size={18} /> : <Briefcase className="text-primary" size={18} />}<h3 className="min-w-0 flex-1 break-words font-semibold">{shift?.name ?? "Смена не назначена"}</h3><Button size="icon" variant="ghost" aria-label="Изменить смену на дату" onClick={() => setOpen(true)}><Pencil /></Button></div>
      {shift && !shift.off && <p className="text-sm text-muted-foreground">{date} {shift.start} → {endDate(date, shift.start, shift.end)} {shift.end} · {workedHours(shift.start, shift.end)} ч</p>}
      {manual && <div className="mt-1 flex flex-wrap items-center justify-between gap-1"><span className="text-xs text-muted-foreground">Изменено вручную</span><Button size="sm" variant="ghost" onClick={() => useStore.getState().overrideShift(schedule.id, date, undefined)}><RotateCcw />Автоматическая смена</Button></div>}
    </article>
    <Sheet open={open} onClose={() => setOpen(false)} title={`Смена · ${date}`}>
      <label className="block"><Label>Тип смены из графика</Label><select className="field" value="" onChange={(e) => { const s = schedule.shifts.find((x) => x.id === e.target.value); if (s) setF({ ...s }); }}><option value="">Выбрать</option>{schedule.shifts.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      <label className="block"><Label>Название смены</Label><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.off} onChange={(e) => setF({ ...f, off: e.target.checked })} />Выходной день</label>
      {!f.off && <><label className="block"><Label>Тип смены</Label><select className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as ShiftType["kind"] })}><option value="day">Дневная</option><option value="night">Ночная</option><option value="regular">Обычная</option><option value="custom">Пользовательская</option></select></label><div className="grid grid-cols-2 gap-2">{(["start", "end"] as const).map((key) => <label key={key} className="min-w-0"><Label>{key === "start" ? "Начало" : "Окончание"}</Label><input type="time" className="field" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></label>)}</div></>}
      <PrimaryButton disabled={!f.name.trim() || (!f.off && (!f.start || !f.end))} onClick={() => { useStore.getState().overrideShift(schedule.id, date, { ...f }); setOpen(false); }}>Сохранить на эту дату</PrimaryButton>
      <Button variant="secondary" className="w-full" onClick={() => { useStore.getState().overrideShift(schedule.id, date, null); setOpen(false); }}>Убрать смену на эту дату</Button>
      {manual && <Button variant="ghost" className="w-full" onClick={() => { useStore.getState().overrideShift(schedule.id, date, undefined); setOpen(false); }}>Восстановить автоматическую смену</Button>}
    </Sheet>
  </>;
}