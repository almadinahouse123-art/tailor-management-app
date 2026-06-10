import { z } from "zod";

// Per-table allowlists for backup import. Anything not in this list is
// dropped from the input row before insertion. Keeps malicious or stale
// fields (user_id, deleted_at, unknown columns) out of the database.

const num = z.coerce.number().finite().nullable().optional();
const int = z.coerce.number().int().nullable().optional();
const str = (max = 500) => z.coerce.string().max(max).nullable().optional();
const bool = z.coerce.boolean().nullable().optional();
const date = z.coerce.string().max(64).nullable().optional();

export const TABLE_SCHEMAS = {
  customers: z.object({
    name: str(200),
    phone: str(40),
    address: str(500),
    notes: str(1000),
  }),
  measurements: z.object({
    customer_id: int,
    kind: str(40),
    data: z.any().optional(),
    notes: str(1000),
  }),
  orders: z.object({
    customer_id: int,
    title: str(200),
    status: str(40),
    total: num,
    advance: num,
    due_date: date,
    delivery_date: date,
    notes: str(1000),
  }),
  workers: z.object({
    name: str(200),
    phone: str(40),
    notes: str(1000),
  }),
  inventory: z.object({
    item_name: str(200),
    quantity: num,
    unit: str(40),
    price: num,
    notes: str(1000),
  }),
  invoices: z.object({
    customer_id: int,
    order_id: int,
    amount: num,
    paid: num,
    status: str(40),
    notes: str(1000),
    issued_at: date,
  }),
  customer_ledger: z.object({
    customer_id: int,
    kind: str(40),
    amount: num,
    notes: str(1000),
    entry_date: date,
  }),
  worker_ledger: z.object({
    worker_id: int,
    kind: str(40),
    amount: num,
    notes: str(1000),
    entry_date: date,
  }),
  daily_production: z.object({
    worker_id: int,
    entry_date: date,
    simple_count: int,
    simple_rate: num,
    check_count: int,
    check_rate: num,
    total: num,
    notes: str(1000),
  }),
} as const;

export type BackupTable = keyof typeof TABLE_SCHEMAS;

export function sanitiseRow(table: BackupTable, row: unknown) {
  const schema = TABLE_SCHEMAS[table];
  const parsed = schema.safeParse(row);
  if (!parsed.success) return null;
  // Drop undefined keys so we don't overwrite DB defaults.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
