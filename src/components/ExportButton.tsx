import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export-csv";

export function ExportButton({
  fileBase,
  rows,
  columns,
  label = "Export",
  className,
}: {
  fileBase: string;
  rows: Record<string, unknown>[];
  columns?: { key: string; label?: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={className ?? "h-12 rounded-2xl"}
      onClick={() => {
        if (!rows.length) {
          toast.info("ایکسپورٹ کے لیے کوئی ڈیٹا نہیں");
          return;
        }
        exportCSV(fileBase, rows, columns);
        toast.success("CSV فائل ڈاؤن لوڈ ہو گئی");
      }}
    >
      <Download className="h-4 w-4 ml-1" /> {label}
    </Button>
  );
}
