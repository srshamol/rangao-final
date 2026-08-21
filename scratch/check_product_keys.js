import { createClient } from "@supabase/supabase-js";

const sb = createClient("https://yglexjxvypwmvjvsspil.supabase.co", "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-");

async function main() {
  const { data, error } = await sb.from("products").select("*").limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Product columns:", Object.keys(data[0] || {}));
    console.log("Sample product:", data[0]);
  }
}

main().then(() => process.exit(0));
