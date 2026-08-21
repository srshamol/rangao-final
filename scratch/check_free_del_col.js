import { createClient } from "@supabase/supabase-js";

const sb = createClient("https://yglexjxvypwmvjvsspil.supabase.co", "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-");

async function checkColumn() {
  const { data, error } = await sb.from("products").select("id, is_free_delivery").limit(1);
  console.log("is_free_delivery check:", error ? error.message : data);
}

checkColumn().then(() => process.exit(0));
