import { Link } from "@tanstack/react-router";
import { LogOut, Scissors, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AppHeader({ title, back }: { title?: string; back?: string }) {
  const { signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-gradient-primary text-primary-foreground shadow-card">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
        <div className="bg-gold/90 text-gold-foreground rounded-full p-1.5">
          <Scissors className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate">
            {title ?? "المدینہ کلاتھ ہاؤس اینڈ سٹچنگ"}
          </h1>
          {!title && <p className="text-[10px] opacity-80">Almadina Cloth House & Stitching</p>}
        </div>
        {back ? (
          <Link to={back} className="text-xs opacity-90 underline-offset-2 hover:underline">
            واپس
          </Link>
        ) : (
          <>
            <Link
              to="/app/search"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/15"
              title="تلاش"
            >
              <Search className="h-4 w-4" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-white/15 h-8 w-8"
              onClick={() => signOut()}
              title="لاگ آؤٹ"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
