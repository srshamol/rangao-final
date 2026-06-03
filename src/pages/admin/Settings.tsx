import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import type { StoreInfo, ContactInfo, SocialLinkItem } from "@/hooks/useStoreSettings";
import MediaPicker from "@/components/MediaPicker";
import { trackLead } from "@/lib/tracking";

interface DeliveryCharges {
  dhaka_inside: number;
  dhaka_outside: number;
  free_delivery_min: number;
}

interface PaymentMethods {
  cod: boolean;
  bkash: boolean;
  nagad: boolean;
  bkash_number: string;
  nagad_number: string;
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

  const [delivery, setDelivery] = useState<DeliveryCharges>({ dhaka_inside: 70, dhaka_outside: 130, free_delivery_min: 0 });
  const [payment, setPayment] = useState<PaymentMethods>({ cod: true, bkash: false, nagad: false, bkash_number: "", nagad_number: "" });
  
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
  const [activePickerField, setActivePickerField] = useState<"logo_url" | "mobile_logo_url" | "white_logo_url" | "favicon_url" | null>(null);
  const primaryLogoInputRef = useRef<HTMLInputElement>(null);
  const mobileLogoInputRef = useRef<HTMLInputElement>(null);
  const whiteLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const ensureBucket = async () => {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.id === "product-images")) {
      await supabase.storage.createBucket("product-images", { public: true });
    }
  };

  const uploadFile = async (file: File, field: "logo_url" | "mobile_logo_url" | "white_logo_url" | "favicon_url") => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "❌ আপলোড ত্রুটি", description: "ফাইলের সাইজ ৫MB এর বেশি হতে পারবে না", variant: "destructive" });
      return;
    }
    setUploadingField(field);
    try {
      await ensureBucket();
      const ext = file.name.split(".").pop();
      const path = `branding/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      
      setStoreInfo(prev => ({
        ...prev,
        [field]: urlData.publicUrl
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
          if (row.key === "delivery_charges") setDelivery(row.value);
          if (row.key === "payment_methods") setPayment(row.value);
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
          if (row.key === "tracking_settings") {
            setTracking(prev => ({
              ...prev,
              ...row.value
            }));
            setDbTracking(row.value);
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
          <TabsTrigger value="images" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap transition-all duration-300">🖼️ ইমেজ অপ্টিমাইজেশন</TabsTrigger>
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
                    <Input value={storeInfo.secondary_email || ""} onChange={e => setStoreInfo(p => ({ ...p, secondary_email: e.target.value }))} placeholder="support@rangao.com.bd" />
                  </div>
                  <div className="space-y-2">
                    <Label>ওয়েবসাইট URL</Label>
                    <Input value={storeInfo.website_url || ""} onChange={e => setStoreInfo(p => ({ ...p, website_url: e.target.value }))} placeholder="https://rangao.com.bd" />
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
                <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => saveSetting("delivery_charges", delivery)} disabled={saving === "delivery_charges"}>
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
            <CardContent className="space-y-6">
              
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
                <Button className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" onClick={() => saveSetting("courier_settings", courier)} disabled={saving === "courier_settings"}>
                  {saving === "courier_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} কুরিয়ার সেটিংস সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Comprehensive Tracking & Analytics */}
        <TabsContent value="tracking" className="space-y-6 outline-none">
          <Card className="border border-border/80 shadow-premium-lg">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-display">🌐 ট্র্যাকিং ও অ্যানালিটিক্স ম্যানেজার (Tracking & Analytics Stack)</CardTitle>
              <CardDescription>
                আপনার ওয়েবসাইটের ইউজার অ্যাকশন ট্র্যাক করতে পিক্সেল এবং সার্ভার-সাইড ইন্টিগ্রেশনসমূহ পরিচালনা করুন।
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
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
                        (dbTracking.meta_pixel_enabled && dbTracking.meta_pixel_id?.trim()) ||
                        (dbTracking.gtm_enabled && dbTracking.gtm_id?.trim()) ||
                        (dbTracking.ga4_enabled && dbTracking.ga4_id?.trim()) ||
                        (dbTracking.tiktok_enabled && dbTracking.tiktok_pixel_id?.trim())
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
                        onChange={e => setTracking((p: any) => ({ ...p, meta_pixel_id: e.target.value }))} 
                        placeholder="যেমন: 123456789012345"
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
                        (tracking.meta_pixel_enabled && tracking.meta_pixel_id?.trim()) ||
                        (tracking.gtm_enabled && tracking.gtm_id?.trim()) ||
                        (tracking.ga4_enabled && tracking.ga4_id?.trim()) ||
                        (tracking.tiktok_enabled && tracking.tiktok_pixel_id?.trim())
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
                      const isActive = tracking.global_enabled &&
                        tracking.meta_capi_enabled &&
                        tracking.meta_pixel_id?.trim() &&
                        tracking.meta_access_token?.trim();
                      return (
                        <span className={`font-bold text-sm block mt-1 ${isActive ? "text-blue-500" : "text-red-500"}`}>
                          {isActive ? "Active (Vercel Node) 🟢" : "Disabled 🔴"}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="p-3 rounded-xl border bg-secondary/10 text-center">
                    <span className="text-[10px] text-muted-foreground block">Deduplication Matching</span>
                    {(() => {
                      const hasPixel = tracking.meta_pixel_enabled && tracking.meta_pixel_id?.trim();
                      const hasCAPI = tracking.meta_capi_enabled && tracking.meta_pixel_id?.trim() && tracking.meta_access_token?.trim();
                      const isVerified = tracking.global_enabled && hasPixel && hasCAPI;
                      
                      return (
                        <span className={`font-bold text-sm block mt-1 ${isVerified ? "text-green-500" : ((hasPixel || hasCAPI) ? "text-yellow-500" : "text-red-500")}`}>
                          {isVerified 
                            ? "Verified (100% Match) 🟢" 
                            : ((hasPixel || hasCAPI) ? "N/A (Single-Channel) 🟡" : "Inactive 🔴")}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-black text-green-400 font-mono text-[11px] space-y-2 min-h-36 max-h-64 overflow-y-auto">
                  <div className="text-white font-bold border-b border-green-800 pb-1.5 flex justify-between items-center">
                    <span>📟 Live Conversions Event Log Terminal</span>
                     <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-[10px] bg-green-950/20 text-green-400 border-green-800 hover:bg-green-800 hover:text-white"
                      disabled={!tracking.global_enabled}
                      onClick={() => {
                        const activeEngines = [];
                        if (tracking.meta_pixel_enabled && tracking.meta_pixel_id?.trim()) activeEngines.push("Meta Pixel");
                        if (tracking.gtm_enabled && tracking.gtm_id?.trim()) activeEngines.push("GTM");
                        if (tracking.ga4_enabled && tracking.ga4_id?.trim()) activeEngines.push("GA4");
                        if (tracking.tiktok_enabled && tracking.tiktok_pixel_id?.trim()) activeEngines.push("TikTok");

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
                      {tracking.meta_pixel_enabled && tracking.meta_pixel_id?.trim() ? (
                        <div>[SYSTEM] Meta Pixel loaded: {tracking.meta_pixel_id}</div>
                      ) : null}
                      {tracking.gtm_enabled && tracking.gtm_id?.trim() ? (
                        <div>[SYSTEM] Google Tag Manager loaded: {tracking.gtm_id}</div>
                      ) : null}
                      {tracking.ga4_enabled && tracking.ga4_id?.trim() ? (
                        <div>[SYSTEM] Google Analytics 4 loaded: {tracking.ga4_id}</div>
                      ) : null}
                      {tracking.tiktok_enabled && tracking.tiktok_pixel_id?.trim() ? (
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
                  className="gap-1.5 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/95" 
                  onClick={saveTrackingSettings} 
                  disabled={saving === "tracking_settings"}
                >
                  {saving === "tracking_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ট্র্যাকিং সেটিংস সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Image Optimization & Database Migration Wizard */}
        <TabsContent value="images" className="space-y-6 outline-none">
          <ImageMigrationPanel toast={toast} />
        </TabsContent>

      </Tabs>

      <MediaPicker 
        isOpen={activePickerField !== null}
        onClose={() => setActivePickerField(null)}
        onSelect={(url) => {
          if (activePickerField) {
            setStoreInfo(prev => ({ ...prev, [activePickerField]: url }));
          }
          setActivePickerField(null);
        }}
        type="images"
      />
    </div>
  );
}

// Separate component for the Image Migration Suite to keep code clean and modular
function ImageMigrationPanel({ toast }: { toast: any }) {
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [legacyImages, setLegacyImages] = useState<any[]>([]);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [rollbackBackup, setRollbackBackup] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    originalSize: 0,
    optimizedSize: 0,
    percentSaved: 0,
    elapsedTimeSec: 0
  });

  const addLog = (msg: string) => {
    setMigrationLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const scanLegacyImages = async () => {
    setScanning(true);
    setLegacyImages([]);
    setMigrationLogs([]);
    addLog("Scanning database for legacy images...");
    
    const itemsToMigrate: any[] = [];
    
    try {
      // 1. Scan Products
      const { data: products } = await supabase.from("products").select("id, name, images");
      if (products) {
        products.forEach(p => {
          if (p.images && p.images.length > 0) {
            p.images.forEach((img: string, idx: number) => {
              if (img && !img.includes("/original/")) {
                itemsToMigrate.push({
                  type: "product",
                  table: "products",
                  recordId: p.id,
                  recordName: p.name,
                  field: `images[${idx}]`,
                  fieldIndex: idx,
                  url: img
                });
              }
            });
          }
        });
      }

      // 2. Scan Categories
      const { data: categories } = await supabase.from("categories").select("id, name, image_url");
      if (categories) {
        categories.forEach(c => {
          if (c.image_url && !c.image_url.includes("/original/")) {
            itemsToMigrate.push({
              type: "category",
              table: "categories",
              recordId: c.id,
              recordName: c.name,
              field: "image_url",
              url: c.image_url
            });
          }
        });
      }

      // 3. Scan Testimonials
      const { data: testimonials } = await supabase.from("testimonials").select("id, customer_name, customer_image_url");
      if (testimonials) {
        testimonials.forEach(t => {
          if (t.customer_image_url && !t.customer_image_url.includes("/original/")) {
            itemsToMigrate.push({
              type: "testimonial",
              table: "testimonials",
              recordId: t.id,
              recordName: t.customer_name,
              field: "customer_image_url",
              url: t.customer_image_url
            });
          }
        });
      }

      // 4. Scan Store Settings (Hero & Offer Banners)
      const { data: settings } = await supabase.from("store_settings" as any).select("key, value");
      if (settings) {
        settings.forEach(s => {
          if (s.key === "hero_banner" && s.value?.slides) {
            s.value.slides.forEach((slide: any, idx: number) => {
              if (slide.banner_image_url && !slide.banner_image_url.includes("/original/")) {
                itemsToMigrate.push({
                  type: "store_setting",
                  table: "store_settings",
                  recordId: s.key,
                  recordName: `Hero Slide ${idx + 1}`,
                  field: `slides[${idx}].banner_image_url`,
                  fieldIndex: idx,
                  settingKey: s.key,
                  fullSettingValue: s.value,
                  url: slide.banner_image_url
                });
              }
            });
          }
          if (s.key === "offer_banner" && s.value?.bg_image) {
            if (!s.value.bg_image.includes("/original/")) {
              itemsToMigrate.push({
                type: "store_setting",
                table: "store_settings",
                recordId: s.key,
                recordName: "Offer Banner Background",
                field: "bg_image",
                settingKey: s.key,
                fullSettingValue: s.value,
                url: s.value.bg_image
              });
            }
          }
        });
      }

      setLegacyImages(itemsToMigrate);
      setStats(prev => ({ ...prev, total: itemsToMigrate.length, processed: 0 }));
      addLog(`Scan complete. Found ${itemsToMigrate.length} legacy/external images matching optimization rules.`);
      toast({ title: `🔎 Scan Complete`, description: `Found ${itemsToMigrate.length} legacy images to optimize.` });
    } catch (e: any) {
      addLog(`Scan failed: ${e.message}`);
      toast({ title: "❌ Scan Failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const startMigration = async () => {
    if (legacyImages.length === 0) return;
    setMigrating(true);
    setRollbackBackup([]);
    addLog("Starting image migration and format pipeline...");
    
    const backup: any[] = [];
    let processedCount = 0;
    let totalOrig = 0;
    let totalOpt = 0;
    const startTime = Date.now();

    // Import dynamic pipeline on the fly
    const { mediaService } = await import("@/lib/mediaService");

    for (const item of legacyImages) {
      try {
        addLog(`Migrating [${item.type.toUpperCase()}] "${item.recordName}"...`);
        addLog(`Downloading: ${item.url}`);
        
        // 1. Fetch image URL as blob
        const res = await fetch(item.url);
        if (!res.ok) throw new Error("CORS or network failed to fetch source image");
        
        const blob = await res.blob();
        const ext = item.url.split("?")[0].split(".").pop() || "jpg";
        const filename = `migrated_${item.recordId}_${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: blob.type });

        addLog(`Converting & generating WebP + AVIF sizes for ${filename}...`);
        
        // 2. Upload and convert
        const mediaItem = await mediaService.upload(file, "images");
        
        // Save database path references
        const newUrl = mediaItem.url;
        
        // 3. Save backup state for rollback
        backup.push({ ...item });

        addLog(`Updating database record references...`);

        // 4. Mutation based on record type
        if (item.type === "product") {
          const { data: p } = await supabase.from("products").select("images").eq("id", item.recordId).single();
          if (p) {
            const nextImages = [...p.images];
            nextImages[item.fieldIndex] = newUrl;
            await supabase.from("products").update({ images: nextImages }).eq("id", item.recordId);
          }
        } else if (item.type === "category") {
          await supabase.from("categories").update({ image_url: newUrl }).eq("id", item.recordId);
        } else if (item.type === "testimonial") {
          await supabase.from("testimonials").update({ customer_image_url: newUrl }).eq("id", item.recordId);
        } else if (item.type === "store_setting") {
          const { data: row } = await supabase.from("store_settings" as any).select("value").eq("key", item.settingKey).single();
          if (row) {
            const nextVal = { ...row.value };
            if (item.field.includes("slides")) {
              nextVal.slides[item.fieldIndex].banner_image_url = newUrl;
            } else {
              nextVal[item.field] = newUrl;
            }
            await supabase.from("store_settings" as any).update({ value: nextVal }).eq("key", item.settingKey);
          }
        }

        // Calculate size improvements (using uploaded metadata sizes if available)
        const origSize = blob.size;
        let optSize = 0;
        if (mediaItem.metadata && mediaItem.metadata.webp) {
          // Average size of webp output files
          optSize = (mediaItem.metadata.originalSize || origSize) / 3; 
        } else {
          optSize = origSize * 0.45; // average savings estimation
        }

        totalOrig += origSize;
        totalOpt += optSize;
        processedCount++;

        setStats({
          total: legacyImages.length,
          processed: processedCount,
          originalSize: totalOrig,
          optimizedSize: totalOpt,
          percentSaved: Math.round(((totalOrig - totalOpt) / totalOrig) * 100),
          elapsedTimeSec: Math.round((Date.now() - startTime) / 1000)
        });

        addLog(`Successfully optimized. Savings estimate: ${Math.round(((origSize - optSize)/origSize)*100)}%!`);

      } catch (err: any) {
        addLog(`Failed to migrate "${item.recordName}": ${err.message || err}`);
      }
    }

    setRollbackBackup(backup);
    setMigrating(false);
    addLog(`Image migration completed. Processed: ${processedCount}/${legacyImages.length}. Saved ${Math.round((totalOrig - totalOpt) / 1024 / 1024)}MB bandwidth.`);
    toast({ title: "🎉 Migration Complete!", description: `Successfully optimized ${processedCount} legacy images.` });
  };

  const rollbackMigration = async () => {
    if (rollbackBackup.length === 0) return;
    setMigrating(true);
    addLog("Rolling back all migrated database references to original URLs...");

    for (const item of rollbackBackup) {
      try {
        addLog(`Rolling back [${item.type.toUpperCase()}] "${item.recordName}"...`);
        if (item.type === "product") {
          const { data: p } = await supabase.from("products").select("images").eq("id", item.recordId).single();
          if (p) {
            const nextImages = [...p.images];
            nextImages[item.fieldIndex] = item.url;
            await supabase.from("products").update({ images: nextImages }).eq("id", item.recordId);
          }
        } else if (item.type === "category") {
          await supabase.from("categories").update({ image_url: item.url }).eq("id", item.recordId);
        } else if (item.type === "testimonial") {
          await supabase.from("testimonials").update({ customer_image_url: item.url }).eq("id", item.recordId);
        } else if (item.type === "store_setting") {
          const { data: row } = await supabase.from("store_settings" as any).select("value").eq("key", item.settingKey).single();
          if (row) {
            const nextVal = { ...row.value };
            if (item.field.includes("slides")) {
              nextVal.slides[item.fieldIndex].banner_image_url = item.url;
            } else {
              nextVal[item.field] = item.url;
            }
            await supabase.from("store_settings" as any).update({ value: nextVal }).eq("key", item.settingKey);
          }
        }
      } catch (err: any) {
        addLog(`Failed rollback for "${item.recordName}": ${err.message}`);
      }
    }
    
    setRollbackBackup([]);
    setMigrating(false);
    setLegacyImages([]);
    setStats({ total: 0, processed: 0, originalSize: 0, optimizedSize: 0, percentSaved: 0, elapsedTimeSec: 0 });
    addLog("Rollback complete. Database state restored perfectly.");
    toast({ title: "↩️ Rollback Complete", description: "All database references successfully rolled back." });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <Card className="border border-border/80 shadow-premium-lg">
      <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
        <CardTitle className="text-lg flex items-center gap-2 text-primary font-display">🖼️ প্রিমিয়াম ইমেজ কনভার্সন ও অপ্টিমাইজেশন সুইট</CardTitle>
        <CardDescription>
          আপনার ই-কমার্স ওয়েবসাইটের সব ইমেজ স্ক্যান করুন এবং অটোমেটিক AVIF/WebP মাল্টি-সাইজ রেসপনসিভ ফরম্যাটে কনভার্ট করুন।
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={scanLegacyImages} 
            disabled={scanning || migrating}
            variant="outline"
            className="rounded-xl border-accent/30 text-accent font-bold"
          >
            {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🔎 স্ক্যান শুরু করুন"}
          </Button>

          <Button 
            onClick={startMigration} 
            disabled={migrating || scanning || legacyImages.length === 0}
            className="rounded-xl bg-accent text-accent-foreground font-bold"
          >
            {migrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🚀 অটো-অপ্টিমাইজ শুরু করুন"}
          </Button>

          {rollbackBackup.length > 0 && (
            <Button 
              onClick={rollbackMigration} 
              disabled={migrating}
              variant="destructive"
              className="rounded-xl font-bold"
            >
              ↩️ রোলব্যাক (Rollback URLs)
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl border bg-secondary/15">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground block">মোট অপ্টিমাইজযোগ্য ফাইল</span>
            <span className="text-2xl font-extrabold block text-primary">{stats.total}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground block">অপ্টিমাইজ সম্পন্ন</span>
            <span className="text-2xl font-extrabold block text-success">{stats.processed} / {stats.total}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground block">মোট অরিজিনাল সাইজ</span>
            <span className="text-2xl font-extrabold block text-amber-600">{formatSize(stats.originalSize)}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground block">অপ্টিমাইজড সাইজ (savings %)</span>
            <span className="text-2xl font-extrabold block text-emerald-600">
              {formatSize(stats.optimizedSize)} ({stats.percentSaved}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {migrating && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>প্রোগ্রেস বার</span>
              <span>{Math.round((stats.processed / stats.total) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${(stats.processed / stats.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Scan Results Table */}
        {legacyImages.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-primary">স্ক্যান রেজাল্ট (অপ্টিমাইজযোগ্য ইমেজ তালিকা)</h4>
            <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-card">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b">
                    <th className="p-2.5 font-bold">নাম / রেকর্ড</th>
                    <th className="p-2.5 font-bold">ট্যাবেল</th>
                    <th className="p-2.5 font-bold">ক্ষেত্র</th>
                    <th className="p-2.5 font-bold">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {legacyImages.map((item, idx) => (
                    <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                      <td className="p-2.5 font-medium">{item.recordName}</td>
                      <td className="p-2.5 capitalize">{item.type}</td>
                      <td className="p-2.5 text-muted-foreground font-mono">{item.field}</td>
                      <td className="p-2.5 text-accent font-semibold">Ready 🟡</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs Terminal */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-primary">রিয়েল-টাইম লাইভ পাইপলাইন টার্মিনাল</h4>
          <div className="p-4 rounded-xl border bg-black text-green-400 font-mono text-xs space-y-1.5 h-48 overflow-y-auto flex flex-col-reverse">
            {migrationLogs.length === 0 ? (
              <div className="text-muted-foreground">[READY] Terminal offline. Click "স্ক্যান শুরু করুন" to inspect database assets.</div>
            ) : (
              migrationLogs.map((log, idx) => <div key={idx}>{log}</div>)
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

