import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Ruler, ScissorsLineDashed, Receipt } from "lucide-react";

const items = [
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/orders", label: "Orders", icon: ScissorsLineDashed },
  { to: "/app/measurements", label: "Sizes", icon: Ruler },
  { to: "/app/billing", label: "Billing", icon: Receipt },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] bg-card/95 backdrop-blur-xl border-t border-border">
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
                  className={`inline-flex items-center justify-center h-9 w-12 rounded-full transition-all duration-150 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground group-active:scale-95"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span
                  className={`text-[10px] leading-none font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
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
