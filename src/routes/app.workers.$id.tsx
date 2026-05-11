import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fmtMoney, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/tailoring";
import { toast } from "sonner";
import { Phone, MapPin, Wallet, Plus, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/app/workers/$id")({
  component: WorkerDetail,
});

function WorkerDetail() {
  const { id } = Route.useParams();
  const wid = Number(id);
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: worker } = useQuery({
    queryKey: ["worker", wid],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*").eq("id", wid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["worker-ledger", wid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_ledger")
        .select("*")
        .eq("worker_id", wid)
        .is("deleted_at", null)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: production = [] } = useQuery({
    queryKey: ["worker-production", wid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_production")
        .select("*")
        .eq("worker_id", wid)
        .is("deleted_at", null)
        .order("production_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assignedOrders = [] } = useQuery({
    queryKey: ["worker-orders", wid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, order_date, delivery_date, total_amount, customers(name)")
        .eq("assigned_worker_id", wid)
        .order("order_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = ledger.reduce(
    (a, e) => ({
      earned: a.earned + Number(e.earned_amount ?? 0),
      paid: a.paid + Number(e.paid_amount ?? 0),
    }),
    { earned: 0, paid: 0 },
  );
  const balance = totals.earned - totals.paid;

  const today = new Date().toISOString().slice(0, 10);
  const todayProd = production.filter((p) => p.production_date === today);
  const todaySimple = todayProd.reduce((s, p) => s + Number(p.simple_suits ?? 0), 0);
  const todayChakpate = todayProd.reduce((s, p) => s + Number(p.chakpate_suits ?? 0), 0);
  const todayEarned = todayProd.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
  const totalSimple = production.reduce((s, p) => s + Number(p.simple_suits ?? 0), 0);
  const totalChakpate = production.reduce((s, p) => s + Number(p.chakpate_suits ?? 0), 0);
  const latest = production[0];

  const [entry, setEntry] = useState({ paid_amount: "", description: "" });
  const [saving, setSaving] = useState(false);

  const addEntry = async () => {
    const paid = Number(entry.paid_amount || 0);
    if (!paid) return toast.error("ادائیگی کی رقم درج کریں");
    setSaving(true);
    const { error } = await supabase.from("worker_ledger").insert({
      worker_id: wid,
      earned_amount: 0,
      paid_amount: paid,
      description: entry.description.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("ادائیگی محفوظ ہو گئی");
    setEntry({ paid_amount: "", description: "" });
    qc.invalidateQueries({ queryKey: ["worker-ledger", wid] });
  };

  const toggleActive = async () => {
    if (!worker) return;
    const { error } = await supabase.from("workers").update({ active: !worker.active }).eq("id", wid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["worker", wid] });
  };

  if (!worker) return <AppHeader title="کاریگر" back="/app/workers" />;

  return (
    <>
      <AppHeader title={`کاریگر #${worker.id}`} back="/app/workers" />
      <div className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-2">
          <div className="text-lg font-bold">{worker.name}</div>
          {worker.phone && (
            <div className="text-sm text-muted-foreground flex items-center gap-1" dir="ltr">
              <Phone className="h-3 w-3" /> {worker.phone}
            </div>
          )}
          {worker.address && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {worker.address}
            </div>
          )}
          <div className="text-sm">فی سوٹ ریٹ: <b>{fmtMoney(worker.rate_per_suit)}</b></div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={toggleActive}>
              {worker.active ? "غیر فعال کریں" : "فعال کریں"}
            </Button>
            <Link to="/app/workers/$id/edit" params={{ id }}>
              <Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5 ml-1" /> ترمیم</Button>
            </Link>
            <DeleteButton table="workers" id={wid} onDeleted={() => nav({ to: "/app/workers" })} />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-primary text-primary-foreground">
          <div className="flex items-center gap-2 text-xs opacity-90">
            <Wallet className="h-4 w-4" /> کھاتہ
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-80">کمائی</div>
              <div className="font-bold text-sm">{fmtMoney(totals.earned)}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-80">ادا شدہ</div>
              <div className="font-bold text-sm">{fmtMoney(totals.paid)}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-80">باقی</div>
              <div className="font-bold text-sm">{fmtMoney(balance)}</div>
            </div>
          </div>
        </Card>

        {/* Production summary */}
        <Card className="p-4 space-y-2">
          <div className="text-sm font-semibold">پیداوار کا خلاصہ</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground">آج سادہ</div>
              <div className="font-bold text-sm">{todaySimple}</div>
            </div>
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground">آج چک پٹے</div>
              <div className="font-bold text-sm">{todayChakpate}</div>
            </div>
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground">کل سادہ</div>
              <div className="font-bold text-sm">{totalSimple}</div>
            </div>
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground">کل چک پٹے</div>
              <div className="font-bold text-sm">{totalChakpate}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            آج کی کمائی: <b className="text-success">{fmtMoney(todayEarned)}</b>
            {latest && <> · موجودہ ریٹ: سادہ {fmtMoney(latest.simple_rate)} · چک پٹے {fmtMoney(latest.chakpate_rate)}</>}
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-sm font-semibold">ادائیگی درج کریں</div>
          <p className="text-[11px] text-muted-foreground">کمائی پیداوار سے خودکار محفوظ ہوتی ہے۔ صرف ادائیگی یہاں درج کریں۔</p>
          <div>
            <Label className="text-xs">ادا شدہ رقم</Label>
            <Input
              dir="ltr"
              type="number"
              value={entry.paid_amount}
              onChange={(e) => setEntry({ ...entry, paid_amount: e.target.value })}
            />
          </div>
          <Input
            placeholder="نوٹ"
            value={entry.description}
            onChange={(e) => setEntry({ ...entry, description: e.target.value })}
          />
          <Button onClick={addEntry} disabled={saving} className="w-full bg-gradient-primary">
            <Plus className="h-4 w-4" /> ادائیگی محفوظ کریں
          </Button>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <ClipboardList className="h-3 w-3" /> تفویض شدہ آرڈرز
          </h2>
          {assignedOrders.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">کوئی آرڈر تفویض نہیں</Card>
          ) : (
            assignedOrders.map((o: any) => (
              <Link key={o.id} to="/app/orders/$id" params={{ id: String(o.id) }}>
                <Card className="p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">آرڈر #{o.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.customers?.name} · {o.order_date}
                        {o.delivery_date && <> · ڈیلیوری {o.delivery_date}</>}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-muted">
                      {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                    </span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">کھاتہ تاریخ</h2>
          {ledger.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">کوئی اندراج نہیں</Card>
          ) : (
            ledger.map((e) => (
              <Card key={e.id} className="p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{e.entry_date}</span>
                  <span className="text-xs">
                    {Number(e.earned_amount) > 0 && (
                      <span className="text-success">+{fmtMoney(e.earned_amount)}</span>
                    )}
                    {Number(e.paid_amount) > 0 && (
                      <span className="text-destructive mr-2">-{fmtMoney(e.paid_amount)}</span>
                    )}
                  </span>
                </div>
                {e.description && <div className="text-xs mt-1">{e.description}</div>}
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
