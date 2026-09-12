import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_order",
  title: "Create order",
  description: "Create a new stitching order for an existing customer of the signed-in shop.",
  inputSchema: {
    customer_id: z.number().int().describe("Existing customer id."),
    total_amount: z.number().optional().describe("Total order amount."),
    paid_amount: z.number().optional().describe("Amount already paid."),
    delivery_date: z.string().optional().describe("Promised delivery date as YYYY-MM-DD."),
    design_type: z.string().optional().describe("Design type, e.g. simple or chakpate."),
    color: z.string().optional().describe("Fabric colour."),
    instructions: z.string().optional().describe("Special stitching instructions."),
    status: z.string().optional().describe("Initial status (defaults to the app's default)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: ctx.getUserId()!,
        customer_id: input.customer_id,
        total_amount: input.total_amount ?? 0,
        paid_amount: input.paid_amount ?? 0,
        delivery_date: input.delivery_date ?? null,
        design_type: input.design_type ?? null,
        color: input.color ?? null,
        instructions: input.instructions ?? null,
        ...(input.status ? { status: input.status } : {}),
      })
      .select("id, customer_id, status, order_date, delivery_date, total_amount, paid_amount")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { order: data },
    };
  },
});
