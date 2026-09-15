/**
 * Local (offline) authentication for the installed Android/PWA app.
 *
 * The device keeps a PBKDF2-SHA256 hash of the passcode — never the passcode
 * itself — inside the same persistent IndexedDB database that stores the
 * offline mirror, so it survives app close/reopen and device restarts.
 *
 * This layer is additive: Supabase email/password, Google sign-in, password
 * reset and cloud sync all keep working exactly as before. Local auth only
 * decides whether the app may be *opened and used* while offline.
 */
import { getDb } from "./offline/db";

const ACCOUNT_KEY = "local_account";
const SESSION_KEY = "local_session";
const SESSION_LS = "almadina.local_session";
const ITERATIONS = 150_000;

export type LocalAccount = {
  email: string;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
  /** set once the same credentials have been verified against the cloud */
  cloudLinked?: boolean;
};

export type LocalSession = { email: string; since: string };

const enc = new TextEncoder();

function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toB64(bytes.buffer);
}

function fromB64(value: string) {
  const s = atob(value);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: string, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromB64(salt) as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toB64(bits);
}

/** Constant-time-ish string compare. */
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function localAuthSupported() {
  return typeof crypto !== "undefined" && !!crypto.subtle && !!getDb();
}

export async function getLocalAccount(): Promise<LocalAccount | null> {
  const db = getDb();
  if (!db) return null;
  const rec = await db.meta.get(ACCOUNT_KEY);
  return (rec?.value as LocalAccount) ?? null;
}

export async function hasLocalAccount() {
  return !!(await getLocalAccount());
}

/**
 * Create (or refresh) the device passcode. Called by the offline first-run
 * setup screen, and silently after a successful cloud sign-in so the same
 * credentials unlock the app later without internet.
 */
export async function setLocalCredentials(
  email: string,
  password: string,
  opts: { cloudLinked?: boolean } = {},
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Local storage is unavailable on this device");
  const salt = randomSalt();
  const hash = await derive(password, salt);
  const existing = await getLocalAccount();
  const account: LocalAccount = {
    email: email.trim().toLowerCase(),
    salt,
    hash,
    iterations: ITERATIONS,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    cloudLinked: opts.cloudLinked ?? existing?.cloudLinked ?? false,
  };
  await db.meta.put({ key: ACCOUNT_KEY, value: account });
}

export async function verifyLocalCredentials(email: string, password: string): Promise<boolean> {
  const account = await getLocalAccount();
  if (!account) return false;
  if (account.email !== email.trim().toLowerCase()) return false;
  const hash = await derive(password, account.salt, account.iterations ?? ITERATIONS);
  return equal(hash, account.hash);
}

/** Change the device passcode (requires the current one). */
export async function changeLocalPassword(current: string, next: string): Promise<boolean> {
  const account = await getLocalAccount();
  if (!account) return false;
  if (!(await verifyLocalCredentials(account.email, current))) return false;
  await setLocalCredentials(account.email, next, { cloudLinked: account.cloudLinked });
  return true;
}

export async function startLocalSession(email: string): Promise<LocalSession> {
  const session: LocalSession = { email: email.trim().toLowerCase(), since: new Date().toISOString() };
  const db = getDb();
  await db?.meta.put({ key: SESSION_KEY, value: session });
  try {
    localStorage.setItem(SESSION_LS, JSON.stringify(session));
  } catch {
    /* private mode */
  }
  return session;
}

export async function getLocalSession(): Promise<LocalSession | null> {
  const db = getDb();
  if (db) {
    const rec = await db.meta.get(SESSION_KEY);
    if (rec?.value) return rec.value as LocalSession;
  }
  try {
    const raw = localStorage.getItem(SESSION_LS);
    if (raw) return JSON.parse(raw) as LocalSession;
  } catch {
    /* ignore */
  }
  return null;
}

export async function endLocalSession(): Promise<void> {
  const db = getDb();
  await db?.meta.delete(SESSION_KEY);
  try {
    localStorage.removeItem(SESSION_LS);
  } catch {
    /* ignore */
  }
}
