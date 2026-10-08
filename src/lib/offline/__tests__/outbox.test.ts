import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Fake cloud: an in-memory table set with switchable failure modes.
const cloudState: { rows: Record<string, any[]>; mode: "ok" | "network" | "fail"; inserts: number } = {
  rows: {}, mode: "ok", inserts: 0,
};
function q(table: string) {
  let filters: [string, any][] = [];
  let action: any = { kind: "select" };
  const rows = () => (cloudState.rows[table] ??= []);
  const pick = () => rows().filter((r) => filters.every(([k, v]) => String(r[k]) === String(v)));
  const run = async () => {
    if (cloudState.mode === "network") return { data: null, error: { message: "Failed to fetch" } };
    if (action.kind === "insert") {
      if (cloudState.mode === "fail") return { data: null, error: { message: "boom", code: "XX000" } };
      if (rows().some((r) => r.id === action.p.id)) return { data: null, error: { message: "dup", code: "23505" } };
      cloudState.inserts++;
      rows().push({ ...action.p, updated_at: "2026-01-01T00:00:00Z" });
      return { data: null, error: null };
    }
    if (action.kind === "update") { pick().forEach((r) => Object.assign(r, action.p)); return { data: null, error: null }; }
    if (action.kind === "delete") { cloudState.rows[table] = rows().filter((r) => !pick().includes(r)); return { data: null, error: null }; }
    return { data: pick(), error: null };
  };
  const b: any = {
    select: () => b, eq: (k: string, v: any) => (filters.push([k, v]), b),
    insert: (p: any) => ((action = { kind: "insert", p }), b),
    update: (p: any) => ((action = { kind: "update", p }), b),
    delete: () => ((action = { kind: "delete" }), b),
    maybeSingle: async () => { const r = await run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => q(t),
    rpc: async () => ({ data: null, error: { message: "offline" } }),
    auth: { getSession: async () => ({ data: { session: { user: { id: "user-A" } } } }) },
  },
}));
vi.mock("@/lib/online-status", () => ({ markSync: () => {} }));

(globalThis as any).window = globalThis;
Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true });
(globalThis as any).addEventListener = () => {};

const { getDb } = await import("../db");
const ob = await import("../outbox");
const { syncNow } = await import("../sync");

const db = () => getDb()!;
const row = (id: number, extra: any = {}) => ({ id, uid: `uid-${id}`, updated_at: "2026-01-01T00:00:00Z", ...extra });

beforeEach(async () => {
  for (const o of await db().outbox.toArray()) await db().outbox.delete(o.seq!);
  await db().meta.delete("tombstones");
  cloudState.rows = {}; cloudState.mode = "ok"; cloudState.inserts = 0;
  ob.setOwnerResolver(async () => "user-A");
});

describe("outbox", () => {
  it("CREATE makes exactly one queue entry with permanent ids and status pending", async () => {
    const r = { ...row(15), name: "Ali", _pending: 1 as const, _local: 1 as const };
    await db().rows("customers").put(r);
    await ob.queueInsert("customers", r, { name: "Ali", uid: "uid-15", id: 15 });
    const ops = await db().outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ op: "insert", id: 15, uid: "uid-15", status: "pending", owner: "user-A", attempts: 0 });
    expect(ops[0].opId).toMatch(/[0-9a-f-]{36}/);
  });

  it("same opId retried does not add a second entry", async () => {
    const r = row(16);
    await ob.queueInsert("customers", r, {}, "op-fixed");
    await ob.queueInsert("customers", r, {}, "op-fixed");
    expect(await db().outbox.count()).toBe(1);
  });

  it("UPDATE of a queued CREATE folds into it", async () => {
    const r = { ...row(17), name: "A", _local: 1 as const };
    await ob.queueInsert("customers", r, { name: "A" });
    await ob.queueUpdate("customers", r, { name: "B" });
    const ops = await db().outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].payload).toMatchObject({ name: "B" });
  });

  it("UPDATEs of a synced record collapse into one with the base version", async () => {
    const r = row(18);
    await ob.queueUpdate("customers", r, { name: "B" });
    await ob.queueUpdate("customers", r, { phone: "1" });
    const ops = await db().outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ op: "update", baseUpdatedAt: "2026-01-01T00:00:00Z", payload: { name: "B", phone: "1" } });
  });

  it("DELETE of a never-synced record removes its queued ops", async () => {
    const r = row(19);
    await ob.queueInsert("customers", r, {});
    await ob.queueDelete("customers", r, true);
    expect(await db().outbox.count()).toBe(0);
  });

  it("DELETE of a synced record queues a delete and a tombstone", async () => {
    const r = row(20);
    await ob.queueUpdate("customers", r, { name: "x" });
    await ob.queueDelete("customers", r, false);
    const ops = await db().outbox.toArray();
    expect(ops.map((o) => o.op)).toEqual(["delete"]);
    expect((await ob.tombstonedIds("customers")).has(20)).toBe(true);
  });

  it("child records list their unsynced parent and upload after it", async () => {
    const parent = { ...row(21), _pending: 1 as const, _local: 1 as const };
    await db().rows("customers").put(parent);
    const child = row(5, { customer_id: 21 });
    await ob.queueInsert("orders", child, { customer_id: 21 });
    await ob.queueInsert("customers", parent, {});
    const ops = await db().outbox.toArray();
    expect(ops.find((o) => o.table === "orders")!.dependsOn).toEqual([{ table: "customers", id: 21, uid: "uid-21" }]);
    expect(ob.orderForUpload(ops).map((o) => o.table)).toEqual(["customers", "orders"]);
  });
});

describe("sync foundation", () => {
  it("uploads parent then child, keeping business numbers", async () => {
    const parent = { ...row(30), _pending: 1 as const, _local: 1 as const };
    await db().rows("customers").put(parent);
    await ob.queueInsert("customers", parent, { uid: "uid-30", name: "P" });
    await ob.queueInsert("orders", row(40, { customer_id: 30 }), { uid: "uid-40", customer_id: 30 });
    await syncNow();
    expect(await db().outbox.count()).toBe(0);
    expect(cloudState.rows.customers[0].id).toBe(30);
    expect(cloudState.rows.orders[0].id).toBe(40);
  });

  it("retry after a lost reply does not create a duplicate", async () => {
    cloudState.rows.customers = [{ id: 31, uid: "uid-31" }];
    await ob.queueInsert("customers", row(31), { uid: "uid-31" });
    await syncNow();
    expect(cloudState.inserts).toBe(0);
    expect(await db().outbox.count()).toBe(0);
  });

  it("failed op stays queued with retry info; its child waits", async () => {
    const parent = { ...row(32), _pending: 1 as const, _local: 1 as const };
    await db().rows("customers").put(parent);
    await ob.queueInsert("customers", parent, { uid: "uid-32" });
    await ob.queueInsert("orders", row(41, { customer_id: 32 }), { uid: "uid-41", customer_id: 32 });
    cloudState.mode = "fail";
    await syncNow();
    const ops = await db().outbox.toArray();
    expect(ops).toHaveLength(2);
    expect(ops.find((o) => o.table === "customers")).toMatchObject({ status: "failed", attempts: 1, error: "boom" });
    expect(ops.find((o) => o.table === "orders")!.status).toBe("pending");
  });

  it("network loss keeps ops pending", async () => {
    await ob.queueInsert("customers", row(33), { uid: "uid-33" });
    cloudState.mode = "network";
    await syncNow();
    expect((await db().outbox.toArray())[0].status).toBe("pending");
  });

  it("same business number from another device becomes a conflict, nothing overwritten", async () => {
    cloudState.rows.customers = [{ id: 34, uid: "other-device", name: "Theirs" }];
    await ob.queueInsert("customers", row(34), { uid: "uid-34", name: "Mine" });
    await syncNow();
    const op = (await db().outbox.toArray())[0];
    expect(op.status).toBe("conflict");
    expect(cloudState.rows.customers).toEqual([{ id: 34, uid: "other-device", name: "Theirs" }]);
  });

  it("edit conflicting with a newer cloud edit is recorded, not overwritten", async () => {
    cloudState.rows.customers = [{ id: 35, uid: "uid-35", name: "Cloud", updated_at: "2026-02-01T00:00:00Z" }];
    await ob.queueUpdate("customers", row(35), { name: "Local" });
    await syncNow();
    const op = (await db().outbox.toArray())[0];
    expect(op.status).toBe("conflict");
    expect(op.conflict?.remote?.name).toBe("Cloud");
    expect(cloudState.rows.customers[0].name).toBe("Cloud");
  });

  it("another account's queued change is never uploaded", async () => {
    ob.setOwnerResolver(async () => "user-B");
    await ob.queueInsert("customers", row(36), { uid: "uid-36" });
    await syncNow();
    expect(cloudState.inserts).toBe(0);
    expect(await db().outbox.count()).toBe(1);
  });
});
