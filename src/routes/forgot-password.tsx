import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Almadina Stitching" },
      { name: "description", content: "Request a password reset email for your Almadina Cloth House tailoring account." },
      { property: "og:title", content: "Reset Password — Almadina Stitching" },
      { property: "og:description", content: "Request a password reset email for your Almadina Cloth House tailoring account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await resetPassword(email.trim());
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
    toast.success("Reset link sent — check your email");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#f9fafb]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground inline-flex items-center justify-center shadow-elevated mb-3">
            <Scissors className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ll email you a secure link to set a new password.
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-elevated border border-border/60 p-7">
          {sent ? (
            <div className="text-sm text-muted-foreground space-y-4 text-center">
              <p>
                A reset link was sent to <span className="font-medium text-foreground">{email}</span>. Open it on this
                device to choose a new password.
              </p>
              <Button variant="outline" className="w-full h-11" onClick={() => setSent(false)}>
                Send again
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary font-semibold hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
