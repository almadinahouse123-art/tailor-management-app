import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Factory } from "lucide-react";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/production/")({
  component: ProductionList,
});

function ProductionList() {
  const { data: rows = [] } = useQuery({
    queryKey: ["production"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_production")
        .select("*, workers(name)")
        .order("production_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter((r) => r.production_date === today);
  const todaySuits = todayRows.reduce((s, r) => s + Number(r.suits_count ?? 0), 0);
  const todayAmount = todayRows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

  return (
    <>
      <AppHeader title="پیداوار" back="/app" />
      <div className="px-4 py-4 space-y-3">
        <Card className="p-4 bg-gradient-primary text-primary-foreground">
          <div className="text-xs opacity-90 flex items-center gap-1">
            <Factory className="h-3 w-3" /> آج کی پیداوار
          </div>
          <div className="text-2xl font-bold">{todaySuits} سوٹ</div>
          <div className="text-xs opacity-90">{fmtMoney(todayAmount)}</div>
        </Card>

        <div className="flex justify-end">
          <Link to="/app/production/new">
            <Button className="bg-gradient-primary"><Plus className="h-4 w-4" /> نیا اندراج</Button>
          </Link>
        </div>

        {rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">کوئی پیداوار نہیں</Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <Card key={r.id} className="p-3 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{r.workers?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.production_date} · {r.suits_count} سوٹ × {fmtMoney(r.rate_per_suit)}
                      {r.order_id && <> · آرڈر #{r.order_id}</>}
                    </div>
                    {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
                  </div>
                  <div className="text-success font-bold">{fmtMoney(r.total_amount)}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
