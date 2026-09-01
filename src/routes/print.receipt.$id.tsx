import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/offline/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight } from "lucide-react";
import { fmtMoney, paymentStatus, statusLabel } from "@/lib/tailoring";

type Search = { type?: "order" | "invoice"; w?: 58 | 80 };

export const Route = createFileRoute("/print/receipt/$id")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    type: s.type === "invoice" ? "invoice" : "order",
    w: Number(s.w) === 80 ? 80 : 58,
  }),
  component: PrintReceipt,
  head: () => ({
    meta: [
      { title: "Thermal Receipt — Almadina Cloth House" },
      { name: "description", content: "Print a 58mm or 80mm thermal receipt for an order or invoice." },
      { property: "og:title", content: "Thermal Receipt — Almadina Cloth House" },
      { property: "og:description", content: "Print a 58mm or 80mm thermal receipt for an order or invoice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PrintReceipt() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const [width, setWidth] = useState<58 | 80>(search.w ?? 58);
  const isInvoice = search.type === "invoice";

  const { data, isLoading } = useQuery({
    queryKey: ["print-receipt", search.type, id],
    queryFn: async () => {
      if (isInvoice) {
        const { data } = await supabase
          .from("invoices")
          .select("*, customers(id,name,phone,address)")
          .eq("id", Number(id))
          .single();
        return data;
      }
      const { data } = await supabase
        .from("orders")
        .select("*, customers(id,name,phone,address)")
        .eq("id", Number(id))
        .single();
      return data;
    },
    enabled: !!user,
  });

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (isLoading || !data) return <div className="p-8 text-center" dir="rtl">لوڈ ہو رہا ہے...</div>;

  const r: any = data;
  const c = r.customers;
  const total = Number(r.total_amount ?? 0);
  const paid = Number(r.paid_amount ?? 0);
  const due = Math.max(0, total - paid);
  const qty = Number(r.total_suits ?? r.quantity ?? 1) || 1;
  const rate = Number(r.price_per_suit ?? (qty ? total / qty : total));
  const date = r.invoice_date ?? r.order_date ?? new Date().toISOString().slice(0, 10);
  const mm = `${width}mm`;

  return (
    <div dir="rtl" className="min-h-screen bg-muted/40 py-4">
      <style>{`
        @page { size: ${mm} auto; margin: 2mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .receipt { width: ${width - 4}mm !important; margin: 0 !important; box-shadow: none !important; }
        }
        .receipt { font-family: "Noto Nastaliq Urdu", system-ui, sans-serif; }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-between gap-2 px-4">
        <Link to={isInvoice ? "/app/billing/$id" : "/app/orders/$id"} params={{ id }}>
          <Button variant="outline" size="sm"><ArrowRight className="h-4 w-4 ml-1" /> واپس</Button>
        </Link>
        <div className="flex gap-2">
          <Button variant={width === 58 ? "default" : "outline"} size="sm" onClick={() => setWidth(58)}>58mm</Button>
          <Button variant={width === 80 ? "default" : "outline"} size="sm" onClick={() => setWidth(80)}>80mm</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 ml-1" /> پرنٹ</Button>
        </div>
      </div>

      <div
        className="receipt mx-auto bg-white p-2 text-black shadow"
        style={{ width: mm, fontSize: width === 58 ? "10px" : "12px", lineHeight: 1.7 }}
      >
        <div className="text-center border-b border-dashed border-black pb-1">
          <div className="font-bold">المدینہ کلاتھ ہاؤس اینڈ سٹچنگ</div>
          <div style={{ fontSize: "8px" }}>Almadina Cloth House &amp; Stitching</div>
        </div>
        <div className="flex justify-between pt-1">
          <span>{isInvoice ? "انوائس" : "آرڈر"} #{r.id}</span>
          <span dir="ltr">{date}</span>
        </div>
        <div className="border-t border-dashed border-black mt-1 pt-1">
          <div>گاہک: {c?.name} (#{r.customer_id})</div>
          {c?.phone && <div dir="ltr" className="text-right">{c.phone}</div>}
          {!isInvoice && r.delivery_date && <div>ڈیلیوری: <span dir="ltr">{r.delivery_date}</span></div>}
        </div>
        <table className="w-full border-t border-dashed border-black mt-1 pt-1">
          <thead>
            <tr><th className="text-right">تفصیل</th><th>تعداد</th><th>ریٹ</th><th className="text-left">کل</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>سلائی</td>
              <td className="text-center">{qty}</td>
              <td className="text-center">{fmtMoney(rate)}</td>
              <td className="text-left">{fmtMoney(total)}</td>
            </tr>
          </tbody>
        </table>
        <div className="border-t border-dashed border-black mt-1 pt-1">
          <div className="flex justify-between font-bold"><span>کل رقم</span><span>{fmtMoney(total)}</span></div>
          <div className="flex justify-between"><span>ادا</span><span>{fmtMoney(paid)}</span></div>
          <div className="flex justify-between font-bold"><span>باقی</span><span>{fmtMoney(due)}</span></div>
          <div className="text-center">سٹیٹس: {statusLabel(paymentStatus(total, paid))}</div>
        </div>
        {r.notes && <div className="border-t border-dashed border-black mt-1 pt-1">{r.notes}</div>}
        <div className="text-center border-t border-dashed border-black mt-1 pt-1">شکریہ — اللہ حافظ</div>
      </div>
    </div>
  );
}
