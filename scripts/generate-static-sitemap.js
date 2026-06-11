import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// 1. Simple parser for .env file to support any Node version
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn("Could not load .env file directly:", e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase URL or Key is missing. Skipping sitemap generation.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generate() {
  try {
    console.log("⏳ Starting static sitemap & robots.txt generation...");

    // Fetch store info
    const { data: storeInfoData } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "store_info")
      .maybeSingle();

    const storeVal = storeInfoData?.value || {};
    const siteDomain = storeVal.website_url || "https://www.rangao.bd";
    const domain = siteDomain.endsWith("/") ? siteDomain.slice(0, -1) : siteDomain;

    console.log(`🌐 Base domain resolved to: ${domain}`);

    // Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Fetch products
    const { data: products } = await supabase
      .from("products")
      .select("id, name, category, updated_at")
      .eq("status", "active");

    // Fetch blog posts
    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("id, title, updated_at")
      .eq("is_active", true);

    // Helper to generate slug
    const generateSlug = (text) => {
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

    const currentDate = new Date().toISOString().split("T")[0];

    // 1. Build sitemap.xml
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

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
        const categorySlug = prod.category ? generateSlug(prod.category) : "";
        const nameSlug = generateSlug(prod.name);
        const prodUrl = categorySlug && nameSlug 
          ? `${domain}/${categorySlug}/${nameSlug}` 
          : `${domain}/product/${prod.id}`;
        xml += `  <url>\n`;
        xml += `    <loc>${prodUrl}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      });
    }

    // Blog post pages
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

    // Ensure public folder exists
    const publicDir = path.resolve(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write sitemap.xml to public/
    const sitemapPath = path.join(publicDir, "sitemap.xml");
    fs.writeFileSync(sitemapPath, xml, "utf-8");
    console.log(`✅ Static sitemap.xml created successfully in public/`);

    // 2. Build robots.txt
    let robotsText = "User-agent: *\n";
    robotsText += "Allow: /\n";
    robotsText += "Disallow: /admin\n";
    robotsText += "Disallow: /admin/*\n";
    robotsText += "Disallow: /api/\n";
    robotsText += "Disallow: /cart\n";
    robotsText += "Disallow: /checkout\n";
    robotsText += "Disallow: /account\n";
    robotsText += "Disallow: /account/*\n";
    robotsText += "Disallow: /login\n";
    robotsText += "Disallow: /register\n";
    robotsText += "Disallow: /forgot-password\n";
    robotsText += "Disallow: /reset-password\n";
    robotsText += `Sitemap: ${domain}/sitemap.xml\n`;

    // Write robots.txt to public/
    const robotsPath = path.join(publicDir, "robots.txt");
    fs.writeFileSync(robotsPath, robotsText, "utf-8");
    console.log(`✅ Static robots.txt created successfully in public/`);

    // Write copies to dist/ if it exists (e.g. running post-build or during custom scripts)
    const distDir = path.resolve(process.cwd(), "dist");
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf-8");
      fs.writeFileSync(path.join(distDir, "robots.txt"), robotsText, "utf-8");
      console.log(`✅ Copies of sitemap.xml & robots.txt written to dist/`);
    }

  } catch (err) {
    console.error("❌ Failed to generate sitemap/robots.txt:", err);
  }
}

generate();
