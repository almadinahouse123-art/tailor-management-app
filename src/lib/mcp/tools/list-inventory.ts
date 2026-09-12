import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_inventory",
  title: "List stock items",
  description:
    "List the shop's stock items with quantity and price, optionally only those at or below their low-stock threshold.",
  inputSchema: {
    low_stock_only: z.boolean().optional().describe("When true, return only items running low."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ low_stock_only, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("inventory")
      .select("id, item_name, category, quantity, unit, unit_price, low_stock_threshold")
      .is("deleted_at", null)
      .order("item_name")
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = low_stock_only
      ? (data ?? []).filter((r) => Number(r.quantity) <= Number(r.low_stock_threshold))
      : (data ?? []);
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { items: rows },
    };
  },
});
