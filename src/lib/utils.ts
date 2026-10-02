import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Display form of a sequential business number. Records created offline carry a
 * temporary negative id until they sync and receive their real number.
 */
export function bizId(id: number | string | null | undefined): string {
  const n = Number(id);
  if (id == null || Number.isNaN(n)) return "—";
  return n < 0 ? "نیا (sync pending)" : String(n);
}
