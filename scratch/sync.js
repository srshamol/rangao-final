import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

async function main() {
  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "bdinfosky@gmail.com",
    password: "11223311",
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  console.log("Logged in successfully!");
  supabase.auth.setSession(authData.session);

  // Get categories
  const { data: categories, error: catError } = await supabase.from("categories").select("*");
  if (catError) {
    console.error("Error reading categories:", catError);
    return;
  }
  console.log("Database Categories:", categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })));

  // Get products
  const { data: products, error: prodError } = await supabase.from("products").select("*");
  if (prodError) {
    console.error("Error reading products:", prodError);
    return;
  }
  console.log("Database Products:", products.map(p => ({ id: p.id, name: p.name, category: p.category })));

  // Sync logic:
  // If product's category slug doesn't match any category slug by exact string,
  // let's try to map them or update them to the closest existing category!
  // For instance, mapping products with 'wall-canvas' category to 'wall-canvas' or updating categories.
  // Wait, let's see if we should upsert standard categories and ensure products have matching category values!
  
  const standardCategories = [
    { name: "ওয়াল ক্যানভাস", slug: "wall-canvas", image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80", sort_order: 1, is_active: true },
    { name: "ইসলামিক পোস্টার", slug: "islamic-posters", image_url: "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=600&q=80", sort_order: 2, is_active: true },
    { name: "ক্যালিগ্রাফি আর্ট", slug: "calligraphy-art", image_url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80", sort_order: 3, is_active: true },
    { name: "হোম ডেকোর", slug: "home-decor", image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80", sort_order: 4, is_active: true },
    { name: "অ্যাক্সেসরিজ", slug: "accessories", image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80", sort_order: 5, is_active: true }
  ];

  console.log("Upserting standard categories...");
  for (const cat of standardCategories) {
    const { error } = await supabase.from("categories").upsert(cat, { onConflict: "slug" });
    if (error) console.error("Error upserting:", cat.slug, error);
  }

  // Update products categories to make sure they match
  console.log("Checking products categories...");
  for (const p of products) {
    let updatedCat = p.category;
    // Map any lowercase or slightly different names to the correct standard slugs
    if (p.category === "wall_canvas" || p.category === "ওয়াল ক্যানভাস") updatedCat = "wall-canvas";
    if (p.category === "islamic_posters" || p.category === "ইসলামিক পোস্টার") updatedCat = "islamic-posters";
    if (p.category === "calligraphy_art" || p.category === "ক্যালিগ্রাফি আর্ট") updatedCat = "calligraphy-art";
    if (p.category === "home_decor" || p.category === "হোম ডেকোর") updatedCat = "home-decor";

    if (updatedCat !== p.category) {
      console.log(`Updating product "${p.name}" category from "${p.category}" to "${updatedCat}"`);
      const { error } = await supabase.from("products").update({ category: updatedCat }).eq("id", p.id);
      if (error) console.error("Error updating product:", p.name, error);
    }
  }

  console.log("Synchronization complete!");
}

main().catch(console.error);
