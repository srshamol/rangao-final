import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Save, Image, Phone, Globe, Layout, Upload, Video, Type, X,
  Store, Mail, MapPin, MessageCircle, Facebook, Instagram, Eye, EyeOff,
  Sparkles, Palette, Monitor, Smartphone, CheckCircle2, AlertCircle,
} from "lucide-react";

interface HeroBanner {
  title: string; subtitle: string; cta_text: string; cta_link: string;
  banner_image_url: string; banner_video_url: string; badge_text: string; enabled: boolean;
}
interface ContactInfo {
  phone: string; whatsapp: string; email: string; address: string;
  facebook_url: string; instagram_url: string;
}
interface HomepageSections {
  show_categories: boolean; show_featured: boolean; show_flash_sale: boolean;
  show_why_choose: boolean; show_testimonials: boolean; show_newsletter: boolean;
}
interface StoreInfo {
  name: string; phone: string; email: string; address: string; logo_url: string;
}

export default function HomepageManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [hero, setHero] = useState<HeroBanner>({
    title: "", subtitle: "", cta_text: "", cta_link: "#products",
    banner_image_url: "", banner_video_url: "", badge_text: "", enabled: true,
  });
  const [contact, setContact] = useState<ContactInfo>({
    phone: "", whatsapp: "", email: "", address: "", facebook_url: "", instagram_url: "",
  });
  const [sections, setSections] = useState<HomepageSections>({
    show_categories: true, show_featured: true, show_flash_sale: true,
    show_why_choose: true, show_testimonials: true, show_newsletter: true,
  });
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "GadgetGram", phone: "", email: "", address: "", logo_url: "",
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings" as any).select("key, value");
      if (data) {
        (data as any[]).forEach((row) => {
          if (row.key === "hero_banner") setHero((p) => ({ ...p, ...row.value }));
          if (row.key === "contact_info") setContact((p) => ({ ...p, ...row.value }));
          if (row.key === "homepage_sections") setSections((p) => ({ ...p, ...row.value }));
          if (row.key === "store_info") setStoreInfo((p) => ({ ...p, ...row.value }));
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    setSaving(key);
    try {
      const { error: updateErr } = await supabase
        .from("store_settings" as any)
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (updateErr) {
        const { error: insertErr } = await supabase
          .from("store_settings" as any)
          .insert({ key, value });
        if (insertErr) throw insertErr;
      }
      toast({ title: "✅ সেভ হয়েছে!" });
    } catch (e: any) {
      toast({ title: "সেভ ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("site-assets").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "logo") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const folder = type === "logo" ? "logos" : type === "image" ? "banners" : "videos";
      const url = await uploadFile(file, folder);
      if (type === "image") setHero((p) => ({ ...p, banner_image_url: url }));
      else if (type === "video") setHero((p) => ({ ...p, banner_video_url: url }));
      else setStoreInfo((p) => ({ ...p, logo_url: url }));
      toast({ title: "✅ আপলোড সফল!" });
    } catch (e: any) {
      toast({ title: "আপলোড ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const activeSections = Object.values(sections).filter(Boolean).length;
  const totalSections = Object.keys(sections).length;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            হোমপেজ ম্যানেজার
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 ml-[3rem]">
            ব্যানার, কন্টাক্ট, স্টোর ইনফো ও সেকশন কন্ট্রোল করুন
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1">
            <Monitor className="h-3 w-3" />
            লাইভ প্রিভিউ
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat
          icon={<Image className="h-4 w-4" />}
          label="ব্যানার"
          value={hero.enabled ? "সক্রিয়" : "নিষ্ক্রিয়"}
          active={hero.enabled}
        />
        <QuickStat
          icon={<Layout className="h-4 w-4" />}
          label="সেকশন"
          value={`${activeSections}/${totalSections}`}
          active={activeSections > 0}
        />
        <QuickStat
          icon={<Phone className="h-4 w-4" />}
          label="কন্টাক্ট"
          value={contact.phone ? "সেট আছে" : "নেই"}
          active={!!contact.phone}
        />
        <QuickStat
          icon={<Store className="h-4 w-4" />}
          label="স্টোর ইনফো"
          value={storeInfo.name || "সেট করুন"}
          active={!!storeInfo.name}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="banner" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="banner" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Image className="h-3.5 w-3.5" /> ব্যানার
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Store className="h-3.5 w-3.5" /> স্টোর
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Phone className="h-3.5 w-3.5" /> কন্টাক্ট
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Layout className="h-3.5 w-3.5" /> সেকশন
          </TabsTrigger>
        </TabsList>

        {/* Banner Tab */}
        <TabsContent value="banner" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" /> হিরো ব্যানার সেটিংস
                  </CardTitle>
                  <CardDescription className="mt-1">হোমপেজের প্রধান ব্যানার কাস্টমাইজ করুন</CardDescription>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50">
                  {hero.enabled ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-xs font-medium">{hero.enabled ? "দৃশ্যমান" : "লুকানো"}</span>
                  <Switch checked={hero.enabled} onCheckedChange={(v) => setHero((p) => ({ ...p, enabled: v }))} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Media Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Banner Image */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold">
                    <Upload className="h-3.5 w-3.5 text-primary" /> ব্যানার ইমেজ
                  </Label>
                  <div className="relative group rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors overflow-hidden">
                    {hero.banner_image_url ? (
                      <div className="relative">
                        <img src={hero.banner_image_url} alt="Banner" className="w-full h-36 object-cover" />
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                          <button
                            onClick={() => setHero((p) => ({ ...p, banner_image_url: "" }))}
                            className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Image className="h-8 w-8" />
                        <span className="text-xs">ইমেজ আপলোড করুন</span>
                      </div>
                    )}
                  </div>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "image")} disabled={uploading} className="text-xs" />
                  <Input
                    value={hero.banner_image_url}
                    onChange={(e) => setHero((p) => ({ ...p, banner_image_url: e.target.value }))}
                    placeholder="অথবা URL দিন..."
                    className="text-xs"
                  />
                </div>

                {/* Banner Video */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold">
                    <Video className="h-3.5 w-3.5 text-primary" /> ব্যানার ভিডিও
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">ঐচ্ছিক</Badge>
                  </Label>
                  <div className="relative group rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors overflow-hidden">
                    {hero.banner_video_url ? (
                      <div className="relative">
                        <video src={hero.banner_video_url} className="w-full h-36 object-cover" muted />
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                          <button
                            onClick={() => setHero((p) => ({ ...p, banner_video_url: "" }))}
                            className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Video className="h-8 w-8" />
                        <span className="text-xs">ভিডিও আপলোড করুন</span>
                      </div>
                    )}
                  </div>
                  <Input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, "video")} disabled={uploading} className="text-xs" />
                  <Input
                    value={hero.banner_video_url}
                    onChange={(e) => setHero((p) => ({ ...p, banner_video_url: e.target.value }))}
                    placeholder="অথবা URL দিন..."
                    className="text-xs"
                  />
                </div>
              </div>

              <Separator />

              {/* Text Content */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-primary" /> টেক্সট কন্টেন্ট
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">ব্যাজ টেক্সট</Label>
                    <Input value={hero.badge_text} onChange={(e) => setHero((p) => ({ ...p, badge_text: e.target.value }))} placeholder="✦ PREMIUM COLLECTION ✦" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">টাইটেল (প্রধান শিরোনাম)</Label>
                    <Textarea value={hero.title} onChange={(e) => setHero((p) => ({ ...p, title: e.target.value }))} placeholder="প্রিমিয়াম গ্যাজেট কালেকশন" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">সাবটাইটেল</Label>
                    <Textarea value={hero.subtitle} onChange={(e) => setHero((p) => ({ ...p, subtitle: e.target.value }))} placeholder="বাংলাদেশের সবচেয়ে বিশ্বস্ত..." rows={2} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">CTA বাটন টেক্সট</Label>
                    <Input value={hero.cta_text} onChange={(e) => setHero((p) => ({ ...p, cta_text: e.target.value }))} placeholder="শপিং শুরু করুন" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">CTA লিংক</Label>
                    <Input value={hero.cta_link} onChange={(e) => setHero((p) => ({ ...p, cta_link: e.target.value }))} placeholder="#products" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button className="gap-1.5" onClick={() => saveSetting("hero_banner", hero)} disabled={saving === "hero_banner"}>
                  {saving === "hero_banner" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  ব্যানার সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Info Tab */}
        <TabsContent value="store" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4 text-accent" /> স্টোর ইনফরমেশন
              </CardTitle>
              <CardDescription>আপনার স্টোরের নাম, লোগো এবং মৌলিক তথ্য পরিবর্তন করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo Upload */}
              <div className="flex items-start gap-5">
                <div className="shrink-0">
                  <div className="relative group w-24 h-24 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors overflow-hidden">
                    {storeInfo.logo_url ? (
                      <div className="relative w-full h-full">
                        <img src={storeInfo.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                        <button
                          onClick={() => setStoreInfo((p) => ({ ...p, logo_url: "" }))}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                        <Store className="h-6 w-6" />
                        <span className="text-[10px]">লোগো</span>
                      </div>
                    )}
                  </div>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "logo")} disabled={uploading} className="mt-2 text-xs w-24" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">স্টোরের নাম</Label>
                    <Input value={storeInfo.name} onChange={(e) => setStoreInfo((p) => ({ ...p, name: e.target.value }))} placeholder="GadgetGram" className="text-lg font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">লোগো URL (ঐচ্ছিক)</Label>
                    <Input value={storeInfo.logo_url} onChange={(e) => setStoreInfo((p) => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." className="text-xs" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> ফোন</Label>
                  <Input value={storeInfo.phone} onChange={(e) => setStoreInfo((p) => ({ ...p, phone: e.target.value }))} placeholder="+8801XXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> ইমেইল</Label>
                  <Input value={storeInfo.email} onChange={(e) => setStoreInfo((p) => ({ ...p, email: e.target.value }))} placeholder="info@gadgetgram.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> ঠিকানা</Label>
                <Textarea value={storeInfo.address} onChange={(e) => setStoreInfo((p) => ({ ...p, address: e.target.value }))} placeholder="ঢাকা, বাংলাদেশ" rows={2} />
              </div>

              <div className="flex justify-end pt-2">
                <Button className="gap-1.5" onClick={() => saveSetting("store_info", storeInfo)} disabled={saving === "store_info"}>
                  {saving === "store_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  স্টোর ইনফো সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-accent" /> কন্টাক্ট ইনফরমেশন
              </CardTitle>
              <CardDescription>ফোন, WhatsApp, ইমেইল ও সোশ্যাল মিডিয়া — হেডার, ফুটার ও WhatsApp বাটনে ব্যবহৃত হবে</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ContactField
                  icon={<Phone className="h-4 w-4" />}
                  label="ফোন নম্বর"
                  hint="কল বাটনে ব্যবহৃত হবে"
                  value={contact.phone}
                  onChange={(v) => setContact((p) => ({ ...p, phone: v }))}
                  placeholder="+8801XXXXXXXXX"
                />
                <ContactField
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="WhatsApp নম্বর"
                  hint="দেশের কোড সহ, + ছাড়া"
                  value={contact.whatsapp}
                  onChange={(v) => setContact((p) => ({ ...p, whatsapp: v }))}
                  placeholder="8801XXXXXXXXX"
                />
                <ContactField
                  icon={<Mail className="h-4 w-4" />}
                  label="ইমেইল"
                  value={contact.email}
                  onChange={(v) => setContact((p) => ({ ...p, email: v }))}
                  placeholder="info@gadgetgram.com"
                />
                <ContactField
                  icon={<MapPin className="h-4 w-4" />}
                  label="ঠিকানা"
                  value={contact.address}
                  onChange={(v) => setContact((p) => ({ ...p, address: v }))}
                  placeholder="ঢাকা, বাংলাদেশ"
                />
              </div>

              <Separator />

              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> সোশ্যাল মিডিয়া
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ContactField
                  icon={<Facebook className="h-4 w-4" />}
                  label="Facebook পেজ"
                  value={contact.facebook_url}
                  onChange={(v) => setContact((p) => ({ ...p, facebook_url: v }))}
                  placeholder="https://facebook.com/gadgetgram"
                />
                <ContactField
                  icon={<Instagram className="h-4 w-4" />}
                  label="Instagram"
                  value={contact.instagram_url}
                  onChange={(v) => setContact((p) => ({ ...p, instagram_url: v }))}
                  placeholder="https://instagram.com/gadgetgram"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button className="gap-1.5" onClick={() => saveSetting("contact_info", contact)} disabled={saving === "contact_info"}>
                  {saving === "contact_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  কন্টাক্ট সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layout className="h-4 w-4 text-accent" /> হোমপেজ সেকশন কন্ট্রোল
                  </CardTitle>
                  <CardDescription className="mt-1">কোন সেকশনগুলো হোমপেজে দেখাবে তা নির্ধারণ করুন</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {activeSections}/{totalSections} সক্রিয়
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { key: "show_categories" as const, label: "ক্যাটাগরি সেকশন", desc: "স্মার্ট ওয়াচ, ইয়ারফোন ইত্যাদি ক্যাটাগরি", icon: "📂" },
                { key: "show_featured" as const, label: "ফিচার্ড প্রোডাক্ট", desc: "হোমপেজে প্রদর্শিত প্রোডাক্ট", icon: "⭐" },
                { key: "show_flash_sale" as const, label: "ফ্ল্যাশ সেল", desc: "টাইম-বাউন্ড ডিসকাউন্ট অফার", icon: "⚡" },
                { key: "show_why_choose" as const, label: "কেন আমাদের বেছে নেবেন", desc: "ট্রাস্ট ফিচার সেকশন", icon: "🛡️" },
                { key: "show_testimonials" as const, label: "কাস্টমার রিভিউ", desc: "কাস্টমারদের মন্তব্য", icon: "💬" },
                { key: "show_newsletter" as const, label: "নিউজলেটার", desc: "ইমেইল সাবস্ক্রিপশন ফর্ম", icon: "📧" },
              ].map(({ key, label, desc, icon }) => (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    sections[key]
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/50 bg-muted/30 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch checked={sections[key]} onCheckedChange={(v) => setSections((p) => ({ ...p, [key]: v }))} />
                </div>
              ))}

              <div className="flex justify-end pt-3">
                <Button className="gap-1.5" onClick={() => saveSetting("homepage_sections", sections)} disabled={saving === "homepage_sections"}>
                  {saving === "homepage_sections" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  সেকশন সেভ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --- Sub-components --- */

function QuickStat({ icon, label, value, active }: { icon: React.ReactNode; label: string; value: string; active: boolean }) {
  return (
    <div className={`rounded-xl border p-3 transition-colors ${active ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/30"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`${active ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {active ? <CheckCircle2 className="h-3 w-3 text-success" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
        <span className="text-sm font-semibold truncate">{value}</span>
      </div>
    </div>
  );
}

function ContactField({ icon, label, hint, value, onChange, placeholder }: {
  icon: React.ReactNode; label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
