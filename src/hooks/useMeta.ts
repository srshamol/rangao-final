import { useEffect } from "react";

export interface MetaProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "product";
  noindex?: boolean;
  preloadImage?: string;
  product?: {
    price: string;
    currency: "BDT";
    availability: "in_stock" | "out_of_stock";
  };
}

export function useMeta({
  title,
  description,
  image,
  url,
  type = "website",
  noindex = false,
  preloadImage,
  product,
}: MetaProps) {
  useEffect(() => {
    // 1. Update Document Title
    const suffix = " | রাঙাও";
    const hasSiteName = title.includes("রাঙাও") || title.includes("Rangao");
    const finalTitle = hasSiteName ? title : `${title}${suffix}`;
    document.title = finalTitle;

    // Helper function to update or create meta tags
    const updateOrCreateMeta = (nameOrProperty: string, value: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${nameOrProperty}"]` : `meta[name="${nameOrProperty}"]`;
      let meta = document.head.querySelector(selector);
      if (!meta) {
        meta = document.createElement("meta");
        if (isProperty) {
          meta.setAttribute("property", nameOrProperty);
        } else {
          meta.setAttribute("name", nameOrProperty);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", value);
    };

    // 2. Standard Meta Tags
    updateOrCreateMeta("description", description);
    updateOrCreateMeta("robots", noindex ? "noindex, nofollow" : "index, follow");

    // 3. Canonical Link Tag
    const currentUrl = url || window.location.href;
    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", currentUrl);

    // 4. Open Graph Tags
    updateOrCreateMeta("og:title", finalTitle, true);
    updateOrCreateMeta("og:description", description, true);
    updateOrCreateMeta("og:url", currentUrl, true);
    updateOrCreateMeta("og:type", type, true);

    const defaultImage = "/brand/rangao-og-default.jpg";
    const finalImage = image || defaultImage;
    const absoluteImage = finalImage.startsWith("/")
      ? `${window.location.origin}${finalImage}`
      : finalImage;
    updateOrCreateMeta("og:image", absoluteImage, true);

    // 5. Twitter Card Tags
    updateOrCreateMeta("twitter:card", "summary_large_image");
    updateOrCreateMeta("twitter:title", finalTitle);
    updateOrCreateMeta("twitter:description", description);

    const twitterImage = image
      ? absoluteImage
      : `${window.location.origin}/brand/rangao-og-small.jpg`;
    updateOrCreateMeta("twitter:image", twitterImage);

    // 6. Product-Specific Metadata
    if (type === "product" && product) {
      updateOrCreateMeta("product:price:amount", product.price, true);
      updateOrCreateMeta("product:price:currency", product.currency, true);
      updateOrCreateMeta("product:availability", product.availability, true);
    } else {
      // Remove product meta tags if type is website
      document.querySelectorAll('meta[property^="product:"]').forEach((el) => el.remove());
    }

    // Helper to get image proxy URL
    const getProxyUrl = (originalUrl: string, w: number) => {
      try {
        const urlObj = new URL(originalUrl);
        if (urlObj.hostname.includes("r2.dev")) {
          return `${urlObj.origin}/img${urlObj.pathname}?w=${w}&fmt=webp&q=75`;
        }
      } catch (e) {
        if (originalUrl.startsWith("/")) {
          return `/img${originalUrl}?w=${w}&fmt=webp&q=75`;
        }
      }
      return originalUrl;
    };

    // 7. Dynamic Preloading for Hero / LCP Images
    let preloadLink: HTMLLinkElement | null = null;
    if (preloadImage) {
      preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "image";
      preloadLink.href = getProxyUrl(preloadImage, 1200);
      preloadLink.setAttribute(
        "imagesrcset",
        `${getProxyUrl(preloadImage, 640)} 640w, ${getProxyUrl(preloadImage, 1200)} 1200w`
      );
      preloadLink.setAttribute("imagesizes", "100vw");
      document.head.appendChild(preloadLink);
    }

    return () => {
      if (preloadLink && preloadLink.parentNode) {
        preloadLink.parentNode.removeChild(preloadLink);
      }
    };
  }, [title, description, image, url, type, noindex, preloadImage, product]);
}
