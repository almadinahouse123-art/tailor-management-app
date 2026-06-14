import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Package, AlertTriangle, Sparkles } from "lucide-react";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/inventory/")({
  component: InventoryList,
});

function InventoryList() {
  const [q, setQ] = useState("");
  const { data: items = [] } = useQuery({
    queryKey: ["inventory", q],
    queryFn: async () => {
      let qy = supabase.from("inventory").select("*").is("deleted_at", null).order("id", { ascending: false });
      if (q.trim()) qy = qy.or(`item_name.ilike.%${q.trim()}%,category.ilike.%${q.trim()}%`);
      const { data, error } = await qy;
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalValue = items.reduce((s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0), 0);
  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.low_stock_threshold ?? 0));

  return (
    <>
      <AppHeader title="انوینٹری" back="/app" />
      <div className="px-4 py-4 space-y-4 animate-rise">
        <Card className="relative overflow-hidden p-5 rounded-3xl bg-gradient-noir text-primary-foreground border-0 shadow-elevated">
          <div className="absolute -top-12 -left-12 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.2em] uppercase opacity-60 font-display">Stock Value</span>
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-2 text-3xl font-bold font-display" dir="ltr">{fmtMoney(totalValue)}</div>
            {lowStock.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-destructive/20 text-destructive-foreground rounded-full px-3 py-1">
                <AlertTriangle className="h-3 w-3" /> {lowStock.length} اشیاء کم اسٹاک
              </div>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="شے یا قسم تلاش کریں"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-11 h-12 rounded-2xl bg-card border-0 shadow-card"
            />
          </div>
          <Link to="/app/inventory/new">
            <Button size="icon" className="h-12 w-12 rounded-2xl shadow-elevated">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-dashed bg-card/50">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted inline-flex items-center justify-center mb-3">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">کوئی شے نہیں</div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {items.map((i) => {
              const low = Number(i.quantity) <= Number(i.low_stock_threshold ?? 0);
              return (
                <Card key={i.id} className={`p-3.5 rounded-2xl border-0 shadow-card flex items-center gap-3 ${low ? "ring-1 ring-destructive/30" : ""}`}>
                  <div className={`rounded-2xl h-12 w-12 flex items-center justify-center shrink-0 ${low ? "bg-destructive/15 text-destructive" : "bg-muted text-foreground"}`}>
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{i.item_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {i.category ?? "—"} · <span className="font-display" dir="ltr">{i.quantity} {i.unit ?? ""}</span> · <span className="font-display" dir="ltr">{fmtMoney(i.unit_price)}</span>/{i.unit ?? "اکائی"}
                    </div>
                  </div>
                  {low && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
