import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const transliteMap: Record<string, string> = {
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
  "ডেকোরেティブ-লাইটস": "decorative-lights",
  "ডেকোরেティブ লাইটস": "decorative-lights",
  "ইসলামিক-এক্সাসরিজ": "islamic-accessories",
  "ইসলামিক এক্সাসরিজ": "islamic-accessories",
  "গ্লাস-ফ্রেম": "glass-frames",
  "গ্লাস ফ্রেম": "glass-frames",
};

function slugify(text: string): string {
  if (!text) return "";
  const textStr = text.toString().toLowerCase().trim();
  const key = textStr.replace(/\s+/g, "-");
  if (transliteMap[key]) {
    return transliteMap[key];
  }
  return textStr
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\u0980-\u09FF-]/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function getCanonicalProductPath(prod: { id: string; name: string; sku?: string; category?: string }): string {
  const categorySlug = prod.category ? slugify(prod.category) : "products";
  const nameSlug = prod.sku ? slugify(prod.sku) : slugify(prod.name);
  if (categorySlug && nameSlug) {
    return `/${encodeURIComponent(categorySlug)}/${encodeURIComponent(nameSlug)}`;
  }
  return `/product/${encodeURIComponent(prod.id)}`;
}

export default async function handler(req: any, res: any) {
  try {
    // 1. Fetch website root URL from settings (fallback to standard domain)
    const { data: storeInfoData } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "store_info")
      .maybeSingle();

    const host = req.headers.host || "www.rangao.bd";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const requestDomain = `${proto}://${host}`;

    const storeVal = (storeInfoData as any)?.value || {};
    const siteDomain = storeVal.website_url || requestDomain;
    const domain = siteDomain.endsWith("/") ? siteDomain.slice(0, -1) : siteDomain;

    // 2. Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    // 3. Fetch products
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku, category, updated_at")
      .eq("status", "active");

    // 4. Fetch blog posts
    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("id, title, updated_at")
      .eq("is_active", true);

    const currentDate = new Date().toISOString().split("T")[0];

    // Use a Map to guarantee zero duplicate loc entries
    const urlMap = new Map<string, { loc: string; lastmod: string; changefreq: string; priority: string }>();

    // Static pages
    const staticRoutes = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/products", priority: "0.8", changefreq: "daily" },
      { path: "/blog", priority: "0.8", changefreq: "weekly" },
      { path: "/about", priority: "0.5", changefreq: "monthly" },
    ];

    staticRoutes.forEach((route) => {
      const loc = `${domain}${route.path}`;
      urlMap.set(loc, {
        loc,
        lastmod: currentDate,
        changefreq: route.changefreq,
        priority: route.priority,
      });
    });

    // Category pages
    if (categories) {
      categories.forEach((cat) => {
        const lastmod = cat.updated_at ? new Date(cat.updated_at).toISOString().split("T")[0] : currentDate;
        const loc = `${domain}/category/${encodeURIComponent(cat.slug)}`;
        urlMap.set(loc, {
          loc,
          lastmod,
          changefreq: "weekly",
          priority: "0.6",
        });
      });
    }

    // Product pages
    if (products) {
      products.forEach((prod) => {
        const lastmod = prod.updated_at ? new Date(prod.updated_at).toISOString().split("T")[0] : currentDate;
        const canonicalPath = getCanonicalProductPath(prod);
        const loc = `${domain}${canonicalPath}`;
        urlMap.set(loc, {
          loc,
          lastmod,
          changefreq: "daily",
          priority: "0.8",
        });
      });
    }

    // Blog post pages
    if (blogPosts) {
      blogPosts.forEach((post) => {
        const slug = slugify(post.title) || post.id;
        const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split("T")[0] : currentDate;
        const loc = `${domain}/blog/${encodeURIComponent(slug)}`;
        urlMap.set(loc, {
          loc,
          lastmod,
          changefreq: "weekly",
          priority: "0.7",
        });
      });
    }

    // 5. Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const item of urlMap.values()) {
      xml += `  <url>\n`;
      xml += `    <loc>${item.loc}</loc>\n`;
      xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
      xml += `    <priority>${item.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>\n`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error("Sitemap generation error:", err);
    // Minimal fallback sitemap
    const currentDate = new Date().toISOString().split("T")[0];
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.rangao.bd/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(200).send(fallbackXml);
  }
}
