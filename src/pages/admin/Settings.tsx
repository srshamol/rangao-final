import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Loader2, Save, Store, Truck, CreditCard, Settings2, BarChart3, 
  CheckCircle2, XCircle, Send, Plus, Trash2, Smartphone, Globe, 
  MessageSquare, Share2, Mail, MapPin, Eye, UploadCloud 
} from "lucide-react";
import { mediaService } from "@/lib/mediaService";
import type { StoreInfo, ContactInfo, SocialLinkItem, SEOSettings, AboutUsSettings, CoreValueItem } from "@/hooks/useStoreSettings";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import { trackLead, isValidTrackingId } from "@/lib/tracking";

interface DeliveryCharges {
  dhaka_inside: number;
  dhaka_outside: number;
  free_delivery_min: number;
  delivery_time_inside?: string;
  delivery_time_outside?: string;
}

interface PaymentMethods {
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

interface CourierSettings {
  default_courier: string;
  auto_sync_hours: number;
  api_key?: string;
  secret_key?: string;
  bdcourier_api_key?: string;
  bdcourier_base_url?: string;
  bdcourier_enabled?: boolean;
}

interface FacebookPixel {
  pixel_id: string;
  access_token: string;
  test_event_code: string;
  enabled: boolean;
  strict_purchase_mode?: boolean;
}

const SUPPORTED_SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: "Facebook" },
  { value: "facebook_group", label: "Facebook Group", icon: "Users" },
  { value: "instagram", label: "Instagram", icon: "Instagram" },
  { value: "tiktok", label: "TikTok", icon: "Music" },
  { value: "youtube", label: "YouTube", icon: "Youtube" },
  { value: "linkedin", label: "LinkedIn", icon: "Linkedin" },
  { value: "pinterest", label: "Pinterest", icon: "Pin" },
  { value: "twitter", label: "X (Twitter)", icon: "Twitter" },
  { value: "telegram", label: "Telegram", icon: "Send" },
  { value: "messenger", label: "Messenger", icon: "MessageCircle" },
  { value: "whatsapp", label: "WhatsApp", icon: "PhoneCall" },
  { value: "custom", label: "Custom Platform", icon: "Globe" }
];

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Expanded configurations
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "", phone: "", email: "", address: "", logo_url: "",
    secondary_phone: "", secondary_email: "",
    address_line1: "", address_line2: "", city: "", district: "", country: "Bangladesh", postal_code: "",
    website_url: "", mobile_logo_url: "", white_logo_url: "",
    logo_desktop_width: 140, logo_desktop_height: 40,
    logo_mobile_width: 100, logo_mobile_height: 30,
    favicon_url: "",
    tagline: ""
  });

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    phone: "", whatsapp: "", email: "", address: "",
    facebook_url: "", instagram_url: "",
    whatsapp_enabled: true, whatsapp_country_code: "+880",
    social_links: []
  });

  const [delivery, setDelivery] = useState<DeliveryCharges>({ 
    dhaka_inside: 70, 
    dhaka_outside: 130, 
    free_delivery_min: 0,
    delivery_time_inside: "৩-৫ কার্যদিবস",
    delivery_time_outside: "৫-৭ কার্যদিবস"
  });
  const [payment, setPayment] = useState<PaymentMethods>({ cod: true, bkash: false, nagad: false, bkash_number: "", nagad_number: "", uddoktapay: false, uddoktapay_api_key: "", uddoktapay_base_url: "", uddoktapay_display_name: "" });
  
  const [courier, setCourier] = useState<CourierSettings>({ 
    default_courier: "steadfast", 
    auto_sync_hours: 6, 
    api_key: "", 
    secret_key: "", 
    bdcourier_api_key: "", 
    bdcourier_base_url: "https://app.bdcourier.com/api", 
    bdcourier_enabled: false 
  });
  
  const [fbPixel, setFbPixel] = useState<FacebookPixel>({ pixel_id: "", access_token: "", test_event_code: "", enabled: false, strict_purchase_mode: true });
  const [tracking, setTracking] = useState<any>({
    global_enabled: true,
    environment: "production",
    meta_pixel_enabled: false,
    meta_pixel_id: "",
    meta_capi_enabled: false,
    meta_access_token: "",
    meta_api_version: "v21.0",
    meta_test_event_code: "",
    meta_strict_purchase_mode: true,
    meta_debug_mode: false,
    gtm_enabled: false,
    gtm_id: "",
    ga4_enabled: false,
    ga4_id: "",
    google_debug_mode: false,
    tiktok_enabled: false,
    tiktok_pixel_id: "",
    tiktok_access_token: "",
    tiktok_debug_mode: false
  });


  const [aboutUsSettings, setAboutUsSettings] = useState<AboutUsSettings>({
    title: "আমাদের সম্পর্কে",
    subtitle: "শৈল্পিক ও ইসলামিক নান্দনিকতায় আপনার ঘরকে রাঙিয়ে তোলার কারিগর",
    story_title: "আমাদের পথচলা",
    story_text: "রাঙাও মূলত প্রিমিয়াম ইসলামিক ওয়াল ক্যানভাস, কাঠের ক্যালিগ্রাফি এবং নিকাহনামা নিয়ে কাজ করে। আমরা বিশ্বাস করি প্রতিটি মুসলিমের ঘর সুন্দর এবং আল্লাহর স্মরণে মুখরিত থাকা উচিত শৈল্পিক ওয়াল আর্টের মাধ্যমে।",
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
  });

  const handleUpdateCoreValue = (index: number, field: string, val: string) => {
    setAboutUsSettings(prev => {
      const updated = [...prev.core_values];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, core_values: updated };
    });
  };

  const handleAddCoreValue = () => {
    setAboutUsSettings(prev => ({
      ...prev,
      core_values: [
        ...prev.core_values,
        { id: `cv-${Date.now()}`, title: "নতুন মূল্যবোধ", desc: "বিবরণ লিখুন", icon: "Award" }
      ]
    }));
  };

  const handleRemoveCoreValue = (index: number) => {
    setAboutUsSettings(prev => ({
      ...prev,
      core_values: prev.core_values.filter((_, i) => i !== index)
    }));
  };

  const [telegramSettings, setTelegramSettings] = useState<any>({
    bot_token: "",
    chat_id: "",
    enabled: false,
    notify_new_order: true,
    notify_status_change: true,
    notify_incomplete_order: true,
    notify_low_stock: true
  });
  const [testingTelegram, setTestingTelegram] = useState(false);

  const [smsSettings, setSmsSettings] = useState<any>({
    enabled: false,
    sandbox_mode: true,
    otp_enabled: false,
    otp_digit_count: 4,
    gateway: "sandbox",
    api_key: "",
    sender_id: "",
    api_url: "",
    username: "",
    password: "",
    otp_template: "আপনার ভেরিফিকেশন কোড হলো: {otp}",
    order_success_sms_enabled: false,
    order_success_sms_template: "প্রিয় {name}, আপনার অর্ডার #{order_number} সফলভাবে সম্পন্ন হয়েছে। মোট: ৳{total}।",
    status_update_sms_enabled: false,
    status_update_sms_template: "প্রিয় {name}, আপনার অর্ডার #{order_number} এর বর্তমান স্ট্যাটাস: {status}।",
  });


  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    site_title: "",
    site_description: "",
    title_format: "",
    default_keywords: "",
    robots_index: true,
    robots_follow: true,
    google_search_console_id: "",
    fb_app_id: "",
    og_image: "",
  });

  const [localLogs, setLocalLogs] = useState<string[]>([
    `[SYSTEM] Unified tracking engine initialized successfully.`,
  ]);

  const [dbTracking, setDbTracking] = useState<any>(null);

  const { data: capiLogs, refetch: refetchCapiLogs } = useQuery({
    queryKey: ["capi-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_history")
        .select("id, created_at, details, order_id")
        .eq("action", "fb_capi_sent")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  const [newPlatform, setNewPlatform] = useState("facebook");
  const [newUrl, setNewUrl] = useState("");


  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [activePickerField, setActivePickerField] = useState<string | null>(null);
  const primaryLogoInputRef = useRef<HTMLInputElement>(null);
  const mobileLogoInputRef = useRef<HTMLInputElement>(null);
  const whiteLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, field: "logo_url" | "mobile_logo_url" | "white_logo_url" | "favicon_url") => {
    setUploadingField(field);
    try {
      const mediaItem = await mediaService.upload(file, "images");
      
      setStoreInfo(prev => ({
        ...prev,
        [field]: mediaItem.url
      }));
      toast({ title: "✅ আপলোড সফল হয়েছে", description: "পরিবর্তন সংরক্ষণ করতে নিচে সেভ করুন বাটনে ক্লিক করুন।" });
    } catch (e: any) {
      toast({ title: "❌ আপলোড ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setUploadingField(null);
    }
  };

  const deleteFile = (field: "logo_url" | "mobile_logo_url" | "white_logo_url" | "favicon_url") => {
    setStoreInfo(prev => ({
      ...prev,
      [field]: ""
    }));
    toast({ title: "🗑️ ফাইল মুছে ফেলা হয়েছে", description: "পরিবর্তন সংরক্ষণ করতে নিচে সেভ করুন বাটনে ক্লিক করুন।" });
  };

  const handleTestTelegram = async () => {
    if (!telegramSettings.bot_token || !telegramSettings.chat_id) {
      toast({ title: "❌ ভুল ইনপুট", description: "টেলিগ্রাম বট টোকেন এবং চ্যাট আইডি দিতে হবে।", variant: "destructive" });
      return;
    }
    setTestingTelegram(true);
    try {
      // First, save the configuration so the endpoint reads the latest credentials
      const { error: saveError } = await supabase.from("store_settings" as any)
        .upsert({ key: "telegram_settings", value: telegramSettings, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (saveError) throw saveError;

      const { sendTelegramNotification } = await import("@/lib/telegram");
      const res = await sendTelegramNotification(
        "🔔 <b>Rangao Notification</b>\n\nঅভিনন্দন! আপনার টেলিগ্রাম নোটিফিকেশন সিস্টেম সফলভাবে যুক্ত হয়েছে।",
        { isTest: true }
      );

      if (res.success) {
        toast({ title: "✅ টেস্ট সফল", description: "আপনার টেলিগ্রাম অ্যাকাউন্টে একটি টেস্ট মেসেজ পাঠানো হয়েছে।" });
      } else {
        throw new Error(res.error || "Failed to send notification");
      }
    } catch (e: any) {
      toast({ title: "❌ টেস্ট ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setTestingTelegram(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("store_settings" as any).select("key, value");
      if (data) {
        data.forEach((row: any) => {
          if (row.key === "store_info") {
            setStoreInfo(prev => ({
              ...prev,
              ...row.value,
              logo_desktop_width: Number(row.value.logo_desktop_width) || 140,
              logo_desktop_height: Number(row.value.logo_desktop_height) || 40,
              logo_mobile_width: Number(row.value.logo_mobile_width) || 100,
              logo_mobile_height: Number(row.value.logo_mobile_height) || 30
            }));
          }
          if (row.key === "contact_info") {
            setContactInfo(prev => ({
              ...prev,
              ...row.value,
              social_links: row.value.social_links || []
            }));
          }
          if (row.key === "delivery_charges") {
            setDelivery(prev => ({
              ...prev,
              ...row.value,
              delivery_time_inside: row.value.delivery_time_inside || "৩-৫ কার্যদিবস",
              delivery_time_outside: row.value.delivery_time_outside || "৫-৭ কার্যদিবস"
            }));
          }
          if (row.key === "payment_methods") {
            setPayment(prev => ({
              ...prev,
              ...row.value
            }));
          }
          if (row.key === "courier_settings") {
            setCourier({
              default_courier: row.value.default_courier || "steadfast",
              auto_sync_hours: row.value.auto_sync_hours || 6,
              api_key: row.value.api_key || "",
              secret_key: row.value.secret_key || "",
              bdcourier_api_key: row.value.bdcourier_api_key || "",
              bdcourier_base_url: row.value.bdcourier_base_url || "https://app.bdcourier.com/api",
              bdcourier_enabled: !!row.value.bdcourier_enabled,
            });
          }
          if (row.key === "facebook_pixel") setFbPixel(row.value);
          if (row.key === "tracking_settings" || row.key === "public_tracking_settings") {
            const val = { ...row.value };
            if (val.meta_pixel_id === "18625836884445311" || !val.meta_pixel_id) {
              val.meta_pixel_id = "1862583688445311";
            }
            setTracking((prev: any) => ({
              ...prev,
              ...val
            }));
            setDbTracking(val);
          }

          if (row.key === "telegram_settings") {
            setTelegramSettings(prev => ({
              ...prev,
              ...row.value
            }));
          }
          if (row.key === "sms_settings") {
            setSmsSettings(prev => ({
              ...prev,
              ...row.value
            }));
          }
          if (row.key === "seo_settings") {
            setSeoSettings(prev => ({
              ...prev,
              ...row.value
            }));
          }
          if (row.key === "about_us_settings") {
            setAboutUsSettings(prev => ({
              ...prev,
              ...row.value,
              core_values: row.value.core_values || prev.core_values
            }));
          }
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  // Validation functions
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateUrl = (url: string) => {
    if (!url) return true; // Optional fields can be blank
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  const validatePhone = (phone: string) => {
    if (!phone) return true;
    return /^[0-9+\-\s]{5,20}$/.test(phone);
  };

  const saveSetting = async (key: string, value: any) => {
    // Basic structural validation before saving
    if (key === "store_info") {
      if (!value.name?.trim()) {
        toast({ title: "❌ ভুল ইনপুট", description: "স্টোরের নাম খালি হতে পারবে না।", variant: "destructive" });
        return;
      }
      if (value.email && !validateEmail(value.email)) {
        toast({ title: "❌ ভুল ইনপুট", description: "স্টোরের ইমেল সঠিক নয়।", variant: "destructive" });
        return;
      }
      if (value.website_url && !validateUrl(value.website_url)) {
        toast({ title: "❌ ভুল ইনপুট", description: "ওয়েবসাইট লিংক সঠিক নয়। (সম্পূর্ণ URL দিন)", variant: "destructive" });
        return;
      }
    }

    setSaving(key);
    try {
      const { error } = await supabase.from("store_settings" as any)
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      
      // Update both database tables to maintain 100% frontend synchronization
      if (key === "store_info") {
        // Automatically sync email & phone to contact_info too
        const nextContact = { ...contactInfo, phone: value.phone, email: value.email, address: value.address };
        setContactInfo(nextContact);
        await supabase.from("store_settings" as any)
          .upsert({ key: "contact_info", value: nextContact, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }

       toast({ title: "✅ সেটিংস সফলভাবে সেভ হয়েছে" });
     } catch (e: any) {
       toast({ title: "সেভ ব্যর্থ", description: e.message, variant: "destructive" });
     } finally {
       setSaving(null);
     }
   };
 
   const saveTrackingSettings = async () => {
     setSaving("tracking_settings");
     try {
       // Validate Pixel/GTM/GA4/TikTok inputs if needed
       if (tracking.meta_pixel_enabled && !tracking.meta_pixel_id?.trim()) {
         toast({ title: "❌ ভুল ইনপুট", description: "ফেসবুক পিক্সেল আইডি দিতে হবে।", variant: "destructive" });
         return;
       }
       if (tracking.gtm_enabled && !tracking.gtm_id?.trim()) {
         toast({ title: "❌ ভুল ইনপুট", description: "GTM কন্টেইনার আইডি দিতে হবে।", variant: "destructive" });
         return;
       }
       if (tracking.ga4_enabled && !tracking.ga4_id?.trim()) {
         toast({ title: "❌ ভুল ইনপুট", description: "GA4 মেজারমেন্ট আইডি দিতে হবে।", variant: "destructive" });
         return;
       }
       if (tracking.tiktok_enabled && !tracking.tiktok_pixel_id?.trim()) {
         toast({ title: "❌ ভুল ইনপুট", description: "TikTok পিক্সেল আইডি দিতে হবে।", variant: "destructive" });
         return;
       }
 
       // 1. Save full tracking settings (contains private tokens)
       const { error: err1 } = await supabase
         .from("store_settings" as any)
         .upsert({
           key: "tracking_settings",
           value: tracking,
           updated_at: new Date().toISOString()
         }, { onConflict: "key" });
       if (err1) throw err1;
 
       // 2. Save public version (exclude sensitive tokens)
       const { meta_access_token, tiktok_access_token, ...publicTracking } = tracking;
       const { error: err2 } = await supabase
         .from("store_settings" as any)
         .upsert({
           key: "public_tracking_settings",
           value: publicTracking,
           updated_at: new Date().toISOString()
         }, { onConflict: "key" });
       if (err2) throw err2;
 
       // 3. Sync to store_info.tracking for instant frontend refresh
       const nextStoreInfo = { ...storeInfo, tracking: publicTracking };
       setStoreInfo(nextStoreInfo);
       const { error: err3 } = await supabase
         .from("store_settings" as any)
         .upsert({
           key: "store_info",
           value: nextStoreInfo,
           updated_at: new Date().toISOString()
         }, { onConflict: "key" });
       if (err3) throw err3;
 
       // Also update backward-compatible facebook_pixel setting for other systems reading it
       await supabase.from("store_settings" as any)
         .upsert({
           key: "facebook_pixel",
           value: {
             enabled: tracking.meta_pixel_enabled,
             pixel_id: tracking.meta_pixel_id,
             access_token: tracking.meta_access_token,
             test_event_code: tracking.meta_test_event_code,
             strict_purchase_mode: tracking.meta_strict_purchase_mode
           },
           updated_at: new Date().toISOString()
         }, { onConflict: "key" });
 
       toast({ title: "✅ ট্র্যাকিং সেটিংস সফলভাবে সেভ হয়েছে" });
       setDbTracking(tracking);
     } catch (e: any) {
       toast({ title: "❌ সেভ ব্যর্থ হয়েছে", description: e.message, variant: "destructive" });
     } finally {
       setSaving(null);
     }
   };

  // WhatsApp Generation Helper
  const getWhatsAppLink = () => {
    const rawNum = contactInfo.whatsapp.replace(/[^0-9]/g, "");
    if (!rawNum) return "";
    return `https://wa.me/${rawNum}`;
  };

  const handleWhatsAppChange = (val: string) => {
    let cleaned = val.replace(/[^0-9+]/g, "");
    let detectedCode = contactInfo.whatsapp_country_code || "+880";

    // Auto-detect country code from pasted content
    if (cleaned.startsWith("+880") || cleaned.startsWith("880")) {
      detectedCode = "+880";
      if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith("+1") || (cleaned.startsWith("1") && cleaned.length > 10)) {
      detectedCode = "+1";
      if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith("+44") || (cleaned.startsWith("44") && cleaned.length > 10)) {
      detectedCode = "+44";
      if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith("+971") || (cleaned.startsWith("971") && cleaned.length > 10)) {
      detectedCode = "+971";
      if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith("+966") || (cleaned.startsWith("966") && cleaned.length > 10)) {
      detectedCode = "+966";
      if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
    }

    // Auto-prepend country code prefix (e.g. Bangladesh) if typing local number
    const prefix = detectedCode.replace("+", "");
    if (detectedCode === "+880") {
      if (cleaned.startsWith("01")) {
        cleaned = "880" + cleaned.substring(1);
      } else if (cleaned.startsWith("1") && !cleaned.startsWith("880")) {
        cleaned = "880" + cleaned;
      }
    } else {
      // General non-BD fallback: if it doesn't start with prefix and has content, prepend it
      if (cleaned && !cleaned.startsWith(prefix) && (cleaned.startsWith("0") || cleaned.length >= 7)) {
        if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
        cleaned = prefix + cleaned;
      }
    }

    setContactInfo(p => ({
      ...p,
      whatsapp: cleaned,
      whatsapp_country_code: detectedCode
    }));
  };

  const handleCountryCodeChange = (newCode: string) => {
    let num = contactInfo.whatsapp.replace(/[^0-9]/g, "");
    const oldPrefix = (contactInfo.whatsapp_country_code || "+880").replace("+", "");
    const newPrefix = newCode.replace("+", "");

    if (num.startsWith(oldPrefix)) {
      num = newPrefix + num.substring(oldPrefix.length);
    } else if (num) {
      if (newPrefix === "880" && num.startsWith("0")) {
        num = newPrefix + num.substring(1);
      } else {
        num = newPrefix + num;
      }
    }

    setContactInfo(p => ({
      ...p,
      whatsapp_country_code: newCode,
      whatsapp: num
    }));
  };

  // Dynamic social link helpers
  const handleAddSocialLink = () => {
    if (!newUrl.trim()) {
      toast({ title: "ভুল ইনপুট", description: "সোশ্যাল প্রোফাইলের URL দিন", variant: "destructive" });
      return;
    }
    if (!validateUrl(newUrl)) {
      toast({ title: "ভুল ইনপুট", description: "সঠিক সোশ্যাল প্রোফাইল URL দিন (যেমন: https://...)", variant: "destructive" });
      return;
    }

    const matchedPlatform = SUPPORTED_SOCIAL_PLATFORMS.find(p => p.value === newPlatform);
    const newLink: SocialLinkItem = {
      id: `social-${Date.now()}`,
      platform: newPlatform,
      icon: matchedPlatform ? matchedPlatform.icon : "Globe",
      url: newUrl,
      order: (contactInfo.social_links?.length || 0) + 1,
      enabled: true
    };

    const nextLinks = [...(contactInfo.social_links || []), newLink];
    setContactInfo(prev => ({ ...prev, social_links: nextLinks }));
    setNewUrl("");
    toast({ title: "লিংক যোগ করা হয়েছে", description: "সেভ করুন বাটনে ক্লিক করে পরিবর্তন নিশ্চিত করুন।" });
  };

  const handleRemoveSocialLink = (id: string) => {
    const nextLinks = (contactInfo.social_links || []).filter(item => item.id !== id);
    setContactInfo(prev => ({ ...prev, social_links: nextLinks }));
  };

  const handleToggleSocialLink = (id: string) => {
    const nextLinks = (contactInfo.social_links || []).map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setContactInfo(prev => ({ ...prev, social_links: nextLinks }));
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div className="flex flex-col gap-1.5 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">⚙️ স্টোর ও ব্র্যান্ড সেটিংস</h1>
        <p className="text-sm text-muted-foreground">স্টোরের লোগো, সোশ্যাল অ্যাকাউন্ট, কন্টাক্ট এবং গ্লোবাল সেটিংস পরিচালনা করুন।</p>
      </div>

      <Tabs defaultValue="brand" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 bg-muted p-1.5 rounded-xl h-auto w-full">
          <TabsTrigger value="brand" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">🎨 লোগো ও ব্র্যান্ড</TabsTrigger>
          <TabsTrigger value="social" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">🔗 সোশ্যাল লিংক ও হোয়াটসঅ্যাপ</TabsTrigger>
          <TabsTrigger value="contact" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">📞 কন্টাক্ট ও অ্যাড্রেস</TabsTrigger>
          <TabsTrigger value="ecommerce" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">💳 পেমেন্ট ও ডেলিভারি</TabsTrigger>
          <TabsTrigger value="courier" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">📦 কুরিয়ার সেটিংস</TabsTrigger>
          <TabsTrigger value="tracking" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">🌐 ট্র্যাকিং ও অ্যানালিটিক্স</TabsTrigger>
          <TabsTrigger value="about" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">📖 আমাদের সম্পর্কে</TabsTrigger>
          <TabsTrigger value="telegram" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">📢 টেলিগ্রাম নোটিফিকেশন</TabsTrigger>
          <TabsTrigger value="sms" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">💬 এসএমএস ও ওটিপি</TabsTrigger>
        </TabsList>

        {/* Tab 1: Logo & Favicon Management */}
        <TabsContent value="brand" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary"><Store className="h-4.5 w-4.5 text-accent" /> ওয়েবসাইট লোগো</CardTitle>
              <CardDescription>বিভিন্ন স্ক্রিন এবং লেআউটের জন্য লোগো ও মাত্রা নির্ধারণ করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Primary Logo */}
                <div className="space-y-3 p-4 rounded-xl border bg-secondary/25 flex flex-col justify-between">
                  <div>
                    <Label className="font-bold flex items-center gap-1.5">Primary Logo (লাইট ব্যাকগ্রাউন্ড)</Label>
                    <div className="mt-2 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-white relative group">
                      {storeInfo.logo_url ? (
                        <>
                          <img src={storeInfo.logo_url} alt="Primary logo preview" className="max-h-16 object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setActivePickerField("logo_url")}>Replace</Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteFile("logo_url")}>Delete</Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActivePickerField("logo_url")}>
                          <UploadCloud className="h-6 w-6 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Upload Logo</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <Input 
                      value={storeInfo.logo_url} 
                      onChange={e => setStoreInfo(p => ({ ...p, logo_url: e.target.value }))} 
                      placeholder="অথবা লোগো ইমেজ URL দিন" 
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Mobile Logo */}
                <div className="space-y-3 p-4 rounded-xl border bg-secondary/25 flex flex-col justify-between">
                  <div>
                    <Label className="font-bold flex items-center gap-1.5">Mobile Logo (মোবাইল হেডার)</Label>
                    <div className="mt-2 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-white relative group">
                      {storeInfo.mobile_logo_url ? (
                        <>
                          <img src={storeInfo.mobile_logo_url} alt="Mobile logo preview" className="max-h-16 object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setActivePickerField("mobile_logo_url")}>Replace</Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteFile("mobile_logo_url")}>Delete</Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActivePickerField("mobile_logo_url")}>
                          <UploadCloud className="h-6 w-6 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Upload Mobile Logo</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <Input 
                      value={storeInfo.mobile_logo_url || ""} 
                      onChange={e => setStoreInfo(p => ({ ...p, mobile_logo_url: e.target.value }))} 
                      placeholder="অথবা মোবাইল লোগো URL দিন" 
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* White Logo */}
                <div className="space-y-3 p-4 rounded-xl border bg-secondary/25 flex flex-col justify-between">
                  <div>
                    <Label className="font-bold flex items-center gap-1.5">White Logo (ডার্ক ব্যাকগ্রাউন্ড)</Label>
                    <div className="mt-2 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-primary relative group">
                      {storeInfo.white_logo_url ? (
                        <>
                          <img src={storeInfo.white_logo_url} alt="White logo preview" className="max-h-16 object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setActivePickerField("white_logo_url")}>Replace</Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteFile("white_logo_url")}>Delete</Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActivePickerField("white_logo_url")}>
                          <UploadCloud className="h-6 w-6 text-primary-foreground/50" />
                          <span className="text-[10px] text-primary-foreground/55">Upload White Version</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <input 
                      ref={whiteLogoInputRef} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "white_logo_url")} 
                    />
                    <Input 
                      value={storeInfo.white_logo_url || ""} 
                      onChange={e => setStoreInfo(p => ({ ...p, white_logo_url: e.target.value }))} 
                      placeholder="অথবা হোয়াইট লোগো URL দিন" 
                      className="text-xs"
                      disabled={uploadingField === "white_logo_url"}
                    />
                  </div>
                </div>
              </div>

              {/* Logo Dimensions */}
              <Separator />
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-primary">লোগো সাইজ কন্ট্রোল</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">ডেস্কটপ প্রস্থ (px)</Label>
                    <Input 
                      type="number" 
                      value={storeInfo.logo_desktop_width || 140} 
                      onChange={e => setStoreInfo(p => ({ ...p, logo_desktop_width: Number(e.target.value) }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">ডেস্কটপ উচ্চতা (px)</Label>
                    <Input 
                      type="number" 
                      value={storeInfo.logo_desktop_height || 40} 
                      onChange={e => setStoreInfo(p => ({ ...p, logo_desktop_height: Number(e.target.value) }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">মোবাইল প্রস্থ (px)</Label>
                    <Input 
                      type="number" 
                      value={storeInfo.logo_mobile_width || 100} 
                      onChange={e => setStoreInfo(p => ({ ...p, logo_mobile_width: Number(e.target.value) }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">মোবাইল উচ্চতা (px)</Label>
                    <Input 
                      type="number" 
                      value={storeInfo.logo_mobile_height || 30} 
                      onChange={e => setStoreInfo(p => ({ ...p, logo_mobile_height: Number(e.target.value) }))} 
                    />
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="md:col-span-2 space-y-2">
                  <Label className="font-bold">ওয়েবসাইট ফেভিকন (Favicon)</Label>
                  <p className="text-xs text-muted-foreground">PNG, ICO, or SVG ফাইল আপলোড বা URL দিন। এটি ব্রাউজার ট্যাব এবং বুকমার্কে প্রদর্শিত হয়।</p>
                  <div className="flex gap-2">
                    <Input 
                      value={storeInfo.favicon_url || ""} 
                      onChange={e => setStoreInfo(p => ({ ...p, favicon_url: e.target.value }))} 
                      placeholder="ফেভিকন ইমেজ URL" 
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" className="gap-1 rounded-xl" onClick={() => setActivePickerField("favicon_url")}>
                      <UploadCloud className="h-4 w-4" /> Pick/Upload
                    </Button>
                    {storeInfo.favicon_url && (
                      <Button type="button" variant="destructive" className="gap-1 rounded-xl" onClick={() => deleteFile("favicon_url")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-secondary/15 flex items-center gap-3">
                  <div className="h-10 w-10 border rounded flex items-center justify-center bg-white shadow-sm">
                    {storeInfo.favicon_url ? (
                      <img src={storeInfo.favicon_url} alt="Favicon" className="h-6 w-6 object-contain" />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold">ফেভিকন প্রিভিউ</p>
                    <p className="text-muted-foreground">{storeInfo.favicon_url ? "কাস্টম আপলোড" : "ডিফল্ট ফেভিকন"}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" onClick={() => saveSetting("store_info", storeInfo)} disabled={saving === "store_info"}>
                  {saving === "store_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} লোগো ও ব্র্যান্ড সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Social Media & WhatsApp Manager */}
        <TabsContent value="social" className="space-y-6 outline-none">
          {/* WhatsApp Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-success"><MessageSquare className="h-4.5 w-4.5 text-success" /> হোয়াটসঅ্যাপ সেটিংস</CardTitle>
              <CardDescription>গ্রাহক সহায়তার জন্য ওয়ান-ক্লিক ওয়াটসঅ্যাপ চ্যাট বাটন পরিচালনা করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-success/5 border-success/15">
                <div className="space-y-1">
                  <p className="font-bold text-sm">হোয়াটসঅ্যাপ উইজেট বাটন</p>
                  <p className="text-xs text-muted-foreground">অন করলে পুরো ওয়েবসাইটে ও প্রোডাক্ট পেজে হোয়াটসঅ্যাপ বাটন প্রদর্শিত হবে</p>
                </div>
                <Switch 
                  checked={contactInfo.whatsapp_enabled !== false} 
                  onCheckedChange={v => setContactInfo(p => ({ ...p, whatsapp_enabled: v }))} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>কান্ট্রি কোড</Label>
                  <Select 
                    value={contactInfo.whatsapp_country_code || "+880"} 
                    onValueChange={handleCountryCodeChange}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+880">বাংলাদেশ (+880)</SelectItem>
                      <SelectItem value="+1">আমেরিকা (+1)</SelectItem>
                      <SelectItem value="+44">যুক্তরাজ্য (+44)</SelectItem>
                      <SelectItem value="+971">ইউএই (+971)</SelectItem>
                      <SelectItem value="+966">সৌদি আরব (+966)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>হোয়াটসঅ্যাপ নম্বর</Label>
                  <Input 
                    value={contactInfo.whatsapp} 
                    onChange={e => handleWhatsAppChange(e.target.value)} 
                    placeholder="যেমন: 01812345678" 
                  />
                  <p className="text-[10px] text-muted-foreground">নম্বরটি টাইপ করুন। কান্ট্রি কোড ও প্রথম শূন্য স্বয়ংক্রিয়ভাবে ফর্ম্যাট হবে।</p>
                </div>
              </div>

              <Separator />

              {/* Real-time WhatsApp generator preview */}
              <div className="p-4 rounded-xl border bg-secondary/20 flex flex-col gap-3">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">জেনারেটেড লিঙ্ক ও লাইভ প্রিভিউ</h4>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">ফুল হোয়াটসঅ্যাপ লিংক:</p>
                    <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline block truncate mt-1">
                      {getWhatsAppLink() || "নম্বর এন্টার করুন..."}
                    </a>
                  </div>
                  {getWhatsAppLink() && (
                    <Button size="sm" variant="outline" className="rounded-full border-success/30 text-success bg-white hover:bg-success/5 hover:border-success/50 shrink-0" asChild>
                      <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3.5 w-3.5 mr-1" /> চ্যাট প্রিভিউ
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" onClick={() => saveSetting("contact_info", contactInfo)} disabled={saving === "contact_info"}>
                  {saving === "contact_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} হোয়াটসঅ্যাপ সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Accounts Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-600"><Share2 className="h-4.5 w-4.5 text-amber-500" /> সোশ্যাল মিডিয়া অ্যাকাউন্টস</CardTitle>
              <CardDescription>ওয়েবসাইটের হেডার ও ফুটারে সোশ্যাল মিডিয়া আইকন ও অ্যাকাউন্টসমূহ কন্ট্রোল করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Add social account block */}
              <div className="p-4 rounded-xl border bg-secondary/15 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <Label>প্ল্যাটফর্ম নির্বাচন করুন</Label>
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_SOCIAL_PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-2 space-y-2 w-full md:w-auto md:flex-1">
                  <Label>প্রোফাইল লিংক (URL)</Label>
                  <Input 
                    value={newUrl} 
                    onChange={e => setNewUrl(e.target.value)} 
                    placeholder="https://facebook.com/your-brand" 
                  />
                </div>
                <Button type="button" className="gap-1.5 rounded-xl bg-accent text-accent-foreground w-full md:w-auto" onClick={handleAddSocialLink}>
                  <Plus className="h-4 w-4" /> যোগ করুন
                </Button>
              </div>

              {/* Saved accounts manager */}
              <Separator />
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-primary">সংরক্ষিত সোশ্যাল অ্যাকাউন্টসমূহ ({contactInfo.social_links?.length || 0})</h4>
                
                {(!contactInfo.social_links || contactInfo.social_links.length === 0) ? (
                  <div className="p-8 text-center border-2 border-dashed rounded-xl">
                    <p className="text-sm text-muted-foreground">কোনো সোশ্যাল অ্যাকাউন্ট যোগ করা হয়নি। উপরের ফর্মে লিঙ্ক দিন।</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(contactInfo.social_links || []).map((link) => {
                      const matched = SUPPORTED_SOCIAL_PLATFORMS.find(p => p.value === link.platform);
                      return (
                        <div key={link.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border bg-card hover:shadow-sm transition-all duration-300">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold font-mono">
                              {link.platform.substring(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground capitalize">{matched ? matched.label : link.platform}</p>
                              <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 justify-end">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{link.enabled ? "সক্রিয়" : "বন্ধ"}</span>
                              <Switch 
                                checked={link.enabled} 
                                onCheckedChange={() => handleToggleSocialLink(link.id)} 
                              />
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                              onClick={() => handleRemoveSocialLink(link.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Social Accounts Live preview */}
              {contactInfo.social_links && contactInfo.social_links.length > 0 && (
                <div className="p-4 rounded-xl border bg-secondary/15 flex flex-col gap-2.5">
                  <h5 className="font-bold text-xs text-primary uppercase tracking-wider">হেডার/ফুটারে সোশ্যাল প্রিভিউ</h5>
                  <div className="flex items-center gap-2 pt-1">
                    {contactInfo.social_links.filter(l => l.enabled).map(l => (
                      <span key={l.id} className="h-8 px-3 rounded-full bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 capitalize shadow-sm">
                        🌐 {l.platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" onClick={() => saveSetting("contact_info", contactInfo)} disabled={saving === "contact_info"}>
                  {saving === "contact_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} সোশ্যাল লিংকসমূহ সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Contact & Addresses */}
        <TabsContent value="contact" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary"><Mail className="h-4.5 w-4.5 text-accent" /> কন্টাক্ট ও অ্যাড্রেস সেটিংস</CardTitle>
              <CardDescription>বিজনেস আইডেন্টিটি, ফোন নম্বর, কন্টাক্ট ইমেইল এবং অফিসিয়াল ঠিকানা কনফিগার করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Business Contact details */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-primary flex items-center gap-1"><Smartphone className="h-4 w-4 text-accent" /> সাধারণ কন্টাক্ট তথ্য</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>স্টোরের নাম (Business Name)</Label>
                    <Input value={storeInfo.name} onChange={e => setStoreInfo(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>স্টোরের ট্যাগলাইন / স্লোগান (Tagline)</Label>
                    <Input value={storeInfo.tagline || ""} onChange={e => setStoreInfo(p => ({ ...p, tagline: e.target.value }))} placeholder="যেমন: প্রিমিয়াম ইসলামিক ও হোম ডেকোর" />
                  </div>
                  <div className="space-y-2">
                    <Label>প্রধান ফোন নম্বর</Label>
                    <Input value={storeInfo.phone} onChange={e => setStoreInfo(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>বিকল্প ফোন নম্বর (Secondary)</Label>
                    <Input value={storeInfo.secondary_phone || ""} onChange={e => setStoreInfo(p => ({ ...p, secondary_phone: e.target.value }))} placeholder="ঐচ্ছিক বিকল্প ফোন" />
                  </div>
                  <div className="space-y-2">
                    <Label>অফিসিয়াল ইমেইল</Label>
                    <Input value={storeInfo.email} onChange={e => setStoreInfo(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>বিকল্প ইমেইল (Secondary)</Label>
                    <Input value={storeInfo.secondary_email || ""} onChange={e => setStoreInfo(p => ({ ...p, secondary_email: e.target.value }))} placeholder="support@rangao.bd" />
                  </div>
                  <div className="space-y-2">
                    <Label>ওয়েবসাইট URL</Label>
                    <Input value={storeInfo.website_url || ""} onChange={e => setStoreInfo(p => ({ ...p, website_url: e.target.value }))} placeholder="https://www.rangao.bd" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detailed official addresses */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-primary flex items-center gap-1"><MapPin className="h-4 w-4 text-accent" /> অফিসিয়াল ঠিকানা (Address details)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ঠিকানা লাইন ১ (ঠিকানা / রোড / সেকশন)</Label>
                    <Input value={storeInfo.address_line1 || ""} onChange={e => setStoreInfo(p => ({ ...p, address_line1: e.target.value }))} placeholder="বাড়ি-১২, রোড-৪" />
                  </div>
                  <div className="space-y-2">
                    <Label>ঠিকানা লাইন ২ (থানা / অঞ্চল)</Label>
                    <Input value={storeInfo.address_line2 || ""} onChange={e => setStoreInfo(p => ({ ...p, address_line2: e.target.value }))} placeholder="উত্তরা, সেকটর-৩" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="space-y-2">
                      <Label>সিটি/শহর</Label>
                      <Input value={storeInfo.city || ""} onChange={e => setStoreInfo(p => ({ ...p, city: e.target.value }))} placeholder="Dhaka" />
                    </div>
                    <div className="space-y-2">
                      <Label>জেলা</Label>
                      <Input value={storeInfo.district || ""} onChange={e => setStoreInfo(p => ({ ...p, district: e.target.value }))} placeholder="Dhaka" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="space-y-2">
                      <Label>পোস্টাল কোড / জিপ</Label>
                      <Input value={storeInfo.postal_code || ""} onChange={e => setStoreInfo(p => ({ ...p, postal_code: e.target.value }))} placeholder="1230" />
                    </div>
                    <div className="space-y-2">
                      <Label>দেশ (Country)</Label>
                      <Input value={storeInfo.country || "Bangladesh"} onChange={e => setStoreInfo(p => ({ ...p, country: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" onClick={() => saveSetting("store_info", storeInfo)} disabled={saving === "store_info"}>
                  {saving === "store_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} কন্টাক্ট সেটিংস সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Ecommerce & Delivery */}
        <TabsContent value="ecommerce" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary"><Truck className="h-4.5 w-4.5 text-accent" />  ডেলিভারি ও পেমেন্ট সেটিংস</CardTitle>
              <CardDescription>শিপিং চার্জ, কুপন থ্রেশহোল্ড এবং পেমেন্ট মেথড গেটওয়ে সেটিংস</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Delivery charges */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-primary">শিপিং এবং ডেলিভারি চার্জ</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ঢাকা সিটির ভিতরে (৳)</Label>
                    <Input type="number" value={delivery.dhaka_inside} onChange={e => setDelivery(p => ({ ...p, dhaka_inside: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>ঢাকা সিটির বাইরে (৳)</Label>
                    <Input type="number" value={delivery.dhaka_outside} onChange={e => setDelivery(p => ({ ...p, dhaka_outside: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>ফ্রি ডেলিভারি মিনিমাম থ্রেশহোল্ড (৳)</Label>
                    <Input type="number" value={delivery.free_delivery_min} onChange={e => setDelivery(p => ({ ...p, free_delivery_min: Number(e.target.value) }))} />
                    <p className="text-[10px] text-muted-foreground">০ = ফ্রি ডেলিভারি অফ থাকবে</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>আনুমানিক ডেলিভারি সময় (ঢাকার ভিতরে)</Label>
                    <Input value={delivery.delivery_time_inside || ""} onChange={e => setDelivery(p => ({ ...p, delivery_time_inside: e.target.value }))} placeholder="যেমন: ২-৩ কার্যদিবস" />
                  </div>
                  <div className="space-y-2">
                    <Label>আনুমানিক ডেলিভারি সময় (ঢাকার বাইরে)</Label>
                    <Input value={delivery.delivery_time_outside || ""} onChange={e => setDelivery(p => ({ ...p, delivery_time_outside: e.target.value }))} placeholder="যেমন: ৩-৫ কার্যদিবস" />
                  </div>
                </div>

                <Button size="sm" className="gap-1.5 rounded-xl mt-3" onClick={() => saveSetting("delivery_charges", delivery)} disabled={saving === "delivery_charges"}>
                  {saving === "delivery_charges" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} শিপিং সেভ করুন
                </Button>
              </div>

              <Separator />

              {/* Payment gateways */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-primary">পেমেন্ট অপশন ও গেটওয়েসমূহ</h3>
                
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div>
                    <p className="font-semibold text-sm">ক্যাশ অন ডেলিভারি (Cash On Delivery)</p>
                    <p className="text-xs text-muted-foreground">পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধ করার অপশন</p>
                  </div>
                  <Switch checked={payment.cod} onCheckedChange={v => setPayment(p => ({ ...p, cod: v }))} />
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">বিকাশ (bKash Mobile Banking)</p>
                      <p className="text-xs text-muted-foreground">বিকাশ পেমেন্ট বা সেন্ড মানি সেটিংস</p>
                    </div>
                    <Switch checked={payment.bkash} onCheckedChange={v => setPayment(p => ({ ...p, bkash: v }))} />
                  </div>
                  {payment.bkash && (
                    <div className="space-y-2 pl-3 border-l-2 border-accent">
                      <Label className="text-xs">বিকাশ মার্চেন্ট / পার্সোনাল নম্বর</Label>
                      <Input value={payment.bkash_number || ""} onChange={e => setPayment(p => ({ ...p, bkash_number: e.target.value }))} placeholder="01XXXXXXXXX" />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">নগদ (Nagad Mobile Banking)</p>
                      <p className="text-xs text-muted-foreground">নগদ পেমেন্ট বা সেন্ড মানি সেটিংস</p>
                    </div>
                    <Switch checked={payment.nagad} onCheckedChange={v => setPayment(p => ({ ...p, nagad: v }))} />
                  </div>
                  {payment.nagad && (
                    <div className="space-y-2 pl-3 border-l-2 border-accent">
                      <Label className="text-xs">নগদ মার্চেন্ট / পার্সোনাল নম্বর</Label>
                      <Input value={payment.nagad_number || ""} onChange={e => setPayment(p => ({ ...p, nagad_number: e.target.value }))} placeholder="01XXXXXXXXX" />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">UddoktaPay Payment Gateway</p>
                      <p className="text-xs text-muted-foreground">UddoktaPay অনলাইন পেমেন্ট গেটওয়ে সেটিংস</p>
                    </div>
                    <Switch checked={payment.uddoktapay || false} onCheckedChange={v => setPayment(p => ({ ...p, uddoktapay: v }))} />
                  </div>
                  {(payment.uddoktapay) && (
                    <div className="space-y-4 pl-3 border-l-2 border-accent">
                      <div className="space-y-2">
                        <Label className="text-xs">UddoktaPay Display Name (গ্রাহক পেমেন্ট করার সময় যা দেখবে, যেমন: অনলাইন পেমেন্ট, Pay Now)</Label>
                        <Input value={payment.uddoktapay_display_name || ""} onChange={e => setPayment(p => ({ ...p, uddoktapay_display_name: e.target.value }))} placeholder="অনলাইন পেমেন্ট (Pay Now)" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">UddoktaPay Base URL (e.g. https://sandbox.uddoktapay.com or live URL)</Label>
                        <Input value={payment.uddoktapay_base_url || ""} onChange={e => setPayment(p => ({ ...p, uddoktapay_base_url: e.target.value }))} placeholder="https://sandbox.uddoktapay.com" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">UddoktaPay API Key</Label>
                        <Input type="password" value={payment.uddoktapay_api_key || ""} onChange={e => setPayment(p => ({ ...p, uddoktapay_api_key: e.target.value }))} placeholder="API Key" />
                      </div>
                    </div>
                  )}
                </div>

                <Button size="sm" className="gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95" onClick={() => saveSetting("payment_methods", payment)} disabled={saving === "payment_methods"}>
                  {saving === "payment_methods" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} পেমেন্ট সেভ করুন
                </Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Courier Settings */}
        <TabsContent value="courier" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary"><Truck className="h-4.5 w-4.5 text-accent" /> কুরিয়ার ও শিপিং গেটওয়ে</CardTitle>
              <CardDescription>অর্ডার অটো-সিঙ্ক ও পার্সেল বুকিংয়ের জন্য কুরিয়ার API কনফিগার করুন</CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSetting("courier_settings", courier);
                }} 
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-primary">ডিফল্ট কুরিয়ার সার্ভিস</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>প্রধান কুরিয়ার পার্টনার</Label>
                      <Select 
                        value={courier.default_courier} 
                        onValueChange={v => setCourier(p => ({ ...p, default_courier: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="steadfast">Steadfast Courier (স্টেডফাস্ট কুরিয়ার)</SelectItem>
                          <SelectItem value="pathfinder">Pathfinder (পাথফাইন্ডার)</SelectItem>
                          <SelectItem value="redx">REDX Delivery (রেডেক্স)</SelectItem>
                          <SelectItem value="paperfly">Paperfly (পেপারফ্লাই)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>অটো-সিঙ্ক ইন্টারভাল (ঘণ্টা)</Label>
                      <Input 
                        type="number" 
                        value={courier.auto_sync_hours} 
                        onChange={e => setCourier(p => ({ ...p, auto_sync_hours: Number(e.target.value) }))} 
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">🔑 Steadfast API ক্রেডেনশিয়ালস</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Steadfast API Key</Label>
                      <Input 
                        value={courier.api_key || ""} 
                        onChange={e => setCourier(p => ({ ...p, api_key: e.target.value }))} 
                        placeholder="যেমন: sk_xxxxxx_xxxxxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Steadfast Secret Key</Label>
                      <Input 
                        type="password"
                        value={courier.secret_key || ""} 
                        onChange={e => setCourier(p => ({ ...p, secret_key: e.target.value }))} 
                        placeholder="••••••••••••••••••••••••"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                    <div>
                      <p className="font-semibold text-sm">BD Courier ইন্টিগ্রেশন</p>
                      <p className="text-xs text-muted-foreground">BD Courier API গেটওয়ে সচল করুন</p>
                    </div>
                    <Switch 
                      checked={!!courier.bdcourier_enabled} 
                      onCheckedChange={v => setCourier(p => ({ ...p, bdcourier_enabled: v }))} 
                    />
                  </div>

                  {courier.bdcourier_enabled && (
                    <div className="space-y-4 pl-3 border-l-2 border-accent">
                      <div className="space-y-2">
                        <Label>BD Courier API Key</Label>
                        <Input 
                          value={courier.bdcourier_api_key || ""} 
                          onChange={e => setCourier(p => ({ ...p, bdcourier_api_key: e.target.value }))} 
                          placeholder="BD Courier API API Key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>BD Courier Base URL</Label>
                        <Input 
                          value={courier.bdcourier_base_url || "https://app.bdcourier.com/api"} 
                          onChange={e => setCourier(p => ({ ...p, bdcourier_base_url: e.target.value }))} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button type="submit" className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" disabled={saving === "courier_settings"}>
                    {saving === "courier_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} কুরিয়ার সেটিংস সেভ করুন
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Comprehensive Tracking & Analytics */}
        <TabsContent value="tracking" className="space-y-6 outline-none">
          <Card className="border border-border/80 shadow-premium-lg">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-display">🌐 ট্র্যাকিং ও অ্যানালিটিক্স ম্যানেজার</CardTitle>
              <CardDescription>
                আপনার ওয়েবসাইটের ইউজার অ্যাকশন ট্র্যাক করতে পিক্সেল এবং সার্ভার-সাইড ইন্টিগ্রেশনসমূহ পরিচালনা করুন।
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  saveTrackingSettings();
                }} 
                className="space-y-6 pt-6"
              >
                {/* Global Settings Segment */}
                <div className="p-4 rounded-xl border bg-secondary/10 border-border/60 space-y-4">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">⚙️ গ্লোবাল ট্র্যাকিং কনফিগারেশন</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">সব ট্র্যাকিং চালু করুন</Label>
                        <p className="text-[10px] text-muted-foreground">গ্লোবাল ইভেন্ট ফায়ারিং সুইচ</p>
                      </div>
                      <Switch 
                        checked={tracking.global_enabled} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, global_enabled: v }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">অ্যাক্টিভ এনভায়রনমেন্ট (Environment)</Label>
                      <select 
                        value={tracking.environment || "production"} 
                        onChange={e => setTracking((p: any) => ({ ...p, environment: e.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="production">Production (লাইভ ডাটা)</option>
                        <option value="staging">Staging (টেস্ট সার্ভার)</option>
                        <option value="development">Development (লোকাল হোস্ট)</option>
                      </select>
                    </div>
                    <div className="p-3 rounded-lg border bg-card flex flex-col justify-center">
                      <span className="text-[10px] text-muted-foreground block">লাস্ট সিঙ্ক স্ট্যাটাস (Sync Status)</span>
                      {(() => {
                        if (!tracking.global_enabled) {
                          return (
                            <span className="font-bold text-xs text-red-500 mt-1 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-red-500" /> ট্র্যাকিং নিষ্ক্রিয় 🔴
                            </span>
                          );
                        }
                        if (!dbTracking) {
                          return (
                            <span className="font-bold text-xs text-red-500 mt-1 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> কোনো কনফিগারেশন সংরক্ষিত নেই 🔴
                            </span>
                          );
                        }
                        const isDirty = JSON.stringify(tracking) !== JSON.stringify(dbTracking);
                        if (isDirty) {
                          return (
                            <span className="font-bold text-xs text-yellow-500 mt-1 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" /> সিঙ্ক প্রয়োজন 🟡
                            </span>
                          );
                        }
                        const hasAnyConfigured = (
                          (dbTracking.meta_pixel_enabled && isValidTrackingId('meta', dbTracking.meta_pixel_id)) ||
                          (dbTracking.gtm_enabled && isValidTrackingId('gtm', dbTracking.gtm_id)) ||
                          (dbTracking.ga4_enabled && isValidTrackingId('ga4', dbTracking.ga4_id)) ||
                          (dbTracking.tiktok_enabled && isValidTrackingId('tiktok', dbTracking.tiktok_pixel_id))
                        );
                        if (!hasAnyConfigured) {
                          return (
                            <span className="font-bold text-xs text-yellow-500 mt-1 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-yellow-500" /> সেটিংস সিঙ্কড (কোনো ট্র্যাকিং সচল নেই) 🟡
                            </span>
                          );
                        }
                        return (
                          <span className="font-bold text-xs text-green-500 mt-1 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> সেটিংস সিঙ্কড ও সচল 🟢
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Nested Tabs for Platforms */}
                <Tabs defaultValue="meta" className="w-full border rounded-xl overflow-hidden">
                  <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-none border-b">
                    <TabsTrigger value="meta" className="text-xs py-2">Meta (Pixel & CAPI)</TabsTrigger>
                    <TabsTrigger value="google" className="text-xs py-2">Google (GTM & GA4)</TabsTrigger>
                    <TabsTrigger value="tiktok" className="text-xs py-2">TikTok Pixel</TabsTrigger>
                  </TabsList>

                  {/* Platform: Meta */}
                  <TabsContent value="meta" className="p-4 space-y-4 outline-none">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-500/5 border-blue-500/10">
                      <div>
                        <p className="font-bold text-xs text-blue-600">Meta Pixel ট্র্যাকিং</p>
                        <p className="text-[10px] text-muted-foreground">ব্রাউজার পিক্সেল কোড লোড ও ফায়ার করুন</p>
                      </div>
                      <Switch 
                        checked={tracking.meta_pixel_enabled} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, meta_pixel_enabled: v }))} 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Meta Pixel ID</Label>
                        <Input 
                          value={tracking.meta_pixel_id || ""} 
                          onChange={e => {
                            const val = e.target.value;
                            const clean = val === "18625836884445311" ? "1862583688445311" : val;
                            setTracking((p: any) => ({ ...p, meta_pixel_id: clean }));
                          }} 
                          placeholder="যেমন: 1862583688445311"
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Graph API Version</Label>
                        <Input 
                          value={tracking.meta_api_version || "v21.0"} 
                          onChange={e => setTracking((p: any) => ({ ...p, meta_api_version: e.target.value }))} 
                          placeholder="যেমন: v21.0"
                          className="text-xs h-9"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-500/5 border-blue-500/10">
                      <div>
                        <p className="font-bold text-xs text-blue-600">Meta Conversions API (CAPI) সচল করুন</p>
                        <p className="text-[10px] text-muted-foreground">সার্ভার-সাইড ইভেন্ট ট্র্যাকিং এবং উন্নত ম্যাচ রেটিং</p>
                      </div>
                      <Switch 
                        checked={tracking.meta_capi_enabled} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, meta_capi_enabled: v }))} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Meta Conversions API Access Token</Label>
                      <Input 
                        type="password"
                        value={tracking.meta_access_token || ""} 
                        onChange={e => setTracking((p: any) => ({ ...p, meta_access_token: e.target.value }))} 
                        placeholder="EAA..."
                        className="text-xs h-9"
                        autoComplete="off"
                      />
                      <p className="text-[9px] text-muted-foreground">এই টোকেনটি সার্ভারে গোপন রাখা হয় এবং ব্রাউজারে কখনো এক্সপোজ হয় না।</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Test Event Code (পরীক্ষামূলক ইভেন্ট কোড)</Label>
                        <Input 
                          value={tracking.meta_test_event_code || ""} 
                          onChange={e => setTracking((p: any) => ({ ...p, meta_test_event_code: e.target.value }))} 
                          placeholder="যেমন: TEST12345"
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="space-y-0.5">
                          <Label className="font-bold text-xs">Strict Purchase Mode</Label>
                          <p className="text-[9px] text-muted-foreground">অর্ডার প্রতি কেবল একবার ট্র্যাকিং</p>
                        </div>
                        <Switch 
                          checked={tracking.meta_strict_purchase_mode} 
                          onCheckedChange={v => setTracking((p: any) => ({ ...p, meta_strict_purchase_mode: v }))} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">Meta Debug Mode</Label>
                        <p className="text-[9px] text-muted-foreground">কনসোলে ডিটেইলড লগ প্রদর্শন</p>
                      </div>
                      <Switch 
                        checked={tracking.meta_debug_mode} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, meta_debug_mode: v }))} 
                      />
                    </div>
                  </TabsContent>

                  {/* Platform: Google */}
                  <TabsContent value="google" className="p-4 space-y-4 outline-none">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-red-500/5 border-red-500/10">
                      <div>
                        <p className="font-bold text-xs text-red-600">Google Tag Manager (GTM)</p>
                        <p className="text-[10px] text-muted-foreground">GTM কন্টেইনার এবং ডেটালিয়ার সিঙ্ক করুন</p>
                      </div>
                      <Switch 
                        checked={tracking.gtm_enabled} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, gtm_enabled: v }))} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">GTM Container ID</Label>
                      <Input 
                        value={tracking.gtm_id || ""} 
                        onChange={e => setTracking((p: any) => ({ ...p, gtm_id: e.target.value }))} 
                        placeholder="যেমন: GTM-XXXXXXX"
                        className="text-xs h-9"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-orange-500/5 border-orange-500/10">
                      <div>
                        <p className="font-bold text-xs text-orange-600">Google Analytics 4 (GA4)</p>
                        <p className="text-[10px] text-muted-foreground">GA4 মেজারমেন্ট আইডি এবং ইকমার্স ইভেন্ট</p>
                      </div>
                      <Switch 
                        checked={tracking.ga4_enabled} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, ga4_enabled: v }))} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">GA4 Measurement ID</Label>
                      <Input 
                        value={tracking.ga4_id || ""} 
                        onChange={e => setTracking((p: any) => ({ ...p, ga4_id: e.target.value }))} 
                        placeholder="যেমন: G-XXXXXXXXXX"
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">Google Debug Mode</Label>
                        <p className="text-[9px] text-muted-foreground">GA4 রিয়েলটাইম ভিউতে ডিবাগ মড সক্রিয়</p>
                      </div>
                      <Switch 
                        checked={tracking.google_debug_mode} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, google_debug_mode: v }))} 
                      />
                    </div>
                  </TabsContent>

                  {/* Platform: TikTok */}
                  <TabsContent value="tiktok" className="p-4 space-y-4 outline-none">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-black/5 border-black/10">
                      <div>
                        <p className="font-bold text-xs text-black">TikTok Pixel ট্র্যাকিং</p>
                        <p className="text-[10px] text-muted-foreground">টিকটক ব্রাউজার পিক্সেল সচল করুন</p>
                      </div>
                      <Switch 
                        checked={tracking.tiktok_enabled} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, tiktok_enabled: v }))} 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">TikTok Pixel ID</Label>
                        <Input 
                          value={tracking.tiktok_pixel_id || ""} 
                          onChange={e => setTracking((p: any) => ({ ...p, tiktok_pixel_id: e.target.value }))} 
                          placeholder="যেমন: CXXXXXXXXXXXXXXXXXXX"
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">TikTok Access Token (ঐচ্ছিক)</Label>
                        <Input 
                          type="password"
                          value={tracking.tiktok_access_token || ""} 
                          onChange={e => setTracking((p: any) => ({ ...p, tiktok_access_token: e.target.value }))} 
                          placeholder="যেমন: tt_xxxx"
                          className="text-xs h-9"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">TikTok Debug Mode</Label>
                        <p className="text-[9px] text-muted-foreground">কনসোলে ইভেন্ট ডিটেইলস প্রিন্ট করুন</p>
                      </div>
                      <Switch 
                        checked={tracking.tiktok_debug_mode} 
                        onCheckedChange={v => setTracking((p: any) => ({ ...p, tiktok_debug_mode: v }))} 
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Event Log Console terminal */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">📊 Live Tracking Engine Status</h3>
                  
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl border bg-secondary/10 text-center">
                      <span className="text-[10px] text-muted-foreground block">Browser Events</span>
                      {(() => {
                        const isActive = tracking.global_enabled && (
                          (tracking.meta_pixel_enabled && isValidTrackingId('meta', tracking.meta_pixel_id)) ||
                          (tracking.gtm_enabled && isValidTrackingId('gtm', tracking.gtm_id)) ||
                          (tracking.ga4_enabled && isValidTrackingId('ga4', tracking.ga4_id)) ||
                          (tracking.tiktok_enabled && isValidTrackingId('tiktok', tracking.tiktok_pixel_id))
                        );
                        return (
                          <span className={`font-bold text-sm block mt-1 ${isActive ? "text-green-500" : "text-red-500"}`}>
                            {isActive ? "Active 🟢" : "Inactive 🔴"}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="p-3 rounded-xl border bg-secondary/10 text-center">
                      <span className="text-[10px] text-muted-foreground block">Server-Side CAPI Connection</span>
                      {(() => {
                        const isMetaActive = tracking.global_enabled &&
                          tracking.meta_capi_enabled &&
                          isValidTrackingId('meta', tracking.meta_pixel_id) &&
                          tracking.meta_access_token?.trim();
                        const isTiktokActive = tracking.global_enabled &&
                          tracking.tiktok_enabled &&
                          isValidTrackingId('tiktok', tracking.tiktok_pixel_id) &&
                          tracking.tiktok_access_token?.trim();
                        
                        let statusText = "Disabled 🔴";
                        let statusColor = "text-red-500";
                        if (isMetaActive && isTiktokActive) {
                          statusText = "Meta & TikTok Active 🟢";
                          statusColor = "text-green-500";
                        } else if (isMetaActive) {
                          statusText = "Meta Active 🟢";
                          statusColor = "text-blue-500";
                        } else if (isTiktokActive) {
                          statusText = "TikTok Active 🟢";
                          statusColor = "text-purple-500";
                        }
                        
                        return (
                          <span className={`font-bold text-xs block mt-1 ${statusColor}`}>
                            {statusText}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="p-3 rounded-xl border bg-secondary/10 text-center">
                      <span className="text-[10px] text-muted-foreground block">Deduplication Matching</span>
                      {(() => {
                        const hasMetaPixel = tracking.meta_pixel_enabled && isValidTrackingId('meta', tracking.meta_pixel_id);
                        const hasMetaCAPI = tracking.meta_capi_enabled && isValidTrackingId('meta', tracking.meta_pixel_id) && tracking.meta_access_token?.trim();
                        const metaVerified = tracking.global_enabled && hasMetaPixel && hasMetaCAPI;

                        const hasTiktokPixel = tracking.tiktok_enabled && isValidTrackingId('tiktok', tracking.tiktok_pixel_id);
                        const hasTiktokCAPI = tracking.tiktok_enabled && isValidTrackingId('tiktok', tracking.tiktok_pixel_id) && tracking.tiktok_access_token?.trim();
                        const tiktokVerified = tracking.global_enabled && hasTiktokPixel && hasTiktokCAPI;

                        let statusText = "Inactive 🔴";
                        let statusColor = "text-red-500";

                        if ((metaVerified || (!hasMetaPixel && !hasMetaCAPI)) && (tiktokVerified || (!hasTiktokPixel && !hasTiktokCAPI))) {
                          if (metaVerified || tiktokVerified) {
                            statusText = "Verified (100% Match) 🟢";
                            statusColor = "text-green-500";
                          }
                        } else {
                          statusText = "Single-Channel 🟡";
                          statusColor = "text-yellow-500";
                        }
                        
                        return (
                          <span className={`font-bold text-xs block mt-1 ${statusColor}`}>
                            {statusText}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-black text-green-400 font-mono text-[11px] space-y-2 min-h-36 max-h-64 overflow-y-auto">
                    <div className="text-white font-bold border-b border-green-800 pb-1.5 flex justify-between items-center">
                      <span>📟 Live Conversions Event Log Terminal</span>
                       <Button 
                        type="button"
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-[10px] bg-green-950/20 text-green-400 border-green-800 hover:bg-green-800 hover:text-white"
                        disabled={!tracking.global_enabled}
                        onClick={() => {
                          const activeEngines = [];
                          if (tracking.meta_pixel_enabled && isValidTrackingId('meta', tracking.meta_pixel_id)) activeEngines.push("Meta Pixel");
                          if (tracking.gtm_enabled && isValidTrackingId('gtm', tracking.gtm_id)) activeEngines.push("GTM");
                          if (tracking.ga4_enabled && isValidTrackingId('ga4', tracking.ga4_id)) activeEngines.push("GA4");
                          if (tracking.tiktok_enabled && isValidTrackingId('tiktok', tracking.tiktok_pixel_id)) activeEngines.push("TikTok");

                          if (activeEngines.length === 0) {
                            toast({ 
                              title: "❌ No Active Engines", 
                              description: "কোথাও কোনো ভ্যালিড ট্র্যাকিং আইডি কনফিগার ও সচল করা নেই। অনুগ্রহ করে প্রথমে আইডি দিয়ে সেভ করুন।",
                              variant: "destructive"
                            });
                            return;
                          }

                          trackLead({ value: 100, currency: "BDT" });
                          setLocalLogs(prev => [
                            `[${new Date().toLocaleTimeString()}] [CLIENT] Test Lead Event fired (Value: 100 BDT, Currency: BDT) on: ${activeEngines.join(", ")}`,
                            ...prev
                          ]);
                          toast({ 
                            title: "✅ Lead Test Event Dispatched", 
                            description: `টেস্ট ইভেন্ট সফলভাবে পাঠানো হয়েছে সচল ইঞ্জিনে: ${activeEngines.join(", ")}।` 
                          });
                        }}
                      >
                        Trigger Test Event
                      </Button>
                    </div>
                    {tracking.global_enabled ? (
                      <>
                        <div className="text-gray-400 border-b border-green-950 pb-1 mb-1 font-semibold">--- Live Session Logs ---</div>
                        <div>[SYSTEM] Unified tracking engine initialized successfully.</div>
                        {tracking.meta_pixel_enabled && isValidTrackingId('meta', tracking.meta_pixel_id) ? (
                          <div>[SYSTEM] Meta Pixel loaded: {tracking.meta_pixel_id}</div>
                        ) : null}
                        {tracking.gtm_enabled && isValidTrackingId('gtm', tracking.gtm_id) ? (
                          <div>[SYSTEM] Google Tag Manager loaded: {tracking.gtm_id}</div>
                        ) : null}
                        {tracking.ga4_enabled && isValidTrackingId('ga4', tracking.ga4_id) ? (
                          <div>[SYSTEM] Google Analytics 4 loaded: {tracking.ga4_id}</div>
                        ) : null}
                        {tracking.tiktok_enabled && isValidTrackingId('tiktok', tracking.tiktok_pixel_id) ? (
                          <div>[SYSTEM] TikTok Pixel loaded: {tracking.tiktok_pixel_id}</div>
                        ) : null}
                        {localLogs.filter(log => !log.includes("initialized successfully")).map((log, idx) => (
                          <div key={idx} className="text-yellow-300">{log}</div>
                        ))}
                        
                        <div className="text-gray-400 border-b border-green-950 pb-1 mt-3 mb-1 font-semibold">--- Real-Time Backend CAPI Database Logs ---</div>
                        {capiLogs && capiLogs.length > 0 ? (
                          capiLogs.map((log: any) => (
                            <div key={log.id} className="text-blue-300">
                              [{new Date(log.created_at).toLocaleTimeString()}] {log.details} (ID: {log.order_id?.slice(0, 8)}...)
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No backend Conversions API events logged in database yet. Completing a real order will fire a CAPI Purchase event.</div>
                        )}
                      </>
                    ) : (
                      <div className="text-red-400">[WARNING] Global tracking is disabled. Turn on toggle to begin listening.</div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit"
                    className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" 
                    disabled={saving === "tracking_settings"}
                  >
                    {saving === "tracking_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ট্র্যাকিং সেটিংস সেভ করুন
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>




        {/* Tab 9: SEO settings */}
        <TabsContent value="seo" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary">🔍 গ্লোবাল সার্চ ইঞ্জিন অপ্টিমাইজেশন (SEO)</CardTitle>
              <CardDescription>আপনার ওয়েবসাইটের গুগল র‍্যাংকিং, মেটা টাইটেল, ডেসক্রিপশন এবং ইন্ডেক্সিং সেটিংস পরিচালনা করুন।</CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveSetting("seo_settings", seoSettings);
                }} 
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ওয়েবসাইট টাইটেল (Site Title)</Label>
                    <Input 
                      value={seoSettings.site_title || ""} 
                      onChange={e => setSeoSettings((p: any) => ({ ...p, site_title: e.target.value }))} 
                      placeholder="যেমন: Rangao – রাঙাও" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>টাইটেল ফরম্যাট (Title Format)</Label>
                    <Input 
                      value={seoSettings.title_format || ""} 
                      onChange={e => setSeoSettings((p: any) => ({ ...p, title_format: e.target.value }))} 
                      placeholder="যেমন: {title} | {siteName}" 
                    />
                    <p className="text-[10px] text-muted-foreground">প্রতিটি পেজের টাইটেল এবং স্টোর নামের লেআউট ডিজাইন করুন।</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ডিফল্ট মেটা ডেসক্রিপশন (Default Description)</Label>
                  <Input 
                    value={seoSettings.site_description || ""} 
                    onChange={e => setSeoSettings((p: any) => ({ ...p, site_description: e.target.value }))} 
                    placeholder="রাঙাও – বাংলাদেশের প্রিমিয়াম ইসলামিক ক্যালিগ্রাফি ওয়াল আর্ট ও হোম ডেকোর স্টোর।" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>ডিফল্ট কীওয়ার্ডস (Default Keywords)</Label>
                  <Input 
                    value={seoSettings.default_keywords || ""} 
                    onChange={e => setSeoSettings((p: any) => ({ ...p, default_keywords: e.target.value }))} 
                    placeholder="ইসলামিক ডেকোর, ওয়াল আর্ট, নিকাহনামা, আয়াতুল কুরসি" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>গুগল সার্চ কনসোল ভেরিফিকেশন আইডি (Google Search Console ID)</Label>
                  <Input 
                    value={seoSettings.google_search_console_id || ""} 
                    onChange={e => setSeoSettings((p: any) => ({ ...p, google_search_console_id: e.target.value }))} 
                    placeholder="যেমন: google-site-verification=abc123xyz" 
                  />
                  <p className="text-[10px] text-muted-foreground">গুগল সার্চ কনসোলে ওয়েবসাইট ভেরিফাই করতে এই কী-টি ব্যবহার করুন।</p>
                </div>

                <div className="space-y-2">
                  <Label>ফেসবুক অ্যাপ আইডি (Facebook App ID / fb:app_id)</Label>
                  <Input 
                    value={seoSettings.fb_app_id || ""} 
                    onChange={e => setSeoSettings((p: any) => ({ ...p, fb_app_id: e.target.value }))} 
                    placeholder="যেমন: 123456789012345" 
                  />
                  <p className="text-[10px] text-muted-foreground">ফেসবুক ডোমেইন ভেরিফিকেশন ও শেয়ারিং অ্যানালিটিক্স-এর জন্য ফেসবুক অ্যাপ আইডি দিন।</p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-xs">Search Index (ইন্ডেক্স করুন)</Label>
                      <p className="text-[9px] text-muted-foreground">সার্চ ইঞ্জিনে ওয়েবসাইট দৃশ্যমান করতে এটি সচল রাখুন</p>
                    </div>
                    <Switch 
                      checked={seoSettings.robots_index} 
                      onCheckedChange={v => setSeoSettings((p: any) => ({ ...p, robots_index: v }))} 
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-xs">Follow Links (লিংক অনুকরণ করুন)</Label>
                      <p className="text-[9px] text-muted-foreground">বটদের লিংক অনুসরণ করার অনুমতি দিন</p>
                    </div>
                    <Switch 
                      checked={seoSettings.robots_follow} 
                      onCheckedChange={v => setSeoSettings((p: any) => ({ ...p, robots_follow: v }))} 
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit"
                    className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" 
                    disabled={saving === "seo_settings"}
                  >
                    {saving === "seo_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} SEO সেটিংস সেভ করুন
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: About Us Page Settings */}
        <TabsContent value="about" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary">📖 আমাদের সম্পর্কে (About Us) সেটিংস</CardTitle>
              <CardDescription>গ্রাহক ফেস কার্ট স্টোরের "আমাদের সম্পর্কে" পৃষ্ঠার কন্টেন্ট এবং লেআউট কাস্টমাইজ করুন।</CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveSetting("about_us_settings", aboutUsSettings);
                }} 
                className="space-y-6"
              >
                {/* Section 1: Hero Header */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-1.5"><Store className="h-4.5 w-4.5 text-accent" /> হেডার ব্যানার সেটিংস</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>পেজ টাইটেল (Page Title)</Label>
                      <Input 
                        value={aboutUsSettings.title} 
                        onChange={e => setAboutUsSettings(prev => ({ ...prev, title: e.target.value }))} 
                        placeholder="যেমন: আমাদের সম্পর্কে"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>সাবটাইটেল (Subtitle)</Label>
                      <Input 
                        value={aboutUsSettings.subtitle} 
                        onChange={e => setAboutUsSettings(prev => ({ ...prev, subtitle: e.target.value }))} 
                        placeholder="আকর্ষণীয় স্লোগান বা সাবটাইটেল"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ব্যানার ব্যাকগ্রাউন্ড ইমেজ (Banner Image URL)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={aboutUsSettings.banner_image_url} 
                        onChange={e => setAboutUsSettings(prev => ({ ...prev, banner_image_url: e.target.value }))} 
                        placeholder="ইমেজ URL দিন" 
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => setActivePickerField("banner_image_url")}>মিডিয়া লাইব্রেরি</Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 2: Our Story */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-1.5"><BookOpen className="h-4.5 w-4.5 text-accent" /> আমাদের পথচলা (Our Story)</h3>
                  <div className="space-y-2">
                    <Label>স্টোরি হেডিং (Story Title)</Label>
                    <Input 
                      value={aboutUsSettings.story_title} 
                      onChange={e => setAboutUsSettings(prev => ({ ...prev, story_title: e.target.value }))} 
                      placeholder="যেমন: আমাদের পথচলা"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>স্টোরি বিবরণ (Story Content)</Label>
                    <Textarea 
                      value={aboutUsSettings.story_text} 
                      onChange={e => setAboutUsSettings(prev => ({ ...prev, story_text: e.target.value }))} 
                      placeholder="আপনার ব্রান্ড বা পথচলা সম্পর্কিত বিস্তারিত তথ্য লিখুন..." 
                      className="min-h-[160px] leading-relaxed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>স্টোরি সেকশন ইমেজ (Story Section Image URL)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={aboutUsSettings.story_image_url} 
                        onChange={e => setAboutUsSettings(prev => ({ ...prev, story_image_url: e.target.value }))} 
                        placeholder="ইমেজ URL দিন" 
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => setActivePickerField("story_image_url")}>মিডিয়া লাইব্রেরি</Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 3: Mission & Vision */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-1.5"><Globe className="h-4.5 w-4.5 text-accent" /> মিশন ও ভিশন</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mission */}
                    <div className="space-y-3 p-4 rounded-xl border bg-secondary/5">
                      <div className="space-y-2">
                        <Label className="font-bold">মিশন টাইটেল (Mission Title)</Label>
                        <Input 
                          value={aboutUsSettings.mission_title} 
                          onChange={e => setAboutUsSettings(prev => ({ ...prev, mission_title: e.target.value }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>মিশন বিবরণ</Label>
                        <Textarea 
                          value={aboutUsSettings.mission_text} 
                          onChange={e => setAboutUsSettings(prev => ({ ...prev, mission_text: e.target.value }))} 
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>

                    {/* Vision */}
                    <div className="space-y-3 p-4 rounded-xl border bg-secondary/5">
                      <div className="space-y-2">
                        <Label className="font-bold">ভিশন টাইটেল (Vision Title)</Label>
                        <Input 
                          value={aboutUsSettings.vision_title} 
                          onChange={e => setAboutUsSettings(prev => ({ ...prev, vision_title: e.target.value }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ভিশন বিবরণ</Label>
                        <Textarea 
                          value={aboutUsSettings.vision_text} 
                          onChange={e => setAboutUsSettings(prev => ({ ...prev, vision_text: e.target.value }))} 
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Section 4: Core Values */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-primary flex items-center gap-1.5"><Settings2 className="h-4.5 w-4.5 text-accent" /> আমাদের মূল মূল্যবোধ (Core Values)</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {aboutUsSettings.core_values.map((val, idx) => (
                      <div key={val.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border bg-secondary/10 relative">
                        <div className="space-y-2">
                          <Label className="text-xs">মূল্যবোধ নাম (Title)</Label>
                          <Input 
                            value={val.title} 
                            onChange={e => handleUpdateCoreValue(idx, "title", e.target.value)} 
                            className="bg-card"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">সংক্ষিপ্ত বিবরণ (Description)</Label>
                          <Input 
                            value={val.desc} 
                            onChange={e => handleUpdateCoreValue(idx, "desc", e.target.value)} 
                            className="bg-card"
                          />
                        </div>
                        <div className="space-y-2 flex items-end justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs">আইকন (Icon)</Label>
                            <Select value={val.icon} onValueChange={v => handleUpdateCoreValue(idx, "icon", v)}>
                              <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ShieldCheck">🛡️ ShieldCheck</SelectItem>
                                <SelectItem value="Sparkles">✨ Sparkles</SelectItem>
                                <SelectItem value="Heart">❤️ Heart</SelectItem>
                                <SelectItem value="Truck">🚚 Truck</SelectItem>
                                <SelectItem value="Award">🏆 Award</SelectItem>
                                <SelectItem value="Clock">🕒 Clock</SelectItem>
                                <SelectItem value="Globe">🌐 Globe</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="mb-0.5 rounded-lg h-9 w-9" 
                            onClick={() => handleRemoveCoreValue(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="button" 
                      onClick={handleAddCoreValue} 
                      variant="outline" 
                      className="gap-1.5 rounded-xl text-xs"
                    >
                      <Plus className="h-4 w-4" /> নতুন যোগ করুন
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    type="submit"
                    className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" 
                    disabled={saving === "about_us_settings"}
                  >
                    {saving === "about_us_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} About Us সেটিংস সেভ করুন
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Tab 10: Telegram Notifications */}
        <TabsContent value="telegram" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary">📢 টেলিগ্রাম অ্যাডমিন নোটিফিকেশন</CardTitle>
              <CardDescription>নতুন অর্ডার বা স্ট্যাটাস পরিবর্তনের জন্য টেলিগ্রাম বটে রিয়েল-টাইম নোটিফিকেশন চালু করুন।</CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveSetting("telegram_settings", telegramSettings);
                }} 
                className="space-y-6"
              >
                <div className="flex items-center justify-between p-4 rounded-xl border bg-secondary/10">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-sm">টেলিগ্রাম নোটিফিকেশন সচল করুন</Label>
                    <p className="text-xs text-muted-foreground">আপনার ফোনে নোটিফিকেশন চালু করতে এটি অন করুন</p>
                  </div>
                  <Switch 
                    checked={telegramSettings.enabled} 
                    onCheckedChange={v => setTelegramSettings((p: any) => ({ ...p, enabled: v }))} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>বট টোকেন (Telegram Bot Token)</Label>
                    <Input 
                      type="password"
                      value={telegramSettings.bot_token || ""} 
                      onChange={e => setTelegramSettings((p: any) => ({ ...p, bot_token: e.target.value }))} 
                      placeholder="যেমন: 123456789:ABCdefGhIJKlmNoPQRsT..." 
                      className="rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground">@BotFather থেকে প্রাপ্ত বট API টোকেনটি দিন।</p>
                  </div>
                  <div className="space-y-2">
                    <Label>চ্যাট আইডি (Chat/Group ID)</Label>
                    <Input 
                      value={telegramSettings.chat_id || ""} 
                      onChange={e => setTelegramSettings((p: any) => ({ ...p, chat_id: e.target.value }))} 
                      placeholder="যেমন: -1001234567890 বা 12345678" 
                      className="rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground">যে চ্যাট বা গ্রুপে নোটিফিকেশন যাবে তার আইডি দিন।</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-primary">নোটিফিকেশন ইভেন্টস</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">নতুন অর্ডার নোটিফিকেশন</Label>
                        <p className="text-[9px] text-muted-foreground">নতুন অর্ডার প্লেস হলে নোটিফিকেশন পাবেন</p>
                      </div>
                      <Switch 
                        checked={telegramSettings.notify_new_order} 
                        onCheckedChange={v => setTelegramSettings((p: any) => ({ ...p, notify_new_order: v }))} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">অর্ডার স্ট্যাটাস পরিবর্তন</Label>
                        <p className="text-[9px] text-muted-foreground">অর্ডারের প্রসেসিং/ডেলিভারি স্ট্যাটাস চেঞ্জ হলে নোটিফিকেশন পাবেন</p>
                      </div>
                      <Switch 
                        checked={telegramSettings.notify_status_change} 
                        onCheckedChange={v => setTelegramSettings((p: any) => ({ ...p, notify_status_change: v }))} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">ইনকমপ্লিট অর্ডার নোটিফিকেশন</Label>
                        <p className="text-[9px] text-muted-foreground">নতুন ইনকমপ্লিট অর্ডার (কার্ট পরিত্যক্ত) তৈরি হলে নোটিফিকেশন পাবেন</p>
                      </div>
                      <Switch 
                        checked={telegramSettings.notify_incomplete_order} 
                        onCheckedChange={v => setTelegramSettings((p: any) => ({ ...p, notify_incomplete_order: v }))} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-xs">লো স্টক অ্যালার্ট নোটিফিকেশন</Label>
                        <p className="text-[9px] text-muted-foreground">পণ্যের স্টক কমে সর্বনিম্ন সীমায় নামলে নোটিফিকেশন পাবেন</p>
                      </div>
                      <Switch 
                        checked={telegramSettings.notify_low_stock} 
                        onCheckedChange={v => setTelegramSettings((p: any) => ({ ...p, notify_low_stock: v }))} 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <Button 
                    type="submit"
                    className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" 
                    disabled={saving === "telegram_settings"}
                  >
                    {saving === "telegram_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} সেটিংস সেভ করুন
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    className="gap-1.5 rounded-xl px-6" 
                    disabled={testingTelegram}
                    onClick={handleTestTelegram}
                  >
                    {testingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} টেস্ট মেসেজ পাঠান
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 11: SMS & OTP */}
        <TabsContent value="sms" className="space-y-6 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary">💬 এসএমএস ও ওটিপি সেটিংস</CardTitle>
              <CardDescription>গ্রাহকদের জন্য ওটিপি ভেরিফিকেশন এবং কনফার্মেশন/স্ট্যাটাস আপডেট এসএমএস কনফিগার করুন।</CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveSetting("sms_settings", smsSettings);
                }} 
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-secondary/10">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-sm">এসএমএস গেটওয়ে চালু করুন</Label>
                      <p className="text-[10px] text-muted-foreground">সব ধরণের এসএমএস পাঠানোর জন্য এটি চালু করুন</p>
                    </div>
                    <Switch 
                      checked={smsSettings.enabled} 
                      onCheckedChange={v => setSmsSettings((p: any) => ({ ...p, enabled: v }))} 
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border bg-secondary/10">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-sm">স্যান্ডবক্স মোড (Sandbox Mode)</Label>
                      <p className="text-[10px] text-muted-foreground">ব্যালেন্স খরচ না করে ওটিপি টেস্ট করার জন্য</p>
                    </div>
                    <Switch 
                      checked={smsSettings.sandbox_mode} 
                      onCheckedChange={v => setSmsSettings((p: any) => ({ ...p, sandbox_mode: v }))} 
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border bg-secondary/10">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-sm">চেকআউটে ওটিপি ভেরিফিকেশন</Label>
                      <p className="text-[10px] text-muted-foreground">ক্যাশ অন ডেলিভারি অর্ডারের আগে ওটিপি প্রয়োজন</p>
                    </div>
                    <Switch 
                      checked={smsSettings.otp_enabled} 
                      onCheckedChange={v => setSmsSettings((p: any) => ({ ...p, otp_enabled: v }))} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>এসএমএস গেটওয়ে (SMS Gateway)</Label>
                    <Select value={smsSettings.gateway || "sandbox"} onValueChange={v => setSmsSettings((p: any) => ({ ...p, gateway: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Test Mode)</SelectItem>
                        <SelectItem value="greenweb">Greenweb BD</SelectItem>
                        <SelectItem value="elitbuzz">ElitBuzz BD</SelectItem>
                        <SelectItem value="bulksmsbd">BulkSMSBD</SelectItem>
                        <SelectItem value="mim_sms">Mim SMS</SelectItem>
                        <SelectItem value="custom">Custom (HTTP Request)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>ওটিপি ডিজিট সংখ্যা (OTP Digit Count)</Label>
                    <Select value={String(smsSettings.otp_digit_count || 4)} onValueChange={v => setSmsSettings((p: any) => ({ ...p, otp_digit_count: Number(v) }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 Digits</SelectItem>
                        <SelectItem value="6">6 Digits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {smsSettings.gateway !== "sandbox" && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {smsSettings.gateway !== "custom" ? (
                        <>
                          <div className="space-y-2">
                            <Label>এপিআই কী (API Key / Token)</Label>
                            <Input 
                              type="password"
                              value={smsSettings.api_key || ""} 
                              onChange={e => setSmsSettings((p: any) => ({ ...p, api_key: e.target.value }))} 
                              placeholder="আপনার SMS গেটওয়ের API Key দিন" 
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>সেন্ডার আইডি (Sender ID / Masking - Optional)</Label>
                            <Input 
                              value={smsSettings.sender_id || ""} 
                              onChange={e => setSmsSettings((p: any) => ({ ...p, sender_id: e.target.value }))} 
                              placeholder="অনুমোদিত সেন্ডার আইডি (যেমন: Rangao)" 
                              className="rounded-xl"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-2 space-y-2">
                            <Label>এপিআই ইউআরএল (API URL)</Label>
                            <Input 
                              value={smsSettings.api_url || ""} 
                              onChange={e => setSmsSettings((p: any) => ({ ...p, api_url: e.target.value }))} 
                              placeholder="যেমন: https://api.example.com/send?apikey=KEY&to={to}&msg={msg}" 
                              className="rounded-xl"
                            />
                            <p className="text-[10px] text-muted-foreground">ফোনের জন্য <code>{"{to}"}</code> এবং বার্তার জন্য <code>{"{msg}"}</code> প্লেসহোল্ডার ব্যবহার করুন।</p>
                          </div>
                          <div className="space-y-2">
                            <Label>HTTP Method</Label>
                            <Select value={smsSettings.method || "GET"} onValueChange={v => setSmsSettings((p: any) => ({ ...p, method: v }))}>
                              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Headers (JSON String - Optional)</Label>
                            <Input 
                              value={smsSettings.headers || ""} 
                              onChange={e => setSmsSettings((p: any) => ({ ...p, headers: e.target.value }))} 
                              placeholder='যেমন: {"Authorization": "Bearer token"}' 
                              className="rounded-xl"
                            />
                          </div>
                          {smsSettings.method === "POST" && (
                            <div className="col-span-2 space-y-2">
                              <Label>Request Body Template (JSON / Text String)</Label>
                              <Textarea 
                                value={smsSettings.body_template || ""} 
                                onChange={e => setSmsSettings((p: any) => ({ ...p, body_template: e.target.value }))} 
                                placeholder='যেমন: {"mobile": "{to}", "text": "{msg}"}' 
                                className="rounded-xl min-h-[80px]"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-primary">এসএমএস টেমপ্লেট ও কনফিগারেশন</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">ওটিপি কোড টেমপ্লেট (OTP Code Template)</Label>
                      <Input 
                        value={smsSettings.otp_template || ""} 
                        onChange={e => setSmsSettings((p: any) => ({ ...p, otp_template: e.target.value }))} 
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-muted-foreground">অবশ্যই টেমপ্লেটে <code>{"{otp}"}</code> প্লেসহোল্ডারটি ব্যবহার করবেন।</p>
                    </div>

                    <div className="p-4 rounded-xl border bg-secondary/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="font-bold text-xs">অর্ডার সফল হলে এসএমএস পাঠান</Label>
                          <p className="text-[9px] text-muted-foreground">অর্ডার সফল হলে গ্রাহককে এসএমএস পাঠাবে</p>
                        </div>
                        <Switch 
                          checked={smsSettings.order_success_sms_enabled} 
                          onCheckedChange={v => setSmsSettings((p: any) => ({ ...p, order_success_sms_enabled: v }))} 
                        />
                      </div>
                      {smsSettings.order_success_sms_enabled && (
                        <div className="space-y-2 pt-2">
                          <Label className="text-xs">অর্ডার সফল এসএমএস টেমপ্লেট</Label>
                          <Textarea 
                            value={smsSettings.order_success_sms_template || ""} 
                            onChange={e => setSmsSettings((p: any) => ({ ...p, order_success_sms_template: e.target.value }))} 
                            className="rounded-xl min-h-[80px]"
                          />
                          <p className="text-[9px] text-muted-foreground">প্লেসহোল্ডারসমূহ: <code>{"{name}"}</code>, <code>{"{order_number}"}</code>, <code>{"{total}"}</code></p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border bg-secondary/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="font-bold text-xs">স্ট্যাটাস আপডেট এসএমএস</Label>
                          <p className="text-[9px] text-muted-foreground">অর্ডার স্ট্যাটাস পরিবর্তিত হলে গ্রাহককে এসএমএস পাঠাবে</p>
                        </div>
                        <Switch 
                          checked={smsSettings.status_update_sms_enabled} 
                          onCheckedChange={v => setSmsSettings((p: any) => ({ ...p, status_update_sms_enabled: v }))} 
                        />
                      </div>
                      {smsSettings.status_update_sms_enabled && (
                        <div className="space-y-2 pt-2">
                          <Label className="text-xs">স্ট্যাটাস আপডেট এসএমএস টেমপ্লেট</Label>
                          <Textarea 
                            value={smsSettings.status_update_sms_template || ""} 
                            onChange={e => setSmsSettings((p: any) => ({ ...p, status_update_sms_template: e.target.value }))} 
                            className="rounded-xl min-h-[80px]"
                          />
                          <p className="text-[9px] text-muted-foreground">প্লেসহোল্ডারসমূহ: <code>{"{name}"}</code>, <code>{"{order_number}"}</code>, <code>{"{status}"}</code></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit"
                    className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" 
                    disabled={saving === "sms_settings"}
                  >
                    {saving === "sms_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} সেটিংস সেভ করুন
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MediaPicker 
        isOpen={activePickerField !== null}
        onClose={() => setActivePickerField(null)}
        onSelect={(url) => {
          if (activePickerField) {
            if (activePickerField === "banner_image_url" || activePickerField === "story_image_url") {
              setAboutUsSettings(prev => ({ ...prev, [activePickerField]: url }));
            } else {
              setStoreInfo(prev => ({ ...prev, [activePickerField]: url }));
            }
          }
          setActivePickerField(null);
        }}
        type="images"
      />
    </div>
  );
}

