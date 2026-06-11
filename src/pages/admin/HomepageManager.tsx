import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { useStoreSettings, DEFAULT_SECTION_ORDER, type HomepageSectionOrder, type TrustFeatureItem, type HeroBannerSlide, type GalleryItem } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCategories, useProducts } from "@/hooks/useHomepageData";
import { mediaService } from "@/lib/mediaService";
import {
  Save, GripVertical, Eye, EyeOff, Monitor, Smartphone,
  Plus, Trash2, ChevronDown, ChevronUp, Settings2,
  Image, Layout, Package, Star, Megaphone, Tag,
  Users, BarChart2, Mail, Globe, Layers, Loader2, BookOpen
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function upsertSetting(key: string, value: any) {
  const { error } = await (supabase as any)
    .from("store_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

const TAB_ICONS: Record<string, any> = {
  sections: Layers,
  hero: Image,
  categories: Tag,
  products: Package,
  offer: Megaphone,
  trust: Star,
  stats: BarChart2,
  newsletter: Mail,
  gallery: Image,
  announcement: Megaphone,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionRowProps {
  section: HomepageSectionOrder;
  index: number;
  total: number;
  onToggle: (id: string, field: "enabled" | "desktop" | "mobile") => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}

function SectionRow({ section, index, total, onToggle, onMoveUp, onMoveDown, expanded, onToggleExpand, children }: SectionRowProps) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${section.config.enabled ? "border-border/50 bg-card" : "border-border/20 bg-muted/30 opacity-60"}`}>
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle / order */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{section.label}</p>
          <p className="text-xs text-muted-foreground font-mono">{section.id}</p>
        </div>

        {/* Visibility toggles */}
        <div className="flex items-center gap-4 mr-2">
          <div className="flex items-center gap-1.5" title="ডেস্কটপ">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            <Switch
              checked={section.config.desktop}
              onCheckedChange={() => onToggle(section.id, "desktop")}
              className="scale-75"
            />
          </div>
          <div className="flex items-center gap-1.5" title="মোবাইল">
            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
            <Switch
              checked={section.config.mobile}
              onCheckedChange={() => onToggle(section.id, "mobile")}
              className="scale-75"
            />
          </div>
          <Switch
            checked={section.config.enabled}
            onCheckedChange={() => onToggle(section.id, "enabled")}
          />
          {children && (
            <button
              onClick={onToggleExpand}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {expanded && children && (
        <div className="border-t border-border/30 px-5 py-4 bg-muted/20">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomepageManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();
  const { data: allCategories } = useCategories({});
  const { data: allProducts } = useProducts({ filter: "newest", limit: 100 });

  const [sectionOrder, setSectionOrder] = useState<HomepageSectionOrder[]>(
    settings?.sectionOrder || DEFAULT_SECTION_ORDER
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroBannerSlide[]>(
    settings?.heroBanner?.slides || []
  );
  const [expandedSlide, setExpandedSlide] = useState<number | null>(0);
  const [trustItems, setTrustItems] = useState<TrustFeatureItem[]>(
    settings?.trustFeatures || []
  );
  const [newsletter, setNewsletter] = useState(
    settings?.newsletter || { title: "", subtitle: "", placeholder: "", button_text: "" }
  );
  const [offerBanner, setOfferBanner] = useState(
    settings?.offerBanner || { enabled: false, bg_image: "", title: "", subtitle: "", coupon_code: "", button_text: "", button_url: "", start_date: "", end_date: "", show_countdown: true }
  );
  const [statistics, setStatistics] = useState(
    settings?.statistics || { 
      mode: "auto", 
      customers: 5000, 
      orders: 10000, 
      reviews: 4800, 
      products: 200,
      use_bengali_digits: true,
      labels: { customers: "সন্তুষ্ট গ্রাহক", orders: "ডেলিভারি সম্পন্ন", reviews: "গ্রাহক রিভিউ", products: "প্রিমিয়াম পণ্য" },
      suffixes: { customers: "+", orders: "+", reviews: "+", products: "+" },
      icons: { customers: "👥", orders: "📦", reviews: "⭐", products: "🎨" }
    }
  );
  const [announcement, setAnnouncement] = useState(
    settings?.announcementBar || { enabled: true, text: "", bg_color: "#102a20", text_color: "#ffffff", link_url: "" }
  );
  const [homepageGallery, setHomepageGallery] = useState<GalleryItem[]>(
    settings?.homepageGallery || []
  );
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<string | null>(null);

  const [hasLoaded, setHasLoaded] = useState(false);

  // Synchronize state once store settings are loaded from React Query asynchronously
  useEffect(() => {
    if (settings && !hasLoaded) {
      if (settings.sectionOrder) setSectionOrder(settings.sectionOrder);
      if (settings.heroBanner?.slides) setHeroSlides(settings.heroBanner.slides);
      if (settings.trustFeatures) setTrustItems(settings.trustFeatures);
      if (settings.newsletter) setNewsletter(settings.newsletter);
      if (settings.offerBanner) setOfferBanner(settings.offerBanner);
      if (settings.statistics) setStatistics(settings.statistics);
      if (settings.announcementBar) setAnnouncement(settings.announcementBar);
      if (settings.homepageGallery) setHomepageGallery(settings.homepageGallery);
      setHasLoaded(true);
    }
  }, [settings, hasLoaded]);

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>, i: number, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uniqueIndex = `${i}-${type}`;
    try {
      setUploadingIndex(uniqueIndex);
      const mediaItem = await mediaService.upload(file, type === "image" ? "images" : "videos");
      if (mediaItem?.url) {
        if (type === "image") {
          updateSlide(i, { banner_image_url: mediaItem.url });
        } else {
          updateSlide(i, { banner_video_url: mediaItem.url });
        }
        toast({ title: `${type === "image" ? "ইমেজ" : "ভিডিও"} আপলোড সফল হয়েছে` });
      }
    } catch (err: any) {
      toast({ title: `${type === "image" ? "ইমেজ" : "ভিডিও"} আপলোড ব্যর্থ হয়েছে`, description: err.message, variant: "destructive" });
    } finally {
      setUploadingIndex(null);
    }
  };

  // ─── Section Order helpers ──────────────────────────────────────────────────

  const toggleSection = useCallback((id: string, field: "enabled" | "desktop" | "mobile") => {
    setSectionOrder((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextVal = !s.config[field];
          if (id === "offer_banner" && field === "enabled") {
            setOfferBanner((o: any) => ({ ...o, enabled: nextVal }));
          }
          return { ...s, config: { ...s.config, [field]: nextVal } };
        }
        return s;
      })
    );
  }, []);

  const moveUp = useCallback((i: number) => {
    if (i === 0) return;
    setSectionOrder((prev) => {
      const n = [...prev];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];
      return n;
    });
  }, []);

  const moveDown = useCallback((i: number) => {
    setSectionOrder((prev) => {
      if (i >= prev.length - 1) return prev;
      const n = [...prev];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];
      return n;
    });
  }, []);

  const updateSectionConfig = (id: string, updates: Partial<HomepageSectionOrder["config"]>) => {
    setSectionOrder((prev) =>
      prev.map((s) => s.id === id ? { ...s, config: { ...s.config, ...updates } } : s)
    );
  };

  // ─── Hero slide helpers ─────────────────────────────────────────────────────

  const addSlide = () => {
    const newSlide: HeroBannerSlide = {
      id: `slide-${Date.now()}`,
      title: "নতুন স্লাইড",
      subtitle: "",
      description: "",
      badge_text: "",
      cta_primary_text: "দেখুন",
      cta_primary_url: "/products",
      cta_secondary_text: "",
      cta_secondary_url: "",
      banner_image_url: "",
      banner_video_url: "",
      overlay_opacity: 0.85,
      text_align: "left",
      enabled: true,
    };
    setHeroSlides((s) => [...s, newSlide]);
    setExpandedSlide(heroSlides.length);
  };

  const updateSlide = (i: number, updates: Partial<HeroBannerSlide>) => {
    setHeroSlides((s) => s.map((sl, idx) => idx === i ? { ...sl, ...updates } : sl));
  };

  const removeSlide = (i: number) => {
    setHeroSlides((s) => s.filter((_, idx) => idx !== i));
  };

  // ─── Trust items helpers ────────────────────────────────────────────────────

  const addTrustItem = () => {
    setTrustItems((t) => [
      ...t,
      { id: `ti-${Date.now()}`, icon: "ShieldCheck", title: "নতুন আইটেম", desc: "" },
    ]);
  };

  const updateTrustItem = (i: number, updates: Partial<TrustFeatureItem>) => {
    setTrustItems((t) => t.map((item, idx) => idx === i ? { ...item, ...updates } : item));
  };

  const removeTrustItem = (i: number) => {
    setTrustItems((t) => t.filter((_, idx) => idx !== i));
  };

  // ─── Gallery helpers ────────────────────────────────────────────────────────
  const addGalleryItem = () => {
    const newItem: GalleryItem = {
      id: `g-${Date.now()}`,
      image_url: "",
      title: "নতুন গ্যালারি আইটেম",
      link: "/products"
    };
    setHomepageGallery((g) => [...g, newItem]);
  };

  const updateGalleryItem = (i: number, updates: Partial<GalleryItem>) => {
    setHomepageGallery((g) => g.map((item, idx) => idx === i ? { ...item, ...updates } : item));
  };

  const removeGalleryItem = (i: number) => {
    setHomepageGallery((g) => g.filter((_, idx) => idx !== i));
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIndex(`gallery-${i}`);
      const mediaItem = await mediaService.upload(file, "images");
      if (mediaItem?.url) {
        updateGalleryItem(i, { image_url: mediaItem.url });
        toast({ title: "ইমেজ আপলোড সফল হয়েছে" });
      }
    } catch (err: any) {
      toast({ title: "ইমেজ আপলোড ব্যর্থ হয়েছে", description: err.message, variant: "destructive" });
    } finally {
      setUploadingIndex(null);
    }
  };

  const addCustomQuote = () => {
    setNewsletter((prev: any) => {
      const list = prev.quotes_list || [];
      const newQuote = { id: `q-${Date.now()}`, arabic: "", bengali: "", source: "" };
      return { ...prev, quotes_list: [...list, newQuote] };
    });
  };

  const updateCustomQuote = (idx: number, updates: any) => {
    setNewsletter((prev: any) => {
      const list = [...(prev.quotes_list || [])];
      list[idx] = { ...list[idx], ...updates };
      return { ...prev, quotes_list: list };
    });
  };

  const removeCustomQuote = (idx: number) => {
    setNewsletter((prev: any) => {
      const list = (prev.quotes_list || []).filter((_: any, i: number) => i !== idx);
      return { ...prev, quotes_list: list };
    });
  };

  // ─── Save all ──────────────────────────────────────────────────────────────

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting("homepage_section_order", sectionOrder),
        upsertSetting("hero_banner", { enabled: true, slides: heroSlides }),
        upsertSetting("trust_features", trustItems),
        upsertSetting("newsletter", newsletter),
        upsertSetting("offer_banner", offerBanner),
        upsertSetting("statistics", statistics),
        upsertSetting("announcement_bar", announcement),
        upsertSetting("homepage_gallery", homepageGallery),
      ]);
      qc.invalidateQueries({ queryKey: ["store-settings-all"] });
      toast({ title: "✅ সব পরিবর্তন সেভ হয়েছে", description: "হোমপেজ আপডেট হয়েছে।" });
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex h-60 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  const ICON_OPTIONS = ["ShieldCheck", "Truck", "Headset", "RotateCcw", "Banknote", "MapPin", "Package", "Star", "Gift", "Zap", "Heart", "Clock"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">হোমপেজ বিল্ডার</h1>
          <p className="text-sm text-muted-foreground mt-1">হোমপেজের প্রতিটি সেকশন সম্পূর্ণ নিয়ন্ত্রণ করুন</p>
        </div>
        <Button onClick={saveAll} disabled={saving} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
        </Button>
      </div>

      <Tabs defaultValue="sections">
        <TabsList className="flex h-auto flex-wrap gap-1.5 bg-secondary/50 p-2 rounded-2xl w-full">
          {[
            { id: "sections", label: "সেকশন অর্ডার" },
            { id: "hero", label: "হিরো ব্যানার" },
            { id: "categories", label: "ক্যাটাগরি" },
            { id: "products", label: "প্রোডাক্ট" },
            { id: "offer", label: "অফার ব্যানার" },
            { id: "trust", label: "ট্রাস্ট ফিচার" },
            { id: "stats", label: "পরিসংখ্যান" },
            { id: "newsletter", label: "ইসলামিক বাণী" },
            { id: "gallery", label: "গ্যালারি / ইন্সপিরেশন" },
            { id: "announcement", label: "অ্যানাউন্সমেন্ট বার" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-xl text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── SECTIONS TAB ── */}
        <TabsContent value="sections" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                সেকশন অর্ডার ও ভিজিবিলিটি
              </CardTitle>
              <p className="text-sm text-muted-foreground">↑↓ বাটন দিয়ে সেকশন সাজান। স্যুইচ দিয়ে চালু/বন্ধ করুন।</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {sectionOrder.map((section, i) => {
                const hasConfig = ["categories", "featured", "islamic_collection", "new_arrivals", "best_sellers", "flash_sale", "testimonials", "brands", "footer_promo", "gallery", "why_choose"].includes(section.id);
                return (
                  <SectionRow
                    key={section.id}
                    section={section}
                    index={i}
                    total={sectionOrder.length}
                    onToggle={toggleSection}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                    expanded={expandedSection === section.id}
                    onToggleExpand={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  >
                    <div className="space-y-4">
                      {/* Core Layout Controls (Padding, Margin, Background, Animation) */}
                      <div className="grid grid-cols-2 gap-3 border-b border-border/20 pb-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">প্যাডিং (Padding)</label>
                          <Input
                            placeholder="e.g. py-20 md:py-28"
                            value={section.config.padding || ""}
                            onChange={(e) => updateSectionConfig(section.id, { padding: e.target.value })}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">মার্জিন (Margin)</label>
                          <Input
                            placeholder="e.g. my-4"
                            value={section.config.margin || ""}
                            onChange={(e) => updateSectionConfig(section.id, { margin: e.target.value })}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">ব্যাকগ্রাউন্ড কালার (HEX/HSL)</label>
                          <Input
                            placeholder="e.g. #f9f9f9"
                            value={section.config.bg_color || ""}
                            onChange={(e) => updateSectionConfig(section.id, { bg_color: e.target.value })}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">অ্যানিমেশন (Animation)</label>
                          <Select
                            value={section.config.animation || "fade-up"}
                            onValueChange={(v) => updateSectionConfig(section.id, { animation: v as any })}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">কোনোটিই নয়</SelectItem>
                              <SelectItem value="fade">ফেড (Fade)</SelectItem>
                              <SelectItem value="fade-up">ফেড আপ (Fade Up)</SelectItem>
                              <SelectItem value="slide">স্লাইড (Slide)</SelectItem>
                              <SelectItem value="zoom">জুম (Zoom)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-muted-foreground">ব্যাকগ্রাউন্ড ইমেজ URL</label>
                          <Input
                            placeholder="https://..."
                            value={section.config.bg_image || ""}
                            onChange={(e) => updateSectionConfig(section.id, { bg_image: e.target.value })}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>

                      {hasConfig && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          {/* Common Title/Subtitle for most sections */}
                          {["categories", "featured", "islamic_collection", "new_arrivals", "best_sellers", "flash_sale", "testimonials", "brands", "footer_promo", "gallery", "why_choose"].includes(section.id) && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">সেকশন শিরোনাম</label>
                                <Input
                                  value={section.config.title || ""}
                                  onChange={(e) => updateSectionConfig(section.id, { title: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              {section.id !== "footer_promo" && (
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">সাবটাইটেল</label>
                                  <Input
                                    value={section.config.subtitle || ""}
                                    onChange={(e) => updateSectionConfig(section.id, { subtitle: e.target.value })}
                                    className="mt-1 h-8 text-sm"
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {/* ── Products sections config ── */}
                          {["featured", "islamic_collection", "new_arrivals", "best_sellers"].includes(section.id) && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">প্রোডাক্ট সংখ্যা</label>
                                <Input
                                  type="number"
                                  value={section.config.count || 4}
                                  onChange={(e) => updateSectionConfig(section.id, { count: Number(e.target.value) })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">ফিল্টার মোড</label>
                                <Select
                                  value={section.config.filter || "featured"}
                                  onValueChange={(v) => updateSectionConfig(section.id, { filter: v as any })}
                                >
                                  <SelectTrigger className="mt-1 h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="featured">ফিচার্ড</SelectItem>
                                    <SelectItem value="newest">নতুন আগমন</SelectItem>
                                    <SelectItem value="best_seller">বেস্ট সেলার</SelectItem>
                                    <SelectItem value="category">ক্যাটাগরি ভিত্তিক</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {section.config.filter === "category" && (
                                <div className="col-span-2">
                                  <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি স্লাগ</label>
                                  <Select
                                    value={section.config.category_slug || ""}
                                    onValueChange={(v) => updateSectionConfig(section.id, { category_slug: v })}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-sm">
                                      <SelectValue placeholder="ক্যাটাগরি বেছে নিন" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(allCategories || []).map((c) => (
                                        <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </>
                          )}

                          {/* ── Categories config ── */}
                          {section.id === "categories" && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি সংখ্যা</label>
                                <Input
                                  type="number"
                                  value={section.config.count || 8}
                                  onChange={(e) => updateSectionConfig(section.id, { count: Number(e.target.value) })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-3 pt-4">
                                <Switch
                                  checked={section.config.show_count !== false}
                                  onCheckedChange={(v) => updateSectionConfig(section.id, { show_count: v })}
                                  className="scale-75"
                                />
                                <label className="text-xs font-medium">প্রোডাক্ট কাউন্ট দেখান</label>
                              </div>
                            </>
                          )}

                          {/* ── Flash Sale config ── */}
                          {section.id === "flash_sale" && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">কুপন টেক্সট (যেমন: FLASH20)</label>
                                <Input
                                  value={section.config.coupon_code || ""}
                                  onChange={(e) => updateSectionConfig(section.id, { coupon_code: e.target.value })}
                                  className="mt-1 h-8 text-sm font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">শেষ সময় (End Time)</label>
                                <Input
                                  type="datetime-local"
                                  value={section.config.end_date || ""}
                                  onChange={(e) => updateSectionConfig(section.id, { end_date: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-3 pt-4">
                                <Switch
                                  checked={section.config.show_countdown !== false}
                                  onCheckedChange={(v) => updateSectionConfig(section.id, { show_countdown: v })}
                                  className="scale-75"
                                />
                                <label className="text-xs font-medium">কাউন্টডাউন টাইমার দেখান</label>
                              </div>
                            </>
                          )}

                          {/* ── Footer Promo config ── */}
                          {section.id === "footer_promo" && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">বাটন টেক্সট</label>
                                <Input
                                  placeholder="সব কালেকশন দেখুন"
                                  value={section.config.cta_text || ""}
                                  onChange={(e) => updateSectionConfig(section.id, { cta_text: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-medium text-muted-foreground">বাটন লিংক URL</label>
                                <Input
                                  placeholder="/products"
                                  value={section.config.cta_url || ""}
                                  onChange={(e) => updateSectionConfig(section.id, { cta_url: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                            </>
                          )}

                          {/* ── Testimonials config ── */}
                          {section.id === "testimonials" && (
                            <>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">স্লাইডার গতি (ms)</label>
                                <Input
                                  type="number"
                                  placeholder="5000"
                                  value={section.config.slider_speed || 5000}
                                  onChange={(e) => updateSectionConfig(section.id, { slider_speed: Number(e.target.value) })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div className="flex gap-4 pt-4">
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={section.config.autoplay !== false}
                                    onCheckedChange={(v) => updateSectionConfig(section.id, { autoplay: v })}
                                    className="scale-75"
                                  />
                                  <label className="text-xs font-medium">অটোপ্লে</label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={section.config.loop !== false}
                                    onCheckedChange={(v) => updateSectionConfig(section.id, { loop: v })}
                                    className="scale-75"
                                  />
                                  <label className="text-xs font-medium">লুপ</label>
                                </div>
                              </div>
                            </>
                          )}

                          {/* ── Brands config ── */}
                          {section.id === "brands" && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">ডিসপ্লে মোড</label>
                              <Select
                                value={section.config.display_mode || "slider"}
                                onValueChange={(v) => updateSectionConfig(section.id, { display_mode: v as any })}
                              >
                                <SelectTrigger className="mt-1 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="slider">স্লাইডার (Slider)</SelectItem>
                                  <SelectItem value="grid">গ্রিড (Grid)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* ── Why Choose Us items config ── */}
                          {section.id === "why_choose" && (
                            <div className="col-span-2 space-y-4 border-t border-border/20 pt-4 mt-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <label className="text-xs font-semibold text-foreground">কেন রাঙাও বেছে নেবেন আইটেমসমূহ</label>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">হোমপেজে প্রদর্শনের জন্য বৈশিষ্ট্য কার্ড যোগ/সম্পাদনা করুন</p>
                                </div>
                                <Button size="sm" variant="outline" type="button" onClick={addTrustItem} className="h-7 text-xs px-2.5">
                                  <Plus className="mr-1 h-3 w-3" /> আইটেম যোগ করুন
                                </Button>
                              </div>

                              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {trustItems.map((item, idx) => (
                                  <div key={item.id} className="grid grid-cols-12 gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 items-start">
                                    <div className="col-span-3">
                                      <label className="text-[10px] font-medium text-muted-foreground">আইকন</label>
                                      <Select value={item.icon} onValueChange={(v) => updateTrustItem(idx, { icon: v })}>
                                        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {ICON_OPTIONS.map((ic) => <SelectItem key={ic} value={ic} className="text-xs">{ic}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="col-span-4">
                                      <label className="text-[10px] font-medium text-muted-foreground">শিরোনাম</label>
                                      <Input value={item.title} onChange={(e) => updateTrustItem(idx, { title: e.target.value })} className="mt-1 h-8 text-xs" />
                                    </div>
                                    <div className="col-span-4">
                                      <label className="text-[10px] font-medium text-muted-foreground">বিবরণ</label>
                                      <Input value={item.desc} onChange={(e) => updateTrustItem(idx, { desc: e.target.value })} className="mt-1 h-8 text-xs" />
                                    </div>
                                    <div className="col-span-1 flex justify-center pt-5">
                                      <button
                                        type="button"
                                        onClick={() => removeTrustItem(idx)}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {trustItems.length === 0 && (
                                  <div className="rounded-xl border border-dashed border-border/40 py-8 text-center text-xs text-muted-foreground">
                                    কোনো আইটেম নেই। উপরে "আইটেম যোগ করুন" ক্লিক করুন।
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </SectionRow>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HERO BANNER TAB ── */}
        <TabsContent value="hero" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">হিরো ব্যানার স্লাইডস</h2>
              <p className="text-xs text-muted-foreground mt-0.5">একাধিক স্লাইড যোগ করুন — অটোমেটিক ক্যারোসেল হবে</p>
            </div>
            <Button size="sm" variant="outline" onClick={addSlide}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> স্লাইড যোগ করুন
            </Button>
          </div>

          {heroSlides.map((slide, i) => (
            <Card key={slide.id} className="overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedSlide(expandedSlide === i ? null : i)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 font-bold text-accent">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{slide.title || `স্লাইড ${i + 1}`}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{slide.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={slide.enabled} onCheckedChange={(v) => updateSlide(i, { enabled: v })} className="scale-75" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlide(i); }}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {expandedSlide === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {expandedSlide === i && (
                <CardContent className="border-t bg-muted/10 pt-5 pb-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">ব্যানার শিরোনাম</label>
                      <Input value={slide.title} onChange={(e) => updateSlide(i, { title: e.target.value })} className="mt-1" placeholder="প্রিমিয়াম ইসলামিক ও ওয়াল ডেকোর" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">সাবটাইটেল</label>
                      <Textarea value={slide.subtitle} onChange={(e) => updateSlide(i, { subtitle: e.target.value })} className="mt-1" rows={2} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">ব্যাজ টেক্সট</label>
                      <Input value={slide.badge_text} onChange={(e) => updateSlide(i, { badge_text: e.target.value })} className="mt-1" placeholder="✦ RANGAO PREMIUM DECOR ✦" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">টেক্সট অ্যালাইনমেন্ট</label>
                      <Select value={slide.text_align} onValueChange={(v: any) => updateSlide(i, { text_align: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">বাম (Left)</SelectItem>
                          <SelectItem value="center">কেন্দ্র (Center)</SelectItem>
                          <SelectItem value="right">ডান (Right)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">প্রাইমারি বাটন টেক্সট</label>
                      <Input value={slide.cta_primary_text} onChange={(e) => updateSlide(i, { cta_primary_text: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">প্রাইমারি বাটন URL</label>
                      <Input value={slide.cta_primary_url} onChange={(e) => updateSlide(i, { cta_primary_url: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">সেকেন্ডারি বাটন টেক্সট</label>
                      <Input value={slide.cta_secondary_text} onChange={(e) => updateSlide(i, { cta_secondary_text: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">সেকেন্ডারি বাটন URL</label>
                      <Input value={slide.cta_secondary_url} onChange={(e) => updateSlide(i, { cta_secondary_url: e.target.value })} className="mt-1" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">ব্যানার ইমেজ URL</label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          value={slide.banner_image_url} 
                          onChange={(e) => updateSlide(i, { banner_image_url: e.target.value })} 
                          placeholder="https://..." 
                          className="flex-1"
                        />
                        <div className="relative">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="shrink-0 rounded-xl"
                            disabled={uploadingIndex === `${i}-image`}
                          >
                            {uploadingIndex === `${i}-image` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "ইমেজ আপলোড"
                            )}
                          </Button>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleSlideUpload(e, i, "image")}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                      {slide.banner_image_url && (
                        <img src={slide.banner_image_url} alt="Preview" className="mt-2 h-28 w-full object-cover rounded-xl" />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">ব্যানার ভিডিও URL (MP4 / WebM)</label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          value={slide.banner_video_url} 
                          onChange={(e) => updateSlide(i, { banner_video_url: e.target.value })} 
                          placeholder="https://... (MP4 বা WebM লিংক)" 
                          className="flex-1"
                        />
                        {slide.banner_video_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => updateSlide(i, { banner_video_url: "" })}
                            title="ভিডিও মুছুন"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="relative">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="shrink-0 rounded-xl"
                            disabled={uploadingIndex === `${i}-video`}
                          >
                            {uploadingIndex === `${i}-video` ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> আপলোড হচ্ছে...</>
                            ) : (
                              "ভিডিও আপলোড"
                            )}
                          </Button>
                          <input 
                            type="file" 
                            accept="video/mp4,video/webm,video/quicktime" 
                            onChange={(e) => handleSlideUpload(e, i, "video")}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                      {slide.banner_video_url && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-border/40">
                          <video
                            key={slide.banner_video_url}
                            src={slide.banner_video_url}
                            controls
                            muted
                            className="w-full max-h-40 object-cover bg-black"
                          />
                          <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-mono truncate bg-muted/40">
                            {slide.banner_video_url}
                          </p>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">ভিডিও সেট থাকলে ইমেজের বদলে ভিডিও ব্যাকগ্রাউন্ড দেখাবে।</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">ওভারলে অপাসিটি: {Math.round((slide.overlay_opacity || 0.85) * 100)}%</label>
                      <Slider
                        value={[Math.round((slide.overlay_opacity || 0.85) * 100)]}
                        onValueChange={([v]) => updateSlide(i, { overlay_opacity: v / 100 })}
                        min={0}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {heroSlides.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border/40 py-16 text-center">
              <Image className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">কোনো স্লাইড নেই। উপরে "স্লাইড যোগ করুন" ক্লিক করুন।</p>
            </div>
          )}
        </TabsContent>

        {/* ── CATEGORIES TAB ── */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" />
                ক্যাটাগরি সেকশন কনফিগারেশন
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                সমস্ত ক্যাটাগরি ডেটা{" "}
                <a href="/admin/categories" className="text-accent underline">Admin → Categories</a>{" "}
                থেকে আসে। এখানে শুধু প্রেজেন্টেশন কনফিগার করুন।
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const catSection = sectionOrder.find((s) => s.id === "categories");
                if (!catSection) return null;
                const config = catSection.config;
                return (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">শিরোনাম</label>
                      <Input
                        value={config.title || ""}
                        onChange={(e) => updateSectionConfig("categories", { title: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">সাবটাইটেল</label>
                      <Input
                        value={config.subtitle || ""}
                        onChange={(e) => updateSectionConfig("categories", { subtitle: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">ক্যাটাগরি সোর্স (Category Source)</label>
                      <Select
                        value={config.category_mode || "auto"}
                        onValueChange={(v) => updateSectionConfig("categories", { category_mode: v })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">সব ক্যাটাগরি (All Categories)</SelectItem>
                          <SelectItem value="manual">নির্ধারিত ক্যাটাগরি (Selected Categories)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.category_mode === "manual" && (
                      <div className="col-span-2 border p-4 rounded-xl bg-muted/20 space-y-2">
                        <label className="text-sm font-medium block">ক্যাটাগরি নির্বাচন করুন (Selected Categories)</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 border rounded-lg bg-card">
                          {(allCategories || []).map((cat) => {
                            const selectedIds = config.category_ids || [];
                            const isSelected = selectedIds.includes(cat.id);
                            return (
                              <div key={cat.id} className="flex items-center gap-2">
                                <Switch
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const nextIds = checked
                                      ? [...selectedIds, cat.id]
                                      : selectedIds.filter((id: string) => id !== cat.id);
                                    updateSectionConfig("categories", { category_ids: nextIds });
                                  }}
                                  className="scale-75"
                                />
                                <span className="text-xs truncate">{cat.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">সর্টিং অপশন (Sorting Options)</label>
                      <Select
                        value={config.sort_by || "custom"}
                        onValueChange={(v) => updateSectionConfig("categories", { sort_by: v })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">কাস্টম অর্ডার (Custom Order)</SelectItem>
                          <SelectItem value="newest">নতুন ক্যাটাগরি (Newest First)</SelectItem>
                          <SelectItem value="oldest">পুরানো ক্যাটাগরি (Oldest First)</SelectItem>
                          <SelectItem value="products">অধিক প্রোডাক্ট (Most Products)</SelectItem>
                          <SelectItem value="alphabetical">বর্ণানুক্রমিক (Alphabetical)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">সর্বোচ্চ ক্যাটাগরি সংখ্যা (Limit)</label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={config.count || 8}
                        onChange={(e) => updateSectionConfig("categories", { count: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">ডেস্কটপ কলাম সংখ্যা</label>
                      <Select
                        value={String(config.desktop_cols || 4)}
                        onValueChange={(v) => updateSectionConfig("categories", { desktop_cols: Number(v) })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n} কলাম</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">ট্যাবলেট কলাম সংখ্যা</label>
                      <Select
                        value={String(config.tablet_cols || 3)}
                        onValueChange={(v) => updateSectionConfig("categories", { tablet_cols: Number(v) })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n} কলাম</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">মোবাইল কলাম সংখ্যা</label>
                      <Select
                        value={String(config.mobile_cols || 2)}
                        onValueChange={(v) => updateSectionConfig("categories", { mobile_cols: Number(v) })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3].map((n) => <SelectItem key={n} value={String(n)}>{n} কলাম</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.show_image !== false}
                          onCheckedChange={(v) => updateSectionConfig("categories", { show_image: v })}
                        />
                        <label className="text-xs font-semibold">ইমেজ দেখান (Show Image)</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.show_count !== false}
                          onCheckedChange={(v) => updateSectionConfig("categories", { show_count: v })}
                        />
                        <label className="text-xs font-semibold">প্রোডাক্ট কাউন্ট দেখান</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.show_description === true}
                          onCheckedChange={(v) => updateSectionConfig("categories", { show_description: v })}
                        />
                        <label className="text-xs font-semibold">ডেসক্রিপশন দেখান (Description)</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.show_cta === true}
                          onCheckedChange={(v) => updateSectionConfig("categories", { show_cta: v })}
                        />
                        <label className="text-xs font-semibold">CTA বাটন দেখান (Show CTA)</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.show_icon === true}
                          onCheckedChange={(v) => updateSectionConfig("categories", { show_icon: v })}
                        />
                        <label className="text-xs font-semibold">আইকন দেখান (Show Icon)</label>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                <p>📊 বর্তমানে <strong>{allCategories?.length || 0}টি</strong> সক্রিয় ক্যাটাগরি আছে।{" "}
                  <a href="/admin/categories" className="text-accent hover:underline">ক্যাটাগরি ম্যানেজ করুন →</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PRODUCTS TAB ── */}
        <TabsContent value="products" className="mt-6 space-y-4">
          <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>📊 বর্তমানে <strong>{allProducts?.length || 0}+</strong> সক্রিয় প্রোডাক্ট আছে।{" "}
              <a href="/admin/products" className="text-accent hover:underline">প্রোডাক্ট ম্যানেজ করুন →</a>
            </p>
          </div>

          {["featured", "islamic_collection", "new_arrivals", "best_sellers"].map((sid) => {
            const s = sectionOrder.find((x) => x.id === sid);
            if (!s) return null;
            return (
              <Card key={sid}>
                <CardHeader>
                  <CardTitle className="text-base">{s.label}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">শিরোনাম</label>
                    <Input value={s.config.title || ""} onChange={(e) => updateSectionConfig(sid, { title: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">সাবটাইটেল</label>
                    <Input value={s.config.subtitle || ""} onChange={(e) => updateSectionConfig(sid, { subtitle: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ফিল্টার মোড</label>
                    <Select
                      value={s.config.filter || "featured"}
                      onValueChange={(v) => updateSectionConfig(sid, { filter: v as any })}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">ফিচার্ড প্রোডাক্ট</SelectItem>
                        <SelectItem value="newest">নতুন আগমন</SelectItem>
                        <SelectItem value="best_seller">বেস্ট সেলার</SelectItem>
                        <SelectItem value="category">ক্যাটাগরি ভিত্তিক</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">প্রোডাক্ট সংখ্যা</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={s.config.count || 4}
                      onChange={(e) => updateSectionConfig(sid, { count: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  {s.config.filter === "category" && (
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">ক্যাটাগরি</label>
                      <Select
                        value={s.config.category_slug || ""}
                        onValueChange={(v) => updateSectionConfig(sid, { category_slug: v })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="ক্যাটাগরি সিলেক্ট করুন" /></SelectTrigger>
                        <SelectContent>
                          {allCategories?.map((c: any) => (
                            <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── OFFER TAB ── */}
        <TabsContent value="offer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-accent" />
                  অফার ব্যানার কনফিগারেশন
                </span>
                 <Switch
                   checked={offerBanner.enabled}
                   onCheckedChange={(v) => {
                     setOfferBanner((o: any) => ({ ...o, enabled: v }));
                     updateSectionConfig("offer_banner", { enabled: v });
                   }}
                 />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">শিরোনাম</label>
                  <Input
                    value={offerBanner.title}
                    onChange={(e) => setOfferBanner((o: any) => ({ ...o, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">সাবটাইটেল</label>
                  <Input
                    value={offerBanner.subtitle}
                    onChange={(e) => setOfferBanner((o: any) => ({ ...o, subtitle: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">কুপন কোড</label>
                  <Input
                    value={offerBanner.coupon_code}
                    onChange={(e) => setOfferBanner((o: any) => ({ ...o, coupon_code: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ব্যানার ব্যাকগ্রাউন্ড ইমেজ URL</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={offerBanner.bg_image}
                      onChange={(e) => setOfferBanner((o: any) => ({ ...o, bg_image: e.target.value }))}
                      placeholder="https://..."
                    />
                    <input
                      type="file"
                      id="offer-bg-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const media = await mediaService.upload(file, "images");
                            if (media?.url) {
                              setOfferBanner((o: any) => ({ ...o, bg_image: media.url }));
                            }
                          } catch (err: any) {
                            toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("offer-bg-upload")?.click()}
                    >
                      আপলোড
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">মোবাইল ব্যানার ইমেজ URL (Mobile View)</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={offerBanner.mobile_image || ""}
                      onChange={(e) => setOfferBanner((o: any) => ({ ...o, mobile_image: e.target.value }))}
                      placeholder="https://..."
                    />
                    <input
                      type="file"
                      id="offer-mobile-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const media = await mediaService.upload(file, "images");
                            if (media?.url) {
                              setOfferBanner((o: any) => ({ ...o, mobile_image: media.url }));
                            }
                          } catch (err: any) {
                            toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("offer-mobile-upload")?.click()}
                    >
                      আপলোড
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">বাটন টেক্সট</label>
                  <Input
                    value={offerBanner.button_text}
                    onChange={(e) => setOfferBanner((o: any) => ({ ...o, button_text: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">বাটন URL</label>
                  <Input
                    value={offerBanner.button_url}
                    onChange={(e) => setOfferBanner((o: any) => ({ ...o, button_url: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">অফার শেষ হওয়ার সময় (End Date)</label>
                  <Input
                    type="datetime-local"
                    value={offerBanner.end_date ? offerBanner.end_date.substring(0, 16) : ""}
                    onChange={(e) => setOfferBanner((o: any) => ({ ...o, end_date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-3 mt-8">
                  <Switch
                    checked={offerBanner.show_countdown}
                    onCheckedChange={(v) => setOfferBanner((o: any) => ({ ...o, show_countdown: v }))}
                  />
                  <label className="text-sm font-medium">কাউন্টডাউন টাইমার দেখান</label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STATISTICS TAB ── */}
        <TabsContent value="stats" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-accent" />
                পরিসংখ্যান সেকশন কনফিগারেশন
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Top Controls: Mode & Bengali Digits */}
              <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-2xl border border-border/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className="font-semibold text-sm">ডেটা গণনা মোড (Mode)</label>
                    <p className="text-xs text-muted-foreground">অটোমেটিক নাকি ম্যানুয়াল সংখ্যা ব্যবহার করবেন</p>
                  </div>
                  <div className="flex gap-2">
                    {(["auto", "manual"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setStatistics((s) => ({ ...s, mode: m }))}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${statistics.mode === m ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      >
                        {m === "auto" ? "অটো" : "ম্যানুয়াল"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-l border-border/40 pl-0 sm:pl-6">
                  <div className="space-y-0.5">
                    <label className="font-semibold text-sm">বাংলা সংখ্যা প্রদর্শন</label>
                    <p className="text-xs text-muted-foreground">কাউন্টার সংখ্যা বাংলায় দেখাবে কিনা</p>
                  </div>
                  <Switch
                    checked={statistics.use_bengali_digits !== false}
                    onCheckedChange={(v) => setStatistics((s) => ({ ...s, use_bengali_digits: v }))}
                  />
                </div>
              </div>

              {/* Stats Config Fields */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold border-b pb-2">চারটি কাউন্টার ফিল্ড কনফিগার করুন</h3>
                
                {[
                  { key: "customers", defaultLabel: "সন্তুষ্ট গ্রাহক", defaultIcon: "👥" },
                  { key: "orders", defaultLabel: "ডেলিভারি সম্পন্ন", defaultIcon: "📦" },
                  { key: "reviews", defaultLabel: "গ্রাহক রিভিউ", defaultIcon: "⭐" },
                  { key: "products", defaultLabel: "প্রিমিয়াম পণ্য", defaultIcon: "🎨" },
                ].map(({ key, defaultLabel, defaultIcon }) => {
                  const currentLabel = statistics.labels?.[key] || defaultLabel;
                  const currentSuffix = statistics.suffixes?.[key] || "+";
                  const currentIcon = statistics.icons?.[key] || defaultIcon;

                  return (
                    <div key={key} className="p-4 border rounded-2xl bg-card/50 space-y-4 shadow-sm hover:border-accent/20 transition-all duration-300">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm font-bold text-accent flex items-center gap-1.5">
                          <span className="text-lg">{currentIcon}</span>
                          {currentLabel}
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{key}</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">কাস্টম লেবেল (Label)</label>
                          <Input
                            value={currentLabel}
                            onChange={(e) => {
                              const labels = { ...statistics.labels, [key]: e.target.value };
                              setStatistics((s) => ({ ...s, labels }));
                            }}
                            className="mt-1 h-8.5 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">সাফিক্স (Suffix)</label>
                          <Input
                            value={currentSuffix}
                            onChange={(e) => {
                              const suffixes = { ...statistics.suffixes, [key]: e.target.value };
                              setStatistics((s) => ({ ...s, suffixes }));
                            }}
                            className="mt-1 h-8.5 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">আইকন ইমোজি</label>
                          <Input
                            value={currentIcon}
                            onChange={(e) => {
                              const icons = { ...statistics.icons, [key]: e.target.value };
                              setStatistics((s) => ({ ...s, icons }));
                            }}
                            className="mt-1 h-8.5 text-xs text-center"
                          />
                        </div>
                        
                        {statistics.mode === "manual" && (
                          <div className="sm:col-span-4 mt-1 border-t pt-3">
                            <label className="text-xs font-bold text-muted-foreground">ম্যানুয়াল সংখ্যা (Value)</label>
                            <Input
                              type="number"
                              value={(statistics as any)[key] || 0}
                              onChange={(e) => setStatistics((s) => ({ ...s, [key]: Number(e.target.value) }))}
                              className="mt-1 h-8.5 text-xs font-semibold"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {statistics.mode === "auto" && (
                <div className="rounded-xl bg-accent/5 border border-accent/15 p-4 text-xs text-muted-foreground">
                  <p>💡 <strong>অটো মোড সক্রিয়:</strong> কাউন্টারের সংখ্যাগুলো সরাসরি ডেটাবেজের রিয়েল-টাইম রেকর্ড (যেমন: মোট কাস্টমার, সফল অর্ডার, মোট প্রোডাক্ট ও কাস্টমার রিভিউ) থেকে অটোমেটিকালি হিসাব করে দেখানো হবে।</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trust" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">ট্রাস্ট ফিচার আইটেম</h2>
              <p className="text-xs text-muted-foreground mt-0.5">"কেন রাঙাও বেছে নেবেন" সেকশনের আইটেম</p>
            </div>
            <Button size="sm" variant="outline" onClick={addTrustItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> আইটেম যোগ করুন
            </Button>
          </div>

          {trustItems.map((item, i) => (
            <Card key={item.id}>
              <CardContent className="pt-5 pb-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">আইকন</label>
                    <Select value={item.icon} onValueChange={(v) => updateTrustItem(i, { icon: v })}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">শিরোনাম</label>
                    <Input value={item.title} onChange={(e) => updateTrustItem(i, { title: e.target.value })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground">বিবরণ</label>
                      <Input value={item.desc} onChange={(e) => updateTrustItem(i, { desc: e.target.value })} className="mt-1 h-8 text-sm" />
                    </div>
                    <button
                      onClick={() => removeTrustItem(i)}
                      className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {trustItems.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border/40 py-12 text-center text-sm text-muted-foreground">
              কোনো আইটেম নেই। উপরে "আইটেম যোগ করুন" ক্লিক করুন।
            </div>
          )}
        </TabsContent>

        {/* ── NEWSLETTER TAB ── */}
        <TabsContent value="newsletter" className="mt-6 space-y-6">
          {/* Main Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                ইসলামিক বাণী / উক্তি সেকশন ডিজাইন সেটিংস
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">ডিজাইন থিম (Theme Style)</label>
                  <Select
                    value={newsletter.theme_style || "dark"}
                    onValueChange={(v) => setNewsletter((n: any) => ({ ...n, theme_style: v as any }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="থিম সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">ডার্ক গ্রিন নাইট (Mystic Green)</SelectItem>
                      <SelectItem value="classic">ক্লাসিক এমারেল্ড (Classic Emerald)</SelectItem>
                      <SelectItem value="gold">লাক্সারি গোল্ড (Luxury Gold)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between border rounded-xl p-3 bg-muted/10">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">শুধুমাত্র আপনার কাস্টম উক্তিগুলো দেখান</label>
                    <p className="text-xs text-muted-foreground">ডিফল্ট উক্তিগুলো হাইড করুন</p>
                  </div>
                  <Switch
                    checked={!!newsletter.show_only_custom}
                    onCheckedChange={(checked) => setNewsletter((n: any) => ({ ...n, show_only_custom: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotes List Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">উক্তি ও বাণী সমূহের তালিকা (Custom Quotes)</h2>
                <p className="text-xs text-muted-foreground mt-0.5">হোমপেজে স্লাইডার আকারে দেখানোর জন্য একাধিক উক্তি যুক্ত করুন</p>
              </div>
              <Button size="sm" variant="outline" onClick={addCustomQuote} className="border-accent text-accent hover:bg-accent/10">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> উক্তি যোগ করুন
              </Button>
            </div>

            <div className="grid gap-4">
              {(newsletter.quotes_list || []).map((q: any, i: number) => (
                <Card key={q.id || i} className="relative overflow-hidden border border-border/60 hover:border-accent/30 transition-all duration-300">
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-semibold text-accent uppercase tracking-wider">উক্তি #{i + 1}</span>
                      <button
                        onClick={() => removeCustomQuote(i)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="উক্তি মুছুন"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">আরবি টেক্সট (Arabic Script)</label>
                        <Input
                          value={q.arabic || ""}
                          onChange={(e) => updateCustomQuote(i, { arabic: e.target.value })}
                          className="font-arabic"
                          placeholder="যেমন: إِنَّ مَعَ الْعُסْرِ يُסْرًا"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">উৎস / রেফারেন্স (Source/Reference)</label>
                        <Input
                          value={q.source || ""}
                          onChange={(e) => updateCustomQuote(i, { source: e.target.value })}
                          placeholder="যেমন: সূরা আশ-শারহ্ (৯৪:৬)"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">বাংলা অর্থ (Bengali Translation)</label>
                      <Textarea
                        value={q.bengali || ""}
                        onChange={(e) => updateCustomQuote(i, { bengali: e.target.value })}
                        rows={2}
                        placeholder="নিশ্চয়ই কষ্টের সাথেই স্বস্তি রয়েছে।"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(newsletter.quotes_list || []).length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border/40 py-12 text-center text-sm text-muted-foreground">
                  কোনো কাস্টম উক্তি যোগ করা নেই। ডানদিকের "উক্তি যোগ করুন" বাটনে ক্লিক করুন।
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── GALLERY TAB ── */}
        <TabsContent value="gallery" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">ডেকর ইন্সপিরেশন গ্যালারি</h2>
              <p className="text-xs text-muted-foreground mt-0.5">গ্রাহকদের ঘর সাজানোর ছবির গ্যালারি কাস্টমাইজ করুন</p>
            </div>
            <Button size="sm" variant="outline" onClick={addGalleryItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> আইটেম যোগ করুন
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homepageGallery.map((item, i) => (
              <Card key={item.id} className="overflow-hidden flex flex-col justify-between">
                <CardContent className="pt-5 space-y-3 flex-1">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden border bg-muted flex items-center justify-center group">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="relative">
                        <Button size="sm" variant="secondary" className="rounded-xl">আপলোড করুন</Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleGalleryUpload(e, i)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">শিরোনাম</label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateGalleryItem(i, { title: e.target.value })}
                      className="mt-1 h-8 text-sm"
                      placeholder="লিভিং রুম ডেকোর"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">লিংক (URL)</label>
                    <Input
                      value={item.link}
                      onChange={(e) => updateGalleryItem(i, { link: e.target.value })}
                      className="mt-1 h-8 text-sm font-mono"
                      placeholder="/products"
                    />
                  </div>
                </CardContent>

                <div className="border-t bg-muted/20 px-4 py-2.5 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                    onClick={() => removeGalleryItem(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> ডিলিট
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {homepageGallery.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border/40 py-12 text-center text-sm text-muted-foreground">
              কোনো গ্যালারি আইটেম নেই। উপরে "আইটেম যোগ করুন" ক্লিক করুন।
            </div>
          )}
        </TabsContent>


        {/* ── ANNOUNCEMENT TAB ── */}
        <TabsContent value="announcement" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-accent" />
                অ্যানাউন্সমেন্ট বার সেটিংস
              </CardTitle>
              <p className="text-sm text-muted-foreground">ওয়েবসাইটের সবার উপরে প্রদর্শিত অ্যানাউন্সমেন্ট বা অফার বার কাস্টমাইজ করুন।</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-primary/5 border-primary/10">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">অ্যানাউন্সমেন্ট বার প্রদর্শন করুন</p>
                  <p className="text-xs text-muted-foreground">অন করলে ওয়েবসাইটের সবার উপরে অফার বা তথ্য সম্বলিত বারটি দেখা যাবে</p>
                </div>
                <Switch 
                  checked={announcement.enabled !== false} 
                  onCheckedChange={v => setAnnouncement(p => ({ ...p, enabled: v }))} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">অ্যানাউন্সমেন্ট টেক্সট (বাংলা বা ইংরেজি)</label>
                <Input 
                  value={announcement.text || ""} 
                  onChange={e => setAnnouncement(p => ({ ...p, text: e.target.value }))} 
                  placeholder="যেমন: সারা বাংলাদেশে ক্যাশ অন ডেলিভারি এবং ৭ দিনের সহজ রিপ্লেসমেন্ট পলিসি!"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ব্যাকগ্রাউন্ড কালার (Background Color)</label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      type="color" 
                      value={announcement.bg_color || "#102a20"} 
                      onChange={e => setAnnouncement(p => ({ ...p, bg_color: e.target.value }))}
                      className="h-10 w-12 p-0 border-0 rounded-lg cursor-pointer"
                    />
                    <Input 
                      type="text" 
                      value={announcement.bg_color || "#102a20"} 
                      onChange={e => setAnnouncement(p => ({ ...p, bg_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">টেক্সট কালার (Text Color)</label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      type="color" 
                      value={announcement.text_color || "#ffffff"} 
                      onChange={e => setAnnouncement(p => ({ ...p, text_color: e.target.value }))}
                      className="h-10 w-12 p-0 border-0 rounded-lg cursor-pointer"
                    />
                    <Input 
                      type="text" 
                      value={announcement.text_color || "#ffffff"} 
                      onChange={e => setAnnouncement(p => ({ ...p, text_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ক্লিক অ্যাকশন লিংক (Link URL - ঐচ্ছিক)</label>
                <Input 
                  value={announcement.link_url || ""} 
                  onChange={e => setAnnouncement(p => ({ ...p, link_url: e.target.value }))} 
                  placeholder="যেমন: /products অথবা অফার লিঙ্কের সম্পূর্ণ URL"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
