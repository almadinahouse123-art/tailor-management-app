import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { z } from "zod";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/tailoring";
import { toast } from "sonner";

const search = z.object({
  customer: z.coerce.number().optional(),
  order: z.coerce.number().optional(),
});

export const Route = createFileRoute("/app/billing/new")({
  validateSearch: (s) => search.parse(s),
  component: NewInvoice,
});

function NewInvoice() {
  const nav = useNavigate();
  const { customer: preset, order: presetOrder } = Route.useSearch();
  const [customerId, setCustomerId] = useState(preset ? String(preset) : "");
  const [orderId, setOrderId] = useState(presetOrder ? String(presetOrder) : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [suits, setSuits] = useState("1");
  const [price, setPrice] = useState("0");
  const [paid, setPaid] = useState("0");
  const [notes, setNotes] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-options"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("id", { ascending: false })).data ?? [],
  });

  const total = useMemo(() => (Number(suits) || 0) * (Number(price) || 0), [suits, price]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error("گاہک منتخب کریں");
    const { data, error } = await supabase.from("invoices").insert({
      customer_id: Number(customerId),
      order_id: orderId ? Number(orderId) : null,
      invoice_date: date,
      total_suits: Number(suits) || 0,
      price_per_suit: Number(price) || 0,
      total_amount: total,
      paid_amount: Number(paid) || 0,
      notes: notes || null,
    }).select("id").single();
    if (error) return toast.error(friendlyError(error));
    toast.success(`انوائس بن گیا (#${data!.id})`);
    nav({ to: "/app/billing/$id", params: { id: String(data!.id) } });
  };

  return (
    <>
      <AppHeader title="نیا انوائس" back="/app/billing" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        <Card className="p-3 space-y-3">
          <div>
            <Label>گاہک *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>#{c.id} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">آرڈر ID (اختیاری)</Label><Input dir="ltr" className="mt-1 text-left" value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
          <div><Label className="text-xs">تاریخ</Label><Input dir="ltr" type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </Card>
        <Card className="p-3 grid grid-cols-2 gap-3">
          <div><Label className="text-xs">سوٹ تعداد</Label><Input dir="ltr" inputMode="numeric" className="mt-1 text-left" value={suits} onChange={(e) => setSuits(e.target.value)} /></div>
          <div><Label className="text-xs">فی سوٹ ریٹ</Label><Input dir="ltr" inputMode="decimal" className="mt-1 text-left" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="col-span-2 text-sm font-semibold flex justify-between border-t pt-2">
            <span>کل رقم</span><span>{fmtMoney(total)}</span>
          </div>
          <div><Label className="text-xs">ادا شدہ</Label><Input dir="ltr" inputMode="decimal" className="mt-1 text-left" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
          <div><Label className="text-xs">باقی</Label><Input dir="ltr" readOnly className="mt-1 text-left bg-muted" value={Math.max(0, total - (Number(paid) || 0))} /></div>
          <div className="col-span-2"><Label className="text-xs">نوٹ</Label><Textarea rows={2} className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary">انوائس محفوظ کریں</Button>
      </form>
    </>
  );
}
