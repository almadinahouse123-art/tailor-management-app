import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_order_status",
  title: "Update order status",
  description:
    "Change the status of an existing order (for example to stitching, ready or delivered), and optionally record a paid amount.",
  inputSchema: {
    order_id: z.number().int().describe("Order id to update."),
    status: z.string().trim().min(1).describe("New status, e.g. pending, stitching, ready, delivered."),
    paid_amount: z.number().optional().describe("Updated total paid amount for this order."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_id, status, paid_amount }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("orders")
      .update({ status, ...(typeof paid_amount === "number" ? { paid_amount } : {}) })
      .eq("id", order_id)
      .is("deleted_at", null)
      .select("id, status, total_amount, paid_amount")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return { content: [{ type: "text", text: `No order found with id ${order_id}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { order: data },
    };
  },
});
