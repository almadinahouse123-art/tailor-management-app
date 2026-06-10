import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeErr } from "@/lib/errors";

export type TrashTable =
  | "customers"
  | "measurements"
  | "orders"
  | "workers"
  | "inventory"
  | "invoices"
  | "customer_ledger"
  | "worker_ledger"
  | "daily_production";

export const TRASH_LABELS: Record<TrashTable, string> = {
  customers: "گاہک",
  measurements: "پیمائش",
  orders: "آرڈر",
  workers: "کاریگر",
  inventory: "شے",
  invoices: "انوائس",
  customer_ledger: "کھاتہ اندراج",
  worker_ledger: "کاریگر اندراج",
  daily_production: "پیداوار",
};

export async function softDelete(table: TrashTable, id: number) {
  const { error } = await supabase
    .from(table as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  return error;
}

export async function restore(table: TrashTable, id: number) {
  const { error } = await supabase
    .from(table as any)
    .update({ deleted_at: null })
    .eq("id", id);
  return error;
}

export async function hardDelete(table: TrashTable, id: number) {
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  return error;
}

/** Soft-delete with a toast that lets the user undo. */
export async function softDeleteWithUndo(
  table: TrashTable,
  id: number,
  opts: { label?: string; onChange?: () => void } = {},
) {
  const err = await softDelete(table, id);
  if (err) {
    toast.error(safeErr(err));
    return false;
  }
  opts.onChange?.();
  toast.success(`${opts.label ?? TRASH_LABELS[table]} حذف ہو گیا`, {
    action: {
      label: "واپس لائیں",
      onClick: async () => {
        const e = await restore(table, id);
        if (e) toast.error(safeErr(e));
        else {
          toast.success("بحال ہو گیا");
          opts.onChange?.();
        }
      },
    },
  });
  return true;
}
