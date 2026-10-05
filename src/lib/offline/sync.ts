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
import { clearTombstone, orderForUpload, setOwnerResolver } from "./outbox";
import { getLocalSession } from "@/lib/local-auth";

let running = false;
let queuedAgain = false;

// Owner of each queued change: the cloud user when signed in, else the device account.
setOwnerResolver(async () => {
  try {
    const { data } = await cloud.auth.getSession(); // local read, no network
    if (data.session?.user?.id) return data.session.user.id;
  } catch {
    /* ignore */
  }
  const local = await getLocalSession();
  return local ? `local:${local.email}` : undefined;
});

export async function pendingCount() {
  const db = getDb();
  if (!db) return 0;
  return db.outbox.count();
}

async function refreshPending() {
  setSyncState({ pending: await pendingCount() });
}

const isNetworkError = (e: any) =>
  /Failed to fetch|NetworkError|network|fetch failed|Load failed|timeout|ERR_INTERNET/i.test(
    String(e?.message ?? e ?? ""),
  ) || e?.name === "TypeError";

type PushResult =
  | { kind: "ok" }
  | { kind: "network"; error: any }
  | { kind: "failed"; error: any }
  | { kind: "conflict"; reason: string; remote?: any }
  | { kind: "waiting"; reason: string };

/** Replace legacy (negative) local ids inside a payload with their real server ids. */
async function resolvePayload(table: MirroredTable, payload: Record<string, any> | undefined) {
  if (!payload) return payload;
  const cols = REF_COLUMNS[table] ?? [];
  const out = { ...payload };
  for (const c of cols) {
    const v = out[c];
    if (typeof v === "number" && isLocalId(v)) {
      const target = c === "customer_id" ? "customers" : c === "order_id" ? "orders" : "workers";
      out[c] = await resolveId(target, v);
    }
  }
  return out;
}

const wrap = (error: any): PushResult =>
  isNetworkError(error) ? { kind: "network", error } : { kind: "failed", error };

async function pushOp(op: OutboxOp): Promise<PushResult> {
  const db = getDb()!;
  const payload = await resolvePayload(op.table, op.payload);
  const c = cloud as any;

  if (op.op === "insert" && !isLocalId(op.id)) {
    const uid = op.uid ?? payload?.uid;
    // Idempotent: the record carries its permanent uid + business number.
    // If this uid is already in the cloud (e.g. the earlier reply was lost), it's done.
    if (uid) {
      const { data: found, error: fErr } = await c.from(op.table).select("id,uid").eq("uid", uid).maybeSingle();
      if (fErr) return wrap(fErr);
      if (found) {
        if (Number(found.id) !== op.id) {
          return { kind: "conflict", reason: `Record already uploaded with number ${found.id}`, remote: found };
        }
        await markRowSynced(op);
        return { kind: "ok" };
      }
    }
    const { error } = await c.from(op.table).insert({ ...payload, id: op.id });
    if (error) {
      // Same business number, different record -> never overwrite, never renumber.
      if (error.code === "23505") {
        return { kind: "conflict", reason: `Business number ${op.id} is already used by another record` };
      }
      return wrap(error);
    }
    await markRowSynced(op);
    return { kind: "ok" };
  }

  if (op.op === "insert") {
    // Legacy path: rows queued by older app versions with a temporary negative id.
    const { data, error } = await c.from(op.table).insert(payload).select("*").single();
    if (error) return wrap(error);
    await db.rows(op.table).delete(op.id);
    await db.rows(op.table).put({ ...data, _pending: 0, _local: 0 });
    await setIdMapping(op.table, op.id, data.id);
    await remapReferences(op.table, op.id, data.id);
    return { kind: "ok" };
  }

  const realId = await resolveId(op.table, op.id);
  if (isLocalId(realId)) return { kind: "waiting", reason: "Waiting for parent record" };
  const match = (q: any) => (op.uid ? q.eq("uid", op.uid) : q.eq("id", realId));

  // Conflict foundation: if the cloud copy changed after our local edit began, stop.
  if (op.baseUpdatedAt) {
    const { data: remote, error } = await match(c.from(op.table).select("*")).maybeSingle();
    if (error) return wrap(error);
    if (remote && remote.updated_at && new Date(remote.updated_at) > new Date(op.baseUpdatedAt)) {
      return { kind: "conflict", reason: "Changed in the cloud after this device edited it", remote };
    }
    if (!remote && op.op === "delete") return { kind: "ok" }; // already gone
  }

  if (op.op === "update") {
    const { error } = await match(c.from(op.table).update(payload));
    if (error) return wrap(error);
    await markRowSynced(op);
    return { kind: "ok" };
  }

  const { error } = await match(c.from(op.table).delete());
  if (error) return wrap(error);
  await clearTombstone(op.table, op.id);
  return { kind: "ok" };
}

async function markRowSynced(op: OutboxOp) {
  const db = getDb()!;
  const others = (await db.outbox.where("table").equals(op.table).toArray()).filter(
    (o) => o.id === op.id && o.seq !== op.seq,
  );
  const row = await db.rows(op.table).get(op.id);
  if (row) await db.rows(op.table).put({ ...row, _pending: others.length ? 1 : 0, _local: 0 });
}

/** Legacy: update local rows + queued ops that still point at a temporary id. */
async function remapReferences(table: MirroredTable, localId: number, serverId: number) {
  const db = getDb()!;
  for (const [t, cols] of Object.entries(REF_COLUMNS)) {
    for (const col of cols) {
      const target = col === "customer_id" ? "customers" : col === "order_id" ? "orders" : "workers";
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

/**
 * Upload queued changes in dependency order. Failed and conflicting ops stay in
 * the queue; anything that depends on them waits. A network drop stops the run
 * and leaves every remaining op pending for the next attempt.
 */
export async function syncNow(): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (running) {
    queuedAgain = true;
    return;
  }
  const { data: session } = await cloud.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return;

  running = true;
  setSyncState({ syncing: true, lastError: null });
  try {
    const ops = orderForUpload(await db.outbox.toArray());
    const blocked = new Set<string>(); // "table:id" of records that could not upload
    const key = (t: string, id: number) => `${t}:${id}`;
    for (const o of ops) if (o.status === "failed" || o.status === "conflict") blocked.add(key(o.table, o.id));

    for (const op of ops) {
      if (op.status === "failed" || op.status === "conflict") continue;
      // Shop isolation: never upload another account's changes.
      if (op.owner && !op.owner.startsWith("local:") && op.owner !== userId) {
        blocked.add(key(op.table, op.id));
        continue;
      }
      if (blocked.has(key(op.table, op.id)) || (op.dependsOn ?? []).some((d) => blocked.has(key(d.table, d.id)))) {
        blocked.add(key(op.table, op.id));
        continue;
      }
      const now = new Date().toISOString();
      await db.outbox.update(op.seq!, { status: "syncing", lastAttemptAt: now, owner: userId });
      const res = await pushOp(op);
      if (res.kind === "ok") {
        await db.outbox.delete(op.seq!);
        markSyncedNow();
        continue;
      }
      blocked.add(key(op.table, op.id));
      const attempts = (op.attempts ?? 0) + 1;
      if (res.kind === "network") {
        await db.outbox.update(op.seq!, { status: "pending", attempts, error: "Network unavailable" });
        setSyncState({ lastError: "Network unavailable" });
        break;
      }
      if (res.kind === "conflict") {
        await db.outbox.update(op.seq!, {
          status: "conflict",
          attempts,
          error: res.reason,
          conflict: { reason: res.reason, remote: res.remote ?? null, detectedAt: now },
        });
        setSyncState({ lastError: res.reason });
        continue;
      }
      if (res.kind === "waiting") {
        await db.outbox.update(op.seq!, { status: "pending", error: res.reason });
        continue;
      }
      const msg = String(res.error?.message ?? res.error ?? "Sync failed");
      await db.outbox.update(op.seq!, { status: "failed", attempts, error: msg });
      setSyncState({ lastError: msg });
    }
  } finally {
    // An interrupted run must never leave ops stuck in "syncing".
    for (const o of await db.outbox.toArray()) {
      if (o.status === "syncing") await db.outbox.update(o.seq!, { status: "pending" });
    }
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
