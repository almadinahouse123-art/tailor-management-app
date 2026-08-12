import { supabase as cloud } from "@/integrations/supabase/client";
import {
  getDb,
  isLocalId,
  nextLocalId,
  resolveId,
  stripLocalFields,
  REF_TABLE,
  type MirroredTable,
  type Row,
} from "./db";
import { notifyLocalChange, markSyncedNow, requestSync } from "./bus";

type Op = { m: string; args: any[] };

export type Result<T = any> = { data: T; error: any };

const isNetworkError = (e: any) => {
  const msg = String(e?.message ?? e ?? "");
  return (
    /Failed to fetch|NetworkError|network|fetch failed|Load failed|timeout|ERR_INTERNET/i.test(msg) ||
    e?.name === "TypeError"
  );
};

const online = () => (typeof navigator === "undefined" ? true : navigator.onLine);

/* ------------------------------------------------------------------ *
 * Local (IndexedDB) evaluation
 * ------------------------------------------------------------------ */

function matches(row: Row, ops: Op[]): boolean {
  for (const { m, args } of ops) {
    const [a, b, c] = args;
    switch (m) {
      case "eq":
        if (String(row[a] ?? "") !== String(b)) return false;
        break;
      case "neq":
        if (String(row[a] ?? "") === String(b)) return false;
        break;
      case "is":
        if (b === null && row[a] != null) return false;
        if (typeof b === "boolean" && Boolean(row[a]) !== b) return false;
        break;
      case "not":
        // .not(col, "is", null)
        if (b === "is" && c === null && row[a] == null) return false;
        break;
      case "gte":
        if (!(row[a] >= b)) return false;
        break;
      case "lte":
        if (!(row[a] <= b)) return false;
        break;
      case "gt":
        if (!(row[a] > b)) return false;
        break;
      case "lt":
        if (!(row[a] < b)) return false;
        break;
      case "in":
        if (!(b as any[]).map(String).includes(String(row[a]))) return false;
        break;
      case "ilike":
        if (!like(row[a], b)) return false;
        break;
      case "or":
        if (!matchesOr(row, String(a))) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

function like(value: any, pattern: string) {
  const v = String(value ?? "").toLowerCase();
  const p = String(pattern ?? "").toLowerCase();
  if (!p.includes("%")) return v === p;
  const re = new RegExp("^" + p.split("%").map(escapeRe).join(".*") + "$");
  return re.test(v);
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Supports `col.op.value` clauses joined with commas, e.g. `name.ilike.%a%,phone.ilike.%a%`. */
function matchesOr(row: Row, expr: string) {
  const clauses = splitOr(expr);
  return clauses.some((clause) => {
    const first = clause.indexOf(".");
    const second = clause.indexOf(".", first + 1);
    if (first < 0 || second < 0) return false;
    const col = clause.slice(0, first);
    const op = clause.slice(first + 1, second);
    const raw = clause.slice(second + 1);
    switch (op) {
      case "eq":
        return String(row[col] ?? "") === raw;
      case "ilike":
      case "like":
        return like(row[col], raw);
      case "gte":
        return row[col] >= raw;
      case "lte":
        return row[col] <= raw;
      case "is":
        return raw === "null" ? row[col] == null : Boolean(row[col]) === (raw === "true");
      default:
        return false;
    }
  });
}

function splitOr(expr: string) {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of expr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** Parse embedded relations out of a select string: `customers(id,name)`, `workers:assigned_worker_id(id)`. */
function parseEmbeds(select: string) {
  const embeds: { key: string; table: MirroredTable; fk: string }[] = [];
  const re = /([A-Za-z_][\w]*)(?::([A-Za-z_][\w]*))?\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(select))) {
    const name = m[1];
    const fkOrNothing = m[2];
    const table = (name in REF_TABLE ? REF_TABLE[name] : (name as MirroredTable)) as MirroredTable;
    const fk =
      fkOrNothing ??
      Object.keys(REF_TABLE).find((c) => REF_TABLE[c] === table && c !== "order_id") ??
      "";
    if (!fk) continue;
    embeds.push({ key: name, table, fk });
  }
  return embeds;
}

async function hydrate(rows: Row[], select: string) {
  const db = getDb();
  if (!db) return rows;
  const embeds = parseEmbeds(select);
  if (!embeds.length) return rows;
  for (const e of embeds) {
    const all = await db.rows(e.table).toArray();
    const byId = new Map(all.map((r) => [String(r.id), r]));
    for (const r of rows) {
      const fkVal = r[e.fk];
      (r as any)[e.key] = fkVal == null ? null : byId.get(String(fkVal)) ?? null;
    }
  }
  return rows;
}

/** Upsert cloud rows into the local mirror, keeping unsynced local rows intact. */
export async function mirrorRows(table: MirroredTable, rows: any[]) {
  const db = getDb();
  if (!db || !rows?.length) return;
  try {
    const existing = await db.rows(table).bulkGet(rows.map((r) => r.id));
    const merged = rows
      .filter((r) => r && r.id != null)
      .map((r, i) => {
        const prev = existing[i];
        if (prev?._pending) return prev; // don't clobber unsynced local edits
        return { ...stripLocalFields(r), _pending: 0 as const, _local: 0 as const };
      });
    await db.rows(table).bulkPut(merged as Row[]);
  } catch {
    /* mirroring is best-effort */
  }
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

class OfflineQuery<T = any> implements PromiseLike<Result<T>> {
  private ops: Op[] = [];
  private action: { kind: "select" | "insert" | "update" | "delete"; payload?: any; select?: string } = {
    kind: "select",
    select: "*",
  };
  private shape: "many" | "single" | "maybeSingle" = "many";

  constructor(private table: MirroredTable) {}

  private rec(m: string, args: any[]) {
    this.ops.push({ m, args });
    return this;
  }

  select(cols = "*") {
    if (this.action.kind === "select") this.action.select = cols;
    else this.action.select = cols;
    this.ops.push({ m: "select", args: [cols] });
    return this;
  }
  insert(payload: any) {
    this.action = { kind: "insert", payload, select: undefined };
    this.ops.push({ m: "insert", args: [payload] });
    return this;
  }
  update(payload: any) {
    this.action = { kind: "update", payload, select: undefined };
    this.ops.push({ m: "update", args: [payload] });
    return this;
  }
  delete() {
    this.action = { kind: "delete", select: undefined };
    this.ops.push({ m: "delete", args: [] });
    return this;
  }
  upsert(payload: any) {
    return this.insert(payload);
  }
  eq(c: string, v: any) {
    return this.rec("eq", [c, v]);
  }
  neq(c: string, v: any) {
    return this.rec("neq", [c, v]);
  }
  is(c: string, v: any) {
    return this.rec("is", [c, v]);
  }
  not(c: string, op: string, v: any) {
    return this.rec("not", [c, op, v]);
  }
  gte(c: string, v: any) {
    return this.rec("gte", [c, v]);
  }
  lte(c: string, v: any) {
    return this.rec("lte", [c, v]);
  }
  gt(c: string, v: any) {
    return this.rec("gt", [c, v]);
  }
  lt(c: string, v: any) {
    return this.rec("lt", [c, v]);
  }
  in(c: string, v: any[]) {
    return this.rec("in", [c, v]);
  }
  ilike(c: string, v: string) {
    return this.rec("ilike", [c, v]);
  }
  or(expr: string) {
    return this.rec("or", [expr]);
  }
  order(c: string, opts?: { ascending?: boolean }) {
    return this.rec("order", [c, opts]);
  }
  limit(n: number) {
    return this.rec("limit", [n]);
  }
  range(a: number, b: number) {
    return this.rec("range", [a, b]);
  }
  single() {
    this.shape = "single";
    return this;
  }
  maybeSingle() {
    this.shape = "maybeSingle";
    return this;
  }

  then<A = Result<T>, B = never>(
    onfulfilled?: ((value: Result<T>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: any) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }

  private async run(): Promise<Result<any>> {
    if (this.action.kind === "select") return this.runSelect();
    return this.runWrite();
  }

  /* -------------------- reads -------------------- */

  private async runSelect(): Promise<Result<any>> {
    if (online()) {
      try {
        const res = await this.replayOnCloud();
        if (!res.error) {
          markSyncedNow();
          const rows = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
          void mirrorRows(this.table, rows);
          return res;
        }
        if (!isNetworkError(res.error)) return res;
      } catch (e) {
        if (!isNetworkError(e)) return { data: null, error: e };
      }
    }
    return this.runLocalSelect();
  }

  private async replayOnCloud(): Promise<Result<any>> {
    let q: any = (cloud as any).from(this.table);
    for (const { m, args } of this.ops) q = q[m](...args);
    if (this.shape === "single") q = q.single();
    if (this.shape === "maybeSingle") q = q.maybeSingle();
    return await q;
  }

  private async runLocalSelect(): Promise<Result<any>> {
    const db = getDb();
    if (!db) return { data: this.shape === "many" ? [] : null, error: null };
    let rows = await db.rows(this.table).toArray();
    rows = rows.filter((r) => matches(r, this.ops));

    for (const { m, args } of this.ops) {
      if (m === "order") {
        const [col, opts] = args;
        const asc = opts?.ascending !== false;
        rows.sort((a, b) => {
          const x = a[col],
            y = b[col];
          if (x == null && y == null) return 0;
          if (x == null) return 1;
          if (y == null) return -1;
          return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1);
        });
      }
    }
    for (const { m, args } of this.ops) {
      if (m === "limit") rows = rows.slice(0, args[0]);
      if (m === "range") rows = rows.slice(args[0], args[1] + 1);
    }

    await hydrate(rows, this.action.select ?? "*");

    if (this.shape === "single") {
      return rows[0]
        ? { data: rows[0], error: null }
        : { data: null, error: { message: "Row not found in offline cache", code: "PGRST116" } };
    }
    if (this.shape === "maybeSingle") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  /* -------------------- writes -------------------- */

  private async runWrite(): Promise<Result<any>> {
    if (online()) {
      try {
        const res = await this.replayOnCloud();
        if (!res.error) {
          markSyncedNow();
          await this.applyLocalWrite({ synced: true, serverData: res.data });
          notifyLocalChange();
          return res;
        }
        if (!isNetworkError(res.error)) return res;
      } catch (e) {
        if (!isNetworkError(e)) return { data: null, error: e };
      }
    }
    const res = await this.applyLocalWrite({ synced: false });
    notifyLocalChange();
    requestSync();
    return res;
  }

  /** Mutate the local mirror; when not synced, also queue the change in the outbox. */
  private async applyLocalWrite(opts: { synced: boolean; serverData?: any }): Promise<Result<any>> {
    const db = getDb();
    if (!db) return { data: null, error: null };
    const now = new Date().toISOString();
    const table = this.table;

    if (this.action.kind === "insert") {
      const payloads: any[] = Array.isArray(this.action.payload)
        ? this.action.payload
        : [this.action.payload];
      const serverRows: any[] = opts.synced
        ? Array.isArray(opts.serverData)
          ? opts.serverData
          : opts.serverData
            ? [opts.serverData]
            : []
        : [];
      const written: Row[] = [];
      for (let i = 0; i < payloads.length; i++) {
        const server = serverRows[i];
        const id = server?.id ?? nextLocalId();
        const row: Row = {
          deleted_at: null,
          created_at: now,
          updated_at: now,
          ...stripLocalFields(payloads[i]),
          ...(server ? stripLocalFields(server) : {}),
          id,
          _pending: opts.synced ? 0 : 1,
          _local: opts.synced ? 0 : 1,
        };
        await db.rows(table).put(row);
        if (!opts.synced) {
          await db.outbox.add({
            table,
            op: "insert",
            id,
            payload: stripLocalFields(payloads[i]),
            createdAt: now,
          });
        }
        written.push(row);
      }
      if (opts.synced) return { data: null, error: null };
      const data = this.shape === "many" ? written : written[0] ?? null;
      return { data, error: null };
    }

    // update / delete
    let rows = await db.rows(table).toArray();
    rows = rows.filter((r) => matches(r, this.ops));

    if (this.action.kind === "update") {
      const patch = stripLocalFields(this.action.payload);
      const written: Row[] = [];
      for (const r of rows) {
        const next: Row = {
          ...r,
          ...patch,
          updated_at: now,
          _pending: opts.synced ? (r._pending ?? 0) : 1,
        };
        await db.rows(table).put(next);
        if (!opts.synced) {
          await db.outbox.add({ table, op: "update", id: r.id, payload: patch, createdAt: now });
        }
        written.push(next);
      }
      if (opts.synced) return { data: null, error: null };
      return { data: this.shape === "many" ? written : written[0] ?? null, error: null };
    }

    for (const r of rows) {
      await db.rows(table).delete(r.id);
      if (!opts.synced && !isLocalId(r.id)) {
        await db.outbox.add({ table, op: "delete", id: r.id, createdAt: now });
      } else if (!opts.synced && isLocalId(r.id)) {
        // never synced: drop any queued ops for this row
        const queued = await db.outbox.where("table").equals(table).toArray();
        for (const q of queued) if (q.id === r.id) await db.outbox.delete(q.seq!);
      }
    }
    return { data: null, error: null };
  }
}

export function offlineFrom(table: string) {
  return new OfflineQuery(table as MirroredTable);
}

export { resolveId };
