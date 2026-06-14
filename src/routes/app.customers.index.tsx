import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Search, ChevronLeft, Users } from "lucide-react";

export const Route = createFileRoute("/app/customers/")({
  component: CustomersList,
});

function initials(name: string) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

function CustomersList() {
  const [q, setQ] = useState("");
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", q],
    queryFn: async () => {
      let qy = supabase.from("customers").select("*").is("deleted_at", null).order("id", { ascending: false });
      if (q.trim()) {
        const term = q.trim();
        if (/^\d+$/.test(term)) {
          qy = supabase.from("customers").select("*").is("deleted_at", null).eq("id", Number(term));
        } else {
          qy = qy.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
        }
      }
      const { data, error } = await qy;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <AppHeader title="گاہک" />
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
          <Link to="/app/customers/new">
            <Button size="icon" className="h-12 w-12 rounded-2xl shadow-elevated">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-display">
            تمام گاہک
          </span>
          <span className="text-[11px] text-muted-foreground font-display" dir="ltr">
            {customers.length} total
          </span>
        </div>

        {customers.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-dashed bg-card/50">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-muted inline-flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">کوئی گاہک نہیں ملا</div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {customers.map((c) => (
              <Link key={c.id} to="/app/customers/$id" params={{ id: String(c.id) }}>
                <Card className="p-3.5 rounded-2xl border-0 shadow-card hover:shadow-elevated transition-all active:scale-[0.99] flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="bg-foreground text-background rounded-2xl h-12 w-12 flex items-center justify-center font-bold font-display text-sm">
                      {initials(c.name)}
                    </div>
                    <span className="absolute -bottom-1 -left-1 text-[9px] font-display font-semibold bg-gold text-gold-foreground rounded-full px-1.5 py-0.5 shadow-card" dir="ltr">
                      #{c.id}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.name}</div>
                    {c.phone && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5" dir="ltr">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
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
