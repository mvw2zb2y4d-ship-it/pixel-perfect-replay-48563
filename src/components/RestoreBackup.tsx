import { useEffect, useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "./ui-kit";
import { plannerData, type PlannerData } from "@/lib/store";
import { downloadPreRestoreBackup, restoreBackup, useSync } from "@/lib/cloud-sync";
import { parseBackup, restoreCounts, type RestoreMode } from "@/lib/backup";

export function RestoreBackup() {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ data: PlannerData; current: PlannerData; owner: string | null; name: string } | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasCopy, setHasCopy] = useState(false);
  const ownerId = useSync((s) => s.userId);
  useEffect(() => { setHasCopy(!!localStorage.getItem(`moy-den-before-restore:${ownerId ?? "local"}`)); }, [ownerId]);
  const counts = preview ? restoreCounts(preview.current, preview.data, mode) : [];

  async function choose(file: File | undefined) {
    if (!file) return;
    setMessage(""); setConfirming(false);
    const owner = useSync.getState().userId;
    try {
      const data = parseBackup(await file.text());
      if (owner !== useSync.getState().userId) throw new Error("Аккаунт изменился. Выберите файл заново.");
      setMode("merge"); setPreview({ data, current: structuredClone(plannerData()), owner, name: file.name });
    } catch (error) { setPreview(null); setMessage(error instanceof Error ? error.message : "Не удалось прочитать файл. Данные не изменены."); }
  }
  async function apply() {
    if (!preview || busy) return;
    setBusy(true);
    try {
      const result = await restoreBackup(preview.data, mode, preview.owner, JSON.stringify(preview.current));
      setMessage(`Восстановление завершено${preview.owner ? "; сохранено в Cloud" : "; сохранено на устройстве"}. ${result.map((r) => `${r.label}: ${r.count}`).join(" · ")}.`);
      setHasCopy(true); setPreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось восстановить данные.");
      setHasCopy(!!localStorage.getItem(`moy-den-before-restore:${useSync.getState().userId ?? "local"}`));
      setPreview(null);
    } finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <input ref={input} type="file" accept=".json,application/json" aria-label="Резервная копия JSON" className="hidden" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
    <Button variant="outline" className="h-auto w-full whitespace-normal" onClick={() => input.current?.click()}><Upload />Восстановить из резервной копии</Button>
    {hasCopy && <Button variant="outline" className="h-auto w-full whitespace-normal" onClick={() => { try { downloadPreRestoreBackup(); } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось скачать копию."); } }}><Download />Скачать копию до восстановления</Button>}
    {message && <p role="status" className="break-words text-sm">{message}</p>}
    <Sheet open={!!preview} onClose={() => { if (!busy) setPreview(null); }} title={confirming ? "Подтвердите восстановление" : "Резервная копия"}>
      {preview && <>
        <p className="break-all text-sm text-muted-foreground">{preview.name}</p>
        <p className="break-words text-sm">{preview.owner ? `Текущий аккаунт: ${useSync.getState().email || "личный аккаунт"}` : "Данные на этом устройстве, без аккаунта"}</p>
        <fieldset disabled={busy || confirming} className="space-y-2">
          <label className="flex items-center gap-2"><input type="radio" name="restore-mode" checked={mode === "merge"} onChange={() => setMode("merge")} />Объединить данные</label>
          <label className="flex items-center gap-2"><input type="radio" name="restore-mode" checked={mode === "replace"} onChange={() => setMode("replace")} />Заменить мои данные</label>
        </fieldset>
        <p className="text-sm text-muted-foreground">{mode === "merge" ? "Существующие записи с совпадающими ID, настройки и активный график останутся без изменений." : "Все записи и настройки текущего владельца будут заменены содержимым файла."}</p>
        <dl className="space-y-1 text-sm">{counts.map((r) => <div key={r.key} className="flex justify-between"><dt>{r.label}</dt><dd>{r.count}</dd></div>)}</dl>
        <p className="text-xs text-muted-foreground">До восстановления текущая копия будет сохранена на этом устройстве и отправлена на скачивание.</p>
        {confirming && <p className="text-sm font-semibold">{mode === "replace" ? "Подтверждаете полную замену ваших данных?" : "Подтверждаете добавление новых записей?"}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} variant="outline" onClick={() => confirming ? setConfirming(false) : setPreview(null)}>Отмена</Button>
          <Button disabled={busy} onClick={() => confirming ? void apply() : setConfirming(true)}>{busy ? "Восстанавливается…" : confirming ? "Подтвердить восстановление" : "Продолжить"}</Button>
        </div>
      </>}
    </Sheet>
  </div>;
}