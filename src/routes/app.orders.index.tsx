import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, ScissorsLineDashed } from "lucide-react";
import { fmtMoney, paymentStatus, statusBadgeClass, statusLabel, ORDER_STATUS_LABEL, ORDER_STATUS, type OrderStatus } from "@/lib/tailoring";

const search = z.object({ filter: z.string().optional() });

export const Route = createFileRoute("/app/orders/")({
  validateSearch: (s) => search.parse(s),
  component: OrdersList,
});

const FILTER_LABEL: Record<string, string> = {
  all: "سب",
  today: "آج کے",
  "today-delivery": "آج ڈیلیوری",
  late: "دیر سے",
  Pending: "زیر التواء",
  Stitching: "سلائی",
  Ready: "تیار",
  Delivered: "ڈیلیور",
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

function OrdersList() {
  const { filter = "all" } = Route.useSearch();
  const [q, setQ] = useState("");
  const today = todayISO();

  const { data = [] } = useQuery({
    queryKey: ["orders", q, filter],
    queryFn: async () => {
      let qy = supabase.from("orders").select("*, customers(id,name,phone)").is("deleted_at", null).order("id", { ascending: false });
      if (q.trim() && /^\d+$/.test(q.trim())) {
        qy = supabase.from("orders").select("*, customers(id,name,phone)").is("deleted_at", null).eq("id", Number(q.trim()));
      }
      const { data } = await qy;
      let rows = data ?? [];
      if (q.trim() && !/^\d+$/.test(q.trim())) {
        const t = q.trim().toLowerCase();
        rows = rows.filter((o: any) => o.customers?.name?.toLowerCase().includes(t) || o.customers?.phone?.includes(t));
      }
      if (filter === "today") rows = rows.filter((o: any) => o.order_date === today);
      else if (filter === "today-delivery") rows = rows.filter((o: any) => o.delivery_date === today && o.status !== "Delivered");
      else if (filter === "late") rows = rows.filter((o: any) => o.delivery_date && o.delivery_date < today && o.status !== "Delivered");
      else if ((ORDER_STATUS as readonly string[]).includes(filter)) rows = rows.filter((o: any) => o.status === filter);
      return rows;
    },
  });

  const chips = ["all", "today", "today-delivery", "Pending", "Stitching", "Ready", "late", "Delivered"];

  return (
    <>
      <AppHeader title="آرڈرز" />
      <div className="px-4 py-4 space-y-4 animate-rise">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="آرڈر ID یا گاہک"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-11 h-12 rounded-2xl bg-card border-0 shadow-card"
            />
          </div>
          <Link to="/app/orders/new">
            <Button size="icon" className="h-12 w-12 rounded-2xl shadow-elevated">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {chips.map((f) => {
            const active = filter === f;
            return (
              <Link
                key={f}
                to="/app/orders"
                search={f === "all" ? {} : { filter: f }}
                className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all shrink-0 ${
                  active
                    ? "bg-foreground text-background shadow-card"
                    : "bg-card text-muted-foreground border border-border/60 hover:text-foreground"
                }`}
              >
                {FILTER_LABEL[f]}
              </Link>
            );
          })}
        </div>

        {data.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-dashed bg-card/50">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted inline-flex items-center justify-center mb-3">
              <ScissorsLineDashed className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">کوئی آرڈر نہیں ملا</div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {data.map((o: any) => {
              const ps = paymentStatus(Number(o.total_amount), Number(o.paid_amount));
              const isLate = o.delivery_date && o.delivery_date < today && o.status !== "Delivered";
              const remaining = Math.max(0, Number(o.total_amount ?? 0) - Number(o.paid_amount ?? 0));
              return (
                <Link key={o.id} to="/app/orders/$id" params={{ id: String(o.id) }}>
                  <Card className={`p-4 rounded-2xl shadow-card border-0 hover:shadow-elevated transition-all active:scale-[0.99] ${isLate ? "ring-1 ring-destructive/40" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-display font-semibold text-gold" dir="ltr">#{o.id}</span>
                          <span className="text-xs bg-muted text-foreground/80 px-2 py-0.5 rounded-md">
                            {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                          </span>
                        </div>
                        <div className="mt-1 font-semibold truncate">{o.customers?.name ?? "—"}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${statusBadgeClass(ps)}`}>{statusLabel(ps)}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
                      <span className={`flex items-center gap-1 ${isLate ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        <Calendar className="h-3 w-3" />
                        {o.delivery_date ?? "—"}{isLate ? " (دیر)" : ""}
                      </span>
                      <div className="text-left" dir="ltr">
                        <div className="font-semibold font-display">{fmtMoney(o.total_amount)}</div>
                        {remaining > 0 && (
                          <div className="text-[10px] text-destructive/80">due {fmtMoney(remaining)}</div>
                        )}
                      </div>
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
