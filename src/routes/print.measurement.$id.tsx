import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { URDU_LABELS } from "@/lib/tailoring";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/print/measurement/$id")({
  component: PrintMeasurement,
});

const FIELDS = [
  "lambai", "daman", "chorai", "tera", "asteen",
  "cuff_paimaish", "collar_type", "jeb",
  "asteen_type", "shalwar_size", "panja",
] as const;

function PrintMeasurement() {
  const { id } = Route.useParams();
  const mid = Number(id);
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["print-measurement", mid],
    queryFn: async () => {
      const { data } = await supabase
        .from("measurements")
        .select("*, customers(id,name,phone,address)")
        .eq("id", mid)
        .single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (isLoading || !data) {
    return <div className="p-8 text-center" dir="rtl">لوڈ ہو رہا ہے...</div>;
  }

  const m: any = data;
  const c = m.customers;
  const date = new Date(m.created_at).toLocaleDateString();

  return (
    <div dir="rtl" className="min-h-screen bg-white text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A5; margin: 10mm; }
          body { background: white !important; }
        }
        .sheet { font-family: "Noto Nastaliq Urdu", serif; }
      `}</style>

      <div className="no-print sticky top-0 bg-background border-b p-3 flex items-center justify-between max-w-2xl mx-auto">
        <Link to="/app/customers/$id" params={{ id: String(c?.id ?? "") }}>
          <Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4 ml-1" /> واپس</Button>
        </Link>
        <Button size="sm" onClick={() => window.print()} className="bg-gradient-primary">
          <Printer className="h-4 w-4 ml-1" /> پرنٹ کریں
        </Button>
      </div>

      <div className="sheet max-w-2xl mx-auto p-6 print:p-0">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-2xl font-bold">المدینہ کلاتھ ہاؤس اینڈ سٹچنگ</h1>
          <div className="text-sm mt-1">کٹنگ شیٹ — پیمائش</div>
        </div>

        {/* Customer info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm border border-black p-3 mb-4">
          <div className="flex justify-between"><span className="font-bold">گاہک نمبر:</span><span>#{c?.id}</span></div>
          <div className="flex justify-between"><span className="font-bold">پیمائش نمبر:</span><span>#{m.id}</span></div>
          <div className="flex justify-between"><span className="font-bold">نام:</span><span>{c?.name}</span></div>
          <div className="flex justify-between"><span className="font-bold">فون:</span><span dir="ltr">{c?.phone || "—"}</span></div>
          <div className="flex justify-between col-span-2"><span className="font-bold">تاریخ:</span><span>{date}</span></div>
        </div>

        {/* Measurements grid */}
        <table className="w-full border-collapse text-base mb-4">
          <tbody>
            {FIELDS.reduce<Array<typeof FIELDS[number][]>>((rows, f, i) => {
              if (i % 2 === 0) rows.push([f]); else rows[rows.length - 1].push(f);
              return rows;
            }, []).map((row, ri) => (
              <tr key={ri}>
                {row.map((f) => (
                  <>
                    <td key={f + "l"} className="border border-black p-2 font-bold w-1/4 bg-gray-100">
                      {URDU_LABELS[f]}
                    </td>
                    <td key={f + "v"} className="border border-black p-2 w-1/4 text-center text-lg">
                      {m[f] || "—"}
                    </td>
                  </>
                ))}
                {row.length === 1 && (
                  <>
                    <td className="border border-black p-2 bg-gray-100"></td>
                    <td className="border border-black p-2"></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Asteen description */}
        {m.asteen_description && (
          <div className="border border-black p-3 mb-3">
            <div className="font-bold mb-1">{URDU_LABELS.asteen_description}:</div>
            <div className="text-sm">{m.asteen_description}</div>
          </div>
        )}

        {/* Notes */}
        {m.notes && (
          <div className="border border-black p-3 mb-3">
            <div className="font-bold mb-1">{URDU_LABELS.notes}:</div>
            <div className="text-sm">{m.notes}</div>
          </div>
        )}

        {/* Signature */}
        <div className="grid grid-cols-2 gap-6 mt-10 text-sm">
          <div className="border-t border-black pt-1 text-center">کاریگر کے دستخط</div>
          <div className="border-t border-black pt-1 text-center">گاہک کے دستخط</div>
        </div>
      </div>
    </div>
  );
}
