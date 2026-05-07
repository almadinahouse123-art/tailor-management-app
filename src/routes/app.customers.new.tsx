import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/app/customers/new")({
  component: NewCustomer,
});

function NewCustomer() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("نام درکار ہے");
    setBusy(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`گاہک محفوظ ہو گیا (ID: ${data!.id})`);
    nav({ to: "/app/customers/$id", params: { id: String(data!.id) } });
  };

  return (
    <>
      <AppHeader title="نیا گاہک" back="/app/customers" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div>
            <Label>نام *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>فون نمبر</Label>
            <Input dir="ltr" className="mt-1 text-left" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
          </div>
          <div>
            <Label>پتہ</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" rows={2} />
          </div>
        </Card>
        <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
          {busy ? "..." : "محفوظ کریں"}
        </Button>
      </form>
    </>
  );
}
