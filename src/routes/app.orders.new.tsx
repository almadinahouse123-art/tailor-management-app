import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDER_STATUS, ORDER_STATUS_LABEL } from "@/lib/tailoring";
import { toast } from "sonner";

const search = z.object({ customer: z.coerce.number().optional() });

export const Route = createFileRoute("/app/orders/new")({
  validateSearch: (s) => search.parse(s),
  component: NewOrder,
});

function NewOrder() {
  const nav = useNavigate();
  const { customer: preset } = Route.useSearch();
  const [customerId, setCustomerId] = useState<string>(preset ? String(preset) : "");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<string>("Pending");
  const [designType, setDesignType] = useState<string>("Simple");
  const [color, setColor] = useState("");
  const [instructions, setInstructions] = useState("");
  const [total, setTotal] = useState("0");
  const [paid, setPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [workerId, setWorkerId] = useState<string>("");
  const [assignedRate, setAssignedRate] = useState<string>("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-options"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("id", { ascending: false })).data ?? [],
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-active"],
    queryFn: async () => (await supabase.from("workers").select("id,name,rate_per_suit").eq("active", true).order("name")).data ?? [],
  });

  const onWorkerChange = (v: string) => {
    setWorkerId(v);
    const w = workers.find((x) => String(x.id) === v);
    if (w && !assignedRate) setAssignedRate(String(w.rate_per_suit ?? ""));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error("گاہک منتخب کریں");
    const totalNum = Number(total) || 0;
    const paidNum = Number(paid) || 0;
    const { data, error } = await supabase.from("orders").insert({
      customer_id: Number(customerId),
      order_date: orderDate,
      delivery_date: deliveryDate || null,
      status,
      design_type: designType,
      color: color || null,
      instructions: instructions || null,
      total_amount: totalNum,
      paid_amount: paidNum,
      notes: notes || null,
      assigned_worker_id: workerId ? Number(workerId) : null,
      assigned_rate: Number(assignedRate) || 0,
    }).select("id").single();
    if (error) return toast.error(friendlyError(error));
    if (paidNum > 0) {
      await supabase.from("customer_ledger").insert({
        customer_id: Number(customerId),
        order_id: data!.id,
        entry_date: orderDate,
        description: `آرڈر #${data!.id} ادائیگی`,
        total_amount: totalNum,
        paid_amount: paidNum,
      });
    }
    toast.success(`آرڈر محفوظ (ID: ${data!.id})`);
    nav({ to: "/app/orders/$id", params: { id: String(data!.id) } });
  };

  return (
    <>
      <AppHeader title="نیا آرڈر" back="/app/orders" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        <Card className="p-3 space-y-3">
          <div>
            <Label>گاہک *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="گاہک منتخب کریں" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>#{c.id} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">آرڈر کی تاریخ</Label><Input dir="ltr" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">ڈیلیوری تاریخ</Label><Input dir="ltr" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <Label className="text-xs">سٹیٹس</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUS.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-3 space-y-3">
          <div>
            <Label className="text-xs">ڈیزائن کی قسم</Label>
            <Select value={designType} onValueChange={setDesignType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Simple">سادہ</SelectItem>
                <SelectItem value="Fancy">فینسی</SelectItem>
                <SelectItem value="Embroidery">کڑھائی</SelectItem>
                <SelectItem value="Printed">پرنٹڈ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">رنگ</Label><Input className="mt-1" value={color} onChange={(e) => setColor(e.target.value)} /></div>
          <div><Label className="text-xs">ہدایات</Label><Textarea rows={2} className="mt-1" value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
        </Card>

        <Card className="p-3 space-y-3">
          <div className="text-sm font-semibold">کاریگر کا تفویض</div>
          <div>
            <Label className="text-xs">کاریگر منتخب کریں</Label>
            <Select value={workerId} onValueChange={onWorkerChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="غیر تفویض" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">فی سوٹ ریٹ (کاریگر)</Label>
            <Input dir="ltr" className="mt-1 text-left" inputMode="decimal" value={assignedRate} onChange={(e) => setAssignedRate(e.target.value)} />
          </div>
        </Card>

        <Card className="p-3 grid grid-cols-2 gap-3">
          <div><Label className="text-xs">کل رقم</Label><Input dir="ltr" className="mt-1 text-left" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
          <div><Label className="text-xs">ادا شدہ</Label><Input dir="ltr" className="mt-1 text-left" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
          <div className="col-span-2"><Label className="text-xs">نوٹ</Label><Textarea rows={2} className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </Card>

        <Button type="submit" className="w-full bg-gradient-primary">آرڈر محفوظ کریں</Button>
      </form>
    </>
  );
}
