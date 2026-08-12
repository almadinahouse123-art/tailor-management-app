import { Cloud, CloudOff, RefreshCw, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "@/lib/online-status";
import { useSyncStatus, syncNow } from "@/lib/offline/use-sync";

/** Persistent Online / Offline / Syncing badge. */
export function SyncBadge({ className = "" }: { className?: string }) {
  const online = useOnlineStatus();
  const { syncing, pending } = useSyncStatus();

  const state = !online ? "offline" : syncing ? "syncing" : pending > 0 ? "queued" : "online";

  const styles: Record<string, string> = {
    offline: "bg-destructive/10 text-destructive",
    syncing: "bg-primary/10 text-primary",
    queued: "bg-amber-500/10 text-amber-600",
    online: "bg-emerald-500/10 text-emerald-600",
  };

  const label: Record<string, string> = {
    offline: "Offline",
    syncing: "Syncing…",
    queued: `${pending} pending`,
    online: "Online",
  };

  const Icon =
    state === "offline" ? CloudOff : state === "syncing" ? RefreshCw : state === "queued" ? CloudUpload : Cloud;

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      title={state === "offline" ? "No internet — changes are saved on this device" : "Tap to sync now"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${styles[state]} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${state === "syncing" ? "animate-spin" : ""}`} />
      {label[state]}
    </button>
  );
}

/** Small "not yet synced" marker for individual records. */
export function PendingDot({ pending }: { pending?: boolean | number | null }) {
  if (!pending) return null;
  return (
    <span
      title="Waiting to sync"
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600"
    >
      <CloudUpload className="h-3 w-3" />
      Pending
    </span>
  );
}
