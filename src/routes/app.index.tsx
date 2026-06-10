import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { StatusStrip } from "@/components/StatusStrip";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users, ScissorsLineDashed, Plus, Package, Factory, UserCog,
  Trash2, Wallet, Search, AlertTriangle, CheckCircle2, Clock, Truck, Receipt, Phone, ShieldCheck,
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
        todayOrders: o.filter((x) => x.order_date === today).length,
        pending: o.filter((x) => x.status === "Pending").length,
        stitching: o.filter((x) => x.status === "Stitching").length,
        ready: o.filter((x) => x.status === "Ready").length,
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
      <div className="px-4 py-4 space-y-4">
        <StatusStrip />
        <QuickSearch />

        {/* Revenue */}
        <Card className="p-4 bg-gradient-primary text-primary-foreground border-0 shadow-card">
          <div className="flex items-center gap-2 text-xs opacity-90">
            <Wallet className="h-4 w-4" /> آج کی آمدنی
          </div>
          <div className="mt-1 text-2xl font-bold">{fmtMoney(data?.todayIncome)}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="opacity-80">کل آمدنی</div>
              <div className="font-semibold text-sm">{fmtMoney(data?.revenue)}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="opacity-80">باقی واجب</div>
              <div className="font-semibold text-sm">{fmtMoney(data?.pendingPay)}</div>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        {(data?.lateDelivery ?? 0) > 0 && (
          <Link to="/app/orders" search={{ filter: "late" } as any}>
            <Card className="p-3 border-destructive/40 bg-destructive/10 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <div className="text-sm font-bold text-destructive">دیر سے ڈیلیوری</div>
                <div className="text-xs text-muted-foreground">{data?.lateDelivery} آرڈر دیر سے ہیں</div>
              </div>
            </Card>
          </Link>
        )}

        {/* Operational tiles */}
        <div className="grid grid-cols-2 gap-3">
          <Tile to="/app/orders" search={{ filter: "today" }} icon={ScissorsLineDashed} label="آج کے آرڈر" value={data?.todayOrders} color="bg-primary/10 text-primary" />
          <Tile to="/app/orders" search={{ filter: "today-delivery" }} icon={Truck} label="آج ڈیلیوری" value={data?.todayDelivery} color="bg-blue-500/10 text-blue-600" />
          <Tile to="/app/orders" search={{ filter: "Pending" }} icon={Clock} label="زیر التواء" value={data?.pending} color="bg-warning/20 text-foreground" />
          <Tile to="/app/orders" search={{ filter: "Stitching" }} icon={Factory} label="سلائی میں" value={data?.stitching} color="bg-gold/20 text-gold-foreground" />
          <Tile to="/app/orders" search={{ filter: "Ready" }} icon={CheckCircle2} label="تیار" value={data?.ready} color="bg-success/15 text-success" />
          <Tile to="/app/billing" icon={Receipt} label="انوائسز" value="→" color="bg-success/15 text-success" />
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">فوری اقدام</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/app/customers/new"><Card className="p-3 flex items-center gap-2 shadow-card"><Plus className="h-4 w-4 text-primary" /><span className="text-sm">نیا گاہک</span></Card></Link>
            <Link to="/app/orders/new"><Card className="p-3 flex items-center gap-2 shadow-card"><Plus className="h-4 w-4 text-primary" /><span className="text-sm">نیا آرڈر</span></Card></Link>
            <Link to="/app/billing/new"><Card className="p-3 flex items-center gap-2 shadow-card"><Plus className="h-4 w-4 text-primary" /><span className="text-sm">نیا انوائس</span></Card></Link>
            <Link to="/app/customers"><Card className="p-3 flex items-center gap-2 shadow-card"><Users className="h-4 w-4 text-primary" /><span className="text-sm">گاہک</span></Card></Link>
          </div>
        </div>

        {/* More */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">مزید</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/app/workers"><Card className="p-3 flex items-center gap-2 shadow-card"><UserCog className="h-4 w-4 text-primary" /><span className="text-sm">کاریگر</span></Card></Link>
            <Link to="/app/production"><Card className="p-3 flex items-center gap-2 shadow-card"><Factory className="h-4 w-4 text-primary" /><span className="text-sm">پیداوار</span></Card></Link>
            <Link to="/app/inventory"><Card className="p-3 flex items-center gap-2 shadow-card"><Package className="h-4 w-4 text-primary" /><span className="text-sm">انوینٹری</span></Card></Link>
            <Link to="/app/trash"><Card className="p-3 flex items-center gap-2 shadow-card"><Trash2 className="h-4 w-4 text-destructive" /><span className="text-sm">ٹریش</span></Card></Link>
            <Link to="/app/backup"><Card className="p-3 flex items-center gap-2 shadow-card"><ShieldCheck className="h-4 w-4 text-success" /><span className="text-sm">بیک اپ</span></Card></Link>
          </div>
        </div>
      </div>
    </>
  );
}

function Tile({ to, search, icon: Icon, label, value, color }: any) {
  return (
    <Link to={to} search={search as any}>
      <Card className="p-4 shadow-card hover:shadow-lg transition-shadow active:scale-95">
        <div className={`inline-flex p-2 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
        <div className="mt-2 text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value ?? 0}</div>
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

  // close on enter -> go to full search
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && term) nav({ to: "/app/search" });
  };

  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="گاہک: نام، فون یا ID"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        className="pr-9 h-11 text-sm"
      />
      {term && (data?.length ?? 0) > 0 && (
        <Card className="absolute z-20 top-12 left-0 right-0 max-h-72 overflow-auto shadow-lg">
          {data!.map((c: any) => (
            <Link
              key={c.id}
              to="/app/customers/$id"
              params={{ id: String(c.id) }}
              onClick={() => setQ("")}
              className="flex items-center gap-3 p-2.5 hover:bg-accent border-b last:border-0"
            >
              <div className="bg-primary/10 text-primary rounded-full h-8 w-8 flex items-center justify-center font-bold text-xs">{c.id}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                {c.phone && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1" dir="ltr">
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
