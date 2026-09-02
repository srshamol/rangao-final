import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const CANONICAL_BASE = "https://www.rangao.bd";

// Transliteration / slugify helper for consistent URLs
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
  "ডেকোরেটিভ-লাইটস": "decorative-lights",
  "ডেকোরেটিভ লাইটস": "decorative-lights",
  "ইসলামিক-এক্সাসরিজ": "islamic-accessories",
  "ইসলামিক এক্সাসরিজ": "islamic-accessories",
  "গ্লাস-ফ্রেম": "glass-frames",
  "গ্লাস ফ্রেম": "glass-frames",
};

export function slugify(text: string): string {
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

export function getCanonicalProductPath(product: { id: string; name: string; sku?: string; category?: string }): string {
  const categorySlug = product.category ? slugify(product.category) : "products";
  const nameSlug = product.sku ? slugify(product.sku) : slugify(product.name);
  if (categorySlug && nameSlug) {
    return `/${encodeURIComponent(categorySlug)}/${encodeURIComponent(nameSlug)}`;
  }
  return `/product/${encodeURIComponent(product.id)}`;
}

// Fallback minimal HTML template in case file read is unavailable
function getBaseHtml(): string {
  try {
    const distPath = path.resolve(process.cwd(), "dist", "index.html");
    if (fs.existsSync(distPath)) {
      return fs.readFileSync(distPath, "utf-8");
    }
    const rootPath = path.resolve(process.cwd(), "index.html");
    if (fs.existsSync(rootPath)) {
      return fs.readFileSync(rootPath, "utf-8");
    }
  } catch (err) {
    console.warn("Could not read index.html from disk:", err);
  }

  return `<!doctype html>
<html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="content-language" content="bn-BD" />
    <title>Rangao — প্রিমিয়াম ইসলামিক ও হোম ডেকোর</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

// Helper: Escape HTML special characters
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType?: "website" | "product" | "article";
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
  price?: number;
  availability?: "in stock" | "out of stock";
  schemas?: Record<string, any>[];
  statusCode?: number;
  redirectUrl?: string;
}

export async function resolveMetadata(pathname: string): Promise<PageMetadata> {
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  // 1. Private / No-Index Routes
  if (
    cleanPath.startsWith("/admin") ||
    cleanPath === "/checkout" ||
    cleanPath === "/cart" ||
    cleanPath.startsWith("/account") ||
    cleanPath.startsWith("/order-success") ||
    cleanPath === "/login" ||
    cleanPath === "/register" ||
    cleanPath === "/forgot-password" ||
    cleanPath === "/reset-password"
  ) {
    return {
      title: "Rangao",
      description: "Rangao E-commerce",
      canonicalUrl: `${CANONICAL_BASE}${cleanPath}`,
      noIndex: true,
      statusCode: 200,
    };
  }

  // 2. Homepage (/)
  if (cleanPath === "/") {
    const { data: storeInfo } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "store_info")
      .maybeSingle();

    const { data: seoSettings } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "seo_settings")
      .maybeSingle();

    const info = (storeInfo?.value as any) || {};
    const seo = (seoSettings?.value as any) || {};

    const title = seo.site_title || "Rangao — প্রিমিয়াম ইসলামিক ও হোম ডেকোর";
    const description =
      seo.site_description ||
      "Rangao (রাঙাও) — বাংলাদেশের সেরা প্রিমিয়াম ইসলামিক ওয়াল আর্ট, কাঠের ডেকোর, ক্যানভাস ও লাইফস্টাইল ডেকোর শপ।";
    const ogImage = seo.og_image || info.logo_url || `${CANONICAL_BASE}/brand/rangao-og-default.png`;

    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${CANONICAL_BASE}/#organization`,
        "name": info.name || "Rangao",
        "alternateName": "রাঙাও",
        "url": CANONICAL_BASE,
        "logo": info.logo_url || ogImage,
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": info.phone || "",
          "contactType": "customer service",
          "availableLanguage": "Bengali",
        },
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "BD",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${CANONICAL_BASE}/#website`,
        "name": "Rangao",
        "url": CANONICAL_BASE,
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${CANONICAL_BASE}/products?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ];

    return {
      title,
      description,
      canonicalUrl: `${CANONICAL_BASE}/`,
      ogType: "website",
      ogImage,
      twitterCard: "summary_large_image",
      schemas,
      statusCode: 200,
    };
  }

  // 3. Legacy Product Route (/product/:id)
  if (cleanPath.startsWith("/product/")) {
    const rawId = cleanPath.replace("/product/", "").trim();
    if (!rawId) {
      return {
        title: "পণ্য পাওয়া যায়নি | Rangao",
        description: "অনুরোধকৃত পণ্যটি পাওয়া যায়নি।",
        canonicalUrl: `${CANONICAL_BASE}${cleanPath}`,
        noIndex: true,
        statusCode: 404,
      };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
    let product: any = null;

    if (isUuid) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", rawId)
        .maybeSingle();
      product = data;
    } else {
      const { data: allProds } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active");
      product = allProds?.find((p) => slugify(p.sku || "") === rawId || slugify(p.name) === rawId || p.id === rawId);
    }

    if (!product || product.status !== "active") {
      return {
        title: "পণ্য পাওয়া যায়নি | Rangao",
        description: "অনুরোধকৃত পণ্যটি পাওয়া যায়নি বা নিষ্ক্রিয় রয়েছে।",
        canonicalUrl: `${CANONICAL_BASE}${cleanPath}`,
        noIndex: true,
        statusCode: 404,
      };
    }

    const canonicalPath = getCanonicalProductPath(product);
    return {
      title: `${product.name} | Rangao`,
      description: product.short_description || `${product.name} - প্রিমিয়াম কোয়ালিটি প্রোডাক্ট কিনুন রাঙাও থেকে।`,
      canonicalUrl: `${CANONICAL_BASE}${canonicalPath}`,
      redirectUrl: `${CANONICAL_BASE}${canonicalPath}`,
      statusCode: 301,
    };
  }

  // 4. Products Listing Page (/products)
  if (cleanPath === "/products") {
    return {
      title: "সমস্ত প্রোডাক্ট | Rangao",
      description: "রাঙাও স্টোরের সমস্ত প্রিমিয়াম ক্যাটাগরি এবং প্রোডাক্ট কালেকশন দেখুন।",
      canonicalUrl: `${CANONICAL_BASE}/products`,
      ogType: "website",
      ogImage: `${CANONICAL_BASE}/brand/rangao-og-default.png`,
      twitterCard: "summary_large_image",
      statusCode: 200,
    };
  }

  // 5. Category Page (/category/:slug)
  if (cleanPath.startsWith("/category/")) {
    const catSlug = decodeURIComponent(cleanPath.replace("/category/", "").trim());
    const { data: cat } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", catSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!cat) {
      return {
        title: "ক্যাটাগরি পাওয়া যায়নি | Rangao",
        description: "অনুরোধকৃত ক্যাটাগরিটি খুঁজে পাওয়া যায়নি।",
        canonicalUrl: `${CANONICAL_BASE}${cleanPath}`,
        noIndex: true,
        statusCode: 404,
      };
    }

    const { data: catSeoSetting } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "category_seo_data")
      .maybeSingle();

    const catSeo = (catSeoSetting?.value as any)?.[catSlug] || {};
    const title = catSeo.title || `${cat.name} | Rangao`;
    const description = catSeo.description || `${cat.name} কালেকশন দেখুন রাঙাও স্টোরে।`;
    const ogImage = cat.image_url || `${CANONICAL_BASE}/brand/rangao-og-default.png`;

    return {
      title,
      description,
      canonicalUrl: `${CANONICAL_BASE}/category/${encodeURIComponent(catSlug)}`,
      ogType: "website",
      ogImage,
      twitterCard: "summary_large_image",
      statusCode: 200,
    };
  }

  // 6. Blog Listing (/blog)
  if (cleanPath === "/blog") {
    return {
      title: "ব্লগ ও আর্টিকেলস | Rangao",
      description: "ইসলামিক ও হোম ডেকোরেশন টিপস, গাইড এবং সর্বশেষ আপডেট পড়ুন রাঙাও ব্লগে।",
      canonicalUrl: `${CANONICAL_BASE}/blog`,
      ogType: "website",
      ogImage: `${CANONICAL_BASE}/brand/rangao-og-default.png`,
      twitterCard: "summary_large_image",
      statusCode: 200,
    };
  }

  // 7. Blog Post (/blog/:id or /blog/:slug)
  if (cleanPath.startsWith("/blog/")) {
    const rawPostId = decodeURIComponent(cleanPath.replace("/blog/", "").trim());
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawPostId);

    let post: any = null;
    if (isUuid) {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", rawPostId)
        .eq("is_active", true)
        .maybeSingle();
      post = data;
    } else {
      const { data: allPosts } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_active", true);
      post = allPosts?.find((p) => slugify(p.title) === rawPostId || p.id === rawPostId);
    }

    if (!post) {
      return {
        title: "ব্লগ পোস্ট পাওয়া যায়নি | Rangao",
        description: "অনুরোধকৃত আর্টিকেলটি পাওয়া যায়নি।",
        canonicalUrl: `${CANONICAL_BASE}${cleanPath}`,
        noIndex: true,
        statusCode: 404,
      };
    }

    const postSlug = slugify(post.title) || post.id;
    const ogImage = post.image_url || post.image || `${CANONICAL_BASE}/brand/rangao-og-default.png`;
    const excerpt = post.excerpt || post.content?.slice(0, 160).replace(/[#*_`\n\r]/g, " ").trim() + "...";

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": excerpt,
      "image": ogImage,
      "datePublished": post.created_at,
      "dateModified": post.updated_at || post.created_at,
      "author": {
        "@type": "Organization",
        "name": post.author || "Rangao টিম",
      },
      "publisher": {
        "@type": "Organization",
        "name": "Rangao",
        "logo": {
          "@type": "ImageObject",
          "url": `${CANONICAL_BASE}/brand/rangao-og-default.png`,
        },
      },
    };

    return {
      title: `${post.title} | Rangao`,
      description: excerpt,
      canonicalUrl: `${CANONICAL_BASE}/blog/${encodeURIComponent(postSlug)}`,
      ogType: "article",
      ogImage,
      twitterCard: "summary_large_image",
      schemas: [articleSchema],
      statusCode: 200,
    };
  }

  // 8. Static Pages (/about, /privacy-policy, /cookie-policy)
  if (cleanPath === "/about") {
    return {
      title: "আমাদের সম্পর্কে | Rangao",
      description: "রাঙাও (Rangao) — বাংলাদেশের প্রিমিয়াম ইসলামিক ও হোম ডেকোরেশনের নির্ভরযোগ্য গন্তব্য।",
      canonicalUrl: `${CANONICAL_BASE}/about`,
      ogType: "website",
      ogImage: `${CANONICAL_BASE}/brand/rangao-og-default.png`,
      twitterCard: "summary_large_image",
      statusCode: 200,
    };
  }

  if (cleanPath === "/privacy-policy") {
    return {
      title: "প্রাইভেসি পলিসি | Rangao",
      description: "রাঙাও স্টোরের কাস্টমার ডাটা ও গোপনীয়তা সংক্রান্ত নীতিমালা।",
      canonicalUrl: `${CANONICAL_BASE}/privacy-policy`,
      noIndex: true,
      statusCode: 200,
    };
  }

  if (cleanPath === "/cookie-policy") {
    return {
      title: "কুকি পলিসি | Rangao",
      description: "রাঙাও ওয়েবসাইটে কুকি ব্যবহারের নীতিমালা ও তথ্য।",
      canonicalUrl: `${CANONICAL_BASE}/cookie-policy`,
      noIndex: true,
      statusCode: 200,
    };
  }

  // 9. Two-segment Canonical Product Route (/:categorySlug/:productSlug)
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length === 2) {
    const [catParam, prodParam] = segments.map((s) => decodeURIComponent(s));

    // Fetch all active products to match
    const { data: allProds } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active");

    const product = allProds?.find((p) => {
      const matchCat = !p.category || slugify(p.category) === catParam || catParam === "products";
      const matchProd = slugify(p.sku || "") === prodParam || slugify(p.name) === prodParam || p.id === prodParam;
      return matchCat && matchProd;
    }) || allProds?.find((p) => slugify(p.sku || "") === prodParam || slugify(p.name) === prodParam || p.id === prodParam);

    if (product) {
      // Query custom SEO & FAQ for this product
      const { data: seoSetting } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", `product_seo_${product.id}`)
        .maybeSingle();

      const seoVal = (seoSetting?.value as any) || {};

      // Query approved reviews count and average rating
      const { data: reviews } = await supabase
        .from("testimonials" as any)
        .select("rating")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .eq("status", "approved");

      const approvedReviews = (reviews as any[]) || [];
      const reviewCount = approvedReviews.length;
      const averageRating =
        reviewCount > 0
          ? Number((approvedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewCount).toFixed(1))
          : 0;

      const title = seoVal.seo_title || `${product.name} | Rangao`;
      const description =
        seoVal.seo_description ||
        product.short_description ||
        `${product.name} - কিনুন সেরা মূল্যে রাঙাও স্টোরে।`;
      
      const images: string[] = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : [product.image_url || `${CANONICAL_BASE}/brand/rangao-og-default.png`];
      
      const ogImage = images[0];
      const canonicalPath = getCanonicalProductPath(product);
      const isStock = (product.stock_quantity ?? 10) > 0;
      const availability = isStock ? "in stock" : "out of stock";
      const schemaAvailability = isStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

      const productSchema: Record<string, any> = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "image": images,
        "description": product.short_description || description,
        "sku": product.sku || product.id,
        "category": product.category,
        "brand": {
          "@type": "Brand",
          "name": product.brand || "Rangao",
        },
        "offers": {
          "@type": "Offer",
          "url": `${CANONICAL_BASE}${canonicalPath}`,
          "priceCurrency": "BDT",
          "price": Number(product.price) || 0,
          "availability": schemaAvailability,
          "priceValidUntil": "2027-12-31",
        },
      };

      // STRICT RULE: Include AggregateRating ONLY if approved reviews > 0
      if (reviewCount > 0 && averageRating > 0) {
        productSchema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": averageRating,
          "reviewCount": reviewCount,
        };
      }

      const schemas: Record<string, any>[] = [productSchema];

      // STRICT RULE: Include FAQ schema ONLY if valid, visible FAQ items exist
      const faqs = Array.isArray(seoVal.faqs) ? seoVal.faqs.filter((f: any) => f?.question && f?.answer) : [];
      if (faqs.length > 0) {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map((f: any) => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": f.answer,
            },
          })),
        });
      }

      return {
        title,
        description,
        canonicalUrl: `${CANONICAL_BASE}${canonicalPath}`,
        ogType: "product",
        ogImage,
        twitterCard: "summary_large_image",
        price: Number(product.price) || 0,
        availability,
        schemas,
        statusCode: 200,
      };
    }
  }

  // 10. Default / Unmatched Route -> 404
  return {
    title: "পৃষ্ঠাটি পাওয়া যায়নি (404) | Rangao",
    description: "অনুরোধকৃত পেজটি খুঁজে পাওয়া যায়নি। রাঙাও হোমপেজে ফিরে যান।",
    canonicalUrl: `${CANONICAL_BASE}${cleanPath}`,
    noIndex: true,
    statusCode: 404,
  };
}

// Injects metadata tags into HTML shell
export function injectMetadataIntoHtml(baseHtml: string, meta: PageMetadata): string {
  let html = baseHtml;

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  // Build new metadata tags
  const tags: string[] = [];

  // Description
  tags.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);

  // Robots
  if (meta.noIndex) {
    tags.push(`<meta name="robots" content="noindex, nofollow" />`);
  } else {
    tags.push(`<meta name="robots" content="index, follow" />`);
  }

  // Canonical link
  if (meta.canonicalUrl) {
    tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`);
  }

  // Open Graph
  tags.push(`<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  tags.push(`<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`);
  tags.push(`<meta property="og:type" content="${escapeHtml(meta.ogType || "website")}" />`);
  if (meta.ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(meta.ogImage)}" />`);
  }
  if (meta.ogType === "product" && meta.price !== undefined) {
    tags.push(`<meta property="product:price:amount" content="${meta.price}" />`);
    tags.push(`<meta property="product:price:currency" content="BDT" />`);
    if (meta.availability) {
      tags.push(`<meta property="product:availability" content="${escapeHtml(meta.availability)}" />`);
    }
  }

  // Twitter Card
  tags.push(`<meta name="twitter:card" content="${escapeHtml(meta.twitterCard || "summary_large_image")}" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
  if (meta.ogImage) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />`);
  }

  // Schemas (JSON-LD)
  if (meta.schemas && meta.schemas.length > 0) {
    meta.schemas.forEach((s) => {
      tags.push(`<script type="application/ld+json">${JSON.stringify(s)}</script>`);
    });
  }

  // Remove existing duplicate fallback meta tags from head to prevent conflicts
  html = html.replace(/<meta\s+name="description"[\s\S]*?>/gi, "");
  html = html.replace(/<meta\s+property="og:[\s\S]*?>/gi, "");
  html = html.replace(/<meta\s+name="twitter:[\s\S]*?>/gi, "");
  html = html.replace(/<link\s+rel="canonical"[\s\S]*?>/gi, "");

  // Insert fresh tags right before </head>
  const tagsString = tags.join("\n    ");
  html = html.replace("</head>", `    ${tagsString}\n  </head>`);

  return html;
}

export default async function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || "/";
    const pathname = rawUrl.split("?")[0];

    const metadata = await resolveMetadata(pathname);

    // 301 Permanent Redirect for legacy product URLs
    if (metadata.redirectUrl && metadata.statusCode === 301) {
      res.setHeader("Location", metadata.redirectUrl);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.status(301).end();
    }

    const baseHtml = getBaseHtml();
    const finalHtml = injectMetadataIntoHtml(baseHtml, metadata);

    const status = metadata.statusCode || 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    if (status === 200) {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }

    return res.status(status).send(finalHtml);
  } catch (err: any) {
    console.error("Server metadata renderer error:", err);
    const fallbackHtml = getBaseHtml();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(fallbackHtml);
  }
}
