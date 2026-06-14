import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, UserCog, Phone, ChevronLeft } from "lucide-react";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/workers/")({
  component: WorkersList,
});

function initials(name: string) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

function WorkersList() {
  const [q, setQ] = useState("");
  const { data: workers = [] } = useQuery({
    queryKey: ["workers", q],
    queryFn: async () => {
      let qy = supabase.from("workers").select("*").is("deleted_at", null).order("id", { ascending: false });
      if (q.trim()) {
        const t = q.trim();
        if (/^\d+$/.test(t)) qy = supabase.from("workers").select("*").is("deleted_at", null).eq("id", Number(t));
        else qy = qy.or(`name.ilike.%${t}%,phone.ilike.%${t}%`);
      }
      const { data, error } = await qy;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <AppHeader title="کاریگر" back="/app" />
      <div className="px-4 py-4 space-y-4 animate-rise">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="نام، فون یا ID سے تلاش"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-11 h-12 rounded-2xl bg-card border-0 shadow-card"
            />
          </div>
          <Link to="/app/workers/new">
            <Button size="icon" className="h-12 w-12 rounded-2xl shadow-elevated">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {workers.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-dashed bg-card/50">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted inline-flex items-center justify-center mb-3">
              <UserCog className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">کوئی کاریگر نہیں ملا</div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {workers.map((w) => (
              <Link key={w.id} to="/app/workers/$id" params={{ id: String(w.id) }}>
                <Card className="p-3.5 rounded-2xl border-0 shadow-card hover:shadow-elevated transition-all active:scale-[0.99] flex items-center gap-3">
                  <div className="bg-foreground text-background rounded-2xl h-12 w-12 flex items-center justify-center font-bold font-display text-sm shrink-0">
                    {initials(w.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{w.name}</span>
                      {!w.active && (
                        <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md uppercase tracking-wider font-display">Off</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      {w.phone && (
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone className="h-3 w-3" /> {w.phone}
                        </span>
                      )}
                      <span className="text-gold font-display" dir="ltr">{fmtMoney(w.rate_per_suit)}/suit</span>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
