import { createClient } from "@supabase/supabase-js";

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
      .select("id, name, category, updated_at")
      .eq("status", "active");

    // Helper to generate slug
    const slugify = (text: string): string => {
      if (!text) return "";
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\u0980-\u09FFa-z0-9-]/g, "")
        .replace(/\-\-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
    };

    // 4. Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const currentDate = new Date().toISOString().split("T")[0];

    // Static pages
    const staticRoutes = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/products", priority: "0.8", changefreq: "daily" },
      { path: "/blog", priority: "0.8", changefreq: "weekly" },
      { path: "/about", priority: "0.5", changefreq: "monthly" },
    ];

    staticRoutes.forEach((route) => {
      xml += `  <url>\n`;
      xml += `    <loc>${domain}${route.path}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Category pages
    if (categories) {
      categories.forEach((cat) => {
        const lastmod = cat.updated_at ? new Date(cat.updated_at).toISOString().split("T")[0] : currentDate;
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/category/${encodeURIComponent(cat.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.6</priority>\n`;
        xml += `  </url>\n`;
      });
    }

    // Product pages
    if (products) {
      products.forEach((prod) => {
        const lastmod = prod.updated_at ? new Date(prod.updated_at).toISOString().split("T")[0] : currentDate;
        const categorySlug = prod.category ? slugify(prod.category) : "";
        const nameSlug = prod.name ? slugify(prod.name) : "";
        const productPath = (categorySlug && nameSlug) ? `/${categorySlug}/${nameSlug}` : `/product/${prod.id}`;
        
        xml += `  <url>\n`;
        xml += `    <loc>${domain}${productPath}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      });
    }

    // Blog post helper to generate slug
    const generateSlug = (text: string): string => {
      if (!text) return "";
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/\-\-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
    };

    // Fetch and append blog posts
    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("id, title, updated_at")
      .eq("is_active", true);

    if (blogPosts) {
      blogPosts.forEach((post) => {
        const slug = generateSlug(post.title) || post.id;
        const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split("T")[0] : currentDate;
        xml += `  <url>\n`;
        xml += `    <loc>${domain}/blog/${encodeURIComponent(slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });
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
