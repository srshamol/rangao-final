import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";

export default function SettingsSync() {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    if (!settings) return;

    // 1. Dynamic Favicon Synchronization
    const faviconUrl = settings.storeInfo?.favicon_url;
    if (faviconUrl && faviconUrl.trim() !== "") {
      const updateFavicons = () => {
        // Update standard shortcut icon
        let linkIcon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (!linkIcon) {
          linkIcon = document.createElement("link");
          linkIcon.rel = "icon";
          document.head.appendChild(linkIcon);
        }
        linkIcon.href = faviconUrl;

        // Update Apple touch icon
        let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (!appleIcon) {
          appleIcon = document.createElement("link");
          appleIcon.rel = "apple-touch-icon";
          document.head.appendChild(appleIcon);
        }
        appleIcon.href = faviconUrl;
      };

      updateFavicons();
    }

    // 2. Dynamic Title & SEO Synchronization for landing pages
    const seo = settings.homepageSEO;
    if (seo && window.location.pathname === "/") {
      if (seo.meta_title) {
        document.title = seo.meta_title;
      }
      
      // Update Meta description
      if (seo.meta_description) {
        let metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement;
        if (!metaDesc) {
          metaDesc = document.createElement("meta");
          metaDesc.name = "description";
          document.head.appendChild(metaDesc);
        }
        metaDesc.content = seo.meta_description;
      }

      // Update OG Image
      if (seo.og_image) {
        let ogImg = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
        if (!ogImg) {
          ogImg = document.createElement("meta");
          ogImg.setAttribute("property", "og:image");
          document.head.appendChild(ogImg);
        }
        ogImg.content = seo.og_image;
      }
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
