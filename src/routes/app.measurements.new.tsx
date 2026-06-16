import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
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

const search = z.object({ customer: z.coerce.number().optional() });

export const Route = createFileRoute("/app/measurements/new")({
  validateSearch: (s) => search.parse(s),
  component: NewMeasurement,
});

function NewMeasurement() {
  const nav = useNavigate();
  const { customer: preset } = Route.useSearch();
  const [customerId, setCustomerId] = useState<string>(preset ? String(preset) : "");
  const [form, setForm] = useState<Record<string, string>>({
    lambai: "", daman: "", chorai: "", tera: "", asteen: "",
    cuff_paimaish: "", shalwar_size: "", panja: "",
    collar_type: "", jeb: "", asteen_type: "", asteen_description: "", notes: "",
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-options"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("id", { ascending: false })).data ?? [],
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error("گاہک منتخب کریں");
    const payload: any = { customer_id: Number(customerId) };
    for (const [k, v] of Object.entries(form)) if (v.trim()) payload[k] = v.trim();
    const { error } = await supabase.from("measurements").insert(payload);
    if (error) return toast.error(friendlyError(error));
    toast.success("پیمائش محفوظ");
    nav({ to: "/app/customers/$id", params: { id: customerId } });
  };

  const numeric = ["lambai","daman","chorai","tera","asteen","cuff_paimaish","shalwar_size","panja"] as const;

  return (
    <>
      <AppHeader title="نئی پیمائش" back="/app/measurements" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        <Card className="p-3">
          <Label>گاہک *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="گاہک منتخب کریں" /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>#{c.id} — {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-3 grid grid-cols-2 gap-3">
          {numeric.map((k) => (
            <div key={k}>
              <Label className="text-xs">{URDU_LABELS[k]}</Label>
              <Input dir="ltr" className="mt-1 text-left" value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </Card>

        <Card className="p-3 space-y-3">
          <div>
            <Label className="text-xs">{URDU_LABELS.collar_type}</Label>
            <Select value={form.collar_type} onValueChange={(v) => set("collar_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>{COLLAR_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.jeb}</Label>
            <Select value={form.jeb} onValueChange={(v) => set("jeb", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>{JEB_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.asteen_type}</Label>
            <Select value={form.asteen_type} onValueChange={(v) => set("asteen_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
              <SelectContent>{ASTEEN_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.asteen_description} *</Label>
            <Textarea rows={2} value={form.asteen_description} onChange={(e) => set("asteen_description", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{URDU_LABELS.notes}</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1" />
          </div>
        </Card>

        <Button type="submit" className="w-full bg-gradient-primary">محفوظ کریں</Button>
      </form>
    </>
  );
}
