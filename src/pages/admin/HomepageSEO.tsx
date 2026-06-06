import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Save, Globe, Search, Share2 } from "lucide-react";

export default function AdminHomepageSEO() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useStoreSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(settings?.homepageSEO || {
    meta_title: "Rangao – রাঙাও | প্রিমিয়াম ইসলামিক ও হোম ডেকোর",
    meta_description: "রাঙাও – বাংলাদেশের প্রিমিয়াম ইসলামিক ক্যালিগ্রাফি, ওয়াল আর্ট ও হোম ডেকোর স্টোর।",
    meta_keywords: "ইসলামিক ডেকোর, ওয়াল আর্ট, নিকাহনামা, আয়াতুল কুরসি",
    og_image: "",
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("store_settings")
        .upsert({ key: "homepage_seo", value: form }, { onConflict: "key" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["store-settings-all"] });
      toast({ title: "SEO সেটিংস সেভ হয়েছে" });
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">হোমপেজ SEO</h1>
          <p className="text-sm text-muted-foreground mt-1">সার্চ ইঞ্জিন ও সোশ্যাল মিডিয়া মেটা ট্যাগ কাস্টমাইজ করুন</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Basic SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4 text-accent" />
                সার্চ ইঞ্জিন অপটিমাইজেশন
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Meta Title</label>
                <Input
                  value={form.meta_title}
                  onChange={(e) => set("meta_title", e.target.value)}
                  placeholder="পেজ টাইটেল (৬০ ক্যারেক্টার পর্যন্ত)"
                  maxLength={70}
                />
                <p className="mt-1 text-xs text-muted-foreground">{form.meta_title.length}/70 ক্যারেক্টার</p>
              </div>
              <div>
                <label className="text-sm font-medium">Meta Description</label>
                <Textarea
                  value={form.meta_description}
                  onChange={(e) => set("meta_description", e.target.value)}
                  placeholder="পেজ ডেস্ক্রিপশন (১৬০ ক্যারেক্টার পর্যন্ত)"
                  maxLength={180}
                  rows={3}
                />
                <p className="mt-1 text-xs text-muted-foreground">{form.meta_description.length}/160 ক্যারেক্টার</p>
              </div>
              <div>
                <label className="text-sm font-medium">Meta Keywords</label>
                <Input
                  value={form.meta_keywords}
                  onChange={(e) => set("meta_keywords", e.target.value)}
                  placeholder="কীওয়ার্ড, কমা দিয়ে আলাদা করুন"
                />
              </div>
            </CardContent>
          </Card>

          {/* OG / Social */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Share2 className="h-4 w-4 text-accent" />
                Open Graph (Social Media)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">OG Image URL</label>
                <Input
                  value={form.og_image}
                  onChange={(e) => set("og_image", e.target.value)}
                  placeholder="https://... (1200x630px প্রস্তাবিত)"
                />
                {form.og_image && (
                  <div className="mt-2 overflow-hidden rounded-xl border">
                    <img src={form.og_image} alt="OG Preview" className="w-full object-cover" style={{ maxHeight: 200 }} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-accent" />
                Google প্রিভিউ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-white p-5 shadow-sm border font-sans dark:bg-zinc-950 dark:border-zinc-800">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">https://rangao.com.bd</p>
                <p className="text-lg font-medium text-blue-700 dark:text-blue-400 leading-tight hover:underline cursor-pointer line-clamp-1">
                  {form.meta_title || "পেজ টাইটেল"}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-snug line-clamp-2">
                  {form.meta_description || "পেজ ডেস্ক্রিপশন এখানে দেখা যাবে।"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Share2 className="h-4 w-4 text-accent" />
                Facebook / WhatsApp প্রিভিউ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden bg-white dark:bg-zinc-950 dark:border-zinc-800">
                {form.og_image ? (
                  <img src={form.og_image} alt="OG" className="w-full object-cover" style={{ maxHeight: 200 }} />
                ) : (
                  <div className="h-40 bg-secondary flex items-center justify-center text-muted-foreground text-sm">
                    OG Image এখানে দেখা যাবে
                  </div>
                )}
                <div className="p-4 border-t dark:border-zinc-800">
                  <p className="text-xs uppercase text-muted-foreground">rangao.com.bd</p>
                  <p className="font-semibold text-sm mt-1 line-clamp-1">{form.meta_title || "পেজ টাইটেল"}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{form.meta_description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
