/**
 * Cloud -> device download.
 *
 * Per table we keep a cursor (the highest server `updated_at` seen). Each run
 * re-reads a small overlap window before the cursor so rows committed slightly
 * out of order are never missed; merging is idempotent so re-reading is safe.
 * All timestamps come from the server, so device clock drift does not matter.
 * Paged (PAGE rows at a time) and resumable: the cursor only advances after a
 * page has been written locally.
 *
 * Deletes arrive through `sync_tombstones` (filled by a cloud trigger).
 * Rows with unsynced local changes are never overwritten here; the outbox
 * detects and records those as conflicts instead.
 */
import { supabase as cloud } from "@/integrations/supabase/client";
import { getDb, MIRRORED_TABLES, stripLocalFields, type MirroredTable, type Row } from "./db";
import { tombstonedIds } from "./outbox";

const PAGE = 500;
const OVERLAP_MS = 2 * 60 * 1000;
const EPOCH = "1970-01-01T00:00:00Z";
const cursorKey = (t: string) => `pull_cursor:${t}`;

async function getCursor(key: string): Promise<string> {
  return ((await getDb()?.meta.get(key))?.value as string) ?? EPOCH;
}
async function setCursor(key: string, v: string) {
  await getDb()?.meta.put({ key, value: v });
}
const minus = (iso: string, ms: number) =>
  iso === EPOCH ? EPOCH : new Date(new Date(iso).getTime() - ms).toISOString();

export type PullResult = { applied: number; deleted: number; skipped: number };

/** Merge one remote row. Returns "applied" | "skipped". */
export async function mergeRemoteRow(table: MirroredTable, remote: any, tombs?: Set<number>) {
  const db = getDb()!;
  if (remote?.id == null) return "skipped" as const;
  if (tombs?.has(Number(remote.id))) return "skipped" as const; // deleted here, delete still queued
  const local = await db.rows(table).get(Number(remote.id));
  if (local?._pending) return "skipped" as const; // local edit wins until the outbox resolves it
  if (local?.uid && remote.uid && local.uid !== remote.uid) {
    // Same business number, different record (made on another device). Keep ours.
    return "skipped" as const;
  }
  await db.rows(table).put({ ...stripLocalFields(remote), _pending: 0, _local: 0 } as Row);
  return "applied" as const;
}

async function pullTable(table: MirroredTable, res: PullResult) {
  const c = cloud as any;
  const key = cursorKey(table);
  let cursor = await getCursor(key);
  const tombs = await tombstonedIds(table);
  const since = minus(cursor, OVERLAP_MS);
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await c
      .from(table)
      .select("*")
      .gte("updated_at", since)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows: any[] = data ?? [];
    for (const r of rows) {
      const out = await mergeRemoteRow(table, r, tombs);
      if (out === "applied") res.applied++;
      else res.skipped++;
      if (r.updated_at && r.updated_at > cursor) cursor = r.updated_at;
    }
    await setCursor(key, cursor); // resumable: progress saved per page
    if (rows.length < PAGE) break;
  }
}

async function pullTombstones(res: PullResult) {
  const c = cloud as any;
  const db = getDb()!;
  const key = "pull_cursor:__tombstones";
  let cursor = await getCursor(key);
  const since = minus(cursor, OVERLAP_MS);
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await c
      .from("sync_tombstones")
      .select("table_name,row_id,row_uid,deleted_at")
      .gte("deleted_at", since)
      .order("deleted_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows: any[] = data ?? [];
    for (const t of rows) {
      if (!(MIRRORED_TABLES as readonly string[]).includes(t.table_name)) continue;
      const table = t.table_name as MirroredTable;
      const local = await db.rows(table).get(Number(t.row_id));
      if (local && !local._pending && (!local.uid || !t.row_uid || local.uid === t.row_uid)) {
        await db.rows(table).delete(Number(t.row_id));
        res.deleted++;
      }
      if (t.deleted_at > cursor) cursor = t.deleted_at;
    }
    await setCursor(key, cursor);
    if (rows.length < PAGE) break;
  }
}

/** Download every table's changes since the last successful run. */
export async function pullChanges(): Promise<PullResult> {
  const res: PullResult = { applied: 0, deleted: 0, skipped: 0 };
  for (const t of MIRRORED_TABLES) await pullTable(t, res);
  await pullTombstones(res);
  return res;
}
