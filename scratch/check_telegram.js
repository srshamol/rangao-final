import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

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

  console.log("Authenticated as admin.");
  supabase.auth.setSession(authData.session);

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("key", "telegram_settings")
    .maybeSingle();

  if (error) {
    console.error("Error querying settings:", error);
  } else {
    console.log("Telegram Settings row:", data);
  }
}

main().catch(console.error);
