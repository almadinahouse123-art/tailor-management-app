import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCustomers from "./tools/list-customers";
import createCustomer from "./tools/create-customer";
import listOrders from "./tools/list-orders";
import createOrder from "./tools/create-order";
import updateOrderStatus from "./tools/update-order-status";
import listInventory from "./tools/list-inventory";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "almadina-stitching-suite",
  title: "Almadina Stitching Suite",
  version: "0.1.0",
  instructions:
    "Tools for the Almadina Cloth House and Stitching shop. Look up or add customers, list and create stitching orders, move orders through stitching/ready/delivered, and check stock levels. All data is scoped to the signed-in shop account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCustomers, createCustomer, listOrders, createOrder, updateOrderStatus, listInventory],
});
