import { Pencil } from "lucide-react";
import type { Gig } from "@/lib/store";
import { endDate } from "@/lib/logic";
import { Button } from "./ui/button";
export function GigItem({ gig, onEdit }: { gig: Gig; onEdit: () => void }) {
  return <article className="flex items-start gap-3 rounded-xl border-l-4 border-success bg-card p-3">
    <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{gig.client || "Халтура"}</h3>
      <p className="text-sm text-muted-foreground">{gig.date} · {gig.start} → {endDate(gig.date, gig.start, gig.end) !== gig.date ? `${endDate(gig.date, gig.start, gig.end)} ` : ""}{gig.end}</p>
      <p className="mt-1 text-sm">{gig.hours} ч · <span className="text-success">{gig.earnings.toLocaleString("ru-RU")} ₽</span></p>
      {gig.comment && <p className="mt-1 break-words text-xs text-muted-foreground">{gig.comment}</p>}
    </div><Button size="icon" variant="ghost" aria-label="Редактировать халтуру" onClick={onEdit}><Pencil /></Button>
  </article>;
}