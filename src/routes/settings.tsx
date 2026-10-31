import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { useStore, type Habit } from "@/lib/store";
import { isStandalone, notifStatus, requestPermission, type NotifStatus } from "@/lib/notifications";
import { Screen, Segmented } from "@/components/ui-kit";
import { HabitSheet } from "@/components/HabitSheet";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — Мой день" },
      { name: "description", content: "Категории, тема, уведомления и управление привычками." },
      { property: "og:title", content: "Настройки — Мой день" },
      { property: "og:description", content: "Категории, тема, уведомления и управление привычками." },
    ],
  }),
  component: SettingsPage,
});

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-5"><h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    <div className="space-y-2 rounded-2xl bg-card p-3">{children}</div></section>
);
const COLORS = ["#8b7cf6", "#4ade80", "#f59e0b", "#38bdf8", "#f472b6", "#ef4444", "#a3a3a3"];

const STATUS_TEXT: Record<NotifStatus, string> = {
  unsupported: "Этот браузер не поддерживает уведомления. На iPhone добавьте приложение на главный экран (iOS 16.4+) и откройте его оттуда.",
  default: "Разрешение ещё не запрошено.",
  granted: "Разрешение получено.",
  denied: "Уведомления запрещены. Разрешите их в настройках iPhone для этого приложения.",
};

function SettingsPage() {
  const s = useStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [status, setStatus] = useState<NotifStatus>("unsupported");
  const [standalone, setStandalone] = useState(false);
  const [edit, setEdit] = useState<{ open: boolean; habit?: Habit | null }>({ open: false });
  useEffect(() => { setStatus(notifStatus()); setStandalone(isStandalone()); }, []);

  const toggleNotif = async () => {
    if (s.settings.notifications) return s.updateSettings({ notifications: false });
    const st = await requestPermission();
    setStatus(st);
    s.updateSettings({ notifications: st === "granted" });
  };

  return (
    <Screen title="Настройки">
      <Section title="Категории">
        {s.categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input type="color" aria-label="Цвет" value={c.color} onChange={(e) => s.updateCategory(c.id, { color: e.target.value })} className="h-8 w-8 shrink-0 rounded-full bg-transparent" />
            <input className="field py-2" value={c.name} onChange={(e) => s.updateCategory(c.id, { name: e.target.value })} />
            <button aria-label="Удалить" onClick={() => confirm(`Удалить категорию «${c.name}»?`) && s.deleteCategory(c.id)} className="p-2 text-destructive"><Trash2 size={18} /></button>
          </div>))}
        <div className="flex gap-1.5 pt-2">{COLORS.map((c) => (
          <button key={c} aria-label="Цвет" onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`} style={{ background: c }} />))}</div>
        <div className="flex gap-2">
          <input className="field py-2" placeholder="Новая категория" value={name} onChange={(e) => setName(e.target.value)} />
          <button disabled={!name.trim()} onClick={() => { s.addCategory({ name: name.trim(), color }); setName(""); }} className="rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">Добавить</button>
        </div>
      </Section>

      <Section title="Тема">
        <Segmented value={s.settings.theme} onChange={(v) => s.updateSettings({ theme: v })} options={[{ value: "dark", label: "Тёмная" }, { value: "light", label: "Светлая" }]} />
      </Section>

      <Section title="Уведомления">
        <div className="flex items-center justify-between">
          <span>Напоминания о привычках</span>
          <button role="switch" aria-checked={s.settings.notifications} disabled={status === "unsupported" || status === "denied"} onClick={toggleNotif}
            className={`relative h-7 w-12 rounded-full transition disabled:opacity-40 ${s.settings.notifications ? "bg-success" : "bg-elevated"}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-foreground transition-all ${s.settings.notifications ? "left-[1.4rem]" : "left-0.5"}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{STATUS_TEXT[status]}</p>
        {status === "granted" && s.settings.notifications && (
          <p className="text-xs text-muted-foreground">Напоминания срабатывают, пока приложение открыто. Фоновые push‑уведомления потребуют подключения сервера отправки — он пока не настроен.</p>)}
        {!standalone && <p className="text-xs text-muted-foreground">Чтобы установить приложение: Safari → «Поделиться» → «На экран Домой».</p>}
      </Section>

      <Section title="Привычки">
        {s.habits.length === 0 && <p className="text-sm text-muted-foreground">Привычек пока нет</p>}
        {s.habits.map((h) => (
          <button key={h.id} onClick={() => setEdit({ open: true, habit: h })} className="flex w-full items-center gap-3 rounded-xl bg-elevated p-2.5 text-left">
            <span className="text-xl">{h.icon}</span><span className="flex-1">{h.name}</span>
            <span className="text-xs text-muted-foreground">{h.reminder.enabled ? `🔔 ${h.reminder.time}` : "без напоминания"}</span>
          </button>))}
      </Section>

      <Section title="Приложение">
        <div className="flex items-center justify-between">
          <span>Неделя начинается</span><span className="text-sm text-muted-foreground">с понедельника</span>
        </div>
        <div className="text-xs text-muted-foreground">Данные хранятся на этом устройстве. Регистрация не требуется.</div>
        <button onClick={() => confirm("Удалить все задачи, привычки и настройки?") && s.resetAll()} className="w-full rounded-xl bg-elevated py-2.5 text-sm font-semibold text-destructive">Сбросить все данные</button>
      </Section>
      <HabitSheet open={edit.open} habit={edit.habit} onClose={() => setEdit({ open: false })} />
    </Screen>
  );
}
