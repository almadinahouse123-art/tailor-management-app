import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Ruler, ScissorsLineDashed, Receipt } from "lucide-react";

const items = [
  { to: "/app", label: "ہوم", icon: LayoutDashboard },
  { to: "/app/customers", label: "گاہک", icon: Users },
  { to: "/app/measurements", label: "پیمائش", icon: Ruler },
  { to: "/app/orders", label: "آرڈرز", icon: ScissorsLineDashed },
  { to: "/app/billing", label: "بلنگ", icon: Receipt },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-xl border-t hairline">
      <ul className="grid grid-cols-5 max-w-md mx-auto px-2 py-1.5">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className="flex flex-col items-center justify-center gap-1 py-1.5 group"
              >
                <span
                  className={`inline-flex items-center justify-center h-9 w-12 rounded-full transition-all ${
                    active
                      ? "bg-foreground text-background shadow-elevated"
                      : "text-muted-foreground group-active:scale-95"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span
                  className={`text-[10px] leading-none ${
                    active ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
