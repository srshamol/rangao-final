import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useMeta } from "@/hooks/useMeta";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonical?: string;
  type?: "website" | "product" | "article" | "store";
  schema?: Record<string, any> | Record<string, any>[];
  noIndex?: boolean;
  price?: string;
  availability?: "in_stock" | "out_of_stock";
  /** Pagination: URL of the previous page (rel="prev") */
  prevUrl?: string;
  /** Pagination: URL of the next page (rel="next") */
  nextUrl?: string;
}

/** Canonical domain — always www, always https */
const CANONICAL_BASE = "https://www.rangao.bd";

export default function SEO({
  title,
  description,
  keywords,
  image,
  canonical,
  type = "website",
  schema,
  noIndex = false,
  price,
  availability = "in_stock",
  prevUrl,
  nextUrl,
}: SEOProps) {
  const { pathname } = useLocation();
  const { data: settings } = useStoreSettings();

  const seo = settings?.seoSettings;
  const store = settings?.storeInfo;
  
  const siteName = seo?.site_title || store?.name || "Rangao - রাঙাও";
  const defaultDesc = seo?.site_description || store?.tagline || "প্রিমিয়াম ইসলামিক ও ওয়াল ডেকোর স্টোর।";
  
  // Always use www canonical — never window.location.origin (avoids http/non-www canonicals)
  const baseDomain = CANONICAL_BASE;

  // Build canonical: if explicitly provided use that, else strip query strings for product/category pages
  const buildCanonical = () => {
    if (canonical) {
      // If caller provides a relative path, make it absolute with www
      return canonical.startsWith("http") ? canonical : `${baseDomain}${canonical}`;
    }
    // Product pages: /product/:id — strip all query strings
    if (pathname.startsWith("/product/") || pathname.startsWith("/products/") || pathname.startsWith("/category/")) {
      return `${baseDomain}${pathname}`;
    }
    // All other pages: preserve the pathname only (no query strings)
    return `${baseDomain}${pathname}`;
  };
  const currentUrl = buildCanonical();

  // Formulate the Page Title
  const format = seo?.title_format || "{title} | {siteName}";
  const finalTitle = title 
    ? format.replace("{title}", title).replace("{siteName}", siteName)
    : siteName;

  const finalDesc = description || defaultDesc;
  const finalKeywords = keywords || seo?.default_keywords || "ইসলামিক ডেকোর, ক্যালিগ্রাফি";
  
  // Use default branded OG image if none provided
  const finalImage = image || seo?.og_image || store?.logo_url || "/brand/rangao-og-default.jpg";

  // Use the useMeta hook for DOM metadata modifications
  useMeta({
    title: finalTitle,
    description: finalDesc,
    image: finalImage,
    url: currentUrl,
    type: type === "product" ? "product" : "website",
    noindex: noIndex || seo?.robots_index === false,
    nofollow: seo?.robots_follow === false,
    product: type === "product" ? {
      price: price || "0",
      currency: "BDT",
      availability: availability
    } : undefined
  });

  // Inject / update rel="canonical", rel="prev", rel="next" link tags
  useEffect(() => {
    // Canonical
    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", currentUrl);

    // rel="prev"
    let prevLink = document.head.querySelector<HTMLLinkElement>('link[rel="prev"]');
    if (prevUrl) {
      if (!prevLink) {
        prevLink = document.createElement("link");
        prevLink.setAttribute("rel", "prev");
        document.head.appendChild(prevLink);
      }
      prevLink.setAttribute("href", prevUrl.startsWith("http") ? prevUrl : `${baseDomain}${prevUrl}`);
    } else if (prevLink) {
      prevLink.remove();
    }

    // rel="next"
    let nextLink = document.head.querySelector<HTMLLinkElement>('link[rel="next"]');
    if (nextUrl) {
      if (!nextLink) {
        nextLink = document.createElement("link");
        nextLink.setAttribute("rel", "next");
        document.head.appendChild(nextLink);
      }
      nextLink.setAttribute("href", nextUrl.startsWith("http") ? nextUrl : `${baseDomain}${nextUrl}`);
    } else if (nextLink) {
      nextLink.remove();
    }

    return () => {
      // Clean up prev/next on unmount
      document.head.querySelector('link[rel="prev"]')?.remove();
      document.head.querySelector('link[rel="next"]')?.remove();
    };
  }, [currentUrl, prevUrl, nextUrl, baseDomain]);


  // Keep the JSON-LD Structured Data Injection in useEffect
  useEffect(() => {
    // 1. Set keywords meta tag
    let keywordsMeta = document.head.querySelector('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement("meta");
      keywordsMeta.setAttribute("name", "keywords");
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute("content", finalKeywords);

    // 2. Set search console verification if configured
    let gVerify = document.head.querySelector('meta[name="google-site-verification"]');
    if (seo?.google_search_console_id) {
      if (!gVerify) {
        gVerify = document.createElement("meta");
        gVerify.setAttribute("name", "google-site-verification");
        document.head.appendChild(gVerify);
      }
      gVerify.setAttribute("content", seo.google_search_console_id);
    } else if (gVerify) {
      gVerify.remove();
    }

    // 3. Inject Structured Data (JSON-LD Schemas)
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

  }, [finalKeywords, currentUrl, seo?.google_search_console_id, siteName, baseDomain, store?.logo_url, store?.phone, schema, finalImage]);

  return null;
}
