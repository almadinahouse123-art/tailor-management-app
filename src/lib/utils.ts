import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Display form of a sequential business number. Numbers are assigned on the
 * device at creation time and never change. Very old offline records (from
 * before permanent numbering) may still carry a negative placeholder until
 * they upload; those show a dash.
 */
export function bizId(id: number | string | null | undefined): string {
  const n = Number(id);
  if (id == null || Number.isNaN(n) || n < 0) return "—";
  return String(n);
}
