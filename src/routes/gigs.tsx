import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore, type Gig } from "@/lib/store";
import { Screen, Empty, IconButton } from "@/components/ui-kit";
import { GigSheet } from "@/components/GigSheet";
import { GigItem } from "@/components/GigItem";
export const Route = createFileRoute("/gigs")({ head: () => ({ meta: [{ title: "Халтуры — Мой день" }, { name: "description", content: "Личный учёт подработок, часов и заработка." }, { property: "og:title", content: "Халтуры — Мой день" }, { property: "og:description", content: "Личный учёт подработок, часов и заработка." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: GigsPage });
function GigsPage() {
  const gigs = useStore((s) => s.gigs); const [edit, setEdit] = useState<{ open: boolean; gig?: Gig | null }>({ open: false });
  return <Screen title="Халтуры" action={<IconButton aria-label="Новая халтура" onClick={() => setEdit({ open: true })}><Plus /></IconButton>}>
    <div className="mb-4 flex justify-between text-sm text-muted-foreground"><span>{gigs.reduce((n, g) => n + g.hours, 0).toLocaleString("ru-RU")} ч</span><span className="text-success">{gigs.reduce((n, g) => n + g.earnings, 0).toLocaleString("ru-RU")} ₽</span></div>
    <div className="space-y-2">{gigs.length ? [...gigs].sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`)).map((gig) => <GigItem key={gig.id} gig={gig} onEdit={() => setEdit({ open: true, gig })} />) : <Empty>Халтур пока нет</Empty>}</div>
    <GigSheet open={edit.open} gig={edit.gig} onClose={() => setEdit({ open: false })} />
  </Screen>;
}