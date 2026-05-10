import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/production/$id/edit")({
  component: EditProduction,
});

function EditProduction() {
  const { id } = Route.useParams();
  const pid = Number(id);
  const nav = useNavigate();
  const [f, setF] = useState({ production_date: "", worker_id: "", order_id: "", suits_count: "", rate_per_suit: "", notes: "" });

  const { data } = useQuery({
    queryKey: ["prod-edit", pid],
    queryFn: async () => (await supabase.from("daily_production").select("*").eq("id", pid).single()).data,
  });
  const { data: workers = [] } = useQuery({
    queryKey: ["workers-active"],
    queryFn: async () => (await supabase.from("workers").select("id,name").is("deleted_at", null).order("name")).data ?? [],
  });

  useEffect(() => {
    if (!data) return;
    setF({
      production_date: data.production_date ?? "",
      worker_id: data.worker_id ? String(data.worker_id) : "",
      order_id: data.order_id ? String(data.order_id) : "",
      suits_count: String(data.suits_count ?? ""),
      rate_per_suit: String(data.rate_per_suit ?? ""),
      notes: data.notes ?? "",
    });
  }, [data]);

  const total = Number(f.suits_count || 0) * Number(f.rate_per_suit || 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("daily_production").update({
      production_date: f.production_date,
      worker_id: f.worker_id ? Number(f.worker_id) : null,
      order_id: f.order_id ? Number(f.order_id) : null,
      suits_count: Number(f.suits_count) || 0,
      rate_per_suit: Number(f.rate_per_suit) || 0,
      total_amount: total,
      notes: f.notes.trim() || null,
    }).eq("id", pid);
    if (error) return toast.error(error.message);
    toast.success("اپڈیٹ ہو گیا");
    nav({ to: "/app/production" });
  };

  return (
    <>
      <AppHeader title="پیداوار کی ترمیم" back="/app/production" />
      <form onSubmit={save} className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div><Label>تاریخ</Label><Input dir="ltr" type="date" value={f.production_date} onChange={(e) => setF({ ...f, production_date: e.target.value })} /></div>
          <div>
            <Label>کاریگر</Label>
            <Select value={f.worker_id} onValueChange={(v) => setF({ ...f, worker_id: v })}>
              <SelectTrigger><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>آرڈر ID</Label><Input dir="ltr" type="number" value={f.order_id} onChange={(e) => setF({ ...f, order_id: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>سوٹ</Label><Input dir="ltr" type="number" value={f.suits_count} onChange={(e) => setF({ ...f, suits_count: e.target.value })} /></div>
            <div><Label>ریٹ</Label><Input dir="ltr" type="number" value={f.rate_per_suit} onChange={(e) => setF({ ...f, rate_per_suit: e.target.value })} /></div>
          </div>
          <div className="bg-muted/40 rounded p-2 text-sm">کل: <b>{fmtMoney(total)}</b></div>
          <div><Label>نوٹ</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary">تبدیلیاں محفوظ کریں</Button>
      </form>
    </>
  );
}
