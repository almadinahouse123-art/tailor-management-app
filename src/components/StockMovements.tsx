import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { supabase } from "@/lib/offline/client";
import { addStockMovement } from "@/lib/offline/stock";
import { friendlyError } from "@/lib/friendly-error";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const KIND: Record<string, string> = { in: "اسٹاک اِن", out: "اسٹاک آؤٹ", adjust: "درستگی" };

/** Stock in / out buttons and movement history for one inventory item. */
export function StockMovements({ itemId, unit }: { itemId: number; unit: string }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["stock-movements", itemId],
    queryFn: async () =>
      ((await (supabase as any)
        .from("stock_movements")
        .select("*")
        .eq("item_id", itemId)
        .is("deleted_at", null)
        .order("id", { ascending: false })).data ?? []) as any[],
  });

  const move = async (kind: "in" | "out") => {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("درست مقدار درج کریں");
    setBusy(true);
    const { error } = await addStockMovement({ itemId, kind, amount: n, note: note.trim() || null });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(kind === "in" ? "اسٹاک شامل ہو گیا" : "اسٹاک نکال لیا گیا");
    setAmount("");
    setNote("");
    qc.invalidateQueries();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="font-semibold text-sm">اسٹاک کی آمد و رفت</div>
      <div className="grid grid-cols-2 gap-2">
        <Input dir="ltr" type="number" inputMode="decimal" placeholder="مقدار" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="نوٹ" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" disabled={busy} onClick={() => move("in")}>
          <ArrowDownCircle className="h-4 w-4 ml-1" /> اسٹاک اِن
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => move("out")}>
          <ArrowUpCircle className="h-4 w-4 ml-1" /> اسٹاک آؤٹ
        </Button>
      </div>
      <div className="divide-y divide-border text-sm">
        {rows.length === 0 && <div className="text-xs text-muted-foreground py-2">ابھی کوئی اندراج نہیں</div>}
        {rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-2">
            <div>
              <div>{KIND[m.kind] ?? m.kind}{m.note ? ` · ${m.note}` : ""}</div>
              <div className="text-[11px] text-muted-foreground" dir="ltr">{m.movement_date}</div>
            </div>
            <div dir="ltr" className={Number(m.qty_change) >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
              {Number(m.qty_change) >= 0 ? "+" : ""}{m.qty_change} {unit}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
