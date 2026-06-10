import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Globe, Search, Share2, Loader2 } from "lucide-react";
import type { SEOSettings } from "@/hooks/useStoreSettings";

export default function AdminHomepageSEO() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useStoreSettings();
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<SEOSettings>({
    site_title: "Rangao – রাঙাও",
    site_description: "রাঙাও – বাংলাদেশের প্রিমিয়াম ইসলামিক ক্যালিগ্রাফি, ওয়াল আর্ট ও হোম ডেকোর স্টোর।",
    title_format: "{title} | {siteName}",
    default_keywords: "ইসলামিক ডেকোর, ওয়াল আর্ট, নিকাহনামা, আয়াতুল কুরসি",
    robots_index: true,
    robots_follow: true,
    google_search_console_id: "",
    og_image: "",
  });

  // Sync form states when store settings are loaded
  useEffect(() => {
    if (settings?.seoSettings) {
      setForm(settings.seoSettings);
    }
  }, [settings]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const saveSeoSettings = async () => {
    setSaving(true);
    try {
      // Save consolidated config under "seo_settings"
      const { error: errGlobal } = await (supabase as any)
        .from("store_settings")
        .upsert({ key: "seo_settings", value: form }, { onConflict: "key" });
      if (errGlobal) throw errGlobal;

      // Also update "homepage_seo" (mapping the fields) for backward compatibility
      const legacyHomepageSeo = {
        meta_title: form.site_title,
        meta_description: form.site_description,
        meta_keywords: form.default_keywords,
        og_image: form.og_image || "",
      };
      await (supabase as any)
        .from("store_settings")
        .upsert({ key: "homepage_seo", value: legacyHomepageSeo }, { onConflict: "key" });

      qc.invalidateQueries({ queryKey: ["store-settings-all"] });
      toast({ title: "সার্চ ইঞ্জিন অপ্টিমাইজেশন (SEO) সেটিংস সফলভাবে সেভ হয়েছে" });
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🔍 সার্চ ইঞ্জিন অপ্টিমাইজেশন (SEO) সেটিংস</h1>
          <p className="text-sm text-muted-foreground mt-1">
            সাইট-ওয়াইড গ্লোবাল SEO এবং সার্চ ইঞ্জিন/সোশ্যাল মিডিয়া প্রিভিউ কনফিগার করুন
          </p>
        </div>
        <Button onClick={saveSeoSettings} disabled={saving} className="gap-1.5 shadow-premium-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "সেভ হচ্ছে..." : "সেটিংস সেভ করুন"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Form Controls */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-premium-sm">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Globe className="h-4.5 w-4.5 text-accent" /> সার্চ ইঞ্জিন কাস্টমাইজেশন
              </CardTitle>
              <CardDescription>আপনার ওয়েবসাইটের গুগল র‍্যাংকিং, টাইটেল, ডেসক্রিপশন এবং ইন্ডেক্সিং সেটিংস</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">ওয়েবসাইট টাইটেল (Site Title)</Label>
                  <Input 
                    value={form.site_title || ""} 
                    onChange={e => set("site_title", e.target.value)} 
                    placeholder="রাঙাও – রাঙাও" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">টাইটেল ফরম্যাট (Title Format)</Label>
                  <Input 
                    value={form.title_format || ""} 
                    onChange={e => set("title_format", e.target.value)} 
                    placeholder="যেমন: {title} | {siteName}" 
                  />
                  <p className="text-[10px] text-muted-foreground">প্রতিটি পেজের টাইটেল এবং স্টোর নামের লেআউট।</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">মেটা বিবরণ (Site Description)</Label>
                <Textarea 
                  value={form.site_description || ""} 
                  onChange={e => set("site_description", e.target.value)} 
                  placeholder="রাঙাও – বাংলাদেশের প্রিমিয়াম ইসলামিক ক্যালিগ্রাফি ওয়াল আর্ট ও হোম ডেকোর স্টোর।" 
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">কীওয়ার্ডস (Site Keywords)</Label>
                <Input 
                  value={form.default_keywords || ""} 
                  onChange={e => set("default_keywords", e.target.value)} 
                  placeholder="ইসলামিক ডেকোর, ওয়াল আর্ট, নিকাহনামা, আয়াতুল কুরসি" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">গুগল সার্চ কনসোল ভেরিফিকেশন আইডি (Google Search Console ID)</Label>
                <Input 
                  value={form.google_search_console_id || ""} 
                  onChange={e => set("google_search_console_id", e.target.value)} 
                  placeholder="যেমন: google-site-verification=abc123xyz" 
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs">Search Index</Label>
                    <p className="text-[10px] text-muted-foreground">সার্চ ইঞ্জিনে প্রদর্শন করুন</p>
                  </div>
                  <Switch 
                    checked={!!form.robots_index} 
                    onCheckedChange={v => set("robots_index", v)} 
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs">Follow Links</Label>
                    <p className="text-[10px] text-muted-foreground">লিংক অনুসরণ করুন</p>
                  </div>
                  <Switch 
                    checked={!!form.robots_follow} 
                    onCheckedChange={v => set("robots_follow", v)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social settings */}
          <Card className="border border-border/80 shadow-premium-sm">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Share2 className="h-4.5 w-4.5 text-accent" /> Open Graph (সোশ্যাল প্রিভিউ)
              </CardTitle>
              <CardDescription>সোশ্যাল মিডিয়ায় শেয়ার করার প্রিভিউ ইমেজ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">OG Image URL</Label>
                <Input
                  value={form.og_image || ""}
                  onChange={(e) => set("og_image", e.target.value)}
                  placeholder="https://... (1200x630px)"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Previews */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-premium-sm">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Globe className="h-4 w-4 text-accent" /> Google প্রিভিউ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-xl bg-white p-5 shadow-sm border font-sans dark:bg-zinc-950 dark:border-zinc-800">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">https://www.rangao.bd</p>
                <p className="text-lg font-medium text-blue-700 dark:text-blue-400 leading-tight hover:underline cursor-pointer line-clamp-1">
                  {form.site_title || "পেজ টাইটেল"}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-snug line-clamp-2">
                  {form.site_description || "পেজ ডেস্ক্রিপশন এখানে দেখা যাবে।"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-premium-sm">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Share2 className="h-4 w-4 text-accent" /> Facebook / WhatsApp প্রিভিউ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-xl border overflow-hidden bg-white dark:bg-zinc-950 dark:border-zinc-800">
                {form.og_image ? (
                  <img src={form.og_image} alt="OG" className="w-full object-cover" style={{ maxHeight: 200 }} />
                ) : (
                  <div className="h-40 bg-secondary flex items-center justify-center text-muted-foreground text-sm">
                    OG Image এখানে দেখা যাবে
                  </div>
                )}
                <div className="p-4 border-t dark:border-zinc-800">
                  <p className="text-xs uppercase text-muted-foreground">rangao.bd</p>
                  <p className="font-semibold text-sm mt-1 line-clamp-1">{form.site_title || "পেজ টাইটেল"}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{form.site_description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
