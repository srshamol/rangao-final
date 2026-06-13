import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envContent = fs.readFileSync(".env", "utf8");
const vars = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    vars[match[1]] = value;
  }
});

const supabaseUrl = vars.VITE_SUPABASE_URL;
const supabaseKey = vars.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("URL:", supabaseUrl);
console.log("Key:", supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("key", "payment_methods")
    .maybeSingle();

  if (error) {
    console.error("Error fetching payment methods:", error);
  } else {
    console.log("Payment methods settings:", JSON.stringify(data, null, 2));
  }
}

run();
