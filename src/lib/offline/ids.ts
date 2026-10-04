/**
 * Permanent local identity.
 *
 * Every record gets two identifiers the moment it is created, online or offline:
 *   - uid: a random UUID — the permanent internal identity, never changes.
 *   - id:  the human-readable business number (Customer #15, Order #27 ...),
 *          handed out on the device and never renumbered by sync.
 *
 * Numbers are allocated as max(highest number known on device, last known
 * cloud floor) + 1. The cloud floor is refreshed whenever the device is online.
 */
import { supabase as cloud } from "@/integrations/supabase/client";
import { getDb, type MirroredTable } from "./db";

const FLOOR_KEY = "number_floor";

export function newUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function getFloors(): Promise<Record<string, number>> {
  const rec = await getDb()?.meta.get(FLOOR_KEY);
  return (rec?.value as Record<string, number>) ?? {};
}

async function raiseFloors(next: Record<string, number>) {
  const db = getDb();
  if (!db) return;
  const cur = await getFloors();
  for (const [k, v] of Object.entries(next)) cur[k] = Math.max(cur[k] ?? 0, Number(v) || 0);
  await db.meta.put({ key: FLOOR_KEY, value: cur });
}

/** Best-effort: learn the highest numbers already used in the cloud. */
export async function refreshNumberFloor(): Promise<void> {
  try {
    const { data, error } = await (cloud as any).rpc("business_number_floor");
    if (!error && data) await raiseFloors(data);
  } catch {
    /* offline — keep the last known floor */
  }
}

// Serialize allocation so two quick saves never get the same number.
let chain: Promise<unknown> = Promise.resolve();

export function allocateNumber(table: MirroredTable): Promise<number> {
  const run = chain.then(async () => {
    const db = getDb();
    if (!db) throw new Error("Local storage unavailable");
    const floors = await getFloors();
    let max = floors[table] ?? 0;
    for (const r of await db.rows(table).toArray()) if (r.id > max) max = r.id;
    const next = max + 1;
    await raiseFloors({ [table]: next });
    return next;
  });
  chain = run.catch(() => {});
  return run;
}

/** Give every insert payload a permanent uid and business number (in place). */
export async function assignIdentity(table: MirroredTable, payloads: any[]) {
  for (const p of payloads) {
    if (!p || typeof p !== "object") continue;
    if (!p.uid) p.uid = newUid();
    if (p.id == null) p.id = await allocateNumber(table);
  }
}
