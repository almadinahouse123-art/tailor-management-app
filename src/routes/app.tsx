import { createFileRoute, Outlet, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { AppSidebar } from "@/components/AppSidebar";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { authed, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!authed) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <main className="flex-1 min-w-0 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto w-full">
          {!user && (
            <div className="mx-4 mt-3 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between gap-3">
              <span>Working on this device only. Sign in to your cloud account to back up and sync.</span>
              <Link to="/login" search={{ cloud: true }} className="text-primary font-semibold whitespace-nowrap">
                Connect cloud
              </Link>
            </div>
          )}
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
