import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Ruler, ScissorsLineDashed, Receipt } from "lucide-react";

const items = [
  { to: "/app", label: "ڈیش بورڈ", icon: LayoutDashboard },
  { to: "/app/customers", label: "گاہک", icon: Users },
  { to: "/app/measurements", label: "پیمائش", icon: Ruler },
  { to: "/app/orders", label: "آرڈرز", icon: ScissorsLineDashed },
  { to: "/app/billing", label: "بلنگ", icon: Receipt },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-md">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/app" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
