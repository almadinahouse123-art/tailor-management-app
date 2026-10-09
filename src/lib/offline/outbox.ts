/**
 * Offline Changes Queue (Outbox).
 *
 * Every local CREATE / UPDATE / DELETE that has not reached the cloud is
 * recorded here through the LocalStore (SQLite on Android, IndexedDB on web).
 *
 * Rules:
 *  - each op has a permanent opId (idempotency key) and the record's permanent uid
 *  - an UPDATE to a record whose CREATE is still queued is folded into that CREATE
 *  - repeated UPDATEs to the same record collapse into one queued UPDATE
 *  - a DELETE of a record that never reached the cloud just removes its queued ops
 *  - a DELETE of a synced record is queued and leaves a tombstone so the record
 *    cannot reappear from cloud reads before the delete uploads
 *  - children list the parents they need (dependsOn) so they never upload first
 */
import { getDb, REF_COLUMNS, REF_TABLE, type MirroredTable, type OutboxOp, type Row } from "./db";
import { newUid } from "./ids";

const TOMBSTONES = "tombstones";
const DEVICE_ID = "device_id";

let ownerResolver: () => Promise<string | undefined> = async () => undefined;
/** Set by the auth layer: returns the cloud user id, or "local:<email>". */
export function setOwnerResolver(fn: () => Promise<string | undefined>) {
  ownerResolver = fn;
}

export async function getDeviceId(): Promise<string> {
  const db = getDb();
  if (!db) return "unknown";
  const rec = await db.meta.get(DEVICE_ID);
  if (rec?.value) return rec.value as string;
  const id = newUid();
  await db.meta.put({ key: DEVICE_ID, value: id });
  return id;
}

/** Parents of a row that have not reached the cloud yet. */
async function pendingParents(table: MirroredTable, row: Record<string, any>) {
  const db = getDb()!;
  const out: NonNullable<OutboxOp["dependsOn"]> = [];
  for (const col of REF_COLUMNS[table] ?? []) {
    const pid = row[col];
    if (pid == null) continue;
    const ptable = REF_TABLE[col];
    const parent = await db.rows(ptable).get(Number(pid));
    if (parent && (parent._pending || parent._local)) {
      out.push({ table: ptable, id: Number(pid), uid: parent.uid });
    }
  }
  return out;
}

async function opsFor(table: MirroredTable, id: number) {
  const db = getDb()!;
  return (await db.outbox.where("table").equals(table).toArray()).filter((o) => o.id === id);
}

async function base(): Promise<Pick<OutboxOp, "opId" | "owner" | "deviceId" | "status" | "attempts" | "createdAt">> {
  return {
    opId: newUid(),
    owner: await ownerResolver(),
    deviceId: await getDeviceId(),
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
}

/** Queue a local CREATE. Ignored if an op with the same opId already exists. */
export async function queueInsert(table: MirroredTable, row: Row, payload: Record<string, any>, opId?: string) {
  const db = getDb();
  if (!db) return;
  if (opId && (await db.outbox.toArray()).some((o) => o.opId === opId)) return;
  const b = await base();
  await db.outbox.add({
    ...b,
    opId: opId ?? b.opId,
    table,
    op: "insert",
    id: row.id,
    uid: row.uid,
    payload,
    dependsOn: await pendingParents(table, row),
  });
}

/** Queue a local UPDATE, folding it into an existing queued op when possible. */
export async function queueUpdate(table: MirroredTable, before: Row, patch: Record<string, any>) {
  const db = getDb();
  if (!db) return;
  const existing = (await opsFor(table, before.id)).filter((o) => o.status !== "syncing");
  const ins = existing.find((o) => o.op === "insert");
  if (ins) {
    await db.outbox.update(ins.seq!, { payload: { ...ins.payload, ...patch } });
    return;
  }
  const upd = existing.find((o) => o.op === "update" && o.status !== "conflict");
  const after = { ...before, ...patch };
  if (upd) {
    await db.outbox.update(upd.seq!, {
      payload: { ...upd.payload, ...patch },
      dependsOn: await pendingParents(table, after),
    });
    return;
  }
  await db.outbox.add({
    ...(await base()),
    table,
    op: "update",
    id: before.id,
    uid: before.uid,
    payload: patch,
    baseUpdatedAt: before.updated_at ?? null,
    dependsOn: await pendingParents(table, after),
  });
}

/** Queue a local hard DELETE (soft deletes are ordinary UPDATEs of deleted_at). */
export async function queueDelete(table: MirroredTable, row: Row, neverSynced: boolean) {
  const db = getDb();
  if (!db) return;
  const queued = await opsFor(table, row.id);
  if (neverSynced) {
    for (const q of queued) if (q.status !== "syncing") await db.outbox.delete(q.seq!);
    return;
  }
  for (const q of queued) if (q.op === "update" && q.status !== "syncing") await db.outbox.delete(q.seq!);
  await addTombstone(table, row);
  await db.outbox.add({
    ...(await base()),
    table,
    op: "delete",
    id: row.id,
    uid: row.uid,
    baseUpdatedAt: row.updated_at ?? null,
  });
}

/* ---------------- tombstones ---------------- */

type Tomb = Record<string, { id: number; uid?: string; at: string }>;
const tombKey = (table: string, id: number) => `${table}:${id}`;

async function getTombs(): Promise<Tomb> {
  return ((await getDb()?.meta.get(TOMBSTONES))?.value as Tomb) ?? {};
}
async function addTombstone(table: MirroredTable, row: Row) {
  const t = await getTombs();
  t[tombKey(table, row.id)] = { id: row.id, uid: row.uid, at: new Date().toISOString() };
  await getDb()!.meta.put({ key: TOMBSTONES, value: t });
}
export async function clearTombstone(table: MirroredTable, id: number) {
  const t = await getTombs();
  if (!t[tombKey(table, id)]) return;
  delete t[tombKey(table, id)];
  await getDb()!.meta.put({ key: TOMBSTONES, value: t });
}
/** Ids of rows deleted locally whose delete has not reached the cloud yet. */
export async function tombstonedIds(table: MirroredTable): Promise<Set<number>> {
  const t = await getTombs();
  return new Set(Object.keys(t).filter((k) => k.startsWith(table + ":")).map((k) => t[k].id));
}

/* ---------------- queue inspection ---------------- */

export async function queueSummary() {
  const ops = (await getDb()?.outbox.toArray()) ?? [];
  const by = (s: string) => ops.filter((o) => (o.status ?? "pending") === s).length;
  return { total: ops.length, pending: by("pending"), syncing: by("syncing"), failed: by("failed"), conflict: by("conflict") };
}

/** Put failed ops back to pending so the next sync retries them. */
export async function retryFailed() {
  const db = getDb();
  if (!db) return;
  for (const o of await db.outbox.toArray()) {
    if (o.status === "failed") await db.outbox.update(o.seq!, { status: "pending", error: null });
  }
}

/**
 * Deterministic upload order: by queue sequence, but an op never comes before
 * a queued CREATE of a parent it depends on.
 */
export function orderForUpload(ops: OutboxOp[]): OutboxOp[] {
  const sorted = [...ops].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const out: OutboxOp[] = [];
  const placed = new Set<OutboxOp>();
  const place = (o: OutboxOp, depth = 0) => {
    if (placed.has(o) || depth > 50) return;
    for (const d of o.dependsOn ?? []) {
      const parent = sorted.find((p) => p.op === "insert" && p.table === d.table && p.id === d.id);
      if (parent) place(parent, depth + 1);
    }
    placed.add(o);
    out.push(o);
  };
  sorted.forEach((o) => place(o));
  return out;
}

/* ---------------- explicit conflict resolution ---------------- */

async function opBySeq(seq: number) {
  return (await getDb()!.outbox.toArray()).find((o) => o.seq === seq);
}

/** Keep this device's version: upload it over the cloud copy on the next sync. */
export async function resolveKeepMine(seq: number) {
  const op = await opBySeq(seq);
  if (!op || op.op === "insert") return;
  await getDb()!.outbox.update(seq, {
    status: "pending",
    error: null,
    conflict: null,
    baseUpdatedAt: op.conflict?.remote?.updated_at ?? new Date().toISOString(),
  });
}

/** Keep the cloud version: drop this device's edit/delete and restore the cloud copy locally. */
export async function resolveKeepCloud(seq: number) {
  const db = getDb()!;
  const op = await opBySeq(seq);
  if (!op || op.op === "insert") return;
  const remote = op.conflict?.remote;
  await db.outbox.delete(seq);
  await clearTombstone(op.table, op.id);
  if (remote) await db.rows(op.table).put({ ...remote, _pending: 0, _local: 0 });
}

/**
 * Number clash on a new record: give *this device's* record the next free
 * number. Only ever done when the user explicitly asks. Children on this
 * device and queued changes are moved to the new number too.
 */
export async function resolveRenumber(seq: number): Promise<number | null> {
  const db = getDb()!;
  const op = await opBySeq(seq);
  if (!op || op.op !== "insert") return null;
  const { refreshNumberFloor, allocateNumber } = await import("./ids");
  await refreshNumberFloor();
  const oldId = op.id;
  const newId = await allocateNumber(op.table);
  const row = await db.rows(op.table).get(oldId);
  if (row && (!op.uid || row.uid === op.uid)) {
    await db.rows(op.table).delete(oldId);
    await db.rows(op.table).put({ ...row, id: newId });
  }
  // children that point at the old number
  for (const [t, cols] of Object.entries(REF_COLUMNS)) {
    for (const col of cols) {
      if (REF_TABLE[col] !== op.table) continue;
      for (const r of await db.rows(t as MirroredTable).toArray()) {
        if (Number(r[col]) === oldId && r._pending) {
          await db.rows(t as MirroredTable).put({ ...r, [col]: newId });
        }
      }
    }
  }
  for (const o of await db.outbox.toArray()) {
    const patch: Partial<OutboxOp> = {};
    if (o.table === op.table && o.id === oldId && (!op.uid || o.uid === op.uid)) {
      patch.id = newId as any;
      if (o.payload) patch.payload = { ...o.payload, id: newId };
    }
    const cols = REF_COLUMNS[o.table] ?? [];
    for (const col of cols) {
      if (REF_TABLE[col] === op.table && o.payload && Number(o.payload[col]) === oldId && o.seq !== seq) {
        patch.payload = { ...(patch.payload ?? o.payload), [col]: newId };
      }
    }
    if (o.dependsOn?.some((d) => d.table === op.table && d.id === oldId)) {
      patch.dependsOn = o.dependsOn.map((d) => (d.table === op.table && d.id === oldId ? { ...d, id: newId } : d));
    }
    if (Object.keys(patch).length) await db.outbox.update(o.seq!, patch);
  }
  await db.outbox.update(seq, { status: "pending", error: null, conflict: null });
  return newId;
}

/** Retry everything that is failed (not conflicts, which need a choice). */
export async function retryAll() {
  await retryFailed();
}
