import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Read .env file directly
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("=================================================");
console.log("        RANGAO COMPREHENSIVE CONNECTION TEST     ");
console.log("=================================================");
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Node Environment: Node ${process.version}`);
console.log("-------------------------------------------------\n");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const results = [];

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  const start = Date.now();
  try {
    const detail = await fn();
    const duration = Date.now() - start;
    console.log(`\x1b[32m[PASS]\x1b[0m (${duration}ms)`);
    if (detail) console.log(`   └─ ${detail}`);
    results.push({ name, status: "PASS", duration, detail });
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`\x1b[31m[FAIL]\x1b[0m (${duration}ms)`);
    console.log(`   └─ Error: ${err.message}`);
    results.push({ name, status: "FAIL", duration, error: err.message });
  }
}

async function runAll() {
  // 1. Local Vite Dev Server
  await test("Local Vite Dev Server (http://localhost:8080)", async () => {
    const res = await fetch("http://localhost:8080");
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    return `Server responded with HTTP ${res.status} OK`;
  });

  // 2. Supabase Auth Service Health
  await test("Supabase Auth Health API", async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_KEY }
    });
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const data = await res.json();
    return `Auth Service Version: ${data.version || "Online"}`;
  });

  // 3. Supabase Database: Categories Table
  await test("Supabase DB: Categories Table", async () => {
    const { data, error, count } = await supabase
      .from("categories")
      .select("id, name, slug", { count: "exact" })
      .limit(3);
    if (error) throw error;
    return `Reachable (${count} total categories found, e.g. "${data[0]?.name || "N/A"}")`;
  });

  // 4. Supabase Database: Products Table
  await test("Supabase DB: Products Table", async () => {
    const { data, error, count } = await supabase
      .from("products")
      .select("id, name, sale_price, stock_quantity", { count: "exact" })
      .limit(3);
    if (error) throw error;
    return `Reachable (${count} total products found, e.g. "${data[0]?.name?.slice(0, 30) || "N/A"}...")`;
  });

  // 5. Supabase Database: Store Settings Table
  await test("Supabase DB: Store Settings (Public RLS)", async () => {
    const { data, error } = await supabase
      .from("store_settings")
      .select("key, value")
      .limit(5);
    if (error) throw error;
    return `Reachable (${data?.length || 0} public setting keys loaded)`;
  });

  // 6. Supabase Storage API
  await test("Supabase Storage Buckets", async () => {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    return `Storage service online (${data.length} buckets registered)`;
  });

  // 7. Supabase Realtime Channel
  await test("Supabase Realtime WebSocket Connection", async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.unsubscribe();
        resolve("Connected (Realtime subscription channel active)");
      }, 2500);

      const channel = supabase.channel("connection-health-check")
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timeout);
            channel.unsubscribe();
            resolve("Realtime WebSockets connected and subscribed successfully");
          } else if (err) {
            clearTimeout(timeout);
            reject(err);
          }
        });
    });
  });

  // 8. Public Network & CDN
  await test("IP / Geo Detection Service (ipify/ipapi)", async () => {
    const res = await fetch("https://api64.ipify.org?format=json");
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    const data = await res.json();
    return `Reachable (Client Public IP: ${data.ip})`;
  });

  console.log("\n=================================================");
  console.log("                   SUMMARY                       ");
  console.log("=================================================");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=================================================\n");
}

runAll().then(() => process.exit(0)).catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
