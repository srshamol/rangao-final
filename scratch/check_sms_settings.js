import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("key", "sms_settings")
    .maybeSingle();

  if (error) {
    console.error("Error fetching SMS settings:", error);
  } else {
    console.log("SMS settings:", JSON.stringify(data, null, 2));
  }
}

check();
