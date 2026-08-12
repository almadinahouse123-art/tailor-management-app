import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useState } from "react";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/app/inventory/new")({
  component: NewItem,
});

function NewItem() {
  const nav = useNavigate();
  const [f, setF] = useState({
    item_name: "",
    category: "",
    quantity: "",
    unit: "",
    unit_price: "",
    low_stock_threshold: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.item_name.trim()) return toast.error("شے کا نام درکار ہے");
    setSaving(true);
    const { error } = await supabase.from("inventory").insert({
      item_name: f.item_name.trim(),
      category: f.category.trim() || null,
      quantity: Number(f.quantity || 0),
      unit: f.unit.trim() || null,
      unit_price: Number(f.unit_price || 0),
      low_stock_threshold: Number(f.low_stock_threshold || 0),
      notes: f.notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("شامل ہو گیا");
    nav({ to: "/app/inventory" });
  };

  return (
    <>
      <AppHeader title="نئی شے" back="/app/inventory" />
      <form onSubmit={submit} className="px-4 py-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div>
            <Label>شے کا نام *</Label>
            <Input value={f.item_name} onChange={(e) => setF({ ...f, item_name: e.target.value })} />
          </div>
          <div>
            <Label>قسم</Label>
            <Input
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value })}
              placeholder="کپڑا، بٹن، دھاگہ..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>مقدار</Label>
              <Input dir="ltr" type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
            </div>
            <div>
              <Label>اکائی</Label>
              <Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="میٹر، عدد..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>فی اکائی قیمت</Label>
              <Input dir="ltr" type="number" value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} />
            </div>
            <div>
              <Label>کم اسٹاک حد</Label>
              <Input dir="ltr" type="number" value={f.low_stock_threshold} onChange={(e) => setF({ ...f, low_stock_threshold: e.target.value })} />
            </div>
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
