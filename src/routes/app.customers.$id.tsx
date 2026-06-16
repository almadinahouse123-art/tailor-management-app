import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Plus, Ruler, ScissorsLineDashed, Receipt, Printer, Pencil, AlertTriangle, MapPin } from "lucide-react";
import { URDU_LABELS, fmtMoney, paymentStatus, statusBadgeClass, statusLabel, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/tailoring";
import { DeleteButton } from "@/components/DeleteButton";

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
  const totalDue = data.orders.reduce(
    (s, o) => s + Math.max(0, Number(o.total_amount) - Number(o.paid_amount)),
    0,
  );
  const latest = data.measurements[0];

  const initials = (c.name ?? "?").trim().slice(0, 1).toUpperCase();

  return (
    <>
      <AppHeader title={`گاہک #${c.id}`} back="/app/customers" />
      <div className="px-4 py-5 space-y-5 animate-rise">
        {/* Premium profile header */}
        <Card className="relative overflow-hidden p-5 bg-gradient-noir text-primary-foreground border-0 rounded-3xl shadow-elevated">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gold text-gold-foreground inline-flex items-center justify-center text-xl font-bold font-display shadow-elevated shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.2em] uppercase opacity-60 font-display">
                Customer · #{c.id}
              </div>
              <div className="text-lg font-bold truncate mt-0.5">{c.name}</div>
              {c.phone && (
                <a href={`tel:${c.phone}`} className="text-xs opacity-80 flex items-center gap-1.5 mt-1" dir="ltr">
                  <Phone className="h-3 w-3" /> {c.phone}
                </a>
              )}
              {c.address && (
                <div className="text-xs opacity-70 mt-0.5 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> <span className="truncate">{c.address}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Link to="/app/customers/$id/edit" params={{ id }}>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-white/15"><Pencil className="h-4 w-4" /></Button>
              </Link>
              <DeleteButton table="customers" id={cid} onDeleted={() => nav({ to: "/app/customers" })} />
            </div>
          </div>
        </Card>

        {/* Previous balance warning */}
        {totalDue > 0 && (
          <Card className="p-4 rounded-2xl border-destructive/30 bg-destructive/5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/15 text-destructive inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">پچھلا بقایا</div>
              <div className="text-xl font-bold text-destructive font-display" dir="ltr">{fmtMoney(totalDue)}</div>
            </div>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link to="/app/measurements/new" search={{ customer: cid }}>
            <Button variant="outline" className="w-full h-12 text-xs rounded-2xl border-border/60 bg-card hover:bg-muted"><Ruler className="h-4 w-4 ml-1" /> پیمائش</Button>
          </Link>
          <Link to="/app/orders/new" search={{ customer: cid }}>
            <Button variant="outline" className="w-full h-12 text-xs rounded-2xl border-border/60 bg-card hover:bg-muted"><ScissorsLineDashed className="h-4 w-4 ml-1" /> آرڈر</Button>
          </Link>
          <Link to="/app/billing/new" search={{ customer: cid }}>
            <Button variant="outline" className="w-full h-12 text-xs rounded-2xl border-border/60 bg-card hover:bg-muted"><Receipt className="h-4 w-4 ml-1" /> انوائس</Button>
          </Link>
        </div>


        {/* Tabs */}
        <Tabs defaultValue="measurements">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="measurements">پیمائش ({data.measurements.length})</TabsTrigger>
            <TabsTrigger value="orders">آرڈرز ({data.orders.length})</TabsTrigger>
            <TabsTrigger value="payments">ادائیگی</TabsTrigger>
          </TabsList>

          {/* MEASUREMENTS TAB */}
          <TabsContent value="measurements" className="space-y-3 mt-3">
            {latest && (
              <Card className="p-3 shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-primary">تازہ پیمائش</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(latest.created_at).toLocaleDateString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {(["lambai","daman","chorai","tera","asteen","cuff_paimaish","collar_size","collar_type","jeb","asteen_type","shalwar_size","panja"] as const).map((k) => (
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
                  <Link to="/app/measurements/$id/edit" params={{ id: String(latest.id) }} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs"><Pencil className="h-3.5 w-3.5 ml-1" /> ترمیم</Button>
                  </Link>
                  <Link to="/print/measurement/$id" params={{ id: String(latest.id) }} target="_blank" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs"><Printer className="h-3.5 w-3.5 ml-1" /> پرنٹ</Button>
                  </Link>
                </div>
              </Card>
            )}

            {data.measurements.length > 1 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">پچھلی پیمائشیں</div>
                <div className="space-y-2">
                  {data.measurements.slice(1).map((m: any) => (
                    <Link key={m.id} to="/app/measurements/$id/edit" params={{ id: String(m.id) }}>
                      <Card className="p-2.5 shadow-card flex items-center justify-between">
                        <div className="text-xs">
                          <div className="font-semibold">{new Date(m.created_at).toLocaleDateString()}</div>
                          <div className="text-muted-foreground flex gap-2">
                            {m.lambai && <span>ل: {m.lambai}</span>}
                            {m.daman && <span>د: {m.daman}</span>}
                            {m.chorai && <span>چ: {m.chorai}</span>}
                          </div>
                        </div>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.measurements.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                کوئی پیمائش نہیں
                <Link to="/app/measurements/new" search={{ customer: cid }} className="block mt-3">
                  <Button size="sm" className="bg-gradient-primary"><Plus className="h-3.5 w-3.5 ml-1" /> نئی پیمائش</Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-2 mt-3">
            {data.orders.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">کوئی آرڈر نہیں</Card>
            ) : (
              data.orders.map((o) => {
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
              })
            )}
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-3 mt-3">
            <Card className="p-3 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xs text-muted-foreground">کل آرڈر رقم</div>
                <div className="text-lg font-bold">{fmtMoney(data.orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0))}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">باقی واجب</div>
                <div className={`text-lg font-bold ${totalDue > 0 ? "text-destructive" : "text-success"}`}>{fmtMoney(totalDue)}</div>
              </div>
            </Card>

            {data.ledger.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">کوئی ادائیگی نہیں</Card>
            ) : (
              <Card className="p-2 shadow-card">
                <ul className="text-xs divide-y">
                  {data.ledger.map((e) => (
                    <li key={e.id} className="py-2 flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">{e.entry_date}</span>
                      <span className="flex-1 truncate">{e.description}</span>
                      <span className="text-success font-semibold">+{fmtMoney(e.paid_amount)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
