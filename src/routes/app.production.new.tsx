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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/production/new")({
  component: NewProduction,
});

function NewProduction() {
  const nav = useNavigate();
  const { data: workers = [] } = useQuery({
    queryKey: ["workers-active"],
    queryFn: async () => {
      const { data } = await supabase.from("workers").select("id, name, rate_per_suit").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const [f, setF] = useState({
    production_date: new Date().toISOString().slice(0, 10),
    worker_id: "",
    order_id: "",
    suits_count: "",
    rate_per_suit: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const w = workers.find((x) => String(x.id) === f.worker_id);
    if (w && !f.rate_per_suit) setF((p) => ({ ...p, rate_per_suit: String(w.rate_per_suit ?? "") }));
  }, [f.worker_id, workers]);

  const total = Number(f.suits_count || 0) * Number(f.rate_per_suit || 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.worker_id) return toast.error("کاریگر منتخب کریں");
    if (!f.suits_count) return toast.error("سوٹ کی تعداد درج کریں");
    setSaving(true);
    const wid = Number(f.worker_id);
    const suits = Number(f.suits_count);
    const rate = Number(f.rate_per_suit || 0);
    const amount = suits * rate;

    const { error } = await supabase.from("daily_production").insert({
      production_date: f.production_date,
      worker_id: wid,
      order_id: f.order_id ? Number(f.order_id) : null,
      suits_count: suits,
      rate_per_suit: rate,
      total_amount: amount,
      notes: f.notes.trim() || null,
    });
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    // Auto-credit worker ledger
    await supabase.from("worker_ledger").insert({
      worker_id: wid,
      entry_date: f.production_date,
      earned_amount: amount,
      paid_amount: 0,
      description: `پیداوار: ${suits} سوٹ${f.order_id ? ` (آرڈر #${f.order_id})` : ""}`,
    });
    setSaving(false);
    toast.success("پیداوار درج ہو گئی");
    nav({ to: "/app/production" });
  };

  return (
    <>
      <AppHeader title="نیا پیداوار اندراج" back="/app/production" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div>
            <Label>تاریخ</Label>
            <Input dir="ltr" type="date" value={f.production_date} onChange={(e) => setF({ ...f, production_date: e.target.value })} />
          </div>
          <div>
            <Label>کاریگر *</Label>
            <Select value={f.worker_id} onValueChange={(v) => setF({ ...f, worker_id: v, rate_per_suit: "" })}>
              <SelectTrigger><SelectValue placeholder="کاریگر منتخب کریں" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>آرڈر ID (اختیاری)</Label>
            <Input dir="ltr" type="number" value={f.order_id} onChange={(e) => setF({ ...f, order_id: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>سوٹ تعداد *</Label>
              <Input dir="ltr" type="number" value={f.suits_count} onChange={(e) => setF({ ...f, suits_count: e.target.value })} />
            </div>
            <div>
              <Label>فی سوٹ ریٹ</Label>
              <Input dir="ltr" type="number" value={f.rate_per_suit} onChange={(e) => setF({ ...f, rate_per_suit: e.target.value })} />
            </div>
          </div>
          <div className="bg-muted/40 rounded p-2 text-sm">
            کل رقم: <b>{fmtMoney(total)}</b>
          </div>
          <div>
            <Label>نوٹ</Label>
            <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary" disabled={saving}>
          {saving ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
        </Button>
      </form>
    </>
  );
}
