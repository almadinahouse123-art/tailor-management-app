import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ScissorsLineDashed, Ruler, Factory,
  Package, Receipt, UserCog, Settings, ShieldCheck, Trash2, Scissors, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/orders", label: "Orders", icon: ScissorsLineDashed },
  { to: "/app/measurements", label: "Measurements", icon: Ruler },
  { to: "/app/production", label: "Production", icon: Factory },
  { to: "/app/inventory", label: "Stock", icon: Package },
  { to: "/app/billing", label: "Payments", icon: Receipt },
  { to: "/app/workers", label: "Staff", icon: UserCog },
] as const;

const secondary = [
  { to: "/app/backup", label: "Backup", icon: ShieldCheck },
  { to: "/app/trash", label: "Trash", icon: Trash2 },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, user } = useAuth();

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/") || path === to;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center shadow-card">
          <Scissors className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-sidebar-foreground truncate">Tailor Manager</div>
          <div className="text-[11px] text-muted-foreground truncate">Business workspace</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <div className="px-2 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Main
        </div>
        {nav.map((it) => {
          const active = isActive(it.to, (it as any).exact);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} strokeWidth={active ? 2.4 : 2} />
              <span className="flex-1">{it.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}

        <div className="px-2 pb-2 pt-5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          System
        </div>
        {secondary.map((it) => {
          const active = isActive(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center font-semibold text-sm shrink-0">
            {(user?.email ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-sidebar-foreground truncate">
              {user?.email ?? "User"}
            </div>
            <div className="text-[10px] text-muted-foreground">Signed in</div>
          </div>
          <button
            onClick={() => signOut()}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
