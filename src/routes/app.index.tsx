import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Users, ScissorsLineDashed, Receipt, Ruler, Wallet, Plus } from "lucide-react";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [c, o, inv] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, status, total_amount, paid_amount"),
        supabase.from("invoices").select("total_amount, paid_amount, invoice_date"),
      ]);
      const orders = o.data ?? [];
      const invoices = inv.data ?? [];
      const today = new Date().toISOString().slice(0, 10);
      return {
        customers: c.count ?? 0,
        orders: orders.length,
        pending: orders.filter((x) => x.status !== "Delivered").length,
        revenue: invoices.reduce((s, x) => s + Number(x.paid_amount ?? 0), 0),
        outstanding: orders.reduce(
          (s, x) => s + Math.max(0, Number(x.total_amount ?? 0) - Number(x.paid_amount ?? 0)),
          0,
        ),
        todayIncome: invoices
          .filter((x) => x.invoice_date === today)
          .reduce((s, x) => s + Number(x.paid_amount ?? 0), 0),
      };
    },
  });

  const tiles = [
    { to: "/app/customers", label: "گاہک", value: data?.customers ?? 0, icon: Users, color: "bg-primary/10 text-primary" },
    { to: "/app/orders", label: "آرڈرز", value: data?.orders ?? 0, icon: ScissorsLineDashed, color: "bg-gold/20 text-gold-foreground" },
    { to: "/app/orders", label: "زیر التواء", value: data?.pending ?? 0, icon: Ruler, color: "bg-warning/20 text-foreground" },
    { to: "/app/billing", label: "انوائسز", value: "→", icon: Receipt, color: "bg-success/15 text-success" },
  ];

  return (
    <>
      <AppHeader />
      <div className="px-4 py-4 space-y-4">
        {/* Revenue card */}
        <Card className="p-4 bg-gradient-primary text-primary-foreground border-0 shadow-card">
          <div className="flex items-center gap-2 text-xs opacity-90">
            <Wallet className="h-4 w-4" /> کل آمدنی
          </div>
          <div className="mt-1 text-2xl font-bold">{fmtMoney(data?.revenue)}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="opacity-80">آج</div>
              <div className="font-semibold text-sm">{fmtMoney(data?.todayIncome)}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="opacity-80">باقی واجب</div>
              <div className="font-semibold text-sm">{fmtMoney(data?.outstanding)}</div>
            </div>
          </div>
        </Card>

        {/* Quick tiles */}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.label} to={t.to}>
                <Card className="p-4 shadow-card hover:shadow-lg transition-shadow">
                  <div className={`inline-flex p-2 rounded-lg ${t.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{t.label}</div>
                  <div className="text-xl font-bold">{t.value}</div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">فوری اقدام</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/app/customers/new">
              <Card className="p-3 flex items-center gap-2 shadow-card">
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-sm">نیا گاہک</span>
              </Card>
            </Link>
            <Link to="/app/orders/new">
              <Card className="p-3 flex items-center gap-2 shadow-card">
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-sm">نیا آرڈر</span>
              </Card>
            </Link>
            <Link to="/app/billing/new">
              <Card className="p-3 flex items-center gap-2 shadow-card">
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-sm">نیا انوائس</span>
              </Card>
            </Link>
            <Link to="/app/measurements">
              <Card className="p-3 flex items-center gap-2 shadow-card">
                <Ruler className="h-4 w-4 text-primary" />
                <span className="text-sm">پیمائش</span>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
