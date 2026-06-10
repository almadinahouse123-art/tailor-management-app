import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Undo2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { hardDelete, restore, TRASH_LABELS, type TrashTable } from "@/lib/crud";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/trash")({
  component: TrashPage,
});

const TABS: { key: TrashTable; label: string }[] = [
  { key: "customers", label: "گاہک" },
  { key: "orders", label: "آرڈرز" },
  { key: "measurements", label: "پیمائش" },
  { key: "workers", label: "کاریگر" },
  { key: "inventory", label: "انوینٹری" },
  { key: "invoices", label: "بلنگ" },
  { key: "customer_ledger", label: "کھاتہ" },
  { key: "worker_ledger", label: "کاریگر کھاتہ" },
  { key: "daily_production", label: "پیداوار" },
];

function describe(table: TrashTable, r: any): string {
  switch (table) {
    case "customers": return `#${r.id} — ${r.name}${r.phone ? ` · ${r.phone}` : ""}`;
    case "orders": return `آرڈر #${r.id} · ${fmtMoney(r.total_amount)}`;
    case "measurements": return `پیمائش #${r.id} (گاہک #${r.customer_id})`;
    case "workers": return `${r.name} (#${r.id})`;
    case "inventory": return `${r.item_name} · ${r.quantity ?? 0} ${r.unit ?? ""}`;
    case "invoices": return `انوائس #${r.id} · ${fmtMoney(r.total_amount)}`;
    case "customer_ledger": return `${r.entry_date} · ${r.description ?? ""} · ${fmtMoney(r.paid_amount)}`;
    case "worker_ledger": return `${r.entry_date} · ${r.description ?? ""}`;
    case "daily_production": return `${r.production_date} · ${r.suits_count} سوٹ · ${fmtMoney(r.total_amount)}`;
  }
}

function TrashList({ table }: { table: TrashTable }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["trash", table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["trash", table] });

  const onRestore = async (id: number) => {
    const e = await restore(table, id);
    if (e) return toast.error(e.message);
    toast.success("بحال ہو گیا");
    refresh();
  };

  const onPurge = async (id: number) => {
    const e = await hardDelete(table, id);
    if (e) return toast.error(e.message);
    toast.success("مستقل حذف ہو گیا");
    refresh();
  };

  if (isLoading) return <div className="text-center text-sm text-muted-foreground py-6">لوڈ...</div>;
  if (data.length === 0)
    return <Card className="p-6 text-center text-sm text-muted-foreground">ٹریش خالی ہے</Card>;

  return (
    <div className="space-y-2">
      {data.map((r: any) => (
        <Card key={r.id} className="p-3 text-sm">
          <div className="font-medium truncate">{describe(table, r)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            حذف: {new Date(r.deleted_at).toLocaleString()}
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => onRestore(r.id)} className="text-success border-success/40">
              <Undo2 className="h-3.5 w-3.5 ml-1" /> بحال کریں
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 ml-1" /> مستقل حذف
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>مستقل حذف کریں؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    یہ {TRASH_LABELS[table]} ہمیشہ کے لیے ضائع ہو جائے گا۔ بحال نہیں کیا جا سکے گا۔
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>منسوخ</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onPurge(r.id)} className="bg-destructive hover:bg-destructive/90">
                    ہاں، مکمل حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TrashPage() {
  const [tab, setTab] = useState<TrashTable>("customers");
  return (
    <>
      <AppHeader title="ٹریش / بحالی" back="/app" />
      <div className="px-4 py-4 space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TrashTable)}>
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs whitespace-nowrap">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-3">
              <TrashList table={t.key} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
