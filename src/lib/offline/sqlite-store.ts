/**
 * Native SQLite adapter for the Local Data Layer (Android via
 * @capacitor-community/sqlite). Opens lazily, never needs the network.
 *
 * Schema (version 1):
 *   rows_<table>(id INTEGER PK, data TEXT json, _pending INT, deleted_at TEXT)
 *   outbox(seq INTEGER PK AUTOINCREMENT, tbl, op, id, payload, created_at, attempts, error)
 *   meta(key TEXT PK, value TEXT json)
 *
 * On first open it copies any data a previous app version kept in the
 * WebView's IndexedDB (read-only, nothing is deleted there).
 */
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { MIRRORED_TABLES, type MirroredTable, type OutboxOp, type Row } from "./db";
import type { LocalStore, RowTable } from "./store";

const DB_NAME = "almadina_local";
const SCHEMA_VERSION = 1;

let conn: Promise<SQLiteDBConnection> | null = null;

async function open(): Promise<SQLiteDBConnection> {
  const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const db =
    consistent && exists
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, "no-encryption", SCHEMA_VERSION, false);
  await db.open();
  const stmts = [
    `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);`,
    `CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, op TEXT NOT NULL, id INTEGER NOT NULL, payload TEXT, created_at TEXT NOT NULL, attempts INTEGER DEFAULT 0, error TEXT);`,
    `CREATE INDEX IF NOT EXISTS idx_outbox_tbl ON outbox(tbl);`,
    ...MIRRORED_TABLES.flatMap((t) => [
      `CREATE TABLE IF NOT EXISTS rows_${t} (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL, _pending INTEGER DEFAULT 0, deleted_at TEXT);`,
      `CREATE INDEX IF NOT EXISTS idx_${t}_pending ON rows_${t}(_pending);`,
    ]),
  ];
  // Additive only — CREATE IF NOT EXISTS never drops or rewrites data.
  await db.execute(stmts.join("\n"), true);
  // Step 3: additive column holding queue fields (opId, uid, status, dependsOn ...)
  const cols = await db.query(`PRAGMA table_info(outbox);`);
  if (!(cols.values ?? []).some((c: any) => c.name === "extra")) {
    await db.execute(`ALTER TABLE outbox ADD COLUMN extra TEXT;`, true);
  }
  await migrateFromIndexedDb(db);
  return db;
}

function getConn() {
  if (!conn) {
    conn = open().catch((e) => {
      conn = null; // allow a retry on next call
      throw e;
    });
  }
  return conn;
}

const parse = (s: any) => (s == null ? undefined : JSON.parse(s));

function rowStmt(table: MirroredTable, row: Row) {
  return {
    statement: `INSERT OR REPLACE INTO rows_${table} (id, data, _pending, deleted_at) VALUES (?, ?, ?, ?);`,
    values: [row.id, JSON.stringify(row), row._pending ?? 0, row.deleted_at ?? null],
  };
}

function rowTable(table: MirroredTable): RowTable {
  return {
    async toArray() {
      const db = await getConn();
      const r = await db.query(`SELECT data FROM rows_${table};`);
      return (r.values ?? []).map((v) => JSON.parse(v.data));
    },
    async get(id) {
      const db = await getConn();
      const r = await db.query(`SELECT data FROM rows_${table} WHERE id = ?;`, [id]);
      return parse(r.values?.[0]?.data);
    },
    async bulkGet(ids) {
      if (!ids.length) return [];
      const db = await getConn();
      const r = await db.query(
        `SELECT id, data FROM rows_${table} WHERE id IN (${ids.map(() => "?").join(",")});`,
        ids,
      );
      const map = new Map((r.values ?? []).map((v) => [Number(v.id), JSON.parse(v.data)]));
      return ids.map((id) => map.get(Number(id)));
    },
    async put(row) {
      const db = await getConn();
      const s = rowStmt(table, row);
      await db.run(s.statement, s.values, true);
    },
    async bulkPut(rows) {
      if (!rows.length) return;
      const db = await getConn();
      await db.executeSet(rows.map((r) => rowStmt(table, r)), true); // single transaction
    },
    async delete(id) {
      const db = await getConn();
      await db.run(`DELETE FROM rows_${table} WHERE id = ?;`, [id], true);
    },
  };
}

const CORE = new Set(["seq", "table", "op", "id", "payload", "createdAt", "attempts", "error"]);
function extraOf(op: Partial<OutboxOp>) {
  const x: Record<string, any> = {};
  for (const [k, v] of Object.entries(op)) if (!CORE.has(k)) x[k] = v;
  return JSON.stringify(x);
}

function toOp(v: any): OutboxOp {
  return {
    ...(parse(v.extra) ?? {}),
    seq: Number(v.seq),
    table: v.tbl,
    op: v.op,
    id: Number(v.id),
    payload: parse(v.payload),
    createdAt: v.created_at,
    attempts: v.attempts ?? 0,
    error: v.error ?? null,
  };
}

async function allOps(where = "", values: any[] = []) {
  const db = await getConn();
  const r = await db.query(`SELECT * FROM outbox ${where} ORDER BY seq;`, values);
  return (r.values ?? []).map(toOp);
}

const tables = new Map<MirroredTable, RowTable>();

export const sqliteStore: LocalStore = {
  kind: "sqlite",
  rows(t) {
    if (!tables.has(t)) tables.set(t, rowTable(t));
    return tables.get(t)!;
  },
  outbox: {
    async count() {
      const db = await getConn();
      const r = await db.query(`SELECT COUNT(*) AS n FROM outbox;`);
      return Number(r.values?.[0]?.n ?? 0);
    },
    toArray: () => allOps(),
    orderBy: () => ({ toArray: () => allOps() }),
    where: () => ({ equals: (t) => ({ toArray: () => allOps("WHERE tbl = ?", [t]) }) }),
    async add(op) {
      const db = await getConn();
      const r = await db.run(
        `INSERT INTO outbox (tbl, op, id, payload, created_at, attempts, error, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [op.table, op.op, op.id, op.payload ? JSON.stringify(op.payload) : null, op.createdAt, op.attempts ?? 0, op.error ?? null, extraOf(op)],
        true,
      );
      return Number(r.changes?.lastId ?? 0);
    },
    async update(seq, patch) {
      const db = await getConn();
      const cur = (await allOps("WHERE seq = ?", [seq]))[0];
      if (!cur) return;
      const n = { ...cur, ...patch };
      await db.run(
        `UPDATE outbox SET payload = ?, attempts = ?, error = ?, extra = ? WHERE seq = ?;`,
        [n.payload ? JSON.stringify(n.payload) : null, n.attempts ?? 0, n.error ?? null, extraOf(n), seq],
        true,
      );
    },
    async delete(seq) {
      const db = await getConn();
      await db.run(`DELETE FROM outbox WHERE seq = ?;`, [seq], true);
    },
  },
  meta: {
    async get(key) {
      const db = await getConn();
      const r = await db.query(`SELECT value FROM meta WHERE key = ?;`, [key]);
      const v = r.values?.[0];
      return v ? { key, value: parse(v.value) } : undefined;
    },
    async put(rec) {
      const db = await getConn();
      await db.run(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);`, [rec.key, JSON.stringify(rec.value ?? null)], true);
    },
    async delete(key) {
      const db = await getConn();
      await db.run(`DELETE FROM meta WHERE key = ?;`, [key], true);
    },
  },
};

/** One-time, non-destructive copy of a previous IndexedDB mirror into SQLite. */
async function migrateFromIndexedDb(db: SQLiteDBConnection) {
  const done = await db.query(`SELECT value FROM meta WHERE key = 'migrated_from_idb';`);
  if (done.values?.length) return;
  try {
    const { DexieStore } = await import("./db");
    const idb = new DexieStore();
    const set: { statement: string; values: any[] }[] = [];
    for (const t of MIRRORED_TABLES) {
      for (const r of await idb.rows(t).toArray()) set.push(rowStmt(t, r));
    }
    for (const op of await idb.outbox.orderBy("seq").toArray()) {
      set.push({
        statement: `INSERT INTO outbox (tbl, op, id, payload, created_at, attempts, error) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        values: [op.table, op.op, op.id, op.payload ? JSON.stringify(op.payload) : null, op.createdAt, op.attempts ?? 0, op.error ?? null],
      });
    }
    for (const m of await idb.meta.toArray()) {
      set.push({ statement: `INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?);`, values: [m.key, JSON.stringify(m.value ?? null)] });
    }
    set.push({ statement: `INSERT OR REPLACE INTO meta (key, value) VALUES ('migrated_from_idb', ?);`, values: [JSON.stringify(new Date().toISOString())] });
    await db.executeSet(set, true);
    idb.close();
  } catch (e) {
    console.warn("[local-db] IndexedDB migration skipped:", e);
  }
}
