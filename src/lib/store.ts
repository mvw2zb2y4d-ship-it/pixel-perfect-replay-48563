import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Priority = "low" | "medium" | "high";
export type Repeat = "none" | "daily" | "weekly" | "monthly";
export interface Category { id: string; name: string; color: string }
export interface Task {
  id: string; title: string; description: string; date: string; time: string;
  categoryId: string | null; priority: Priority; repeat: Repeat; completedDates: string[];
}
export type ScheduleType = "daily" | "days" | "times";
export interface Habit {
  id: string; name: string; description: string; icon: string; categoryId: string | null;
  schedule: { type: ScheduleType; days: number[]; times: number };
  reminder: { enabled: boolean; time: string };
  kind: "check" | "count"; target: number; unit: string;
  log: Record<string, number>; createdAt: string;
}
export interface Settings { theme: "dark" | "light"; notifications: boolean; weekStartsMonday: boolean }

interface State {
  categories: Category[]; tasks: Task[]; habits: Habit[]; settings: Settings;
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  saveTask: (t: Omit<Task, "id" | "completedDates"> & { id?: string }) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, date: string) => void;
  saveHabit: (h: Omit<Habit, "id" | "log" | "createdAt"> & { id?: string }) => void;
  deleteHabit: (id: string) => void;
  setHabitValue: (id: string, date: string, value: number) => void;
  updateSettings: (s: Partial<Settings>) => void;
  resetAll: () => void;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const defaultCategories: Category[] = [
  { id: "work", name: "Работа", color: "#8b7cf6" },
  { id: "personal", name: "Личное", color: "#4ade80" },
  { id: "health", name: "Здоровье", color: "#f59e0b" },
  { id: "study", name: "Учёба", color: "#38bdf8" },
];
const initial = {
  categories: defaultCategories, tasks: [] as Task[], habits: [] as Habit[],
  settings: { theme: "dark", notifications: false, weekStartsMonday: true } as Settings,
};

// Storage is versioned so a cloud sync layer can later replace the storage adapter.
export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial,
      addCategory: (c) => set((s) => ({ categories: [...s.categories, { ...c, id: uid() }] })),
      updateCategory: (id, c) => set((s) => ({ categories: s.categories.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
      deleteCategory: (id) => set((s) => ({
        categories: s.categories.filter((x) => x.id !== id),
        tasks: s.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
        habits: s.habits.map((h) => (h.categoryId === id ? { ...h, categoryId: null } : h)),
      })),
      saveTask: (t) => set((s) => t.id
        ? { tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, ...t, id: x.id } : x)) }
        : { tasks: [...s.tasks, { ...t, id: uid(), completedDates: [] }] }),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) })),
      toggleTask: (id, date) => set((s) => ({
        tasks: s.tasks.map((x) => x.id !== id ? x : {
          ...x, completedDates: x.completedDates.includes(date) ? x.completedDates.filter((d) => d !== date) : [...x.completedDates, date],
        }),
      })),
      saveHabit: (h) => set((s) => h.id
        ? { habits: s.habits.map((x) => (x.id === h.id ? { ...x, ...h, id: x.id } : x)) }
        : { habits: [...s.habits, { ...h, id: uid(), log: {}, createdAt: new Date().toISOString().slice(0, 10) }] }),
      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((x) => x.id !== id) })),
      setHabitValue: (id, date, value) => set((s) => ({
        habits: s.habits.map((x) => x.id !== id ? x : { ...x, log: { ...x.log, [date]: Math.max(0, value) } }),
      })),
      updateSettings: (st) => set((s) => ({ settings: { ...s.settings, ...st } })),
      resetAll: () => set(initial),
    }),
    { name: "moy-den", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
