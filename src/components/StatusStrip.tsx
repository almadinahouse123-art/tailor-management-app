import { Wifi, WifiOff, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useOnlineStatus, useLastSync, useLastBackup, formatRelative } from "@/lib/online-status";

export function StatusStrip() {
  const online = useOnlineStatus();
  const lastSync = useLastSync();
  const lastBackup = useLastBackup();

  return (
    <div className="flex items-center gap-2 text-[10px] flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium tracking-wide ${
          online ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${online ? "bg-success" : "bg-destructive"} ${
            online ? "animate-pulse" : ""
          }`}
        />
        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {online ? "آن لائن" : "آف لائن"}
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <RefreshCw className="h-3 w-3" /> {formatRelative(lastSync)}
      </span>
      <Link
        to="/app/backup"
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mr-auto"
      >
        <ShieldCheck className="h-3 w-3" /> بیک اپ · {formatRelative(lastBackup)}
      </Link>
    </div>
  );
}
