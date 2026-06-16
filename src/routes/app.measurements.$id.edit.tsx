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
import { COLLAR_OPTIONS, JEB_OPTIONS, ASTEEN_TYPE_OPTIONS, URDU_LABELS } from "@/lib/tailoring";
import { toast } from "sonner";

export const Route = createFileRoute("/app/measurements/$id/edit")({
  component: EditMeasurement,
});

const numeric = ["lambai","daman","chorai","tera","asteen","cuff_paimaish","shalwar_size","panja"] as const;
const FIELDS = [...numeric, "collar_type", "jeb", "asteen_type", "asteen_description", "notes"] as const;

function EditMeasurement() {
  const { id } = Route.useParams();
  const mid = Number(id);
  const nav = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({});
  const [customerId, setCustomerId] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ["measurement-edit", mid],
    queryFn: async () => (await supabase.from("measurements").select("*").eq("id", mid).single()).data,
  });

  useEffect(() => {
    if (!data) return;
    setCustomerId(data.customer_id);
    const f: Record<string, string> = {};
    for (const k of FIELDS) f[k] = (data as any)[k] ?? "";
    setForm(f);
  }, [data]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    for (const k of FIELDS) payload[k] = form[k]?.trim() || null;
    const { error } = await supabase.from("measurements").update(payload).eq("id", mid);
    if (error) return toast.error(friendlyError(error));
    toast.success("پیمائش اپڈیٹ ہو گئی");
    if (customerId) nav({ to: "/app/customers/$id", params: { id: String(customerId) } });
    else nav({ to: "/app/measurements" });
  };

  return (
    <>
      <AppHeader title="پیمائش کی ترمیم" back="/app/measurements" />
      <form onSubmit={save} className="px-4 py-4 space-y-3">
        <Card className="p-3 grid grid-cols-2 gap-3">
          {numeric.map((k) => (
            <div key={k}>
              <Label className="text-xs">{URDU_LABELS[k]}</Label>
              <Input dir="ltr" className="mt-1 text-left" value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </Card>
        <Card className="p-3 space-y-3">
          <div>
            <Label className="text-xs">{URDU_LABELS.collar_type}</Label>
            <Select value={form.collar_type ?? ""} onValueChange={(v) => set("collar_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>{COLLAR_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.jeb}</Label>
            <Select value={form.jeb ?? ""} onValueChange={(v) => set("jeb", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>{JEB_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.asteen_type}</Label>
            <Select value={form.asteen_type ?? ""} onValueChange={(v) => set("asteen_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>{ASTEEN_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.asteen_description}</Label>
            <Textarea rows={2} value={form.asteen_description ?? ""} onChange={(e) => set("asteen_description", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.notes}</Label>
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="mt-1" />
          </div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary">تبدیلیاں محفوظ کریں</Button>
      </form>
    </>
  );
}
