import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSyncState, subscribeSyncState, subscribeLocalChange } from "./bus";
import { startSyncEngine, pendingCount, syncNow } from "./sync";
import { setSyncState } from "./bus";

export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => subscribeSyncState(cb),
    () => getSyncState(),
    () => getSyncState(),
  );
}

/** Number of rows still waiting to reach the cloud. */
export function usePendingCount() {
  const { pending } = useSyncStatus();
  return pending;
}

/**
 * Boots the offline sync engine and refetches queries whenever local data
 * changes (offline write applied, or a queued write reached the cloud).
 */
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);

  useEffect(() => {
    const stop = startSyncEngine();
    void pendingCount().then((n) => setSyncState({ pending: n }));
    const off = subscribeLocalChange(() => {
      setTick((t) => t + 1);
      void pendingCount().then((n) => setSyncState({ pending: n }));
      queryClient.invalidateQueries();
    });
    return () => {
      off();
      stop();
    };
  }, [queryClient]);

  return <>{children}</>;
}

export { syncNow };
