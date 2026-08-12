import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { StatusStrip } from "@/components/StatusStrip";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users, ScissorsLineDashed, Plus, Package, Factory, UserCog,
  Wallet, Search, AlertTriangle, CheckCircle2, Clock, Truck, Receipt,
  Phone, ShieldCheck, ArrowUpRight, TrendingUp, DollarSign, ArrowRight,
} from "lucide-react";
import { fmtMoney } from "@/lib/tailoring";
import { markSync } from "@/lib/online-status";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function todayISO() { return new Date().toISOString().slice(0, 10); }

function Dashboard() {
  const today = todayISO();

  const { data } = useQuery({
    queryKey: ["dashboard-stats-v2", today],
    queryFn: async () => {
      const [orders, invoices] = await Promise.all([
        supabase.from("orders")
          .select("id,status,total_amount,paid_amount,order_date,delivery_date")
          .is("deleted_at", null),
        supabase.from("invoices")
          .select("total_amount,paid_amount,invoice_date")
          .is("deleted_at", null),
      ]);
      const o = orders.data ?? [];
      const inv = invoices.data ?? [];
      return {
        totalOrders: o.length,
        todayOrders: o.filter((x) => x.order_date === today).length,
        pending: o.filter((x) => x.status === "Pending").length,
        stitching: o.filter((x) => x.status === "Stitching").length,
        ready: o.filter((x) => x.status === "Ready").length,
        completed: o.filter((x) => x.status === "Delivered").length,
        todayDelivery: o.filter((x) => x.delivery_date === today && x.status !== "Delivered").length,
        lateDelivery: o.filter((x) => x.delivery_date && x.delivery_date < today && x.status !== "Delivered").length,
        pendingPay: o.reduce(
          (s, x) => s + Math.max(0, Number(x.total_amount ?? 0) - Number(x.paid_amount ?? 0)),
          0,
        ),
        revenue: inv.reduce((s, x) => s + Number(x.paid_amount ?? 0), 0),
        todayIncome: inv
          .filter((x) => x.invoice_date === today)
          .reduce((s, x) => s + Number(x.paid_amount ?? 0), 0),
      };
    },
  });

  useEffect(() => { if (data) markSync(); }, [data]);

  return (
    <>
      <AppHeader />
      <div className="px-4 lg:px-8 py-6 space-y-6 animate-rise">
        <StatusStrip />

        {/* Page intro */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back — here's what's happening today.
            </p>
          </div>
          <QuickSearch />
        </div>

        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Kpi
            label="Total Orders" value={data?.totalOrders ?? 0}
            icon={ScissorsLineDashed} tone="primary"
            to="/app/orders"
          />
          <Kpi
            label="Pending Orders" value={data?.pending ?? 0}
            icon={Clock} tone="warning"
            to="/app/orders" search={{ filter: "Pending" }}
          />
          <Kpi
            label="Completed" value={data?.completed ?? 0}
            icon={CheckCircle2} tone="success"
            to="/app/orders" search={{ filter: "Delivered" }}
          />
          <Kpi
            label="Revenue" value={fmtMoney(data?.revenue)}
            icon={DollarSign} tone="primary" big
            to="/app/billing"
          />
        </section>

        {/* Late alert */}
        {(data?.lateDelivery ?? 0) > 0 && (
          <Link to="/app/orders" search={{ filter: "late" } as any}>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition">
              <div className="h-10 w-10 rounded-full bg-destructive/15 text-destructive inline-flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-destructive">Late deliveries</div>
                <div className="text-xs text-muted-foreground">
                  {data?.lateDelivery} order(s) past delivery date
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-destructive" />
            </div>
          </Link>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Today snapshot */}
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold">Today's Activity</div>
                <div className="text-xs text-muted-foreground mt-0.5">{new Date().toDateString()}</div>
              </div>
              <Link to="/app/orders" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="New Orders" value={data?.todayOrders ?? 0} icon={ScissorsLineDashed} />
              <MiniStat label="Deliveries" value={data?.todayDelivery ?? 0} icon={Truck} />
              <MiniStat label="In Stitching" value={data?.stitching ?? 0} icon={Factory} />
              <MiniStat label="Ready" value={data?.ready ?? 0} icon={CheckCircle2} />
            </div>

            <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Today's Income</div>
                <div className="text-xl font-bold mt-1 text-foreground">
                  {fmtMoney(data?.todayIncome)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Outstanding</div>
                <div className="text-xl font-bold mt-1 text-warning" style={{ color: "var(--warning)" }}>
                  {fmtMoney(data?.pendingPay)}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-5">
            <div className="text-sm font-semibold mb-4">Quick Actions</div>
            <div className="space-y-2">
              <ActionRow to="/app/orders/new" icon={Plus} label="New Order" primary />
              <ActionRow to="/app/customers/new" icon={Users} label="Add Customer" />
              <ActionRow to="/app/billing/new" icon={Receipt} label="Create Invoice" />
              <ActionRow to="/app/measurements/new" icon={Plus} label="New Measurement" />
            </div>
          </Card>
        </div>

        {/* Modules */}
        <section>
          <div className="text-sm font-semibold mb-3">Modules</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <ModuleTile to="/app/customers" icon={Users} label="Customers" />
            <ModuleTile to="/app/orders" icon={ScissorsLineDashed} label="Orders" />
            <ModuleTile to="/app/production" icon={Factory} label="Production" />
            <ModuleTile to="/app/inventory" icon={Package} label="Stock" />
            <ModuleTile to="/app/workers" icon={UserCog} label="Staff" />
            <ModuleTile to="/app/backup" icon={ShieldCheck} label="Backup" />
          </div>
        </section>
      </div>
    </>
  );
}

const toneBg: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

function Kpi({
  label, value, icon: Icon, tone = "primary", big, to, search,
}: {
  label: string; value: any; icon: any; tone?: string; big?: boolean; to: string; search?: any;
}) {
  return (
    <Link to={to} search={search as any} className="block group">
      <Card className="p-4 lg:p-5 hover:shadow-elevated transition-all duration-150 group-hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${toneBg[tone] ?? toneBg.primary}`}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition" />
        </div>
        <div className="mt-3">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className={`mt-1 font-bold tracking-tight ${big ? "text-xl lg:text-2xl" : "text-2xl lg:text-3xl"}`}>
            {value}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold mt-1.5">{value}</div>
    </div>
  );
}

function ActionRow({ to, icon: Icon, label, primary }: { to: string; icon: any; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90 shadow-card"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight className={`h-3.5 w-3.5 ${primary ? "opacity-80" : "text-muted-foreground"}`} />
    </Link>
  );
}

function ModuleTile({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 hover:shadow-elevated hover:border-primary/30 transition-all duration-150 flex flex-col items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </Card>
    </Link>
  );
}

function QuickSearch() {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const term = q.trim();

  const { data } = useQuery({
    queryKey: ["home-search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      let qy = supabase.from("customers").select("id,name,phone").is("deleted_at", null).limit(8);
      if (/^\d+$/.test(term)) qy = qy.or(`id.eq.${term},phone.ilike.%${term}%`);
      else qy = qy.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
      return (await qy).data ?? [];
    },
  });

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && term) nav({ to: "/app/search" });
  };

  return (
    <div className="relative w-full sm:w-80">
      <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Search customers, phone, ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        className="pl-10 h-10 rounded-lg text-sm"
      />
      {term && (data?.length ?? 0) > 0 && (
        <Card className="absolute z-20 top-12 left-0 right-0 max-h-72 overflow-auto p-1.5">
          {data!.map((c: any) => (
            <Link
              key={c.id}
              to="/app/customers/$id"
              params={{ id: String(c.id) }}
              onClick={() => setQ("")}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition"
            >
              <div className="bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center font-semibold text-xs">
                {c.id}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                {c.phone && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
