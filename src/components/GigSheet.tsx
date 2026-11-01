import { useEffect, useState } from "react";
import { uid, useStore, type Gig } from "@/lib/store";
import { endDate, todayStr, workedHours } from "@/lib/logic";
import { Label, PrimaryButton, Sheet } from "./ui-kit";
import { Button } from "./ui/button";

export function GigSheet({ open, onClose, gig, date }: { open: boolean; onClose: () => void; gig?: Gig | null; date?: string }) {
  const [f, setF] = useState<Gig>({ id: "", date: todayStr(), start: "", end: "", hours: 0, manualHours: false, client: "", earnings: 0, comment: "" });
  useEffect(() => { if (open) setF(gig ?? { id: uid(), date: date ?? todayStr(), start: "", end: "", hours: 0, manualHours: false, client: "", earnings: 0, comment: "" }); }, [open, gig, date]);
  const hours = f.manualHours ? f.hours : workedHours(f.start, f.end);
  return <Sheet open={open} onClose={onClose} title={gig ? "Редактировать халтуру" : "Новая халтура"}>
    <label className="block"><Label>Дата</Label><input className="field" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
    <div className="grid grid-cols-2 gap-3">{(["start", "end"] as const).map((key) => <label key={key} className="min-w-0"><Label>{key === "start" ? "Начало" : "Окончание"}</Label><input type="time" className="field" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></label>)}</div>
    {f.date && f.start && f.end && <p className="text-xs text-muted-foreground">Окончание: {endDate(f.date, f.start, f.end)} в {f.end}</p>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.manualHours} onChange={(e) => setF({ ...f, hours, manualHours: e.target.checked })} />Часы вручную</label>
    <label className="block"><Label>Отработано часов</Label><input className="field" type="number" min="0" step="0.01" value={hours} readOnly={!f.manualHours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} /></label>
    <label className="block"><Label>На кого закрыт наряд</Label><input className="field" value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} /></label>
    <label className="block"><Label>Заработок, ₽</Label><input className="field" type="number" min="0" step="0.01" value={f.earnings} onChange={(e) => setF({ ...f, earnings: Number(e.target.value) })} /></label>
    <label className="block"><Label>Комментарий</Label><textarea className="field" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></label>
    <PrimaryButton disabled={!f.date || !f.start || !f.end || hours < 0 || !Number.isFinite(hours) || f.earnings < 0 || !Number.isFinite(f.earnings)} onClick={() => { useStore.getState().saveGig({ ...f, hours }); onClose(); }}>Сохранить халтуру</PrimaryButton>
    {gig && <Button variant="ghost" className="w-full text-destructive" onClick={() => { if (confirm("Удалить халтуру?")) { useStore.getState().deleteGig(gig.id); onClose(); } }}>Удалить халтуру</Button>}
  </Sheet>;
}