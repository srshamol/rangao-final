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

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(robotsText);
  } catch (err: any) {
    console.error("Robots generation error:", err);
    // Secure, basic fallback robots.txt
    const fallbackRobots = "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/*\nDisallow: /api/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\nDisallow: /account/*\nDisallow: /login\nDisallow: /register\nDisallow: /forgot-password\nDisallow: /reset-password\nSitemap: https://www.rangao.bd/sitemap.xml\n";
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(fallbackRobots);
  }
}
