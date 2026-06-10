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

        <div className="my-4 flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> یا <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
            if (result.error) {
              toast.error(result.error.message ?? "Google sign-in failed");
              setBusy(false);
              return;
            }
            if (result.redirected) return;
            nav({ to: "/app" });
          }}
          className="w-full"
        >
          <svg className="h-4 w-4 ml-2" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5l-6.1-5c-2 1.5-4.4 2.4-7.1 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.3 43.5 24 43.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.1 5c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          Google سے لاگ ان
        </Button>

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
