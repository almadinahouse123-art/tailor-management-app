import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Scissors, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-primary text-primary-foreground" dir="rtl">
        <Scissors className="h-10 w-10" />
        <p className="text-lg">المدینہ کلاتھ ہاؤس</p>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return <Navigate to={user ? "/app" : "/login"} />;
}
