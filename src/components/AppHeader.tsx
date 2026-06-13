import { Link } from "@tanstack/react-router";
import { ArrowRight, LogOut, Scissors, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AppHeader({ title, back }: { title?: string; back?: string }) {
  const { signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-gradient-noir text-primary-foreground">
      <div className="max-w-md mx-auto px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          {back ? (
            <Link
              to={back}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition"
              title="واپس"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="h-9 w-9 rounded-full bg-gold text-gold-foreground inline-flex items-center justify-center shadow-elevated">
              <Scissors className="h-4 w-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-tight truncate">
              {title ?? "المدینہ کلاتھ ہاؤس"}
            </h1>
            {!title && (
              <p className="text-[10px] tracking-[0.15em] uppercase opacity-60 font-display">
                Almadina · Tailoring Studio
              </p>
            )}
          </div>

          {!back && (
            <>
              <Link
                to="/app/search"
                className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition"
                title="تلاش"
              >
                <Search className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOut()}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition"
                title="لاگ آؤٹ"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {/* gold hairline */}
      <div className="h-px bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
    </header>
  );
}
