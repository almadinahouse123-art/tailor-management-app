/**
 * Stock movements: stock in / out / adjustment as separate records, so
 * movements made on several offline devices add up instead of overwriting
 * each other. The cloud applies each movement to the item's quantity (trigger);
 * the device applies it to its local copy immediately without queuing a
 * competing quantity edit.
 */
import { supabase } from "./client";
import { getDb } from "./db";
import { notifyLocalChange } from "./bus";

export type StockKind = "in" | "out" | "adjust";

export async function addStockMovement(opts: {
  itemId: number;
  kind: StockKind;
  /** positive amount for in/out; signed difference for adjust */
  amount: number;
  note?: string | null;
  date?: string;
}) {
  const qty =
    opts.kind === "in" ? Math.abs(opts.amount) : opts.kind === "out" ? -Math.abs(opts.amount) : opts.amount;
  if (!qty) return { error: null };
  const { error } = await (supabase as any).from("stock_movements").insert({
    item_id: opts.itemId,
    kind: opts.kind,
    qty_change: qty,
    note: opts.note ?? null,
    movement_date: opts.date ?? new Date().toISOString().slice(0, 10),
  });
  if (error) return { error };
  const db = getDb();
  const item = await db?.rows("inventory").get(opts.itemId);
  if (db && item) await db.rows("inventory").put({ ...item, quantity: Number(item.quantity ?? 0) + qty });
  notifyLocalChange();
  return { error: null };
}
