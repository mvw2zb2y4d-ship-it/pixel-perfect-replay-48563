export type ShiftKind = "day" | "night" | "regular" | "custom";
export interface ShiftType { id: string; name: string; kind: ShiftKind; start: string; end: string; off: boolean }
export interface WorkSchedule {
  id: string; name: string; mode: "weekly" | "cycle" | "manual"; startDate: string;
  shifts: ShiftType[]; pattern: (string | null)[];
  overrides: Record<string, ShiftType | null>;
}
export interface Gig { id: string; date: string; start: string; end: string; hours: number; manualHours: boolean; client: string; earnings: number; comment: string }