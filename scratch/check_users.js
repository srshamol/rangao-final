import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Sign in as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "bdinfosky@gmail.com",
    password: "11223311",
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  console.log("Authenticated successfully!");
  
  // Fetch profiles
  const { data: profiles, error: pError } = await supabase
    .from("customer_profiles")
    .select("user_id, email, full_name, phone");
  if (pError) console.error("Profiles error:", pError.message);
  else console.log("Profiles:", profiles);

  // Fetch roles
  const { data: roles, error: rError } = await supabase
    .from("user_roles")
    .select("user_id, role");
  if (rError) console.error("Roles error:", rError.message);
  else console.log("Roles:", roles);
}

main().catch(console.error);
