import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeroBannerSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge_text: string;
  cta_primary_text: string;
  cta_primary_url: string;
  cta_secondary_text: string;
  cta_secondary_url: string;
  banner_image_url: string;
  banner_video_url: string;
  overlay_opacity: number;
  text_align: "left" | "center" | "right";
  enabled: boolean;
}

export interface HeroBanner {
  slides: HeroBannerSlide[];
  enabled: boolean;
  // Legacy single-slide fields for backward compat
  title?: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  banner_image_url?: string;
  banner_video_url?: string;
  badge_text?: string;
}

export interface SocialLinkItem {
  id: string;
  platform: string;
  icon: string;
  url: string;
  order: number;
  enabled: boolean;
}

export interface ContactInfo {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook_url: string;
  instagram_url: string;
  whatsapp_enabled?: boolean;
  whatsapp_country_code?: string;
  social_links?: SocialLinkItem[];
}

export interface SectionConfig {
  enabled: boolean;
  desktop: boolean;
  mobile: boolean;
  title?: string;
  subtitle?: string;
  bg_color?: string;
  bg_image?: string;
  padding?: string;
  margin?: string;
  animation?: "none" | "fade" | "fade-up" | "slide" | "zoom";
  // Product section config
  filter?: "featured" | "newest" | "best_seller" | "manual" | "category";
  product_ids?: string[];
  category_slug?: string;
  count?: number;
  desktop_cols?: number;
  tablet_cols?: number;
  mobile_cols?: number;
  // Category section config
  category_mode?: "auto" | "manual";
  category_ids?: string[];
  show_image?: boolean;
  show_count?: boolean;
  
  // Custom CMS Upgrade fields
  coupon_code?: string;
  start_date?: string;
  end_date?: string;
  show_countdown?: boolean;
  cta_text?: string;
  cta_url?: string;
  display_mode?: "grid" | "slider";
  autoplay?: boolean;
  loop?: boolean;
  slider_speed?: number;
}

export interface HomepageSectionOrder {
  id: string;
  label: string;
  config: SectionConfig;
}

export interface HomepageSections {
  show_categories: boolean;
  show_featured: boolean;
  show_flash_sale: boolean;
  show_why_choose: boolean;
  show_testimonials: boolean;
  show_newsletter: boolean;
  show_islamic_collection: boolean;
  show_new_arrivals: boolean;
  show_best_seller: boolean;
  show_offer_banner: boolean;
  show_brands: boolean;
  show_statistics: boolean;
}

export interface TrustFeatureItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface OfferBanner {
  enabled: boolean;
  bg_image: string;
  mobile_image: string;
  title: string;
  subtitle: string;
  coupon_code: string;
  button_text: string;
  button_url: string;
  start_date: string;
  end_date: string;
  show_countdown: boolean;
}

export interface QuoteItemConfig {
  id: string;
  arabic: string;
  bengali: string;
  source: string;
}

export interface NewsletterConfig {
  title: string;
  subtitle: string;
  placeholder: string;
  button_text: string;
  quote_arabic?: string;
  quote_bengali?: string;
  source?: string;
  quotes_list?: QuoteItemConfig[];
  show_only_custom?: boolean;
  theme_style?: "dark" | "classic" | "gold";
}

export interface HomepageSEO {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  title: string;
  link: string;
}

export interface StatisticsConfig {
  mode: "auto" | "manual";
  customers: number;
  orders: number;
  reviews: number;
  products: number;
}

export interface StoreInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  secondary_phone?: string;
  secondary_email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  district?: string;
  country?: string;
  postal_code?: string;
  website_url?: string;
  mobile_logo_url?: string;
  white_logo_url?: string;
  logo_desktop_width?: number;
  logo_desktop_height?: number;
  logo_mobile_width?: number;
  logo_mobile_height?: number;
  favicon_url?: string;
  tagline?: string;
  tracking?: {
    global_enabled: boolean;
    environment: string;
    meta_pixel_enabled: boolean;
    meta_pixel_id: string;
    meta_capi_enabled: boolean;
    meta_strict_purchase_mode: boolean;
    meta_debug_mode: boolean;
    gtm_enabled: boolean;
    gtm_id: string;
    ga4_enabled: boolean;
    ga4_id: string;
    google_debug_mode: boolean;
    tiktok_enabled: boolean;
    tiktok_pixel_id: string;
    tiktok_debug_mode: boolean;
  };
}

export interface AnnouncementBarConfig {
  enabled: boolean;
  text: string;
  bg_color: string;
  text_color: string;
  link_url?: string;
}

export interface SEOSettings {
  site_title: string;
  site_description: string;
  title_format: string;
  default_keywords: string;
  robots_index: boolean;
  robots_follow: boolean;
  google_search_console_id: string;
  og_image?: string;
}

export interface CoreValueItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface AboutUsSettings {
  title: string;
  subtitle: string;
  story_title: string;
  story_text: string;
  banner_image_url: string;
  story_image_url: string;
  mission_title: string;
  mission_text: string;
  vision_title: string;
  vision_text: string;
  core_values: CoreValueItem[];
}

export interface DeliveryCharges {
  dhaka_inside: number;
  dhaka_outside: number;
  free_delivery_min: number;
  delivery_time_inside?: string;
  delivery_time_outside?: string;
}

export interface PaymentMethods {
  cod: boolean;
  bkash: boolean;
  nagad: boolean;
  bkash_number: string;
  nagad_number: string;
  uddoktapay?: boolean;
  uddoktapay_api_key?: string;
  uddoktapay_base_url?: string;
  uddoktapay_display_name?: string;
}

const DEFAULT_SECTION_ORDER: HomepageSectionOrder[] = [
  { id: "hero", label: "হিরো ব্যানার", config: { enabled: true, desktop: true, mobile: true } },
  { id: "categories", label: "ক্যাটাগরি সেকশন", config: { enabled: true, desktop: true, mobile: true, category_mode: "auto", count: 8, desktop_cols: 4, tablet_cols: 3, mobile_cols: 2, show_image: true, show_count: true, title: "আমাদের কাস্টম ক্যাটাগরি কালেকশন", subtitle: "আপনার ঘরের দেয়াল রাঙিয়ে তুলুন" } },
  { id: "featured", label: "ফিচার্ড প্রোডাক্ট", config: { enabled: true, desktop: true, mobile: true, filter: "featured", count: 8, desktop_cols: 4, tablet_cols: 2, mobile_cols: 2, title: "আমাদের সেরা কালেকশন", subtitle: "প্রতিটি প্রোডাক্ট যত্নসহকারে বাছাই করা হয়েছে" } },
  { id: "flash_sale", label: "ফ্ল্যাশ সেল", config: { enabled: true, desktop: true, mobile: true } },
  { id: "islamic_collection", label: "ইসলামিক কালেকশন", config: { enabled: true, desktop: true, mobile: true, filter: "category", category_slug: "wall_canvas", count: 3, title: "অভিজাত ইসলামিক কালেকশন", subtitle: "আপনার ঘরের দেয়াল রাঙিয়ে তুলুন" } },
  { id: "new_arrivals", label: "নতুন আগমন", config: { enabled: true, desktop: true, mobile: true, filter: "newest", count: 4, desktop_cols: 4, mobile_cols: 2, title: "নতুন আগমন", subtitle: "আমাদের সর্বশেষ কালেকশন" } },
  { id: "best_sellers", label: "বেস্ট সেলার", config: { enabled: true, desktop: true, mobile: true, filter: "best_seller", count: 4, desktop_cols: 4, mobile_cols: 2, title: "আমাদের বেস্ট সেলার কালেকশন", subtitle: "সবচেয়ে জনপ্রিয় সামগ্রী" } },
  { id: "offer_banner", label: "অফার ব্যানার", config: { enabled: false, desktop: true, mobile: true } },
  { id: "why_choose", label: "কেন রাঙাও বেছে নেবেন", config: { enabled: true, desktop: true, mobile: true } },
  { id: "statistics", label: "পরিসংখ্যান", config: { enabled: true, desktop: true, mobile: true } },
  { id: "testimonials", label: "কাস্টমার রিভিউ", config: { enabled: true, desktop: true, mobile: true } },
  { id: "brands", label: "ব্র্যান্ড লোগো / পার্টনার", config: { enabled: true, desktop: true, mobile: true } },
  { id: "newsletter", label: "ইসলামিক বাণী / উক্তি (Islamic Quote)", config: { enabled: true, desktop: true, mobile: true } },
  { id: "gallery", label: "গ্যালারি / ইন্সপিরেশন", config: { enabled: true, desktop: true, mobile: true, title: "আমাদের ডেকর ইন্সপিরেশন", subtitle: "কাস্টমারদের ঘর থেকে কিছু সুন্দর মুহূর্ত" } },
  { id: "footer_promo", label: "ফুটোর প্রমোশন / CTA", config: { enabled: true, desktop: true, mobile: true, title: "রাঙাও দিয়ে আপনার ঘর সাজান", cta_text: "সব কালেকশন দেখুন", cta_url: "/products", bg_image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" } },
];

const defaults = {
  hero_banner: {
    enabled: true,
    slides: [
      {
        id: "slide-1",
        title: "প্রিমিয়াম ইসলামিক ও ওয়াল ডেকোর",
        subtitle: "আপনার ঘরকে রাঙিয়ে তুলুন শৈল্পিক ও ইসলামিক নান্দনিকতায়",
        description: "",
        badge_text: "✦ RANGAO PREMIUM DECOR ✦",
        cta_primary_text: "কালেকশন দেখুন",
        cta_primary_url: "#products",
        cta_secondary_text: "যোগাযোগ করুন",
        cta_secondary_url: "#contact",
        banner_image_url: "",
        banner_video_url: "",
        overlay_opacity: 0.85,
        text_align: "left" as const,
        enabled: true,
      }
    ],
  } as HeroBanner,
  contact_info: {
    phone: "01812-345678",
    whatsapp: "8801812345678",
    email: "hello@rangao.bd",
    address: "ঢাকা, বাংলাদেশ",
    facebook_url: "https://facebook.com/rangao",
    instagram_url: "https://instagram.com/rangao",
    whatsapp_enabled: true,
    whatsapp_country_code: "+880",
    social_links: [
      { id: "sl-1", platform: "facebook", icon: "Facebook", url: "https://facebook.com/rangao", order: 1, enabled: true },
      { id: "sl-2", platform: "instagram", icon: "Instagram", url: "https://instagram.com/rangao", order: 2, enabled: true },
      { id: "sl-3", platform: "youtube", icon: "Youtube", url: "https://youtube.com/rangao", order: 3, enabled: true },
      { id: "sl-4", platform: "tiktok", icon: "Music", url: "https://tiktok.com/@rangao", order: 4, enabled: true }
    ]
  } as ContactInfo,
  delivery_charges: {
    dhaka_inside: 70,
    dhaka_outside: 130,
    free_delivery_min: 0,
    delivery_time_inside: "৩-৫ কার্যদিবস",
    delivery_time_outside: "৫-৭ কার্যদিবস"
  } as DeliveryCharges,
  payment_methods: {
    cod: true,
    bkash: false,
    nagad: false,
    bkash_number: "",
    nagad_number: "",
    uddoktapay: false,
    uddoktapay_api_key: "",
    uddoktapay_base_url: "",
    uddoktapay_display_name: "অনলাইন পেমেন্ট (Pay Now)"
  } as PaymentMethods,
  homepage_sections: {
    show_categories: true,
    show_featured: true,
    show_flash_sale: true,
    show_why_choose: true,
    show_testimonials: true,
    show_newsletter: true,
    show_islamic_collection: true,
    show_new_arrivals: true,
    show_best_seller: true,
    show_offer_banner: false,
    show_brands: false,
    show_statistics: true,
  } as HomepageSections,
  store_info: {
    name: "Rangao - রাঙাও",
    phone: "01812-345678",
    email: "hello@rangao.bd",
    address: "ঢাকা, বাংলাদেশ",
    logo_url: "",
    mobile_logo_url: "",
    white_logo_url: "",
    logo_desktop_width: 140,
    logo_desktop_height: 40,
    logo_mobile_width: 100,
    logo_mobile_height: 30,
    favicon_url: "",
    address_line1: "",
    address_line2: "",
    city: "Dhaka",
    district: "Dhaka",
    country: "Bangladesh",
    postal_code: "",
    website_url: "https://www.rangao.bd",
    tagline: "প্রিমিয়াম ইসলামিক ও হোম ডেকোর",
    tracking: {
      global_enabled: true,
      environment: "production",
      meta_pixel_enabled: false,
      meta_pixel_id: "",
      meta_capi_enabled: false,
      meta_strict_purchase_mode: true,
      meta_debug_mode: false,
      gtm_enabled: false,
      gtm_id: "",
      ga4_enabled: false,
      ga4_id: "",
      google_debug_mode: false,
      tiktok_enabled: false,
      tiktok_pixel_id: "",
      tiktok_debug_mode: false
    }
  } as StoreInfo,
  trust_features: [
    { id: "tf-1", icon: "ShieldCheck", title: "১০০% প্রিমিয়াম কোয়ালিটি", desc: "সকল প্রোডাক্ট উন্নত মানের প্রিমিয়াম আমদানিকৃত কাঠ ও এক্রিলিক দিয়ে তৈরি।" },
    { id: "tf-2", icon: "Truck", title: "নিরাপদ ও দ্রুত ডেলিভারি", desc: "প্রতিটি প্রোডাক্ট মজবুত ও বাবল র‍্যাপড বক্সে দ্রুত ডেলিভারি।" },
    { id: "tf-3", icon: "Headset", title: "২৪/৭ কাস্টমার সাপোর্ট", desc: "যেকোনো সাহায্য বা কাস্টমাইজেশনে আমাদের টিম সবসময় পাশে।" },
    { id: "tf-4", icon: "RotateCcw", title: "রিপ্লেসমেন্ট পলিসি", desc: "ডেলিভারিতে ড্যামেজ হলে দ্রুত রিপ্লেসমেন্ট সুবিধা।" },
    { id: "tf-5", icon: "Banknote", title: "ক্যাশ অন ডেলিভারি", desc: "পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধ করুন।" },
    { id: "tf-6", icon: "MapPin", title: "সারা বাংলাদেশে ডেলিভারি", desc: "ঢাকা সহ সারা বাংলাদেশে হোম ডেলিভারি সার্ভিস।" },
  ] as TrustFeatureItem[],
  offer_banner: {
    enabled: false,
    bg_image: "",
    mobile_image: "",
    title: "বিশেষ অফার",
    subtitle: "সীমিত সময়ের জন্য বিশেষ ছাড়!",
    coupon_code: "",
    button_text: "অফার দেখুন",
    button_url: "/products",
    start_date: "",
    end_date: "",
    show_countdown: true,
  } as OfferBanner,
  newsletter: {
    title: "আমাদের নিউজলেটারে সাবস্ক্রাইব করুন",
    subtitle: "নতুন প্রোডাক্ট ও বিশেষ অফারের আপডেট পেতে ইমেইল দিন",
    placeholder: "আপনার ইমেইল লিখুন",
    button_text: "সাবস্ক্রাইব করুন",
    quote_arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    quote_bengali: "নিশ্চয়ই কষ্টের সাথেই স্বস্তি রয়েছে।",
    source: "সূরা আশ-শারহ্ (৯৪:৬)",
    quotes_list: [
      {
        id: "q-default-1",
        arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
        bengali: "নিশ্চয়ই কষ্টের সাথেই স্বস্তি রয়েছে।",
        source: "সূরা আশ-শারহ্ (৯৪:৬)"
      }
    ],
    show_only_custom: false,
    theme_style: "dark",
  } as NewsletterConfig,
  homepage_seo: {
    meta_title: "Rangao – রাঙাও | প্রিমিয়াম ইসলামিক ও হোম ডেকোর",
    meta_description: "রাঙাও – বাংলাদেশের প্রিমিয়াম ইসলামিক ক্যালিগ্রাফি, ওয়াল আর্ট ও হোম ডেকোর স্টোর।",
    meta_keywords: "ইসলামিক ডেকোর, ওয়াল আর্ট, নিকাহনামা, আয়াতুল কুরসি",
    og_image: "",
  } as HomepageSEO,
  statistics: {
    mode: "auto",
    customers: 5000,
    orders: 10000,
    reviews: 4800,
    products: 200,
  } as StatisticsConfig,
  homepage_gallery: [
    { id: "g-1", image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", title: "লিভিং রুম ক্যালিগ্রাফি ডেকোর", link: "/products" },
    { id: "g-2", image_url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80", title: "বেডরুম উডেন ওয়াল আর্ট", link: "/products" },
    { id: "g-3", image_url: "https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&w=600&q=80", title: "নিকাহনামা ফ্রেম কালেকশন", link: "/products" }
  ] as GalleryItem[],
  announcement_bar: {
    enabled: true,
    text: "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি এবং ৭ দিনের সহজ রিপ্লেসমেন্ট পলিসি!",
    bg_color: "#102a20",
    text_color: "#ffffff",
    link_url: "",
  } as AnnouncementBarConfig,
  homepage_section_order: DEFAULT_SECTION_ORDER,
  seo_settings: {
    site_title: "Rangao – রাঙাও",
    site_description: "রাঙাও – বাংলাদেশের প্রিমিয়াম ইসলামিক ক্যালিগ্রাফি, ওয়াল আর্ট ও হোম ডেকোর স্টোর।",
    title_format: "{title} | {siteName}",
    default_keywords: "ইসলামিক ডেকোর, ওয়াল আর্ট, নিকাহনামা, আয়াতুল কুরসি",
    robots_index: true,
    robots_follow: true,
    google_search_console_id: "",
    og_image: "",
  } as SEOSettings,
  about_us_settings: {
    title: "আমাদের সম্পর্কে",
    subtitle: "শৈল্পিক ও ইসলামিক নান্দনিকতায় আপনার ঘরকে রাঙিয়ে তোলার কারিগর",
    story_title: "আমাদের পথচলা",
    story_text: "রাঙাও মূলত প্রিমিয়াম ইসলামিক ওয়াল ক্যানভাস, কাঠের ক্যালিগ্রাফি এবং নিকাহনামা নিয়ে কাজ করে। আমরা বিশ্বাস করি প্রতিটি মুসলিমের ঘর সুন্দর এবং আল্লাহর স্মরণে মুখরিত থাকা উচিত শৈল্পিক ওয়াল আর্টের মাধ্যমে। মানসম্মত উপাদান, নিখুঁত ডিজাইন এবং দুর্দান্ত কাস্টমার সার্ভিসের মাধ্যমে আমরা আপনার ঘরের সৌন্দর্য বাড়িয়ে তুলতে প্রতিশ্রুতিবদ্ধ।",
    banner_image_url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    story_image_url: "https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&w=600&q=80",
    mission_title: "আমাদের মিশন",
    mission_text: "বাংলাদেশের প্রতিটি ঘরে শৈল্পিক ও অর্থবহ ইসলামিক ডেকোর প্রোডাক্ট ও ক্যালিগ্রাফি পৌঁছে দেওয়া, যা ঘরে নিয়ে আসবে প্রশান্তি এবং স্মরণ করিয়ে দেবে আল্লাহর কালামকে।",
    vision_title: "আমাদের ভিশন",
    vision_text: "একটি বিশ্বস্ত ও প্রিমিয়াম লাইফস্টাইল ব্র্যান্ড হিসেবে নিজেদের প্রতিষ্ঠিত করা এবং আন্তর্জাতিক মান বজায় রেখে গ্রাহকদের সেরা হোম ডেকোরেশন উপহার দেওয়া।",
    core_values: [
      { id: "cv-1", title: "১০০% প্রিমিয়াম কোয়ালিটি", desc: "আমরা শুধুমাত্র উন্নত মানের আমদানিকৃত উপাদান এবং প্রিমিয়াম কাঠের ফ্রেম ব্যবহার করি।", icon: "ShieldCheck" },
      { id: "cv-2", title: "শৈল্পিক ডিজাইন", desc: "আমাদের প্রতিটি আর্টওয়ার্ক অভিজ্ঞ ক্যালিগ্রাফার এবং ডিজাইনারদের দ্বারা নিখুঁতভাবে তৈরি।", icon: "Sparkles" },
      { id: "cv-3", title: "গ্রাহক সন্তুষ্টি", desc: "গ্রাহকদের সন্তুষ্টি ও স্বাচ্ছন্দ্য আমাদের মূল লক্ষ্য, যার জন্য আমরা সার্বক্ষণিক সেবা প্রদান করি।", icon: "Heart" },
      { id: "cv-4", title: "দ্রুত ও নিরাপদ ডেলিভারি", desc: "সারা বাংলাদেশে বাবল র‍্যাপড বক্সে অত্যন্ত নিরাপদ ও দ্রুততম সময়ে ডেলিভারি নিশ্চিত করি।", icon: "Truck" }
    ]
  } as AboutUsSettings,
};

const defaultStoreSettingsData = {
  heroBanner: {
    ...defaults.hero_banner,
    title: defaults.hero_banner.slides[0].title,
    subtitle: defaults.hero_banner.slides[0].subtitle,
    badge_text: defaults.hero_banner.slides[0].badge_text,
    cta_text: defaults.hero_banner.slides[0].cta_primary_text,
    cta_link: defaults.hero_banner.slides[0].cta_primary_url,
    banner_image_url: defaults.hero_banner.slides[0].banner_image_url,
    banner_video_url: "",
  } as HeroBanner,
  contactInfo: defaults.contact_info,
  deliveryCharges: defaults.delivery_charges,
  paymentMethods: defaults.payment_methods,
  homepageSections: defaults.homepage_sections,
  storeInfo: defaults.store_info,
  trustFeatures: defaults.trust_features,
  offerBanner: defaults.offer_banner,
  newsletter: defaults.newsletter,
  homepageSEO: defaults.homepage_seo,
  statistics: defaults.statistics,
  homepageGallery: defaults.homepage_gallery,
  sectionOrder: DEFAULT_SECTION_ORDER,
  announcementBar: defaults.announcement_bar,
  seoSettings: defaults.seo_settings,
  aboutUsSettings: defaults.about_us_settings,
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings-all"],
    placeholderData: defaultStoreSettingsData,
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

      // Merge hero_banner: handle both legacy (single slide) and new (slides array) format
      let heroBanner = { ...defaults.hero_banner, ...settings.hero_banner } as HeroBanner;
      if (!heroBanner.slides || heroBanner.slides.length === 0) {
        // Legacy: convert single-slide to slides array
        heroBanner.slides = [
          {
            id: "slide-1",
            title: heroBanner.title || defaults.hero_banner.slides[0].title,
            subtitle: heroBanner.subtitle || defaults.hero_banner.slides[0].subtitle,
            description: "",
            badge_text: heroBanner.badge_text || defaults.hero_banner.slides[0].badge_text,
            cta_primary_text: heroBanner.cta_text || defaults.hero_banner.slides[0].cta_primary_text,
            cta_primary_url: heroBanner.cta_link || defaults.hero_banner.slides[0].cta_primary_url,
            cta_secondary_text: "যোগাযোগ করুন",
            cta_secondary_url: "#contact",
            banner_image_url: heroBanner.banner_image_url || "",
            banner_video_url: heroBanner.banner_video_url || "",
            overlay_opacity: 0.85,
            text_align: "left" as const,
            enabled: true,
          }
        ];
      }

      // Populate top-level fields from the first slide to support components reading directly
      if (heroBanner.slides && heroBanner.slides.length > 0) {
        const firstSlide = heroBanner.slides[0];
        heroBanner.title = firstSlide.title;
        heroBanner.subtitle = firstSlide.subtitle;
        heroBanner.badge_text = firstSlide.badge_text;
        heroBanner.cta_text = firstSlide.cta_primary_text;
        heroBanner.cta_link = firstSlide.cta_primary_url;
        heroBanner.banner_image_url = firstSlide.banner_image_url;
        heroBanner.banner_video_url = firstSlide.banner_video_url;
      }

      const sectionOrder: HomepageSectionOrder[] = settings.homepage_section_order || defaults.homepage_section_order;

      return {
        heroBanner,
        contactInfo: { ...defaults.contact_info, ...settings.contact_info } as ContactInfo,
        deliveryCharges: { ...defaults.delivery_charges, ...settings.delivery_charges } as DeliveryCharges,
        paymentMethods: { ...defaults.payment_methods, ...settings.payment_methods } as PaymentMethods,
        homepageSections: { ...defaults.homepage_sections, ...settings.homepage_sections } as HomepageSections,
        storeInfo: { ...defaults.store_info, ...settings.store_info } as StoreInfo,
        trustFeatures: (settings.trust_features || defaults.trust_features) as TrustFeatureItem[],
        offerBanner: { ...defaults.offer_banner, ...settings.offer_banner } as OfferBanner,
        newsletter: { ...defaults.newsletter, ...settings.newsletter } as NewsletterConfig,
        homepageSEO: { ...defaults.homepage_seo, ...settings.homepage_seo } as HomepageSEO,
        statistics: { ...defaults.statistics, ...settings.statistics } as StatisticsConfig,
        homepageGallery: (settings.homepage_gallery || defaults.homepage_gallery) as GalleryItem[],
        sectionOrder,
        announcementBar: { ...defaults.announcement_bar, ...settings.announcement_bar } as AnnouncementBarConfig,
        seoSettings: { ...defaults.seo_settings, ...settings.seo_settings } as SEOSettings,
        aboutUsSettings: { ...defaults.about_us_settings, ...settings.about_us_settings } as AboutUsSettings,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

export type { HomepageSectionOrder, SEOSettings, AboutUsSettings, CoreValueItem, DeliveryCharges, PaymentMethods };
export { DEFAULT_SECTION_ORDER };
