import { markSync } from "@/lib/online-status";

export type SyncState = {
  syncing: boolean;
  pending: number;
  lastError: string | null;
};

let state: SyncState = { syncing: false, pending: 0, lastError: null };
const listeners = new Set<() => void>();
const changeListeners = new Set<() => void>();
let syncRequester: (() => void) | null = null;

export function getSyncState() {
  return state;
}

export function setSyncState(patch: Partial<SyncState>) {
  const next = { ...state, ...patch };
  if (next.syncing === state.syncing && next.pending === state.pending && next.lastError === state.lastError) return;
  state = next;
  listeners.forEach((l) => l());
}

export function subscribeSyncState(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Fired whenever local data changed (so React Query can refetch). */
export function notifyLocalChange() {
  changeListeners.forEach((l) => l());
}
export function subscribeLocalChange(l: () => void) {
  changeListeners.add(l);
  return () => changeListeners.delete(l);
}

export function markSyncedNow() {
  markSync();
}

/** Registered by the sync engine; called when new work lands in the outbox. */
export function registerSyncRequester(fn: () => void) {
  syncRequester = fn;
}
export function requestSync() {
  syncRequester?.();
}
