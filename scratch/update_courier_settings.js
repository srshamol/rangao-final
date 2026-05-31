import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

console.log("Updating BDCourier Settings in Supabase at:", SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "bdinfosky@gmail.com",
    password: "11223311",
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  console.log("Authenticated successfully as admin!");
  supabase.auth.setSession(authData.session);

  const courier_settings = {
    default_courier: "bdcourier",
    auto_sync_hours: 6,
    bdcourier_api_key: "boWqqVJl9XzMbSJy5WAm4TUo6C1c8tJTysDiyCiXco00WwLAmOfaHfixR8T3",
    bdcourier_base_url: "https://api.bdcourier.com",
    bdcourier_enabled: true
  };

  const { error } = await supabase
    .from("store_settings")
    .upsert({ 
      key: "courier_settings", 
      value: courier_settings,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

  if (error) {
    console.error("Error updating courier settings:", error.message);
  } else {
    console.log("Successfully updated BDCourier settings in the database!");
  }
}

main().catch(console.error);
