import { supabase as cloud } from "@/integrations/supabase/client";
import {
  getDb,
  isLocalId,
  resolveId,
  setIdMapping,
  REF_COLUMNS,
  type MirroredTable,
  type OutboxOp,
} from "./db";
import { notifyLocalChange, setSyncState, registerSyncRequester, markSyncedNow } from "./bus";

let running = false;
let queuedAgain = false;

export async function pendingCount() {
  const db = getDb();
  if (!db) return 0;
  return db.outbox.count();
}

async function refreshPending() {
  setSyncState({ pending: await pendingCount() });
}

/** Replace any local ids inside a payload with their real server ids. */
async function resolvePayload(table: MirroredTable, payload: Record<string, any> | undefined) {
  if (!payload) return payload;
  const cols = REF_COLUMNS[table] ?? [];
  const out = { ...payload };
  for (const c of cols) {
    const v = out[c];
    if (typeof v === "number" && isLocalId(v)) {
      const target =
        c === "customer_id" ? "customers" : c === "order_id" ? "orders" : "workers";
      out[c] = await resolveId(target, v);
    }
  }
  return out;
}

async function pushOp(op: OutboxOp): Promise<{ ok: boolean; error?: any }> {
  const db = getDb()!;
  const payload = await resolvePayload(op.table, op.payload);

  if (op.op === "insert") {
    const { data, error } = await (cloud as any)
      .from(op.table)
      .insert(payload)
      .select("*")
      .single();
    if (error) return { ok: false, error };
    // swap the temporary local id for the real one
    await db.rows(op.table).delete(op.id);
    await db.rows(op.table).put({ ...data, _pending: 0, _local: 0 });
    await setIdMapping(op.table, op.id, data.id);
    await remapReferences(op.table, op.id, data.id);
    return { ok: true };
  }

  const realId = await resolveId(op.table, op.id);
  if (isLocalId(realId)) return { ok: false, error: { message: "Waiting for parent record" } };

  if (op.op === "update") {
    const { error } = await (cloud as any).from(op.table).update(payload).eq("id", realId);
    if (error) return { ok: false, error };
    const row = await db.rows(op.table).get(op.id);
    if (row) await db.rows(op.table).put({ ...row, _pending: 0 });
    return { ok: true };
  }

  const { error } = await (cloud as any).from(op.table).delete().eq("id", realId);
  if (error) return { ok: false, error };
  return { ok: true };
}

/** Update local rows + queued ops that still point at a temporary id. */
async function remapReferences(table: MirroredTable, localId: number, serverId: number) {
  const db = getDb()!;
  for (const [t, cols] of Object.entries(REF_COLUMNS)) {
    for (const col of cols) {
      const target =
        col === "customer_id" ? "customers" : col === "order_id" ? "orders" : "workers";
      if (target !== table) continue;
      const rows = await db.rows(t as MirroredTable).toArray();
      for (const r of rows) {
        if (r[col] === localId) await db.rows(t as MirroredTable).put({ ...r, [col]: serverId });
      }
    }
  }
  const ops = await db.outbox.toArray();
  for (const o of ops) {
    if (!o.payload) continue;
    let changed = false;
    const p = { ...o.payload };
    for (const [col, v] of Object.entries(p)) {
      const target =
        col === "customer_id" ? "customers" : col === "order_id" ? "orders" : col.includes("worker") ? "workers" : null;
      if (target === table && v === localId) {
        p[col] = serverId;
        changed = true;
      }
    }
    if (changed) await db.outbox.update(o.seq!, { payload: p });
  }
}

export async function syncNow(): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (running) {
    queuedAgain = true;
    return;
  }
  const { data: session } = await cloud.auth.getSession();
  if (!session?.session) return;

  running = true;
  setSyncState({ syncing: true, lastError: null });
  try {
    // strictly ordered replay
    let ops = await db.outbox.orderBy("seq").toArray();
    for (const op of ops) {
      const res = await pushOp(op);
      if (res.ok) {
        await db.outbox.delete(op.seq!);
        markSyncedNow();
      } else {
        const attempts = (op.attempts ?? 0) + 1;
        await db.outbox.update(op.seq!, { attempts, error: String(res.error?.message ?? res.error) });
        setSyncState({ lastError: String(res.error?.message ?? "Sync failed") });
        break; // preserve order: stop at the first failure
      }
    }
  } finally {
    running = false;
    setSyncState({ syncing: false });
    await refreshPending();
    notifyLocalChange();
    if (queuedAgain) {
      queuedAgain = false;
      void syncNow();
    }
  }
}

let started = false;

/** Start background sync: on load, when connectivity returns, on focus, and every 30s. */
export function startSyncEngine() {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  registerSyncRequester(() => void syncNow());
  void refreshPending();
  void syncNow();

  const onOnline = () => void syncNow();
  const onFocus = () => void syncNow();
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onFocus);
  const interval = setInterval(() => void syncNow(), 30_000);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onFocus);
    clearInterval(interval);
    started = false;
  };
}
