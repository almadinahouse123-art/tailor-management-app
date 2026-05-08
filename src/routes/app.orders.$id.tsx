import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, paymentStatus, statusBadgeClass, statusLabel, ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/tailoring";
import { toast } from "sonner";

export const Route = createFileRoute("/app/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const oid = Number(id);
  const qc = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ["order", oid],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, customers(id,name,phone,address), workers:assigned_worker_id(id,name,rate_per_suit)").eq("id", oid).single();
      return data;
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-active"],
    queryFn: async () => (await supabase.from("workers").select("id,name,rate_per_suit").eq("active", true).order("name")).data ?? [],
  });

  const [pay, setPay] = useState("");
  const [status, setStatus] = useState<string>("");

  if (!order) {
    return <><AppHeader title="آرڈر" back="/app/orders" /><div className="p-6 text-center text-sm text-muted-foreground">لوڈ ہو رہا ہے...</div></>;
  }
  const ps = paymentStatus(Number(order.total_amount), Number(order.paid_amount));
  const due = Math.max(0, Number(order.total_amount) - Number(order.paid_amount));

  const addPayment = async () => {
    const amt = Number(pay);
    if (!amt || amt <= 0) return toast.error("صحیح رقم درج کریں");
    const newPaid = Number(order.paid_amount) + amt;
    const { error } = await supabase.from("orders").update({ paid_amount: newPaid }).eq("id", oid);
    if (error) return toast.error(error.message);
    await supabase.from("customer_ledger").insert({
      customer_id: order.customer_id,
      order_id: oid,
      entry_date: new Date().toISOString().slice(0, 10),
      description: `آرڈر #${oid} ادائیگی`,
      total_amount: Number(order.total_amount),
      paid_amount: amt,
    });
    setPay("");
    toast.success("ادائیگی محفوظ");
    qc.invalidateQueries({ queryKey: ["order", oid] });
  };

  const updateStatus = async (s: string) => {
    setStatus(s);
    const { error } = await supabase.from("orders").update({ status: s }).eq("id", oid);
    if (error) return toast.error(error.message);
    toast.success("سٹیٹس اپڈیٹ");
    qc.invalidateQueries({ queryKey: ["order", oid] });
  };

  const assignWorker = async (v: string) => {
    const wid = v ? Number(v) : null;
    const w = workers.find((x) => String(x.id) === v);
    const rate = w ? Number(w.rate_per_suit ?? 0) : Number(order.assigned_rate ?? 0);
    const { error } = await supabase.from("orders").update({ assigned_worker_id: wid, assigned_rate: rate }).eq("id", oid);
    if (error) return toast.error(error.message);
    toast.success("کاریگر تفویض ہو گیا");
    qc.invalidateQueries({ queryKey: ["order", oid] });
  };

  return (
    <>
      <AppHeader title={`آرڈر #${oid}`} back="/app/orders" />
      <div className="px-4 py-4 space-y-3">
        <Card className="p-4 bg-gradient-primary text-primary-foreground border-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs opacity-80">آرڈر نمبر</div>
              <div className="text-2xl font-bold">#{order.id}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full bg-white/15`}>{statusLabel(ps)}</span>
          </div>
          <Link to="/app/customers/$id" params={{ id: String(order.customer_id) }} className="block mt-2 underline text-sm">
            {order.customers?.name} (#{order.customer_id})
          </Link>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className="bg-white/10 rounded p-2"><div className="opacity-80">کل</div><div className="font-bold text-sm">{fmtMoney(order.total_amount)}</div></div>
            <div className="bg-white/10 rounded p-2"><div className="opacity-80">ادا</div><div className="font-bold text-sm">{fmtMoney(order.paid_amount)}</div></div>
            <div className="bg-white/10 rounded p-2"><div className="opacity-80">باقی</div><div className="font-bold text-sm">{fmtMoney(due)}</div></div>
          </div>
        </Card>

        <Card className="p-3 space-y-2">
          <Label className="text-xs">سٹیٹس تبدیل کریں</Label>
          <Select value={status || order.status} onValueChange={updateStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ORDER_STATUS.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s as OrderStatus]}</SelectItem>)}</SelectContent>
          </Select>
        </Card>

        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">تفصیلات</h3>
          <ul className="text-xs space-y-1">
            <li><span className="text-muted-foreground">تاریخ:</span> {order.order_date}</li>
            <li><span className="text-muted-foreground">ڈیلیوری:</span> {order.delivery_date ?? "—"}</li>
            {order.design_type && <li><span className="text-muted-foreground">ڈیزائن:</span> {order.design_type}</li>}
            {order.color && <li><span className="text-muted-foreground">رنگ:</span> {order.color}</li>}
            {order.instructions && <li><span className="text-muted-foreground">ہدایات:</span> {order.instructions}</li>}
            {order.notes && <li><span className="text-muted-foreground">نوٹ:</span> {order.notes}</li>}
          </ul>
        </Card>

        {due > 0 && (
          <Card className="p-3 space-y-2">
            <Label className="text-xs">نئی ادائیگی</Label>
            <div className="flex gap-2">
              <Input dir="ltr" inputMode="decimal" value={pay} onChange={(e) => setPay(e.target.value)} className="text-left" placeholder="رقم" />
              <Button onClick={addPayment} className="bg-gradient-primary">شامل کریں</Button>
            </div>
          </Card>
        )}

        <Link to="/app/billing/new" search={{ customer: order.customer_id, order: oid }}>
          <Button variant="outline" className="w-full">انوائس بنائیں</Button>
        </Link>
      </div>
    </>
  );
}
