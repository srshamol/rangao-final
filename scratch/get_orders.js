import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, order_status, created_at");

  if (error) {
    console.error("Error fetching orders:", error.message);
    return;
  }

  console.log("Total orders:", orders.length);

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1;
    return acc;
  }, {});

  console.log("Order counts by status:", JSON.stringify(statusCounts, null, 2));
}

main().catch(console.error);
