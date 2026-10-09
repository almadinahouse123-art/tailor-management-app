import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSyncState, subscribeSyncState, subscribeLocalChange } from "./bus";
import { startSyncEngine, refreshPending, syncNow } from "./sync";

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
    void refreshPending();
    const off = subscribeLocalChange(() => {
      setTick((t) => t + 1);
      void refreshPending();
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
