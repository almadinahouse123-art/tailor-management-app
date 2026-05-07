import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, UserCog, Phone } from "lucide-react";
import { fmtMoney } from "@/lib/tailoring";

export const Route = createFileRoute("/app/workers/")({
  component: WorkersList,
});

function WorkersList() {
  const [q, setQ] = useState("");
  const { data: workers = [] } = useQuery({
    queryKey: ["workers", q],
    queryFn: async () => {
      let qy = supabase.from("workers").select("*").order("id", { ascending: false });
      if (q.trim()) {
        const t = q.trim();
        if (/^\d+$/.test(t)) qy = supabase.from("workers").select("*").eq("id", Number(t));
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
      <div className="px-4 py-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="نام، فون یا ID سے تلاش"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-9"
            />
          </div>
          <Link to="/app/workers/new">
            <Button size="icon" className="bg-gradient-primary">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {workers.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">کوئی کاریگر نہیں ملا</Card>
        ) : (
          <div className="space-y-2">
            {workers.map((w) => (
              <Link key={w.id} to="/app/workers/$id" params={{ id: String(w.id) }}>
                <Card className="p-3 flex items-center gap-3 shadow-card hover:shadow-lg transition-shadow">
                  <div className="bg-primary/10 text-primary rounded-full h-10 w-10 flex items-center justify-center font-bold">
                    {w.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1">
                      <UserCog className="h-3.5 w-3.5 text-muted-foreground" /> {w.name}
                      {!w.active && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded mr-1">غیر فعال</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {w.phone && (
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone className="h-3 w-3" /> {w.phone}
                        </span>
                      )}
                      <span>{fmtMoney(w.rate_per_suit)}/سوٹ</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
