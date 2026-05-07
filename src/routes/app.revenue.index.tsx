import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { fmtMoney } from "@/lib/tailoring";
import { TrendingUp, Wallet, AlertCircle, Users } from "lucide-react";

export const Route = createFileRoute("/app/revenue/")({
  component: Revenue,
});

function Revenue() {
  const { data } = useQuery({
    queryKey: ["revenue-stats"],
    queryFn: async () => {
      const [inv, ord, wl, dp] = await Promise.all([
        supabase.from("invoices").select("total_amount, paid_amount, invoice_date"),
        supabase.from("orders").select("total_amount, paid_amount, status"),
        supabase.from("worker_ledger").select("earned_amount, paid_amount, entry_date"),
        supabase.from("daily_production").select("total_amount, production_date"),
      ]);
      const invoices = inv.data ?? [];
      const orders = ord.data ?? [];
      const ledger = wl.data ?? [];
      const prod = dp.data ?? [];

      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 7);

      const totalRevenue = invoices.reduce((s, x) => s + Number(x.paid_amount ?? 0), 0);
      const todayRevenue = invoices
        .filter((x) => x.invoice_date === today)
        .reduce((s, x) => s + Number(x.paid_amount ?? 0), 0);
      const monthRevenue = invoices
        .filter((x) => (x.invoice_date ?? "").startsWith(monthStart))
        .reduce((s, x) => s + Number(x.paid_amount ?? 0), 0);

      const outstanding = orders.reduce(
        (s, x) => s + Math.max(0, Number(x.total_amount ?? 0) - Number(x.paid_amount ?? 0)),
        0,
      );

      const workerEarned = ledger.reduce((s, x) => s + Number(x.earned_amount ?? 0), 0);
      const workerPaid = ledger.reduce((s, x) => s + Number(x.paid_amount ?? 0), 0);
      const workerDue = workerEarned - workerPaid;

      const monthProduction = prod
        .filter((x) => (x.production_date ?? "").startsWith(monthStart))
        .reduce((s, x) => s + Number(x.total_amount ?? 0), 0);

      // Monthly invoice breakdown (last 6 months)
      const months: { month: string; amount: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        const amount = invoices
          .filter((x) => (x.invoice_date ?? "").startsWith(key))
          .reduce((s, x) => s + Number(x.paid_amount ?? 0), 0);
        months.push({ month: key, amount });
      }
      const maxMonth = Math.max(1, ...months.map((m) => m.amount));

      return {
        totalRevenue,
        todayRevenue,
        monthRevenue,
        outstanding,
        workerDue,
        workerEarned,
        monthProduction,
        netProfit: monthRevenue - monthProduction,
        months,
        maxMonth,
      };
    },
  });

  return (
    <>
      <AppHeader title="آمدنی" back="/app" />
      <div className="px-4 py-4 space-y-3">
        <Card className="p-4 bg-gradient-primary text-primary-foreground">
          <div className="text-xs opacity-90 flex items-center gap-1">
            <Wallet className="h-3 w-3" /> کل آمدنی
          </div>
          <div className="text-2xl font-bold">{fmtMoney(data?.totalRevenue)}</div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-80">آج</div>
              <div className="font-bold text-sm">{fmtMoney(data?.todayRevenue)}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-80">اس ماہ</div>
              <div className="font-bold text-sm">{fmtMoney(data?.monthRevenue)}</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="inline-flex p-2 rounded-lg bg-destructive/15 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">گاہک واجبات</div>
            <div className="text-base font-bold">{fmtMoney(data?.outstanding)}</div>
          </Card>
          <Card className="p-3">
            <div className="inline-flex p-2 rounded-lg bg-warning/30 text-foreground">
              <Users className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">کاریگر واجبات</div>
            <div className="text-base font-bold">{fmtMoney(data?.workerDue)}</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground">اس ماہ خالص منافع</div>
          <div className="text-xl font-bold flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-success" /> {fmtMoney(data?.netProfit)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            (آمدنی - پیداوار لاگت)
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">پچھلے 6 ماہ</div>
          <div className="space-y-2">
            {data?.months.map((m) => (
              <div key={m.month} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span dir="ltr">{m.month}</span>
                  <span className="font-semibold">{fmtMoney(m.amount)}</span>
                </div>
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary"
                    style={{ width: `${(m.amount / (data?.maxMonth ?? 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
