// Centralised error sanitiser. Avoids leaking raw DB/PostgREST error text
// (table/column/constraint names) to end users via toast messages.
//
// Usage: toast.error(safeErr(error))

const GENERIC = "عملیہ ناکام۔ براہ کرم دوبارہ کوشش کریں";

// Map known PostgrestError codes to friendly Urdu messages.
const CODE_MAP: Record<string, string> = {
  "23505": "یہ ریکارڈ پہلے سے موجود ہے",
  "23503": "متعلقہ ریکارڈ موجود نہیں",
  "23502": "ضروری معلومات نامکمل ہیں",
  "23514": "درج شدہ معلومات قابلِ قبول نہیں",
  "22P02": "غلط فارمیٹ",
  "42501": "اجازت نہیں",
  PGRST301: "اجازت نہیں",
};

export function safeErr(err: unknown, fallback: string = GENERIC): string {
  // Always log the real error for debugging.
  if (err) console.error("[app-error]", err);
  if (!err) return fallback;
  const e = err as { code?: string; status?: number };
  if (e.code && CODE_MAP[e.code]) return CODE_MAP[e.code];
  if (e.status === 401 || e.status === 403) return "اجازت نہیں";
  return fallback;
}
