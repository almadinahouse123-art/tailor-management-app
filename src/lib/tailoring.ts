export const URDU_LABELS = {
  lambai: "لمبائی",
  daman: "دامن",
  daman_style: "دامن کی قسم",
  chorai: "چوڑائی",
  tera: "تیرا",
  asteen: "آستین",
  collar_type: "کالر",
  collar_size: "کالر (گلا)",
  cuff_paimaish: "کف پیمائش",
  jeb: "جب",
  asteen_type: "آستین ٹائپ",
  asteen_description: "آستین تفصیل",
  shalwar_size: "شلوار سائز",
  panja: "پنجہ",
  notes: "نوٹ",
} as const;

export const COLLAR_OPTIONS = ["بن", "دو ٹکڑا"];
export const JEB_OPTIONS = ["2 سائیڈ", "2+1"];
export const ASTEEN_TYPE_OPTIONS = ["کف", "کنار", "چک پٹے"];
export const DAMAN_STYLE_OPTIONS = ["گول", "سیدھا"];

export type PaymentStatus = "paid" | "partial" | "unpaid";

export function paymentStatus(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

export function statusBadgeClass(s: PaymentStatus) {
  if (s === "paid") return "bg-success/15 text-success border-success/30";
  if (s === "partial") return "bg-warning/20 text-foreground border-warning/40";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

export function statusLabel(s: PaymentStatus) {
  return s === "paid" ? "ادا شدہ" : s === "partial" ? "جزوی" : "غیر ادا";
}

export const ORDER_STATUS = ["Pending", "Stitching", "Ready", "Delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  Pending: "زیر التواء",
  Stitching: "سلائی میں",
  Ready: "تیار",
  Delivered: "ڈیلیور شدہ",
};

export function fmtMoney(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return "Rs " + v.toLocaleString("en-PK");
}
