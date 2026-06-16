import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/app/workers/new")({
  component: NewWorker,
});

function NewWorker() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    rate_per_suit: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("نام درکار ہے");
    setSaving(true);
    const { data, error } = await supabase
      .from("workers")
      .insert({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        rate_per_suit: Number(form.rate_per_suit || 0),
        notes: form.notes.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("کاریگر شامل ہو گیا");
    nav({ to: "/app/workers/$id", params: { id: String(data.id) } });
  };

  return (
    <>
      <AppHeader title="نیا کاریگر" back="/app/workers" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div>
            <Label>نام *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>فون</Label>
            <Input
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>پتہ</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>فی سوٹ ریٹ</Label>
            <Input
              dir="ltr"
              type="number"
              value={form.rate_per_suit}
              onChange={(e) => setForm({ ...form, rate_per_suit: e.target.value })}
            />
          </div>
          <div>
            <Label>نوٹ</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary" disabled={saving}>
          {saving ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
        </Button>
      </form>
    </>
  );
}
