import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, ChevronLeft } from "lucide-react";
import { fmtMoney, paymentStatus, statusBadgeClass, statusLabel } from "@/lib/tailoring";

export const Route = createFileRoute("/app/billing/")({
  component: BillingList,
});

function BillingList() {
  const { data = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("invoices").select("*, customers(id,name)").is("deleted_at", null).order("id", { ascending: false })).data ?? [],
  });

  const totalRevenue = data.reduce((s: number, i: any) => s + Number(i.paid_amount ?? 0), 0);
  const totalDue = data.reduce((s: number, i: any) => s + Math.max(0, Number(i.total_amount ?? 0) - Number(i.paid_amount ?? 0)), 0);

  return (
    <>
      <AppHeader title="بلنگ" />
      <div className="px-4 py-4 space-y-4 animate-rise">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 rounded-2xl border-0 shadow-card">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Received</div>
            <div className="text-lg font-bold font-display mt-1" dir="ltr">{fmtMoney(totalRevenue)}</div>
          </Card>
          <Card className="p-4 rounded-2xl border-0 shadow-card">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Due</div>
            <div className="text-lg font-bold font-display mt-1 text-destructive" dir="ltr">{fmtMoney(totalDue)}</div>
          </Card>
        </div>

        <Link to="/app/billing/new">
          <Button className="w-full h-12 rounded-2xl shadow-elevated">
            <Plus className="h-4 w-4 ml-1" /> نیا انوائس
          </Button>
        </Link>

        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-display">
            انوائسز
          </span>
          <span className="text-[11px] text-muted-foreground font-display" dir="ltr">
            {data.length} total
          </span>
        </div>

        {data.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-dashed bg-card/50">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted inline-flex items-center justify-center mb-3">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">کوئی انوائس نہیں</div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {data.map((i: any) => {
              const ps = paymentStatus(Number(i.total_amount), Number(i.paid_amount));
              return (
                <Link key={i.id} to="/app/billing/$id" params={{ id: String(i.id) }}>
                  <Card className="p-3.5 rounded-2xl border-0 shadow-card hover:shadow-elevated transition-all active:scale-[0.99] flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gold/15 text-gold inline-flex items-center justify-center shrink-0">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-display font-semibold text-gold" dir="ltr">#{i.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass(ps)}`}>{statusLabel(ps)}</span>
                      </div>
                      <div className="font-semibold truncate mt-0.5">{i.customers?.name ?? "—"}</div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-sm font-bold font-display" dir="ltr">{fmtMoney(i.total_amount)}</div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground inline-block mt-1" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
