import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDER_STATUS, ORDER_STATUS_LABEL } from "@/lib/tailoring";
import { toast } from "sonner";

export const Route = createFileRoute("/app/orders/$id/edit")({
  component: EditOrder,
});

function EditOrder() {
  const { id } = Route.useParams();
  const oid = Number(id);
  const nav = useNavigate();
  const [f, setF] = useState({
    order_date: "", delivery_date: "", status: "Pending", design_type: "Simple",
    color: "", instructions: "", total_amount: "0", paid_amount: "0", notes: "",
    assigned_worker_id: "", assigned_rate: "0",
  });

  const { data: order } = useQuery({
    queryKey: ["order-edit", oid],
    queryFn: async () => (await supabase.from("orders").select("*").eq("id", oid).single()).data,
  });
  const { data: workers = [] } = useQuery({
    queryKey: ["workers-active"],
    queryFn: async () => (await supabase.from("workers").select("id,name").eq("active", true).is("deleted_at", null).order("name")).data ?? [],
  });

  useEffect(() => {
    if (!order) return;
    setF({
      order_date: order.order_date ?? "",
      delivery_date: order.delivery_date ?? "",
      status: order.status ?? "Pending",
      design_type: order.design_type ?? "Simple",
      color: order.color ?? "",
      instructions: order.instructions ?? "",
      total_amount: String(order.total_amount ?? 0),
      paid_amount: String(order.paid_amount ?? 0),
      notes: order.notes ?? "",
      assigned_worker_id: order.assigned_worker_id ? String(order.assigned_worker_id) : "",
      assigned_rate: String(order.assigned_rate ?? 0),
    });
  }, [order]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("orders").update({
      order_date: f.order_date,
      delivery_date: f.delivery_date || null,
      status: f.status,
      design_type: f.design_type,
      color: f.color || null,
      instructions: f.instructions || null,
      total_amount: Number(f.total_amount) || 0,
      paid_amount: Number(f.paid_amount) || 0,
      notes: f.notes || null,
      assigned_worker_id: f.assigned_worker_id ? Number(f.assigned_worker_id) : null,
      assigned_rate: Number(f.assigned_rate) || 0,
    }).eq("id", oid);
    if (error) return toast.error(error.message);
    toast.success("آرڈر اپڈیٹ ہو گیا");
    nav({ to: "/app/orders/$id", params: { id } });
  };

  return (
    <>
      <AppHeader title={`آرڈر #${oid} ترمیم`} back="/app/orders/$id" />
      <form onSubmit={save} className="px-4 py-4 space-y-3">
        <Card className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">آرڈر تاریخ</Label><Input dir="ltr" type="date" value={f.order_date} onChange={(e) => setF({ ...f, order_date: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">ڈیلیوری</Label><Input dir="ltr" type="date" value={f.delivery_date} onChange={(e) => setF({ ...f, delivery_date: e.target.value })} className="mt-1" /></div>
          </div>
          <div>
            <Label className="text-xs">سٹیٹس</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{ORDER_STATUS.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Card>
        <Card className="p-3 space-y-3">
          <div>
            <Label className="text-xs">ڈیزائن</Label>
            <Select value={f.design_type} onValueChange={(v) => setF({ ...f, design_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Simple">سادہ</SelectItem>
                <SelectItem value="Fancy">فینسی</SelectItem>
                <SelectItem value="Embroidery">کڑھائی</SelectItem>
                <SelectItem value="Printed">پرنٹڈ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">رنگ</Label><Input className="mt-1" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
          <div><Label className="text-xs">ہدایات</Label><Textarea rows={2} className="mt-1" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></div>
        </Card>
        <Card className="p-3 space-y-3">
          <div>
            <Label className="text-xs">کاریگر</Label>
            <Select value={f.assigned_worker_id} onValueChange={(v) => setF({ ...f, assigned_worker_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="غیر تفویض" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">فی سوٹ ریٹ</Label><Input dir="ltr" className="mt-1 text-left" inputMode="decimal" value={f.assigned_rate} onChange={(e) => setF({ ...f, assigned_rate: e.target.value })} /></div>
        </Card>
        <Card className="p-3 grid grid-cols-2 gap-3">
          <div><Label className="text-xs">کل رقم</Label><Input dir="ltr" className="mt-1 text-left" inputMode="decimal" value={f.total_amount} onChange={(e) => setF({ ...f, total_amount: e.target.value })} /></div>
          <div><Label className="text-xs">ادا شدہ</Label><Input dir="ltr" className="mt-1 text-left" inputMode="decimal" value={f.paid_amount} onChange={(e) => setF({ ...f, paid_amount: e.target.value })} /></div>
          <div className="col-span-2"><Label className="text-xs">نوٹ</Label><Textarea rows={2} className="mt-1" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary">تبدیلیاں محفوظ کریں</Button>
      </form>
    </>
  );
}
