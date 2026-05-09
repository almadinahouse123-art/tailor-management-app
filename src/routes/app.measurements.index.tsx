import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Ruler, Printer } from "lucide-react";
import { URDU_LABELS } from "@/lib/tailoring";

export const Route = createFileRoute("/app/measurements/")({
  component: MeasurementsList,
});

function MeasurementsList() {
  const { data = [] } = useQuery({
    queryKey: ["measurements-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("measurements")
        .select("*, customers(id,name,phone)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <>
      <AppHeader title="پیمائش" />
      <div className="px-4 py-4 space-y-3">
        <Link to="/app/measurements/new">
          <Button className="w-full bg-gradient-primary"><Plus className="h-4 w-4 ml-2" /> نئی پیمائش</Button>
        </Link>
        {data.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">ابھی کوئی پیمائش محفوظ نہیں</Card>
        ) : (
          data.map((m: any) => (
            <Link key={m.id} to="/app/customers/$id" params={{ id: String(m.customer_id) }}>
              <Card className="p-3 shadow-card">
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5 text-primary" /> {m.customers?.name ?? `گاہک #${m.customer_id}`}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                  {m.lambai && <span>{URDU_LABELS.lambai}: {m.lambai}</span>}
                  {m.daman && <span>{URDU_LABELS.daman}: {m.daman}</span>}
                  {m.chorai && <span>{URDU_LABELS.chorai}: {m.chorai}</span>}
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
