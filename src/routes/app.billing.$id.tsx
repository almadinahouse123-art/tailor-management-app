import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Scissors } from "lucide-react";
import { fmtMoney, paymentStatus, statusLabel } from "@/lib/tailoring";

export const Route = createFileRoute("/app/billing/$id")({
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const { data: inv } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*, customers(id,name,phone,address)").eq("id", Number(id)).single();
      return data;
    },
  });
  if (!inv) return <><AppHeader title="انوائس" back="/app/billing" /><div className="p-6 text-center text-sm">لوڈ...</div></>;
  const ps = paymentStatus(Number(inv.total_amount), Number(inv.paid_amount));
  const due = Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount));

  return (
    <>
      <AppHeader title={`انوائس #${inv.id}`} back="/app/billing" />
      <div className="px-4 py-4 space-y-3 print:p-2">
        <Card className="p-4 print:shadow-none print:border-0" id="invoice-print">
          <div className="text-center border-b pb-3 mb-3">
            <div className="flex items-center justify-center gap-2">
              <Scissors className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-base">المدینہ کلاتھ ہاؤس اینڈ سٹچنگ</h2>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Almadina Cloth House & Stitching</p>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span>انوائس #{inv.id}</span>
            <span dir="ltr">{inv.invoice_date}</span>
          </div>
          <div className="text-sm mb-3">
            <div><span className="text-muted-foreground text-xs">گاہک:</span> {inv.customers?.name} (#{inv.customer_id})</div>
            {inv.customers?.phone && <div className="text-xs" dir="ltr">{inv.customers.phone}</div>}
          </div>
          <table className="w-full text-xs border-t border-b">
            <thead>
              <tr className="text-muted-foreground"><th className="text-right py-1">تفصیل</th><th>تعداد</th><th>ریٹ</th><th>کل</th></tr>
            </thead>
            <tbody>
              <tr className="border-t"><td className="py-1.5">سلائی</td><td className="text-center">{inv.total_suits}</td><td className="text-center">{fmtMoney(inv.price_per_suit)}</td><td className="text-left font-semibold">{fmtMoney(inv.total_amount)}</td></tr>
            </tbody>
          </table>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>کل رقم</span><span className="font-bold">{fmtMoney(inv.total_amount)}</span></div>
            <div className="flex justify-between text-success"><span>ادا</span><span>{fmtMoney(inv.paid_amount)}</span></div>
            <div className="flex justify-between border-t pt-1"><span>باقی</span><span className="font-bold">{fmtMoney(due)}</span></div>
            <div className="text-center pt-2 text-xs text-muted-foreground">سٹیٹس: {statusLabel(ps)}</div>
          </div>
          {inv.notes && <p className="mt-3 text-xs text-muted-foreground">{inv.notes}</p>}
          <p className="text-center text-[10px] text-muted-foreground mt-4 pt-3 border-t">شکریہ — اللہ حافظ</p>
        </Card>
        <Button onClick={() => window.print()} className="w-full bg-gradient-primary print:hidden">
          <Printer className="h-4 w-4 ml-2" /> پرنٹ کریں
        </Button>
      </div>
    </>
  );
}
