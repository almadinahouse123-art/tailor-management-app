import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, XCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOnlineStatus, useLastSync, formatRelative } from "@/lib/online-status";
import { useSyncStatus, syncNow } from "@/lib/offline/use-sync";
import { getDb, type OutboxOp } from "@/lib/offline/db";
import { refreshPending } from "@/lib/offline/sync";
import { resolveKeepCloud, resolveKeepMine, resolveRenumber, retryFailed } from "@/lib/offline/outbox";
import { TRASH_LABELS } from "@/lib/crud";
import { bizId } from "@/lib/utils";

export const Route = createFileRoute("/app/sync")({
  head: () => ({
    meta: [
      { title: "Sync status — Almadina Stitching Suite" },
      { name: "description", content: "See changes waiting to upload, fix failed uploads and resolve conflicts." },
      { property: "og:title", content: "Sync status — Almadina Stitching Suite" },
      { property: "og:description", content: "Changes waiting to upload, failed uploads and conflicts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SyncPage,
});

const LABELS: Record<string, string> = { ...TRASH_LABELS, stock_movements: "اسٹاک اندراج" };
const OP_LABEL = { insert: "نیا", update: "ترمیم", delete: "حذف" } as const;

function reasonFor(o: OutboxOp) {
  if (o.status === "conflict") {
    if (o.op === "insert") return "یہ نمبر کسی دوسرے آلے پر بھی استعمال ہوا ہے۔ دونوں ریکارڈ محفوظ ہیں۔";
    return "یہ ریکارڈ کلاؤڈ میں بھی بدلا گیا ہے۔ منتخب کریں کون سا ورژن رکھنا ہے۔";
  }
  return "Sync could not complete. Your data is safe on this device. We will try again.";
}

function SyncPage() {
  const online = useOnlineStatus();
  const lastSync = useLastSync();
  const { syncing, pending, failed, conflict } = useSyncStatus();
  const [busy, setBusy] = useState(false);

  const { data: ops = [], refetch } = useQuery({
    queryKey: ["sync-problems", pending, failed, conflict],
    queryFn: async () =>
      ((await getDb()?.outbox.toArray()) ?? []).filter((o) => o.status === "failed" || o.status === "conflict"),
  });

  const run = async (fn: () => Promise<unknown>, msg?: string) => {
    setBusy(true);
    try {
      await fn();
      await refreshPending();
      await refetch();
      if (msg) toast.success(msg);
      void syncNow({ force: true });
    } finally {
      setBusy(false);
    }
  };

  const status = !online
    ? { icon: CloudOff, text: "آف لائن — اس آلے پر کام جاری ہے", cls: "text-destructive" }
    : conflict
      ? { icon: AlertTriangle, text: "توجہ درکار ہے — تنازعہ", cls: "text-amber-600" }
      : failed
        ? { icon: XCircle, text: "Sync failed — Retry", cls: "text-destructive" }
        : syncing
          ? { icon: RefreshCw, text: "آن لائن — Sync ہو رہا ہے…", cls: "text-primary" }
          : pending
            ? { icon: RefreshCw, text: `${pending} تبدیلیاں انتظار میں`, cls: "text-amber-600" }
            : { icon: CheckCircle2, text: "آن لائن — مکمل Sync", cls: "text-success" };
  const Icon = status.icon;

  return (
    <>
      <AppHeader title="Sync" back="/app" />
      <div className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div className={`flex items-center gap-2 font-semibold ${status.cls}`}>
            <Icon className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} /> {status.text}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-muted p-2"><div className="text-lg font-bold">{pending}</div>انتظار میں</div>
            <div className="rounded-xl bg-muted p-2"><div className="text-lg font-bold">{failed}</div>ناکام</div>
            <div className="rounded-xl bg-muted p-2"><div className="text-lg font-bold">{conflict}</div>تنازعہ</div>
          </div>
          <div className="text-xs text-muted-foreground">آخری Sync: {formatRelative(lastSync)}</div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy || !online} onClick={() => run(() => syncNow({ force: true }))}>
              <RefreshCw className="h-4 w-4 ml-1" /> Sync Now
            </Button>
            <Button variant="outline" className="flex-1" disabled={busy || !failed} onClick={() => run(retryFailed, "دوبارہ کوشش ہو رہی ہے")}>
              Retry Failed
            </Button>
          </div>
        </Card>

        {ops.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground text-center">کوئی مسئلہ نہیں۔ آپ کا ڈیٹا محفوظ ہے۔</Card>
        ) : (
          ops.map((o) => (
            <Card key={o.seq} className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{LABELS[o.table] ?? o.table} #{bizId(o.id)} · {OP_LABEL[o.op]}</span>
                <span className={o.status === "conflict" ? "text-amber-600 text-xs" : "text-destructive text-xs"}>
                  {o.status === "conflict" ? "تنازعہ" : "ناکام"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{reasonFor(o)}</p>
              {o.status === "conflict" && o.op !== "insert" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={busy} onClick={() => run(() => resolveKeepMine(o.seq!), "آپ کا ورژن رکھا گیا")}>
                    Keep My Version
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => run(() => resolveKeepCloud(o.seq!), "کلاؤڈ ورژن رکھا گیا")}>
                    Keep Cloud Version
                  </Button>
                </div>
              )}
              {o.status === "conflict" && o.op === "insert" && (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const n = await resolveRenumber(o.seq!);
                      if (n) toast.success(`نیا نمبر: #${n}`);
                    })
                  }
                >
                  اس آلے کے ریکارڈ کو نیا نمبر دیں
                </Button>
              )}
            </Card>
          ))
        )}
      </div>
    </>
  );
}
