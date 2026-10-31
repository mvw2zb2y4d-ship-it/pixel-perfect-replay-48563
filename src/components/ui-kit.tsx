import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";

export function Screen({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pt-safe pb-28">
      <header className="flex items-center justify-between py-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {action}
      </header>
      {children}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = o; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 pb-safe animate-in slide-in-from-bottom duration-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-full bg-elevated p-2"><X size={18} /></button>
        </div>
        <div className="space-y-3 pb-4">{children}</div>
      </div>
    </div>
  );
}

export const Label = ({ children }: { children: ReactNode }) => (
  <span className="mb-1 block text-xs font-medium text-muted-foreground">{children}</span>
);

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-elevated p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition ${value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CategorySelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const cats = useStore((s) => s.categories);
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChange(null)} className={`rounded-full px-3 py-1.5 text-sm ${value === null ? "bg-primary text-primary-foreground" : "bg-elevated"}`}>Без категории</button>
      {cats.map((c) => (
        <button type="button" key={c.id} onClick={() => onChange(c.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${value === c.id ? "bg-primary text-primary-foreground" : "bg-elevated"}`}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}
        </button>
      ))}
    </div>
  );
}

export function useCategory(id: string | null) {
  return useStore((s) => s.categories.find((c) => c.id === id));
}

export const PrimaryButton = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50 ${p.className ?? ""}`} />
);
export const IconButton = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 ${p.className ?? ""}`} />
);

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
