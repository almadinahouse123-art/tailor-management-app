import { Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Scissors, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AppHeader({ title, back }: { title?: string; back?: string }) {
  const { signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border">
      <div className="px-4 lg:px-8 h-16 flex items-center gap-3">
        {back ? (
          <Link
            to={back}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <div className="lg:hidden h-9 w-9 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center shadow-card">
            <Scissors className="h-4 w-4" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-base lg:text-lg font-semibold text-foreground truncate">
            {title ?? "Dashboard"}
          </h1>
        </div>

        {!back && (
          <>
            <Link
              to="/app/search"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </Link>
            <button
              onClick={() => signOut()}
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
