import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { StatusStrip } from "@/components/StatusStrip";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users, ScissorsLineDashed, Plus, Package, Factory, UserCog,
  Trash2, Wallet, Search, AlertTriangle, CheckCircle2, Clock, Truck, Receipt,
  Phone, ShieldCheck, ArrowUpLeft, Sparkles,
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
      <div className="px-4 py-5 space-y-5 animate-rise">
        <StatusStrip />
        <QuickSearch />

        {/* Hero revenue card */}
        <Card className="relative overflow-hidden p-5 bg-gradient-noir text-primary-foreground border-0 shadow-elevated rounded-3xl">
          <div className="absolute -top-12 -left-12 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.2em] uppercase opacity-60 font-display">
                Today's Earnings
              </span>
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-3 flex items-baseline gap-2" dir="ltr">
              <span className="text-4xl font-bold font-display tracking-tight">
                {fmtMoney(data?.todayIncome).replace("Rs ", "")}
              </span>
              <span className="text-xs opacity-60">PKR</span>
            </div>
            <div className="mt-1 text-xs opacity-70">آج کی کل آمدنی</div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <MiniStat label="کل آمدنی" value={fmtMoney(data?.revenue)} />
              <MiniStat label="باقی واجب" value={fmtMoney(data?.pendingPay)} accent />
            </div>
          </div>
        </Card>

        {/* Alert */}
        {(data?.lateDelivery ?? 0) > 0 && (
          <Link to="/app/orders" search={{ filter: "late" } as any}>
            <Card className="p-4 rounded-2xl border-destructive/30 bg-destructive/5 flex items-center gap-3 hover:bg-destructive/10 transition">
              <div className="h-10 w-10 rounded-full bg-destructive/15 text-destructive inline-flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-destructive">دیر سے ڈیلیوری</div>
                <div className="text-xs text-muted-foreground">{data?.lateDelivery} آرڈر دیر سے ہیں</div>
              </div>
              <ArrowUpLeft className="h-4 w-4 text-destructive" />
            </Card>
          </Link>
        )}

        {/* Bento operational grid */}
        <section className="space-y-3">
          <SectionTitle>آج کا کام</SectionTitle>
          <div className="grid grid-cols-6 gap-3">
            <BentoTile
              to="/app/orders" search={{ filter: "today" }}
              className="col-span-3 row-span-2 bg-foreground text-background"
              icon={ScissorsLineDashed} label="آج کے آرڈر"
              value={data?.todayOrders} large
            />
            <BentoTile
              to="/app/orders" search={{ filter: "today-delivery" }}
              className="col-span-3"
              icon={Truck} label="آج ڈیلیوری" value={data?.todayDelivery}
              tone="info"
            />
            <BentoTile
              to="/app/orders" search={{ filter: "Ready" }}
              className="col-span-3"
              icon={CheckCircle2} label="تیار" value={data?.ready}
              tone="success"
            />
            <BentoTile
              to="/app/orders" search={{ filter: "Pending" }}
              className="col-span-2"
              icon={Clock} label="زیر التواء" value={data?.pending}
              tone="warning"
            />
            <BentoTile
              to="/app/orders" search={{ filter: "Stitching" }}
              className="col-span-2"
              icon={Factory} label="سلائی" value={data?.stitching}
              tone="gold"
            />
            <BentoTile
              to="/app/billing"
              className="col-span-2"
              icon={Receipt} label="انوائسز" value="→"
            />
          </div>
        </section>

        {/* Quick actions */}
        <section className="space-y-3">
          <SectionTitle>فوری اقدام</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard to="/app/customers/new" icon={Plus} label="نیا گاہک" />
            <ActionCard to="/app/orders/new" icon={Plus} label="نیا آرڈر" />
            <ActionCard to="/app/billing/new" icon={Plus} label="نیا انوائس" />
            <ActionCard to="/app/customers" icon={Users} label="تمام گاہک" />
          </div>
        </section>

        {/* More */}
        <section className="space-y-3 pb-4">
          <SectionTitle>مزید</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard to="/app/workers" icon={UserCog} label="کاریگر" />
            <ActionCard to="/app/production" icon={Factory} label="پیداوار" />
            <ActionCard to="/app/inventory" icon={Package} label="انوینٹری" />
            <ActionCard to="/app/backup" icon={ShieldCheck} label="بیک اپ" accent="success" />
            <ActionCard to="/app/trash" icon={Trash2} label="ٹریش" accent="danger" />
          </div>
        </section>
      </div>
    </>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/6 backdrop-blur px-3 py-2.5 border border-white/8">
      <div className="text-[10px] uppercase tracking-wider opacity-60 font-display">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${accent ? "text-gold" : ""}`} dir="ltr">
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase font-display">
        {children}
      </h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

type Tone = "default" | "info" | "success" | "warning" | "gold";
const toneClass: Record<Tone, string> = {
  default: "bg-card",
  info: "bg-card",
  success: "bg-card",
  warning: "bg-card",
  gold: "bg-card",
};
const iconToneClass: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  info: "bg-blue-500/10 text-blue-600",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-foreground",
  gold: "bg-gold/15 text-gold",
};

function BentoTile({
  to, search, icon: Icon, label, value, className = "", tone = "default", large = false,
}: any) {
  const isDark = className.includes("text-background");
  return (
    <Link to={to} search={search as any} className={`block ${className}`}>
      <Card
        className={`h-full p-4 rounded-2xl shadow-card border-0 ${
          isDark ? "" : toneClass[tone as Tone]
        } ${isDark ? "" : "hover:shadow-elevated"} transition-all active:scale-[0.98]`}
        style={isDark ? { background: "var(--color-foreground)" } : undefined}
      >
        <div className="flex items-start justify-between h-full">
          <div className="flex flex-col justify-between h-full">
            <div
              className={`inline-flex p-2 rounded-xl ${
                isDark ? "bg-white/10 text-gold" : iconToneClass[tone as Tone]
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="mt-3">
              <div className={`text-[11px] ${isDark ? "opacity-70" : "text-muted-foreground"}`}>
                {label}
              </div>
              <div
                className={`font-display font-bold tracking-tight ${
                  large ? "text-4xl" : "text-2xl"
                } ${isDark ? "text-background" : ""}`}
              >
                {value ?? 0}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ActionCard({
  to, icon: Icon, label, accent,
}: { to: string; icon: any; label: string; accent?: "success" | "danger" }) {
  const color =
    accent === "danger" ? "text-destructive" : accent === "success" ? "text-success" : "text-foreground";
  return (
    <Link to={to}>
      <Card className="p-3.5 rounded-2xl shadow-card border-0 hover:shadow-elevated transition-all active:scale-[0.98] flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-muted inline-flex items-center justify-center">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className="text-sm font-medium">{label}</span>
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
    <div className="relative">
      <Search className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="گاہک تلاش کریں — نام، فون یا ID"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        className="pr-11 h-12 rounded-2xl bg-card border-0 shadow-card text-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-gold/40"
      />
      {term && (data?.length ?? 0) > 0 && (
        <Card className="absolute z-20 top-14 left-0 right-0 max-h-72 overflow-auto rounded-2xl shadow-elevated border-0 p-1">
          {data!.map((c: any) => (
            <Link
              key={c.id}
              to="/app/customers/$id"
              params={{ id: String(c.id) }}
              onClick={() => setQ("")}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition"
            >
              <div className="bg-foreground text-background rounded-full h-9 w-9 flex items-center justify-center font-bold text-xs font-display">
                {c.id}
              </div>
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
