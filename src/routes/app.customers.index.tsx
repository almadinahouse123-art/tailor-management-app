import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Search, User } from "lucide-react";

export const Route = createFileRoute("/app/customers/")({
  component: CustomersList,
});

function CustomersList() {
  const [q, setQ] = useState("");
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", q],
    queryFn: async () => {
      let qy = supabase.from("customers").select("*").order("id", { ascending: false });
      if (q.trim()) {
        const term = q.trim();
        if (/^\d+$/.test(term)) {
          qy = supabase.from("customers").select("*").eq("id", Number(term));
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
          <Link to="/app/customers/new">
            <Button size="icon" className="bg-gradient-primary"><Plus className="h-4 w-4" /></Button>
          </Link>
        </div>

        {customers.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">کوئی گاہک نہیں ملا</Card>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <Link key={c.id} to="/app/customers/$id" params={{ id: String(c.id) }}>
                <Card className="p-3 flex items-center gap-3 shadow-card hover:shadow-lg transition-shadow">
                  <div className="bg-primary/10 text-primary rounded-full h-10 w-10 flex items-center justify-center font-bold">
                    {c.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> {c.name}
                    </div>
                    {c.phone && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
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
