import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Plus, Ruler, ScissorsLineDashed, Receipt, Printer, Pencil } from "lucide-react";
import { URDU_LABELS, fmtMoney, paymentStatus, statusBadgeClass, statusLabel, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/tailoring";
import { DeleteButton } from "@/components/DeleteButton";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const cid = Number(id);
  const nav = useNavigate();

  const { data } = useQuery({
    queryKey: ["customer", cid],
    queryFn: async () => {
      const [c, m, o, l] = await Promise.all([
        supabase.from("customers").select("*").eq("id", cid).single(),
        supabase.from("measurements").select("*").eq("customer_id", cid).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("orders").select("*").eq("customer_id", cid).is("deleted_at", null).order("id", { ascending: false }),
        supabase.from("customer_ledger").select("*").eq("customer_id", cid).is("deleted_at", null).order("entry_date", { ascending: false }),
      ]);
      return {
        customer: c.data,
        measurements: m.data ?? [],
        orders: o.data ?? [],
        ledger: l.data ?? [],
      };
    },
  });

  if (!data?.customer) {
    return (
      <>
        <AppHeader title="گاہک" back="/app/customers" />
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">لوڈ ہو رہا ہے...</div>
      </>
    );
  }

  const c = data.customer;
  const latest = data.measurements[0];
  const totalDue = data.orders.reduce(
    (s, o) => s + Math.max(0, Number(o.total_amount) - Number(o.paid_amount)),
    0,
  );

  return (
    <>
      <AppHeader title={`گاہک #${c.id}`} back="/app/customers" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 bg-gradient-primary text-primary-foreground border-0">
          <div className="text-xs opacity-80">گاہک نمبر</div>
          <div className="text-3xl font-bold mb-1">#{c.id}</div>
          <div className="text-base font-semibold">{c.name}</div>
          {c.phone && (
            <div className="text-xs opacity-90 flex items-center gap-1 mt-1" dir="ltr">
              <Phone className="h-3 w-3" /> {c.phone}
            </div>
          )}
          {c.address && <div className="text-xs opacity-90 mt-1">{c.address}</div>}
          {totalDue > 0 && (
            <div className="mt-3 bg-white/15 rounded-lg p-2 text-xs">
              باقی واجب: <span className="font-bold">{fmtMoney(totalDue)}</span>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Link to="/app/measurements/new" search={{ customer: cid }}>
            <Button variant="outline" className="w-full text-xs"><Ruler className="h-3.5 w-3.5 ml-1" /> پیمائش</Button>
          </Link>
          <Link to="/app/orders/new" search={{ customer: cid }}>
            <Button variant="outline" className="w-full text-xs"><ScissorsLineDashed className="h-3.5 w-3.5 ml-1" /> آرڈر</Button>
          </Link>
          <Link to="/app/billing/new" search={{ customer: cid }}>
            <Button variant="outline" className="w-full text-xs"><Receipt className="h-3.5 w-3.5 ml-1" /> انوائس</Button>
          </Link>
        </div>

        {/* Latest measurement */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">تازہ پیمائش</h2>
            <Link to="/app/measurements/new" search={{ customer: cid }} className="text-xs text-primary flex items-center gap-1">
              <Plus className="h-3 w-3" /> نئی
            </Link>
          </div>
          {latest ? (
            <Card className="p-3 shadow-card">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {(["lambai","daman","chorai","tera","asteen","cuff_paimaish","collar_type","jeb","asteen_type","shalwar_size","panja"] as const).map((k) => (
                  latest[k] ? (
                    <div key={k} className="flex justify-between border-b border-dashed border-border pb-0.5">
                      <span className="text-muted-foreground text-xs">{URDU_LABELS[k]}</span>
                      <span className="font-medium">{latest[k]}</span>
                    </div>
                  ) : null
                ))}
              </div>
              {latest.notes && <p className="text-xs text-muted-foreground mt-2">{latest.notes}</p>}
              <div className="flex gap-2 mt-3">
                <Link to="/print/measurement/$id" params={{ id: String(latest.id) }} target="_blank">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Printer className="h-3.5 w-3.5 ml-1" /> پرنٹ کٹنگ شیٹ
                  </Button>
                </Link>
                {data.measurements.length > 1 && (
                  <span className="text-xs text-muted-foreground self-center">+{data.measurements.length - 1} مزید</span>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-4 text-center text-sm text-muted-foreground">کوئی پیمائش نہیں</Card>
          )}
        </section>

        {/* Orders */}
        <section>
          <h2 className="text-sm font-semibold mb-2">آرڈرز ({data.orders.length})</h2>
          {data.orders.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">کوئی آرڈر نہیں</Card>
          ) : (
            <div className="space-y-2">
              {data.orders.map((o) => {
                const ps = paymentStatus(Number(o.total_amount), Number(o.paid_amount));
                return (
                  <Link key={o.id} to="/app/orders/$id" params={{ id: String(o.id) }}>
                    <Card className="p-3 shadow-card">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">آرڈر #{o.id}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass(ps)}`}>{statusLabel(ps)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status} • {o.order_date}</div>
                      <div className="text-xs mt-1">کل: {fmtMoney(o.total_amount)} • ادا: {fmtMoney(o.paid_amount)}</div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Ledger */}
        {data.ledger.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-2">کھاتہ</h2>
            <Card className="p-2 shadow-card">
              <ul className="text-xs divide-y">
                {data.ledger.slice(0, 8).map((e) => (
                  <li key={e.id} className="py-2 flex justify-between gap-2">
                    <span className="text-muted-foreground">{e.entry_date}</span>
                    <span className="flex-1 truncate">{e.description}</span>
                    <span className="text-success">+{fmtMoney(e.paid_amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>
    </>
  );
}
