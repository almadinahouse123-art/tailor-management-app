import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fmtMoney } from "@/lib/tailoring";
import { toast } from "sonner";

export const Route = createFileRoute("/app/billing/$id/edit")({
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const iid = Number(id);
  const nav = useNavigate();
  const [f, setF] = useState({ invoice_date: "", total_suits: "1", price_per_suit: "0", paid_amount: "0", notes: "", order_id: "" });

  const { data } = useQuery({
    queryKey: ["invoice-edit", iid],
    queryFn: async () => (await supabase.from("invoices").select("*").eq("id", iid).single()).data,
  });

  useEffect(() => {
    if (!data) return;
    setF({
      invoice_date: data.invoice_date ?? "",
      total_suits: String(data.total_suits ?? 0),
      price_per_suit: String(data.price_per_suit ?? 0),
      paid_amount: String(data.paid_amount ?? 0),
      notes: data.notes ?? "",
      order_id: data.order_id ? String(data.order_id) : "",
    });
  }, [data]);

  const total = useMemo(() => (Number(f.total_suits) || 0) * (Number(f.price_per_suit) || 0), [f.total_suits, f.price_per_suit]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("invoices").update({
      invoice_date: f.invoice_date,
      total_suits: Number(f.total_suits) || 0,
      price_per_suit: Number(f.price_per_suit) || 0,
      total_amount: total,
      paid_amount: Number(f.paid_amount) || 0,
      notes: f.notes || null,
      order_id: f.order_id ? Number(f.order_id) : null,
    }).eq("id", iid);
    if (error) return toast.error(friendlyError(error));
    toast.success("انوائس اپڈیٹ ہو گیا");
    nav({ to: "/app/billing/$id", params: { id } });
  };

  return (
    <>
      <AppHeader title={`انوائس #${iid} ترمیم`} back="/app/billing/$id" />
      <form onSubmit={save} className="px-4 py-4 space-y-3">
        <Card className="p-3 space-y-3">
          <div><Label className="text-xs">تاریخ</Label><Input dir="ltr" type="date" className="mt-1" value={f.invoice_date} onChange={(e) => setF({ ...f, invoice_date: e.target.value })} /></div>
          <div><Label className="text-xs">آرڈر ID</Label><Input dir="ltr" className="mt-1 text-left" value={f.order_id} onChange={(e) => setF({ ...f, order_id: e.target.value })} /></div>
        </Card>
        <Card className="p-3 grid grid-cols-2 gap-3">
          <div><Label className="text-xs">سوٹ تعداد</Label><Input dir="ltr" inputMode="numeric" className="mt-1 text-left" value={f.total_suits} onChange={(e) => setF({ ...f, total_suits: e.target.value })} /></div>
          <div><Label className="text-xs">فی سوٹ ریٹ</Label><Input dir="ltr" inputMode="decimal" className="mt-1 text-left" value={f.price_per_suit} onChange={(e) => setF({ ...f, price_per_suit: e.target.value })} /></div>
          <div className="col-span-2 text-sm font-semibold flex justify-between border-t pt-2"><span>کل رقم</span><span>{fmtMoney(total)}</span></div>
          <div><Label className="text-xs">ادا شدہ</Label><Input dir="ltr" inputMode="decimal" className="mt-1 text-left" value={f.paid_amount} onChange={(e) => setF({ ...f, paid_amount: e.target.value })} /></div>
          <div><Label className="text-xs">باقی</Label><Input dir="ltr" readOnly className="mt-1 text-left bg-muted" value={Math.max(0, total - (Number(f.paid_amount) || 0))} /></div>
          <div className="col-span-2"><Label className="text-xs">نوٹ</Label><Textarea rows={2} className="mt-1" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary">تبدیلیاں محفوظ کریں</Button>
      </form>
    </>
  );
}
