import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useState } from "react";
import { supabase } from "@/lib/offline/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

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
    if (error) return toast.error(friendlyError(error));
    toast.success(`گاہک محفوظ ہو گیا (ID: ${data!.id})`);
    nav({ to: "/app/customers/$id", params: { id: String(data!.id) } });
  };

  return (
    <>
      <AppHeader title="نیا گاہک" back="/app/customers" />
      <form onSubmit={submit} className="px-4 py-4 pb-28 space-y-4 animate-rise">
        <Card className="p-5 rounded-2xl border-0 shadow-card">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/60">
            <div className="h-10 w-10 rounded-2xl bg-gold/15 text-gold inline-flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">گاہک کی معلومات</div>
              <div className="text-[11px] text-muted-foreground font-display tracking-wide">Customer details</div>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="نام" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="گاہک کا پورا نام" />
            </Field>
            <Field label="فون نمبر">
              <Input dir="ltr" className="text-left" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
            </Field>
            <Field label="پتہ">
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="گھر کا پتہ" />
            </Field>
          </div>
        </Card>
      </form>

      <div className="fixed bottom-20 inset-x-0 z-30 px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <Button onClick={submit as any} type="submit" disabled={busy} size="lg" className="w-full h-12 rounded-2xl shadow-elevated">
            {busy ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
