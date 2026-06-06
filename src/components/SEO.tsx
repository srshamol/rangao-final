import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonical?: string;
  type?: "website" | "product" | "article" | "store";
  schema?: Record<string, any> | Record<string, any>[];
  noIndex?: boolean;
}

export default function SEO({
  title,
  description,
  keywords,
  image,
  canonical,
  type = "website",
  schema,
  noIndex = false,
}: SEOProps) {
  const { pathname } = useLocation();
  const { data: settings } = useStoreSettings();

  const seo = settings?.seoSettings;
  const store = settings?.storeInfo;
  
  const siteName = seo?.site_title || store?.name || "Rangao - রাঙাও";
  const defaultDesc = seo?.site_description || store?.tagline || "প্রিমিয়াম ইসলামিক ও ওয়াল ডেকোর স্টোর।";
  
  const baseDomain = store?.website_url || (typeof window !== "undefined" ? window.location.origin : "https://www.rangao.bd");
  const currentUrl = canonical || `${baseDomain}${pathname}`;

  // Formulate the Page Title using format
  const format = seo?.title_format || "{title} | {siteName}";
  const finalTitle = title 
    ? format.replace("{title}", title).replace("{siteName}", siteName)
    : siteName;

  const finalDesc = description || defaultDesc;
  const finalKeywords = keywords || seo?.default_keywords || "ইসলামিক ডেকোর, ক্যালিগ্রাফি";
  const finalImage = image || store?.logo_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

  // Determine Robots indexing rule
  let robotsContent = "index, follow";
  if (noIndex || seo?.robots_index === false) {
    const follow = seo?.robots_follow !== false ? "follow" : "nofollow";
    robotsContent = `noindex, ${follow}`;
  }

  useEffect(() => {
    // 1. Update Title
    document.title = finalTitle;

    // Helper to get or create a meta tag
    const updateOrCreateMeta = (name: string, value: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.head.querySelector(selector);
      if (!meta) {
        meta = document.createElement("meta");
        if (isProperty) {
          meta.setAttribute("property", name);
        } else {
          meta.setAttribute("name", name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", value);
    };

    // 2. Standard Meta Tags
    updateOrCreateMeta("description", finalDesc);
    updateOrCreateMeta("keywords", finalKeywords);
    updateOrCreateMeta("robots", robotsContent);

    // 3. Open Graph Tags
    updateOrCreateMeta("og:title", finalTitle, true);
    updateOrCreateMeta("og:description", finalDesc, true);
    updateOrCreateMeta("og:url", currentUrl, true);
    updateOrCreateMeta("og:image", finalImage, true);
    updateOrCreateMeta("og:type", type === "product" ? "product" : type === "article" ? "article" : "website", true);
    updateOrCreateMeta("og:site_name", siteName, true);

    // 4. Twitter Card Tags
    updateOrCreateMeta("twitter:card", "summary_large_image");
    updateOrCreateMeta("twitter:title", finalTitle);
    updateOrCreateMeta("twitter:description", finalDesc);
    updateOrCreateMeta("twitter:image", finalImage);

    // 5. Verification Tag
    if (seo?.google_search_console_id) {
      updateOrCreateMeta("google-site-verification", seo.google_search_console_id);
    }

    // 6. Canonical Link Tag
    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", currentUrl);

    // 7. Inject Structured Data (JSON-LD Schemas)
    // Clear out any old elements safely
    const oldScripts = document.querySelectorAll("script[data-seo-schema]");
    oldScripts.forEach((s) => {
      if (s.parentNode && s.parentNode.contains(s)) {
        try {
          s.parentNode.removeChild(s);
        } catch (e) {
          console.warn("Failed to remove old schema script", e);
        }
      }
    });

    // Combine default Website / Org schema + custom schemas
    const schemasToInject: Record<string, any>[] = [];

    // Base organization schema
    const orgSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${baseDomain}/#organization`,
      "name": siteName,
      "url": baseDomain,
      "logo": store?.logo_url || finalImage,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": store?.phone || "",
        "contactType": "customer service"
      }
    };
    schemasToInject.push(orgSchema);

    // Base website search schema
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseDomain}/#website`,
      "name": siteName,
      "url": baseDomain,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseDomain}/products?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };
    schemasToInject.push(websiteSchema);

    if (schema) {
      if (Array.isArray(schema)) {
        schemasToInject.push(...schema);
      } else {
        schemasToInject.push(schema);
      }
    }

    schemasToInject.forEach((sObj, idx) => {
      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-seo-schema", `schema-${idx}`);
      script.textContent = JSON.stringify(sObj);
      document.head.appendChild(script);
    });

  }, [finalTitle, finalDesc, finalKeywords, robotsContent, currentUrl, finalImage, type, schema, seo?.google_search_console_id, siteName, baseDomain, store?.logo_url, store?.phone]);

  return null;
}
