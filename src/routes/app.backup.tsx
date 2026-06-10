import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { markBackup, useLastBackup, formatRelative } from "@/lib/online-status";

export const Route = createFileRoute("/app/backup")({
  component: BackupPage,
});

const TABLES = [
  "customers",
  "measurements",
  "orders",
  "workers",
  "inventory",
  "invoices",
  "customer_ledger",
  "worker_ledger",
  "daily_production",
] as const;

const STRIP = new Set(["id", "user_id", "created_at", "updated_at", "deleted_at"]);

function BackupPage() {
  const [busy, setBusy] = useState<"none" | "export" | "import">("none");
  const fileRef = useRef<HTMLInputElement>(null);
  const lastBackup = useLastBackup();

  const onExport = async () => {
    setBusy("export");
    try {
      const dump: Record<string, any[]> = {};
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select("*");
        if (error) throw error;
        dump[t] = data ?? [];
      }
      const payload = {
        app: "almadina-tailor",
        version: 1,
        exported_at: new Date().toISOString(),
        data: dump,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `almadina-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      markBackup();
      toast.success("بیک اپ ڈاؤن لوڈ ہو گیا");
    } catch (e: any) {
      toast.error(e.message ?? "بیک اپ ناکام");
    } finally {
      setBusy("none");
    }
  };

  const onImport = async (file: File) => {
    setBusy("import");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = parsed?.data ?? {};
      let total = 0;
      for (const t of TABLES) {
        const rows: any[] = Array.isArray(data[t]) ? data[t] : [];
        if (!rows.length) continue;
        const cleaned = rows.map((r) => {
          const out: any = {};
          for (const k of Object.keys(r)) if (!STRIP.has(k)) out[k] = r[k];
          return out;
        });
        // Chunked insert to avoid request size limits
        for (let i = 0; i < cleaned.length; i += 200) {
          const chunk = cleaned.slice(i, i + 200);
          const { error } = await supabase.from(t).insert(chunk);
          if (error) throw new Error(`${t}: ${error.message}`);
          total += chunk.length;
        }
      }
      toast.success(`${total} ریکارڈ بحال ہو گئے`);
    } catch (e: any) {
      toast.error(e.message ?? "بحالی ناکام");
    } finally {
      setBusy("none");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <AppHeader title="بیک اپ" back="/app" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 bg-gradient-primary text-primary-foreground border-0 shadow-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <div className="font-semibold">آپ کا ڈیٹا محفوظ ہے</div>
          </div>
          <p className="text-xs opacity-90 mt-2 leading-relaxed">
            تمام ریکارڈ خودکار طور پر کلاؤڈ پر محفوظ ہوتے ہیں۔ نئے موبائل پر صرف لاگ ان کریں — سب ڈیٹا واپس آ جائے گا۔
          </p>
          <div className="text-[11px] opacity-80 mt-2">
            آخری بیک اپ: {formatRelative(lastBackup)}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="font-semibold flex items-center gap-2"><Download className="h-4 w-4" /> بیک اپ ڈاؤن لوڈ</div>
          <p className="text-xs text-muted-foreground">
            تمام گاہک، آرڈر، پیمائش، ادائیگیاں، کاریگر اور انوینٹری ایک JSON فائل میں۔
          </p>
          <Button onClick={onExport} disabled={busy !== "none"} className="w-full bg-gradient-primary">
            {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 ml-2" /> ڈاؤن لوڈ</>}
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" /> بیک اپ بحال کریں</div>
          <p className="text-xs text-muted-foreground">
            JSON فائل منتخب کریں۔ موجودہ ڈیٹا حذف نہیں ہو گا — ریکارڈ شامل ہوں گے۔
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== "none"}
            className="w-full"
          >
            {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 ml-2" /> فائل منتخب کریں</>}
          </Button>
        </Card>
      </div>
    </>
  );
}
