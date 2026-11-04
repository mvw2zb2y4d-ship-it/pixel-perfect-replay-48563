import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { initial, plannerData, useStore, type PlannerData } from "./store";
import type { Json } from "@/integrations/supabase/types";
import { parseBackup, prepareRestore, restoreCounts, type RestoreMode } from "./backup";

export const useSync = create<{ userId: string | null; email: string; status: string; ready: boolean; legacy: boolean }>(() => ({ userId: null, email: "", status: "На устройстве", ready: false, legacy: false }));
let generation = 0;
let revision = 0;
let unsubscribe: (() => void) | undefined;
let pending: PlannerData | null = null;
let saving = false;
let blocked = false;
let retry: ReturnType<typeof setTimeout> | undefined;
let restoring = false;

async function flush(epoch: number) {
  if (restoring || saving || blocked || !pending || epoch !== generation) return;
  saving = true;
  const data = pending; pending = null;
  useSync.setState({ status: "Сохраняется…" });
  const result = await supabase.rpc("save_planner_state", { p_payload: data as unknown as Json, p_revision: revision });
  saving = false;
  if (epoch !== generation) { if (pending) void flush(generation); return; }
  if (result.error) {
    pending = pending ?? data;
    if (result.error.message.includes("STATE_CONFLICT")) {
      blocked = true;
      useSync.setState({ status: "Конфликт: есть изменения на другом устройстве. Скачайте копию перед перезагрузкой." });
      return;
    }
    useSync.setState({ status: "Нет связи. Данные сохранены на устройстве." });
    retry = setTimeout(() => void flush(epoch), 5000);
    return;
  }
  revision = result.data;
  const id = useSync.getState().userId;
  if (id) localStorage.setItem(`moy-den-meta:${id}`, JSON.stringify({ revision, dirty: !!pending }));
  useSync.setState({ status: pending ? "Сохраняется…" : "Сохранено в Cloud" });
  if (pending) void flush(epoch);
}

export async function openAccount(userId: string | null, email = "") {
  // Finish the owner-bound transaction before switching persistence keys.
  while (restoring) await new Promise((resolve) => setTimeout(resolve, 25));
  if (useSync.getState().ready && useSync.getState().userId === userId) return;
  const epoch = ++generation;
  unsubscribe?.(); clearTimeout(retry); pending = null; blocked = false;
  useSync.setState({ userId, email, ready: false });
  const storageName = userId ? `moy-den:${userId}` : "moy-den";
  const existing = localStorage.getItem(storageName);
  useStore.persist.setOptions({ name: storageName });
  useStore.setState({ ...initial });
  if (existing) localStorage.setItem(storageName, existing);
  await useStore.persist.rehydrate();
  if (epoch !== generation) return;
  if (userId) {
    const cache = plannerData();
    const meta = JSON.parse(localStorage.getItem(`moy-den-meta:${userId}`) ?? '{"revision":0,"dirty":false}') as { revision: number; dirty: boolean };
    const { data, error } = await supabase.from("planner_states").select("payload,revision").eq("user_id", userId).maybeSingle();
    if (epoch !== generation) return;
    if (error) {
      revision = meta.revision;
      useSync.setState({ status: "Нет связи. Данные сохранены на устройстве." });
    } else {
      revision = data?.revision ?? 0;
      if (!meta.dirty) useStore.setState({ ...initial, ...(data?.payload as Partial<PlannerData> ?? {}) });
      else if (meta.revision !== revision) { blocked = true; revision = meta.revision; useSync.setState({ status: "Конфликт: скачайте копию перед перезагрузкой." }); }
      else pending = cache;
      if (!meta.dirty) useSync.setState({ status: "Сохранено в Cloud" });
    }
    const rawLegacy = localStorage.getItem("moy-den");
    const legacy = rawLegacy ? JSON.parse(rawLegacy).state as Partial<PlannerData> : null;
    useSync.setState({ legacy: !!legacy && !!(legacy.tasks?.length || legacy.habits?.length || legacy.gigs?.length || legacy.schedules?.length) });
    unsubscribe = useStore.subscribe(() => {
      pending = plannerData();
      localStorage.setItem(`moy-den-meta:${userId}`, JSON.stringify({ revision, dirty: true }));
      void flush(epoch);
    });
    if (error && meta.dirty) pending = cache;
    if (pending) void flush(epoch);
  } else useSync.setState({ status: "На устройстве", legacy: false });
  useSync.setState({ ready: true });
}

export async function resolveConflict(keepLocal: boolean) {
  const userId = useSync.getState().userId;
  if (!userId) return;
  const epoch = generation;
  const { data, error } = await supabase.from("planner_states").select("payload,revision").eq("user_id", userId).maybeSingle();
  if (error || epoch !== generation) return;
  revision = data?.revision ?? 0; blocked = false;
  if (keepLocal) { pending = plannerData(); void flush(epoch); }
  else {
    pending = null; unsubscribe?.();
    localStorage.setItem(`moy-den-meta:${userId}`, JSON.stringify({ revision, dirty: false }));
    useStore.setState({ ...initial, ...(data?.payload as Partial<PlannerData> ?? {}) });
    useSync.setState({ ready: false });
    await openAccount(userId, useSync.getState().email);
  }
}

export function importLegacy() {
  const raw = localStorage.getItem("moy-den");
  if (!raw || !useSync.getState().userId) return;
  const old = JSON.parse(raw).state as Partial<PlannerData>;
  const now = plannerData();
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))];
  useStore.setState({ tasks: merge(now.tasks, old.tasks ?? []), habits: merge(now.habits, old.habits ?? []), categories: merge(now.categories, old.categories ?? []), schedules: merge(now.schedules, old.schedules ?? []), gigs: merge(now.gigs, old.gigs ?? []) });
  useSync.setState({ legacy: false });
}

export function exportBackup(data = plannerData(), filename = "moy-den-backup.json") {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPreRestoreBackup() {
  const key = `moy-den-before-restore:${useSync.getState().userId ?? "local"}`;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error("На этом устройстве нет копии перед восстановлением.");
  exportBackup(parseBackup(raw), "moy-den-before-restore.json");
}

export async function restoreBackup(incoming: PlannerData, mode: RestoreMode, owner: string | null, expected: string) {
  if (restoring || !useSync.getState().ready || owner !== useSync.getState().userId) throw new Error("Аккаунт изменился. Выберите файл заново.");
  incoming = parseBackup(JSON.stringify(incoming));
  if (mode !== "replace" && mode !== "merge") throw new Error("Неизвестный режим восстановления.");
  if (saving || pending || blocked) throw new Error("Дождитесь сохранения в Cloud и разрешите конфликт перед восстановлением.");
  const previous = structuredClone(plannerData());
  if (JSON.stringify(previous) !== expected) throw new Error("Данные изменились. Выберите файл заново и проверьте результат.");
  const next = prepareRestore(previous, incoming, mode);
  const counts = restoreCounts(previous, incoming, mode);
  const epoch = generation;
  const storageKey = owner ? `moy-den:${owner}` : "moy-den";
  const metaKey = owner ? `moy-den-meta:${owner}` : null;
  const beforeRaw = localStorage.getItem(storageKey);
  const beforeMeta = metaKey ? localStorage.getItem(metaKey) : null;
  const oldRevision = revision;
  let cloudRevision: number | null = null;
  let token: string | null = null;
  let staged = false;
  const oldStatus = useSync.getState().status;
  restoring = true;
  try {
    if (owner) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      token = sessionData.session?.access_token ?? null;
      if (sessionError || !token || sessionData.session?.user.id !== owner) throw new Error("Аккаунт изменился. Восстановление отменено.");
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (error || userData.user?.id !== owner) throw new Error("Не удалось подтвердить аккаунт. Данные не изменены.");
    }
    if (epoch !== generation || JSON.stringify(plannerData()) !== expected) throw new Error("Данные изменились. Восстановление отменено.");
    // Durable safety copy first; a quota error must prevent any cloud write.
    localStorage.setItem(`moy-den-before-restore:${owner ?? "local"}`, JSON.stringify(previous));
    exportBackup(previous, "moy-den-before-restore.json");
    localStorage.setItem(storageKey, JSON.stringify({ state: next, version: 1 }));
    staged = true;
    if (metaKey) localStorage.setItem(metaKey, JSON.stringify({ revision: oldRevision + 1, dirty: false }));
    if (owner && token) {
      useSync.setState({ status: "Восстанавливается…" });
      const result = await supabase.rpc("save_planner_state", { p_payload: next as unknown as Json, p_revision: oldRevision }).setHeader("Authorization", `Bearer ${token}`);
      if (result.error) {
        // A lost response cannot prove the server did not commit. Block automatic writes until the owner reconciles.
        if (!result.error.code || result.error.message.includes("STATE_CONFLICT")) {
          blocked = true;
          useSync.setState({ status: "Конфликт: результат сохранения в Cloud нужно проверить. Прежняя копия сохранена на устройстве." });
        }
        throw new Error(result.error.message.includes("STATE_CONFLICT") ? "В Cloud появились новые изменения. Восстановление отменено; проверьте облачную версию." : "Не удалось подтвердить сохранение в Cloud. Прежние данные оставлены на устройстве; проверьте облачную версию.");
      }
      cloudRevision = result.data;
      if (JSON.stringify(plannerData()) !== expected) throw new Error("Данные изменились во время восстановления.");
      revision = cloudRevision;
      if (metaKey) localStorage.setItem(metaKey, JSON.stringify({ revision, dirty: false }));
    }
    unsubscribe?.();
    try { useStore.setState(next); }
    catch (error) {
      // Zustand changes memory before its persistence adapter writes; restore memory even if that write fails.
      try { useStore.setState(previous); } catch { /* Original storage values are restored by the outer handler. */ }
      throw error;
    }
    finally {
      if (owner) unsubscribe = useStore.subscribe(() => {
        pending = plannerData();
        localStorage.setItem(`moy-den-meta:${owner}`, JSON.stringify({ revision, dirty: true }));
        void flush(epoch);
      });
    }
    useSync.setState({ status: owner ? "Сохранено в Cloud" : "На устройстве" });
    return counts;
  } catch (error) {
    // Compensate only a confirmed cloud commit, with the same owner token and CAS revision.
    if (cloudRevision !== null && token) {
      const rollback = await supabase.rpc("save_planner_state", { p_payload: previous as unknown as Json, p_revision: cloudRevision }).setHeader("Authorization", `Bearer ${token}`);
      if (rollback.error) {
        blocked = true;
        useSync.setState({ status: "Конфликт: проверьте версию в Cloud. Копия до восстановления сохранена на устройстве." });
      } else revision = rollback.data;
    } else revision = oldRevision;
    if (staged) {
      if (beforeRaw === null) localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, beforeRaw);
      if (metaKey) {
        if (cloudRevision !== null && !blocked) localStorage.setItem(metaKey, JSON.stringify({ revision, dirty: false }));
        else if (beforeMeta === null) localStorage.removeItem(metaKey); else localStorage.setItem(metaKey, beforeMeta);
      }
    }
    if (!blocked) useSync.setState({ status: oldStatus });
    throw error instanceof Error ? error : new Error("Восстановление не выполнено. Прежние данные сохранены.");
  } finally {
    restoring = false;
    if (pending && !blocked) void flush(epoch);
  }
}