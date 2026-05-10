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
import { toast } from "sonner";

export const Route = createFileRoute("/app/workers/$id/edit")({
  component: EditWorker,
});

function EditWorker() {
  const { id } = Route.useParams();
  const wid = Number(id);
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", phone: "", address: "", rate_per_suit: "", notes: "", active: true });

  const { data } = useQuery({
    queryKey: ["worker-edit", wid],
    queryFn: async () => (await supabase.from("workers").select("*").eq("id", wid).single()).data,
  });

  useEffect(() => {
    if (!data) return;
    setF({
      name: data.name ?? "",
      phone: data.phone ?? "",
      address: data.address ?? "",
      rate_per_suit: String(data.rate_per_suit ?? ""),
      notes: data.notes ?? "",
      active: !!data.active,
    });
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("نام درکار ہے");
    const { error } = await supabase.from("workers").update({
      name: f.name.trim(),
      phone: f.phone.trim() || null,
      address: f.address.trim() || null,
      rate_per_suit: Number(f.rate_per_suit) || 0,
      notes: f.notes.trim() || null,
      active: f.active,
    }).eq("id", wid);
    if (error) return toast.error(error.message);
    toast.success("اپڈیٹ ہو گیا");
    nav({ to: "/app/workers/$id", params: { id } });
  };

  return (
    <>
      <AppHeader title="کاریگر کی ترمیم" back="/app/workers/$id" />
      <form onSubmit={save} className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div><Label>نام *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>فون</Label><Input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>پتہ</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><Label>فی سوٹ ریٹ</Label><Input dir="ltr" type="number" value={f.rate_per_suit} onChange={(e) => setF({ ...f, rate_per_suit: e.target.value })} /></div>
          <div><Label>نوٹ</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </Card>
        <Button type="submit" className="w-full bg-gradient-primary">تبدیلیاں محفوظ کریں</Button>
      </form>
    </>
  );
}
