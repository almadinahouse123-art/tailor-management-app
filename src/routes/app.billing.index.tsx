import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { fmtMoney, paymentStatus, statusBadgeClass, statusLabel } from "@/lib/tailoring";

export const Route = createFileRoute("/app/billing/")({
  component: BillingList,
});

function BillingList() {
  const { data = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("invoices").select("*, customers(id,name)").order("id", { ascending: false })).data ?? [],
  });
  return (
    <>
      <AppHeader title="بلنگ / انوائسز" />
      <div className="px-4 py-4 space-y-3">
        <Link to="/app/billing/new"><Button className="w-full bg-gradient-primary"><Plus className="h-4 w-4 ml-2" /> نیا انوائس</Button></Link>
        {data.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">کوئی انوائس نہیں</Card>
        ) : (
          data.map((i: any) => {
            const ps = paymentStatus(Number(i.total_amount), Number(i.paid_amount));
            return (
              <Link key={i.id} to="/app/billing/$id" params={{ id: String(i.id) }}>
                <Card className="p-3 shadow-card flex items-center gap-3">
                  <div className="bg-gold/20 rounded-full p-2"><Receipt className="h-4 w-4 text-gold-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">انوائس #{i.id}</div>
                    <div className="text-xs text-muted-foreground truncate">{i.customers?.name}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold">{fmtMoney(i.total_amount)}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass(ps)}`}>{statusLabel(ps)}</span>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
