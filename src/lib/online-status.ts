import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

const LAST_SYNC_KEY = "almadina:last-sync";
const LAST_BACKUP_KEY = "almadina:last-backup";

export function markSync() {
  try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch {}
}
export function markBackup() {
  try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch {}
}
export function useLastSync() {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      try { setV(localStorage.getItem(LAST_SYNC_KEY)); } catch {}
    };
    read();
    const i = setInterval(read, 5000);
    return () => clearInterval(i);
  }, []);
  return v;
}
export function useLastBackup() {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      try { setV(localStorage.getItem(LAST_BACKUP_KEY)); } catch {}
    };
    read();
    const i = setInterval(read, 5000);
    return () => clearInterval(i);
  }, []);
  return v;
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "کبھی نہیں";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "ابھی";
  if (s < 3600) return `${Math.floor(s / 60)} منٹ پہلے`;
  if (s < 86400) return `${Math.floor(s / 3600)} گھنٹے پہلے`;
  return d.toLocaleDateString();
}
