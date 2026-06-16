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
import { toast } from "sonner";

export const Route = createFileRoute("/app/customers/$id/edit")({
  component: EditCustomer,
});

function EditCustomer() {
  const { id } = Route.useParams();
  const cid = Number(id);
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["customer-edit", cid],
    queryFn: async () => (await supabase.from("customers").select("*").eq("id", cid).single()).data,
  });

  useEffect(() => {
    if (data) setForm({ name: data.name ?? "", phone: data.phone ?? "", address: data.address ?? "" });
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("نام درکار ہے");
    setBusy(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      })
      .eq("id", cid);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("گاہک اپڈیٹ ہو گیا");
    nav({ to: "/app/customers/$id", params: { id } });
  };

  return (
    <>
      <AppHeader title="گاہک کی ترمیم" back="/app/customers/$id" />
      <form onSubmit={save} className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div>
            <Label>نام *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label>فون نمبر</Label>
            <Input dir="ltr" className="mt-1 text-left" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>پتہ</Label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" rows={2} />
          </div>
        </Card>
        <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
          {busy ? "..." : "تبدیلیاں محفوظ کریں"}
        </Button>
      </form>
    </>
  );
}
