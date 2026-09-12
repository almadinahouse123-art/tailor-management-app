import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_customer",
  title: "Create customer",
  description: "Add a new customer to the signed-in shop's customer list.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Customer full name."),
    phone: z.string().trim().optional().describe("Phone number."),
    address: z.string().trim().optional().describe("Address."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, phone, address }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("customers")
      .insert({ user_id: ctx.getUserId()!, name, phone: phone ?? null, address: address ?? null })
      .select("id, name, phone, address")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { customer: data },
    };
  },
});
