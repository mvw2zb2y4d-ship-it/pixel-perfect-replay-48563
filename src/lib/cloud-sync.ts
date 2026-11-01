import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { initial, plannerData, useStore, type PlannerData } from "./store";
import type { Json } from "@/integrations/supabase/types";

export const useSync = create<{ userId: string | null; email: string; status: string; ready: boolean; legacy: boolean }>(() => ({ userId: null, email: "", status: "На устройстве", ready: false, legacy: false }));
let generation = 0;
let revision = 0;
let unsubscribe: (() => void) | undefined;
let pending: PlannerData | null = null;
let saving = false;
let retry: ReturnType<typeof setTimeout> | undefined;

async function flush(epoch: number) {
  if (saving || !pending || epoch !== generation) return;
  saving = true;
  const data = pending; pending = null;
  useSync.setState({ status: "Сохраняется…" });
  const result = await supabase.rpc("save_planner_state", { p_payload: data as unknown as Json, p_revision: revision });
  saving = false;
  if (epoch !== generation) return;
  if (result.error) {
    pending = pending ?? data;
    if (result.error.message.includes("STATE_CONFLICT")) {
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
  if (useSync.getState().ready && useSync.getState().userId === userId) return;
  const epoch = ++generation;
  unsubscribe?.(); clearTimeout(retry); pending = null;
  useSync.setState({ userId, email, ready: false });
  useStore.persist.setOptions({ name: userId ? `moy-den:${userId}` : "moy-den" });
  useStore.setState({ ...initial });
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
      else if (meta.revision !== revision) useSync.setState({ status: "Конфликт: скачайте копию перед перезагрузкой." });
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
    if (pending) void flush(epoch);
  } else useSync.setState({ status: "На устройстве", legacy: false });
  useSync.setState({ ready: true });
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

export function exportBackup() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(plannerData(), null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = "moy-den-backup.json"; a.click(); URL.revokeObjectURL(url);
}