/**
 * Local Data Layer storage contract.
 *
 * Every piece of the app that touches on-device data (offline query layer,
 * sync engine, local auth) goes through this interface — never through a
 * concrete database. Two adapters implement it:
 *   - Native SQLite (Android / Capacitor)  -> sqlite-store.ts
 *   - IndexedDB via Dexie (web / PWA)      -> db.ts (DexieStore)
 */
import type { MirroredTable, OutboxOp, Row } from "./db";

export interface RowTable {
  toArray(): Promise<Row[]>;
  get(id: number): Promise<Row | undefined>;
  bulkGet(ids: number[]): Promise<(Row | undefined)[]>;
  put(row: Row): Promise<unknown>;
  /** Atomic: all rows are written or none are. */
  bulkPut(rows: Row[]): Promise<unknown>;
  delete(id: number): Promise<void>;
}

export interface OutboxTable {
  count(): Promise<number>;
  toArray(): Promise<OutboxOp[]>;
  orderBy(field: "seq"): { toArray(): Promise<OutboxOp[]> };
  where(field: "table"): { equals(table: string): { toArray(): Promise<OutboxOp[]> } };
  add(op: OutboxOp): Promise<number>;
  update(seq: number, patch: Partial<OutboxOp>): Promise<unknown>;
  delete(seq: number): Promise<void>;
}

export interface MetaTable {
  get(key: string): Promise<{ key: string; value: any } | undefined>;
  put(rec: { key: string; value: any }): Promise<unknown>;
  delete(key: string): Promise<void>;
}

export interface LocalStore {
  readonly kind: "sqlite" | "indexeddb";
  outbox: OutboxTable;
  meta: MetaTable;
  rows(table: MirroredTable): RowTable;
}
