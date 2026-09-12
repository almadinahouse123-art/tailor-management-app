import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "List orders",
  description:
    "List stitching orders for the signed-in shop, optionally filtered by status or customer id.",
  inputSchema: {
    status: z.string().optional().describe("Order status, e.g. pending, stitching, ready, delivered."),
    customer_id: z.number().int().optional().describe("Only orders for this customer id."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, customer_id, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("orders")
      .select(
        "id, customer_id, status, order_date, delivery_date, total_amount, paid_amount, design_type, color, customers(name, phone)",
      )
      .is("deleted_at", null)
      .order("order_date", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (status?.trim()) query = query.eq("status", status.trim());
    if (typeof customer_id === "number") query = query.eq("customer_id", customer_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
