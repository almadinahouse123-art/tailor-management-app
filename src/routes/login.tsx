import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/app" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "login" ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (mode === "signup") {
      toast.success("اکاؤنٹ بن گیا — اب لاگ ان کریں");
      setMode("login");
    } else {
      nav({ to: "/app" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-primary" dir="rtl">
      <Card className="w-full max-w-sm p-6 shadow-card">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="bg-gradient-gold rounded-full p-3 mb-3 shadow-card">
            <Scissors className="h-6 w-6 text-gold-foreground" />
          </div>
          <h1 className="text-lg font-bold leading-tight">المدینہ کلاتھ ہاؤس</h1>
          <p className="text-xs text-muted-foreground mt-0.5">اینڈ سٹچنگ — مینجمنٹ سسٹم</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-sm">ای میل</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="text-left mt-1"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm">پاس ورڈ</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="text-left mt-1"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">
            {busy ? "..." : mode === "login" ? "لاگ ان" : "اکاؤنٹ بنائیں"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-primary"
        >
          {mode === "login" ? "نیا اکاؤنٹ بنائیں" : "پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں"}
        </button>
      </Card>
    </div>
  );
}
