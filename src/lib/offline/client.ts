import { supabase as cloud } from "@/integrations/supabase/client";
import { offlineFrom } from "./query";

/**
 * Offline-capable drop-in replacement for the generated Supabase client.
 *
 * - Reads go to the cloud when online (and are mirrored into IndexedDB),
 *   and fall back to the local mirror when offline / on network failure.
 * - Writes go to the cloud when online, and are written locally + queued
 *   in the outbox when offline (replayed in order by the sync engine).
 * - Everything else (auth, storage, functions) proxies to the real client.
 */
export const supabase = new Proxy(cloud as any, {
  get(target, prop, receiver) {
    if (prop === "from") return (table: string) => offlineFrom(table);
    return Reflect.get(target, prop, receiver);
  },
}) as typeof cloud;

export { cloud };
