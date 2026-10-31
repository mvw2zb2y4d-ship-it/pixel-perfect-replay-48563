import { Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, CheckSquare, Settings, Sparkles } from "lucide-react";

const items = [
  { to: "/", label: "Календарь", icon: CalendarDays },
  { to: "/tasks", label: "Задачи", icon: CheckSquare },
  { to: "/habits", label: "Привычки", icon: Sparkles },
  { to: "/stats", label: "Статистика", icon: BarChart3 },
  { to: "/settings", label: "Настройки", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 pb-safe backdrop-blur-xl">
      <div className="mx-auto flex max-w-md">
        {items.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: true }}
            className="flex flex-1 flex-col items-center gap-1 pt-2 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary">
            <Icon size={22} />{label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
