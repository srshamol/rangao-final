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
    
    const storeVal = (storeInfoData as any)?.value || {};
    const siteDomain = storeVal.website_url || "https://rangao.com.bd";
    const domain = siteDomain.endsWith("/") ? siteDomain.slice(0, -1) : siteDomain;

    // 2. Fetch SEO Settings
    const { data: seoData } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "seo_settings")
      .maybeSingle();

    const seoVal = (seoData as any)?.value || {};
    const robotsIndex = seoVal.robots_index !== false;

    let robotsText = "";

    if (!robotsIndex) {
      robotsText = "User-agent: *\nDisallow: /\n";
    } else {
      robotsText = "User-agent: *\n";
      robotsText += "Allow: /\n";
      robotsText += "Disallow: /admin/\n";
      robotsText += "Disallow: /admin\n";
      robotsText += "Disallow: /account/\n";
      robotsText += "Disallow: /account\n";
      robotsText += "Disallow: /checkout\n";
      robotsText += `Sitemap: ${domain}/sitemap.xml\n`;
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    return res.status(200).send(robotsText);
  } catch (err: any) {
    console.error("Robots generation error:", err);
    return res.status(500).send("Error generating robots.txt");
  }
}
