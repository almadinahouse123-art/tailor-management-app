import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, User, Phone, ScissorsLineDashed } from "lucide-react";
import { fmtMoney, paymentStatus, statusBadgeClass, statusLabel, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/tailoring";

export const Route = createFileRoute("/app/search")({
  component: SmartSearch,
});

function SmartSearch() {
  const [q, setQ] = useState("");
  const term = q.trim();
  const isNum = /^\d+$/.test(term);

  const { data, isFetching } = useQuery({
    queryKey: ["smart-search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      // Customers: by id, name (partial), or phone (partial)
      let custQ = supabase.from("customers").select("*").is("deleted_at", null).limit(20);
      if (isNum) {
        custQ = custQ.or(`id.eq.${term},phone.ilike.%${term}%`);
      } else {
        custQ = custQ.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
      }
      const { data: customers } = await custQ;

      const ordersBase = supabase
        .from("orders")
        .select("*, customers(id,name,phone)")
        .is("deleted_at", null)
        .order("id", { ascending: false })
        .limit(30);
      const { data: ordersAll } = isNum
        ? await supabase.from("orders").select("*, customers(id,name,phone)").is("deleted_at", null).or(`id.eq.${term},customer_id.eq.${term}`).limit(30)
        : await ordersBase;

      let orders = ordersAll ?? [];
      if (!isNum && term) {
        const t = term.toLowerCase();
        orders = orders.filter(
          (o: any) =>
            o.customers?.name?.toLowerCase().includes(t) ||
            o.customers?.phone?.includes(t),
        );
      }

      return { customers: customers ?? [], orders };
    },
  });

  return (
    <>
      <AppHeader title="ذہین تلاش" back="/app" />
      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="نام، فون، گاہک ID یا آرڈر ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-9 h-11"
          />
        </div>

        {!term ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            گاہک یا آرڈر تلاش کرنے کے لیے ٹائپ کریں
          </Card>
        ) : isFetching && !data ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">تلاش جاری ہے…</Card>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4" /> گاہک ({data?.customers.length ?? 0})
              </h2>
              {data?.customers.length === 0 ? (
                <Card className="p-3 text-xs text-muted-foreground text-center">کوئی گاہک نہیں ملا</Card>
              ) : (
                data?.customers.map((c: any) => (
                  <Link key={c.id} to="/app/customers/$id" params={{ id: String(c.id) }}>
                    <Card className="p-3 flex items-center gap-3 shadow-card">
                      <div className="bg-primary/10 text-primary rounded-full h-9 w-9 flex items-center justify-center font-bold text-sm">
                        {c.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{c.name}</div>
                        {c.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <ScissorsLineDashed className="h-4 w-4" /> آرڈرز ({data?.orders.length ?? 0})
              </h2>
              {data?.orders.length === 0 ? (
                <Card className="p-3 text-xs text-muted-foreground text-center">کوئی آرڈر نہیں ملا</Card>
              ) : (
                data?.orders.map((o: any) => {
                  const ps = paymentStatus(Number(o.total_amount), Number(o.paid_amount));
                  return (
                    <Link key={o.id} to="/app/orders/$id" params={{ id: String(o.id) }}>
                      <Card className="p-3 shadow-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold">آرڈر #{o.id}</div>
                            <div className="text-xs text-muted-foreground">{o.customers?.name}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass(ps)}`}>
                            {statusLabel(ps)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="bg-secondary px-2 py-0.5 rounded">
                            {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                          </span>
                          <span>کل: {fmtMoney(o.total_amount)}</span>
                        </div>
                      </Card>
                    </Link>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
