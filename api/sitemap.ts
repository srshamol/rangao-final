import { createClient } from "@supabase/supabase-js";

// Utility to generate URL slug (same logic as client-side)
function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  try {
    // 1. Fetch website root URL from settings (fallback to standard domain)
    const { data: storeInfoData } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "store_info")
      .maybeSingle();
    
    const storeVal = (storeInfoData as any)?.value || {};
    const siteDomain = storeVal.website_url || "https://www.rangao.bd";
    const domain = siteDomain.endsWith("/") ? siteDomain.slice(0, -1) : siteDomain;

    // 2. Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    // 3. Fetch products
    const { data: products } = await supabase
      .from("products")
      .select("id, updated_at")
      .eq("status", "active");

    // 4. Fetch blog posts
    const { data: blogPosts } = await supabase
      .from("blog_posts" as any)
      .select("id, title, created_at, updated_at")
      .eq("is_active", true);

    // 5. Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static Routes
    const currentDate = new Date().toISOString().split("T")[0];
    const staticRoutes = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/products", priority: "0.8", changefreq: "daily" },
      { path: "/blog", priority: "0.7", changefreq: "weekly" },
      { path: "/checkout", priority: "0.5", changefreq: "monthly" },
    ];

    staticRoutes.forEach((route) => {
      xml += `  <url>\n`;
      xml += `    <loc>${domain}${route.path}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic Category Routes
    if (categories) {
      categories.forEach((cat) => {
        const lastmod = cat.updated_at ? new Date(cat.updated_at).toISOString().split("T")[0] : currentDate;
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/category/${cat.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      });
    }

    // Dynamic Product Routes
    if (products) {
      products.forEach((prod) => {
        const lastmod = prod.updated_at ? new Date(prod.updated_at).toISOString().split("T")[0] : currentDate;
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/product/${prod.id}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
      });
    }

    // Dynamic Blog Post Routes (support both ID and Slug URLs)
    if (blogPosts) {
      blogPosts.forEach((post) => {
        const lastmod = post.updated_at || post.created_at
          ? new Date(post.updated_at || post.created_at).toISOString().split("T")[0]
          : currentDate;
        const slug = generateSlug(post.title);
        
        // Output post id URL (standard)
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/blog/${post.id}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;

        // Output slug URL (SEO friendly)
        if (slug) {
          xml += `  <url>\n`;
          xml += `    <loc>${domain}/blog/${slug}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += `  </url>\n`;
        }
      });
    }

    xml += `</urlset>\n`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200");
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error("Sitemap generation error:", err);
    return res.status(500).send("Error generating sitemap");
  }
}
