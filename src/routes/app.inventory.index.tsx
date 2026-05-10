import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
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
      <div className="px-4 py-4 space-y-3">
        <Card className="p-4 bg-gradient-primary text-primary-foreground">
          <div className="text-xs opacity-90">کل اسٹاک قیمت</div>
          <div className="text-2xl font-bold">{fmtMoney(totalValue)}</div>
          {lowStock.length > 0 && (
            <div className="mt-2 text-xs flex items-center gap-1 bg-warning/30 rounded px-2 py-1">
              <AlertTriangle className="h-3 w-3" /> {lowStock.length} اشیاء کم اسٹاک
            </div>
          )}
        </Card>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="شے یا قسم تلاش کریں"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-9"
            />
          </div>
          <Link to="/app/inventory/new">
            <Button size="icon" className="bg-gradient-primary"><Plus className="h-4 w-4" /></Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">کوئی شے نہیں</Card>
        ) : (
          <div className="space-y-2">
            {items.map((i) => {
              const low = Number(i.quantity) <= Number(i.low_stock_threshold ?? 0);
              return (
                <Card key={i.id} className="p-3 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full h-10 w-10 flex items-center justify-center ${low ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{i.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.category ?? "—"} · {i.quantity} {i.unit ?? ""} · {fmtMoney(i.unit_price)}/{i.unit ?? "اکائی"}
                      </div>
                    </div>
                    {low && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
