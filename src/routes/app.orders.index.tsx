import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { fmtMoney, paymentStatus, statusBadgeClass, statusLabel, ORDER_STATUS_LABEL, ORDER_STATUS, type OrderStatus } from "@/lib/tailoring";

const search = z.object({ filter: z.string().optional() });

export const Route = createFileRoute("/app/orders/")({
  validateSearch: (s) => search.parse(s),
  component: OrdersList,
});

const FILTER_LABEL: Record<string, string> = {
  all: "سب",
  today: "آج کے آرڈر",
  "today-delivery": "آج ڈیلیوری",
  late: "دیر سے",
  Pending: "زیر التواء",
  Stitching: "سلائی میں",
  Ready: "تیار",
  Delivered: "ڈیلیور شدہ",
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
      <div className="px-4 py-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="آرڈر ID یا گاہک" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
          </div>
          <Link to="/app/orders/new"><Button size="icon" className="bg-gradient-primary"><Plus className="h-4 w-4" /></Button></Link>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {chips.map((f) => (
            <Link
              key={f}
              to="/app/orders"
              search={f === "all" ? {} : { filter: f }}
              className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
            >
              {FILTER_LABEL[f]}
            </Link>
          ))}
        </div>

        {data.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">کوئی آرڈر نہیں ملا</Card>
        ) : (
          data.map((o: any) => {
            const ps = paymentStatus(Number(o.total_amount), Number(o.paid_amount));
            const isLate = o.delivery_date && o.delivery_date < today && o.status !== "Delivered";
            return (
              <Link key={o.id} to="/app/orders/$id" params={{ id: String(o.id) }}>
                <Card className={`p-3 shadow-card ${isLate ? "border-destructive/50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">آرڈر #{o.id}</div>
                      <div className="text-xs text-muted-foreground">{o.customers?.name}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass(ps)}`}>{statusLabel(ps)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="bg-secondary px-2 py-0.5 rounded">{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</span>
                    <span className={isLate ? "text-destructive font-semibold" : "text-muted-foreground"}>
                      ڈیلیوری: {o.delivery_date ?? "—"}{isLate ? " (دیر)" : ""}
                    </span>
                  </div>
                  <div className="text-xs mt-1">کل: {fmtMoney(o.total_amount)} • ادا: {fmtMoney(o.paid_amount)}</div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
