import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { softDeleteWithUndo, type TrashTable, TRASH_LABELS } from "@/lib/crud";

type Props = {
  table: TrashTable;
  id: number;
  label?: string;
  size?: "sm" | "icon" | "default";
  variant?: "outline" | "destructive" | "ghost";
  className?: string;
  onDeleted?: () => void;
};

export function DeleteButton({
  table,
  id,
  label,
  size = "sm",
  variant = "outline",
  className,
  onDeleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const what = label ?? TRASH_LABELS[table];

  const confirm = async () => {
    setBusy(true);
    const ok = await softDeleteWithUndo(table, id, { label: what, onChange: onDeleted });
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          className={`text-destructive hover:text-destructive ${className ?? ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {size !== "icon" && <span className="mr-1">حذف</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>کیا آپ {what} حذف کرنا چاہتے ہیں؟</AlertDialogTitle>
          <AlertDialogDescription>
            یہ ریکارڈ ٹریش میں چلا جائے گا۔ آپ اسے بعد میں بحال کر سکتے ہیں۔
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>منسوخ</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={busy} className="bg-destructive hover:bg-destructive/90">
            {busy ? "..." : "ہاں، حذف کریں"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
