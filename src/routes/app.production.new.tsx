import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
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

const searchSchema = z.object({
  order: z.coerce.number().optional(),
  worker: z.coerce.number().optional(),
});

export const Route = createFileRoute("/app/production/new")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NewProduction,
});

function NewProduction() {
  const nav = useNavigate();
  const { order: presetOrder, worker: presetWorker } = Route.useSearch();

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workers")
        .select("id, name")
        .eq("active", true)
        .is("deleted_at", null)
        .order("name");
      return data ?? [];
    },
  });

  const [f, setF] = useState({
    production_date: new Date().toISOString().slice(0, 10),
    worker_id: presetWorker ? String(presetWorker) : "",
    order_id: presetOrder ? String(presetOrder) : "",
    simple_rate: "",
    chakpate_rate: "",
    simple_suits: "",
    chakpate_suits: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Prefill rates from worker's most recent production entry
  useEffect(() => {
    const wid = Number(f.worker_id);
    if (!wid) return;
    (async () => {
      const { data } = await supabase
        .from("daily_production")
        .select("simple_rate, chakpate_rate")
        .eq("worker_id", wid)
        .is("deleted_at", null)
        .order("production_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setF((p) => ({
          ...p,
          simple_rate: p.simple_rate || (data.simple_rate ? String(data.simple_rate) : ""),
          chakpate_rate: p.chakpate_rate || (data.chakpate_rate ? String(data.chakpate_rate) : ""),
        }));
      }
    })();
  }, [f.worker_id]);

  const sCount = Number(f.simple_suits || 0);
  const cCount = Number(f.chakpate_suits || 0);
  const sRate = Number(f.simple_rate || 0);
  const cRate = Number(f.chakpate_rate || 0);
  const sTotal = sCount * sRate;
  const cTotal = cCount * cRate;
  const total = sTotal + cTotal;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.worker_id) return toast.error("کاریگر منتخب کریں");
    if (!sCount && !cCount) return toast.error("سوٹ کی تعداد درج کریں");
    if (sCount > 0 && !sRate) return toast.error("سادہ سوٹ کا ریٹ درج کریں");
    if (cCount > 0 && !cRate) return toast.error("چک پٹے سوٹ کا ریٹ درج کریں");

    setSaving(true);
    const wid = Number(f.worker_id);

    const { error } = await supabase.from("daily_production").insert({
      production_date: f.production_date,
      worker_id: wid,
      order_id: f.order_id ? Number(f.order_id) : null,
      simple_suits: sCount,
      simple_rate: sRate,
      chakpate_suits: cCount,
      chakpate_rate: cRate,
      // legacy fields kept in sync
      suits_count: sCount + cCount,
      rate_per_suit: 0,
      total_amount: total,
      notes: f.notes.trim() || null,
    });
    if (error) {
      setSaving(false);
      return toast.error(friendlyError(error));
    }

    // Auto-credit worker ledger
    await supabase.from("worker_ledger").insert({
      worker_id: wid,
      entry_date: f.production_date,
      earned_amount: total,
      paid_amount: 0,
      description:
        `پیداوار: ${sCount > 0 ? `سادہ ${sCount}×${sRate}` : ""}` +
        `${sCount > 0 && cCount > 0 ? " · " : ""}` +
        `${cCount > 0 ? `چک پٹے ${cCount}×${cRate}` : ""}` +
        `${f.order_id ? ` (آرڈر #${f.order_id})` : ""}`,
    });

    setSaving(false);
    toast.success("پیداوار درج ہو گئی");
    if (presetWorker) nav({ to: "/app/workers/$id", params: { id: String(presetWorker) } });
    else nav({ to: "/app/production" });
  };

  return (
    <>
      <AppHeader title="نیا پیداوار اندراج" back="/app/production" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        {/* Step 1: Worker + Date */}
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">۱) کاریگر اور تاریخ</div>
          <div>
            <Label>کاریگر *</Label>
            <Select value={f.worker_id} onValueChange={(v) => setF({ ...f, worker_id: v })}>
              <SelectTrigger><SelectValue placeholder="کاریگر منتخب کریں" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>تاریخ</Label>
            <Input dir="ltr" type="date" value={f.production_date} onChange={(e) => setF({ ...f, production_date: e.target.value })} />
          </div>
        </Card>

        {/* Step 2: Rates */}
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">۲) آج کے ریٹ مقرر کریں</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>سادہ سوٹ ریٹ</Label>
              <Input dir="ltr" type="number" placeholder="مثلاً 300" value={f.simple_rate}
                onChange={(e) => setF({ ...f, simple_rate: e.target.value })} />
            </div>
            <div>
              <Label>چک پٹے سوٹ ریٹ</Label>
              <Input dir="ltr" type="number" placeholder="مثلاً 450" value={f.chakpate_rate}
                onChange={(e) => setF({ ...f, chakpate_rate: e.target.value })} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">یہ ریٹ صرف اسی اندراج کے لیے محفوظ ہوں گے۔ پرانے ریکارڈ نہیں بدلیں گے۔</p>
        </Card>

        {/* Step 3: Counts */}
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">۳) آج کی پیداوار</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>سادہ سوٹ</Label>
              <Input dir="ltr" type="number" value={f.simple_suits}
                onChange={(e) => setF({ ...f, simple_suits: e.target.value })} />
            </div>
            <div>
              <Label>چک پٹے سوٹ</Label>
              <Input dir="ltr" type="number" value={f.chakpate_suits}
                onChange={(e) => setF({ ...f, chakpate_suits: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>آرڈر ID (اختیاری)</Label>
            <Input dir="ltr" type="number" value={f.order_id} onChange={(e) => setF({ ...f, order_id: e.target.value })} />
          </div>
          <div>
            <Label>نوٹ</Label>
            <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
        </Card>

        {/* Step 4: Auto total */}
        <Card className="p-4 bg-gradient-primary text-primary-foreground space-y-1">
          <div className="text-xs opacity-90">۴) خودکار حساب</div>
          <div className="text-xs flex justify-between"><span>سادہ {sCount} × {sRate}</span><b>{fmtMoney(sTotal)}</b></div>
          <div className="text-xs flex justify-between"><span>چک پٹے {cCount} × {cRate}</span><b>{fmtMoney(cTotal)}</b></div>
          <div className="border-t border-white/20 mt-1 pt-1 flex justify-between text-base font-bold">
            <span>کل کمائی</span><span>{fmtMoney(total)}</span>
          </div>
        </Card>

        <Button type="submit" className="w-full bg-gradient-primary" disabled={saving}>
          {saving ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
        </Button>
      </form>
    </>
  );
}
