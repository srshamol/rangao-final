import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually parse .env file since dotenv is not installed
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn("Failed to load .env file manually:", e.message);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

function slugify(text) {
  if (!text) return "";
  
  const textStr = text.toString().toLowerCase().trim();
  
  const transliteMap = {
    "উডেন-ডেকোর-আইটেম": "wooden-decor",
    "উডেন ডেকোর আইটেম": "wooden-decor",
    "উডেন-ডেকোর": "wooden-decor",
    "এক্রেলিক-ডেকোর-আইটেম": "acrylic-decor",
    "এক্রেলিক ডেকোর আইটেম": "acrylic-decor",
    "এক্রেলিক-ডেকোর": "acrylic-decor",
    "3d-বর্ডার-ওয়াল-ক্যানভাস": "3d-border-wall-canvas",
    "3d বর্ডার ওয়াল ক্যানভাস": "3d-border-wall-canvas",
    "দোয়া-স্টিকার": "dua-stickers",
    "দোয়া স্টিকার": "dua-stickers",
    "ডেকোরেটিভ-লাইটস": "decorative-lights",
    "ডেকোরেটিভ লাইটস": "decorative-lights",
    "ইসলামিক-এক্সাসরিজ": "islamic-accessories",
    "ইসলামিক এক্সাসরিজ": "islamic-accessories",
    "গ্লাস-ফ্রেম": "glass-frames",
    "গ্লাস ফ্রেম": "glass-frames",
  };

  const key = textStr.replace(/\s+/g, "-");
  if (transliteMap[key]) {
    return transliteMap[key];
  }

  return textStr
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function main() {
  console.log("Connecting to Supabase at:", SUPABASE_URL);
  // Sign in as admin to modify store_settings
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

  // 1. Fetch all products
  console.log("Fetching products...");
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id, name, sku, category");

  if (prodError) {
    console.error("Error fetching products:", prodError.message);
    return;
  }

  console.log(`Found ${products.length} products to process.`);

  for (const p of products) {
    const categorySlug = p.category ? slugify(p.category) : "category";
    const skuSlug = p.sku ? slugify(p.sku) : slugify(p.name);
    
    if (!skuSlug) {
      console.warn(`Skipping product ${p.id} due to empty name and SKU.`);
      continue;
    }

    const newCanonicalUrl = `https://www.rangao.bd/${categorySlug}/${skuSlug}`;
    const key = `product_seo_${p.id}`;

    // Fetch existing SEO settings
    const { data: existingSettings } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    const value = existingSettings?.value || {
      seo_title: p.name,
      seo_description: `প্রিমিয়াম কোয়ালিটির ${p.name} রাঙাও অনলাইন স্টোর থেকে কিনুন।`,
      faqs: []
    };

    // Update the canonical URL
    value.canonical_url = newCanonicalUrl;

    console.log(`Updating ${p.name} URL to: ${newCanonicalUrl}`);
    const { error: upsertError } = await supabase
      .from("store_settings")
      .upsert({ key, value }, { onConflict: "key" });

    if (upsertError) {
      console.error(`Error updating settings for key ${key}:`, upsertError.message);
    }
  }

  console.log("All product URLs updated successfully!");
}

main().catch(console.error);
