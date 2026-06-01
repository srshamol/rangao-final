import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";

export default function SettingsSync() {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    if (!settings) return;

    // 1. Dynamic Favicon Synchronization with Cache Busting
    const faviconUrl = settings.storeInfo?.favicon_url;
    if (faviconUrl && faviconUrl.trim() !== "") {
      localStorage.setItem("cached_favicon_url", faviconUrl);
      const updateFavicons = () => {
        const cacheBustedUrl = faviconUrl.includes("?") 
          ? `${faviconUrl}&v=${Date.now()}` 
          : `${faviconUrl}?v=${Date.now()}`;

        // Update standard shortcut icon
        let linkIcon = document.getElementById("dynamic-favicon") as HTMLLinkElement;
        if (!linkIcon) {
          linkIcon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        }
        if (!linkIcon) {
          linkIcon = document.createElement("link");
          linkIcon.id = "dynamic-favicon";
          linkIcon.rel = "icon";
          document.head.appendChild(linkIcon);
        }
        linkIcon.href = cacheBustedUrl;

        // Update Apple touch icon
        let appleIcon = document.getElementById("dynamic-apple-icon") as HTMLLinkElement;
        if (!appleIcon) {
          appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        }
        if (!appleIcon) {
          appleIcon = document.createElement("link");
          appleIcon.id = "dynamic-apple-icon";
          appleIcon.rel = "apple-touch-icon";
          document.head.appendChild(appleIcon);
        }
        appleIcon.href = cacheBustedUrl;
      };

      updateFavicons();
    }

    // 2. Dynamic Title & SEO Synchronization
    const storeName = settings.storeInfo?.name;
    const storeTagline = settings.storeInfo?.tagline;

    if (storeName) {
      const pageTitle = storeTagline ? `${storeName} — ${storeTagline}` : storeName;
      document.title = pageTitle;
      
      // Update og:title
      let ogTitle = document.querySelector("meta[property='og:title']") as HTMLMetaElement;
      if (!ogTitle) {
        ogTitle = document.createElement("meta");
        ogTitle.setAttribute("property", "og:title");
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = pageTitle;
    }

    if (storeTagline) {
      // Update Meta description
      let metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement;
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = storeTagline;

      // Update og:description
      let ogDesc = document.querySelector("meta[property='og:description']") as HTMLMetaElement;
      if (!ogDesc) {
        ogDesc = document.createElement("meta");
        ogDesc.setAttribute("property", "og:description");
        document.head.appendChild(ogDesc);
      }
      ogDesc.content = storeTagline;
    }

    // Update OG Image (using home SEO config if available)
    const seo = settings.homepageSEO;
    if (seo && seo.og_image) {
      let ogImg = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
      if (!ogImg) {
        ogImg = document.createElement("meta");
        ogImg.setAttribute("property", "og:image");
        document.head.appendChild(ogImg);
      }
      ogImg.content = seo.og_image;
    }

    // 3. Resilient Product & Category Synchronization
    const syncProductAndCategory = async () => {
      try {
        const { data: categories } = await supabase.from("categories").select("id, name, slug");
        const { data: products } = await supabase.from("products").select("id, name, category");
        
        if (!categories || !products) return;

        for (const p of products) {
          const matchedCat = categories.find(c => 
            c.slug.toLowerCase().trim() === p.category.toLowerCase().trim() ||
            c.name.toLowerCase().trim() === p.category.toLowerCase().trim() ||
            c.slug.toLowerCase().replace(/[-_]/g, " ").trim() === p.category.toLowerCase().replace(/[-_]/g, " ").trim() ||
            c.name.toLowerCase().replace(/[-_]/g, " ").trim() === p.category.toLowerCase().replace(/[-_]/g, " ").trim()
          );

          if (matchedCat && p.category !== matchedCat.slug) {
            console.log(`[Sync] Updating product "${p.name}" category field to "${matchedCat.slug}"`);
            await supabase.from("products").update({ category: matchedCat.slug }).eq("id", p.id);
          }
        }
      } catch (e) {
        console.error("[Sync Error] Failed to synchronize categories and products:", e);
      }
    };
    syncProductAndCategory();

  }, [settings]);

  return null;
}
