import Dexie, { type Table } from "dexie";
import { Capacitor } from "@capacitor/core";
import type { LocalStore } from "./store";
import { sqliteStore } from "./sqlite-store";

/** Tables mirrored locally in IndexedDB. */
export const MIRRORED_TABLES = [
  "customers",
  "measurements",
  "orders",
  "workers",
  "customer_ledger",
  "worker_ledger",
  "inventory",
  "invoices",
  "daily_production",
] as const;

export type MirroredTable = (typeof MIRRORED_TABLES)[number];

/** Foreign-key columns that must be remapped when a local id becomes a server id. */
export const REF_COLUMNS: Record<string, string[]> = {
  measurements: ["customer_id"],
  orders: ["customer_id", "assigned_worker_id"],
  customer_ledger: ["customer_id", "order_id"],
  worker_ledger: ["worker_id"],
  invoices: ["customer_id", "order_id"],
  daily_production: ["worker_id", "order_id"],
};

/** Which table a FK column points at (used for offline relation hydration). */
export const REF_TABLE: Record<string, MirroredTable> = {
  customer_id: "customers",
  order_id: "orders",
  worker_id: "workers",
  assigned_worker_id: "workers",
};

export type Row = Record<string, any> & {
  id: number;
  /** true while the row still needs to be pushed to the cloud */
  _pending?: 0 | 1;
  /** true when the row was created offline (id is a temporary local id) */
  _local?: 0 | 1;
};

export type OpStatus = "pending" | "syncing" | "failed" | "conflict";

export type OutboxOp = {
  seq?: number;
  table: MirroredTable;
  op: "insert" | "update" | "delete";
  /** row id for update/delete, or the temporary local id for insert */
  id: number;
  payload?: Record<string, any>;
  createdAt: string;
  attempts?: number;
  error?: string | null;
  /* ---- Step 3 queue fields (all optional so older queued ops stay valid) ---- */
  /** permanent, unique id of this operation (idempotency key) */
  opId?: string;
  /** permanent record identity (Step 2 uid) */
  uid?: string;
  /** cloud user id, or "local:<email>" for a device-only account */
  owner?: string;
  deviceId?: string;
  status?: OpStatus;
  /** parent records that must reach the cloud before this op */
  dependsOn?: { table: MirroredTable; id: number; uid?: string }[];
  /** updated_at of the record when this local edit started (conflict check) */
  baseUpdatedAt?: string | null;
  lastAttemptAt?: string | null;
  /** remote version captured when a conflict was detected */
  conflict?: { reason: string; remote?: Record<string, any> | null; detectedAt: string } | null;
};

/** IndexedDB adapter (web / PWA). Satisfies the LocalStore contract. */
export class DexieStore extends Dexie {
  readonly kind = "indexeddb" as const;
  outbox!: Table<OutboxOp, number>;
  meta!: Table<{ key: string; value: any }, string>;

  constructor() {
    super("almadina-offline");
    const stores: Record<string, string> = {
      outbox: "++seq, table, createdAt",
      meta: "key",
    };
    for (const t of MIRRORED_TABLES) stores[t] = "id, _pending, deleted_at";
    this.version(1).stores(stores);
  }

  rows(table: MirroredTable): Table<Row, number> {
    return (this as any)[table] as Table<Row, number>;
  }
}

let _db: LocalStore | null = null;

export function hasIndexedDB() {
  return typeof indexedDB !== "undefined";
}

/**
 * The single entry point to on-device storage. Native Android uses SQLite;
 * the browser/PWA uses IndexedDB. Returns null during SSR.
 */
export function getDb(): LocalStore | null {
  if (typeof window === "undefined") return null;
  if (!_db) {
    if (Capacitor.isNativePlatform()) _db = sqliteStore;
    else if (hasIndexedDB()) _db = new DexieStore() as unknown as LocalStore;
  }
  return _db;
}

/** Temporary ids for offline-created rows are negative so they never collide with server ids. */
let localCounter = 0;
export function nextLocalId() {
  localCounter = (localCounter + 1) % 1000;
  return -(Date.now() * 1000 + localCounter);
}
export const isLocalId = (id: number) => typeof id === "number" && id < 0;

/** Persistent map of local id -> server id, per table. */
const ID_MAP_KEY = "idmap";

export async function getIdMap(): Promise<Record<string, number>> {
  const db = getDb();
  if (!db) return {};
  const rec = await db.meta.get(ID_MAP_KEY);
  return (rec?.value as Record<string, number>) ?? {};
}

export async function setIdMapping(table: string, localId: number, serverId: number) {
  const db = getDb();
  if (!db) return;
  const map = await getIdMap();
  map[`${table}:${localId}`] = serverId;
  await db.meta.put({ key: ID_MAP_KEY, value: map });
}

export async function resolveId(table: string, id: number): Promise<number> {
  if (!isLocalId(id)) return id;
  const map = await getIdMap();
  return map[`${table}:${id}`] ?? id;
}

/** Strip local-only bookkeeping fields before sending a row to the cloud. */
export function stripLocalFields<T extends Record<string, any>>(row: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "_pending" || k === "_local") continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) continue; // embedded relations
    if (Array.isArray(v)) continue;
    out[k] = v;
  }
  return out;
}
