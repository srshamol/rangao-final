import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeroBanner {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  banner_image_url: string;
  banner_video_url: string;
  badge_text: string;
  enabled: boolean;
}

export interface ContactInfo {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook_url: string;
  instagram_url: string;
}

export interface HomepageSections {
  show_categories: boolean;
  show_featured: boolean;
  show_flash_sale: boolean;
  show_why_choose: boolean;
  show_testimonials: boolean;
  show_newsletter: boolean;
}

export interface StoreInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
}

const defaults = {
  hero_banner: {
    title: "প্রিমিয়াম গ্যাজেট কালেকশন",
    subtitle: "বাংলাদেশের সবচেয়ে বিশ্বস্ত গ্যাজেট স্টোর",
    cta_text: "শপিং শুরু করুন",
    cta_link: "#products",
    banner_image_url: "",
    banner_video_url: "",
    badge_text: "✦ PREMIUM COLLECTION ✦",
    enabled: true,
  } as HeroBanner,
  contact_info: {
    phone: "+8801XXXXXXXXX",
    whatsapp: "8801XXXXXXXXX",
    email: "info@gadgetgram.com",
    address: "ঢাকা, বাংলাদেশ",
    facebook_url: "",
    instagram_url: "",
  } as ContactInfo,
  homepage_sections: {
    show_categories: true,
    show_featured: true,
    show_flash_sale: true,
    show_why_choose: true,
    show_testimonials: true,
    show_newsletter: true,
  } as HomepageSections,
  store_info: {
    name: "GadgetGram",
    phone: "+8801XXXXXXXXX",
    email: "info@gadgetgram.com",
    address: "ঢাকা, বাংলাদেশ",
    logo_url: "",
  } as StoreInfo,
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings" as any)
        .select("key, value");

      const settings: Record<string, any> = {};
      if (data) {
        (data as any[]).forEach((row) => {
          settings[row.key] = row.value;
        });
      }

      return {
        heroBanner: { ...defaults.hero_banner, ...settings.hero_banner } as HeroBanner,
        contactInfo: { ...defaults.contact_info, ...settings.contact_info } as ContactInfo,
        homepageSections: { ...defaults.homepage_sections, ...settings.homepage_sections } as HomepageSections,
        storeInfo: { ...defaults.store_info, ...settings.store_info } as StoreInfo,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
