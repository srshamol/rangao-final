import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

console.log("Seeding Supabase DB at:", SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

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

  console.log("Authenticated successfully as admin!");
  supabase.auth.setSession(authData.session);

  // 1. Categories seed
  console.log("Seeding categories...");
  const categories = [
    { name: "ওয়াল ক্যানভাস", slug: "wall-canvas", image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80", sort_order: 1, is_active: true },
    { name: "ইসলামিক পোস্টার", slug: "islamic-posters", image_url: "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=600&q=80", sort_order: 2, is_active: true },
    { name: "ক্যালিগ্রাফি আর্ট", slug: "calligraphy-art", image_url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80", sort_order: 3, is_active: true },
    { name: "হোম ডেকোর", slug: "home-decor", image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80", sort_order: 4, is_active: true },
    { name: "অ্যাক্সেসরিজ", slug: "accessories", image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80", sort_order: 5, is_active: true }
  ];

  for (const cat of categories) {
    const { error } = await supabase
      .from("categories")
      .upsert(cat, { onConflict: "slug" });
    if (error) console.error("Error seeding category:", cat.slug, error.message);
  }

  // 2. Products seed
  console.log("Seeding products...");
  
  // Clear any existing products to prevent tech/smartwatch layout remnants
  const { data: existingProducts } = await supabase.from("products").select("id, name");
  if (existingProducts && existingProducts.length > 0) {
    for (const p of existingProducts) {
      if (p.name.toLowerCase().includes("galaxy") || p.name.toLowerCase().includes("watch")) {
        console.log("Removing tech product:", p.name);
        await supabase.from("products").delete().eq("id", p.id);
      }
    }
  }

  const products = [
    {
      name: "কাবা শরীফ ৫ প্যানেল ক্যানভাস",
      sku: "RNG-KABA-05",
      category: "wall-canvas",
      regular_price: 2000,
      sale_price: 1450,
      stock_quantity: 48,
      description: "রাঙাও ক্যানভাস সিরিজের প্রিমিয়াম কাবা শরীফ ৫ প্যানেল ওয়াল আর্ট। আপনার ড্রয়িং রুমে ইসলামিক নান্দনিকতা যোগ করবে। প্রিমিয়াম ফিনিশিং, নিখুঁত লেজার কাটিং এবং দীর্ঘস্থায়ী কাঠ ব্যবহার করে এটি তৈরি করা হয়েছে।",
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=600&q=80"
      ],
      featured: true,
      rating: 4.8,
      review_count: 220,
      status: "active",
      tags: ["kaba", "canvas", "popular"]
    },
    {
      name: "আয়াতুল কুরসি ক্যালিগ্রাফি ফ্রেম",
      sku: "RNG-AK-WOOD",
      category: "calligraphy-art",
      regular_price: 1600,
      sale_price: 1258,
      stock_quantity: 25,
      description: "লেজার খোদাইকৃত প্রিমিয়াম কাঠের আয়াতুল কুরসি ৩ডি ক্যালিগ্রাফি আর্ট যা আপনার ঘরের ওয়াল সজ্জাকে অনন্য ও প্রিমিয়াম করবে।",
      images: [
        "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"
      ],
      featured: true,
      rating: 4.9,
      review_count: 145,
      status: "active",
      tags: ["ayatul-kursi", "wood", "new"]
    },
    {
      name: "সূরা ইয়াসীন পোস্টার",
      sku: "RNG-SY-POST",
      category: "islamic-posters",
      regular_price: 500,
      sale_price: 350,
      stock_quantity: 80,
      description: "প্রিমিয়াম ম্যাট ফিনিশ ও গোল্ডেন ফয়েল সম্বলিত সূরা ইয়াসীন এর দেওয়াল আর্ট পোস্টার। ফাইবার বডি ও সামনের কাচ সহ ফ্রেমযুক্ত।",
      images: [
        "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=600&q=80"
      ],
      featured: true,
      rating: 4.7,
      review_count: 104,
      status: "active",
      tags: ["yasin", "poster", "best-seller"]
    },
    {
      name: "তসবিহ লিমিটেড ক্ল্যাসিক কালেকশন",
      sku: "RNG-TASBIH-01",
      category: "accessories",
      regular_price: 550,
      sale_price: 450,
      stock_quantity: 35,
      description: "প্রাকৃতিক কাঠের পুঁতি ও প্রিমিয়াম ফিনিশিং এর ১০০ দানার এক্সক্লুসিভ তসবিহ কালেকশন। চমৎকার গিফট বক্স সহ কাস্টম প্যাকেজিং।",
      images: [
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80"
      ],
      featured: true,
      rating: 4.8,
      review_count: 82,
      status: "active",
      tags: ["tasbih", "accessories", "popular"]
    }
  ];

  for (const p of products) {
    const { error } = await supabase
      .from("products")
      .upsert(p, { onConflict: "sku" });
    if (error) console.error("Error seeding product:", p.sku, error.message);
  }

  // 3. Testimonials seed
  console.log("Seeding testimonials...");
  const testimonials = [
    {
      customer_name: "রাশেদুল ইসলাম",
      customer_location: "ঢাকা",
      customer_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
      rating: 5,
      review: "প্রোডাক্টের কোয়ালিটি অনেক ভালো এবং এটি আমার ঘরের দেয়ালে অত্যন্ত মানানসই হয়েছে। ডেলিভারিও খুব দ্রুত পেয়েছি। আলহামদুলিল্লাহ!",
      is_active: true,
      sort_order: 1
    },
    {
      customer_name: "সাবিহা ইয়াসমিন",
      customer_location: "চট্টগ্রাম",
      customer_image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
      rating: 5,
      review: "দারুণ একটি ডেকোরেশন! আমার ড্রয়িং রুমের সৌন্দর্য অনেক বাড়িয়ে দিয়েছে। কাজের ফিনিশিং এবং কাটিং সত্যি প্রশংসনীয়।",
      is_active: true,
      sort_order: 2
    },
    {
      customer_name: "মোহাম্মদ শিহাব",
      customer_location: "সিলেট",
      customer_image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
      rating: 5,
      review: "প্যাকেজিং দারুণ ছিল এবং প্রোডাক্টটি একদম ছবির মতোই পেয়েছি। কোনো রকমের ড্যামেজ ছাড়া যত্নসহকারে ডেলিভারি করা হয়েছে। ১০/১০!",
      is_active: true,
      sort_order: 3
    }
  ];

  // Truncate or insert
  await supabase.from("testimonials").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  for (const t of testimonials) {
    const { error } = await supabase.from("testimonials").insert(t);
    if (error) console.error("Error seeding testimonial:", error.message);
  }

  // 4. Update Store Settings keys to represent premium Islamic brand
  console.log("Seeding store settings...");
  
  const hero_banner = {
    enabled: true,
    slides: [
      {
        id: "slide-1",
        title: "আপনার ঘরকে করুন\nইসলামিক ও সুন্দর",
        subtitle: "প্রিমিয়াম 3D ইসলামিক ওয়াল ক্যানভাস\nসহজে অর্ডার করুন, দ্রুত ডেলিভারি পান",
        description: "অভিজাত ইসলামিক ওয়াল ডেকোর দিয়ে ঘর সাজান",
        badge_text: "✦ রাঙাও প্রিমিয়াম কালেকশন ✦",
        cta_primary_text: "এখনি শপ করুন",
        cta_primary_url: "#products",
        cta_secondary_text: "সকল কালেকশন দেখুন",
        cta_secondary_url: "/products",
        banner_image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
        banner_video_url: "",
        overlay_opacity: 0.2,
        text_align: "left",
        enabled: true
      }
    ]
  };

  const contact_info = {
    phone: "01812-345678",
    whatsapp: "8801812345678",
    email: "hello@rangao.bd",
    address: "ঢাকা, বাংলাদেশ",
    facebook_url: "https://facebook.com/rangao",
    instagram_url: "https://instagram.com/rangao"
  };

  const newsletter = {
    title: "আমাদের সাথে থাকুন",
    subtitle: "নতুন কালেকশন ও বিশেষ অফারের আপডেট পেতে",
    placeholder: "আপনার ইমেইল দিন",
    button_text: "সাবস্ক্রাইব করুন"
  };

  const offer_banner = {
    enabled: true,
    bg_image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    mobile_image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
    title: "প্রথম অর্ডারে বিশেষ ছাড়!",
    subtitle: "6% ডিসকাউন্ট. কুপন কোড: RANGAO5",
    coupon_code: "RANGAO5",
    button_text: "এখনি শপ করুন",
    button_url: "/products",
    start_date: "",
    end_date: "",
    show_countdown: false
  };

  const homepage_seo = {
    meta_title: "Rangao – রাঙাও | প্রিমিয়াম ইসলামিক ও হোম ডেকোর",
    meta_description: "রাঙাও – বাংলাদেশের প্রিমিয়াম ইসলামিক ক্যালিগ্রাফি, ওয়াল আর্ট ও হোম ডেকোর স্টোর।",
    meta_keywords: "ইসলামিক ডেকোর, ওয়াল আর্ট, নিকাহনামা, আয়াতুল কুরসি",
    og_image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80"
  };

  const trust_features = [
    { id: "tf-1", icon: "Truck", title: "ফ্রি ডেলিভারি", desc: "৳১,৫০০+ অর্ডারে" },
    { id: "tf-2", icon: "RotateCcw", title: "সহজ রিটার্ন", desc: "৭ দিনের ইজি রিটার্ন সুবিধা" },
    { id: "tf-3", icon: "ShieldCheck", title: "নিরাপদ পেমেন্ট", desc: "SSL এনক্রিপশন লেনদেন" },
    { id: "tf-4", icon: "Headset", title: "দ্রুত ডেলিভারি", desc: "১-৩ দিনের মধ্যে হোম ডেলিভারি" }
  ];

  const why_choose_us_items = [
    { id: "wc-1", icon: "Sparkles", title: "প্রিমিয়াম কোয়ালিটি", desc: "উচ্চমানের ক্যানভাস ও কাঠের দীর্ঘস্থায়ী ও টেকসই" },
    { id: "wc-2", icon: "Banknote", title: "সেরা দাম গ্যারান্টি", desc: "সর্বোচ্চ মানের পণ্য সবচেয়ে সাশ্রয়ী দামে" },
    { id: "wc-3", icon: "Truck", title: "দ্রুত ডেলিভারি", desc: "১-৩ দিনের মধ্যে সারা দেশে হোম ডেলিভারি" },
    { id: "wc-4", icon: "ShieldCheck", title: "নিরাপদ পেমেন্ট", desc: "SSL এনক্রিপশন ও নিরাপদ লেনদেন" }
  ];

  await supabase.from("store_settings").upsert({ key: "hero_banner", value: hero_banner }, { onConflict: "key" });
  await supabase.from("store_settings").upsert({ key: "contact_info", value: contact_info }, { onConflict: "key" });
  await supabase.from("store_settings").upsert({ key: "newsletter", value: newsletter }, { onConflict: "key" });
  await supabase.from("store_settings").upsert({ key: "offer_banner", value: offer_banner }, { onConflict: "key" });
  await supabase.from("store_settings").upsert({ key: "homepage_seo", value: homepage_seo }, { onConflict: "key" });
  await supabase.from("store_settings").upsert({ key: "trust_features", value: trust_features }, { onConflict: "key" });
  await supabase.from("store_settings").upsert({ key: "why_choose_us", value: why_choose_us_items }, { onConflict: "key" });

  console.log("All settings seeded perfectly!");
}

main().catch(console.error);
