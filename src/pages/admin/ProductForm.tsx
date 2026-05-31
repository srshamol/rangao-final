import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Upload, Image as ImageIcon, GripVertical, Star, Trash2, Save, Eye, Loader2 } from "lucide-react";

interface SpecItem {
  label: string;
  value: string;
}

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    brand: "",
    regular_price: 0,
    sale_price: null as number | null,
    cost_price: null as number | null,
    stock_quantity: 0,
    low_stock_alert: 5,
    description: "",
    status: "active" as string,
    featured: false,
    tags: [] as string[],
    images: [] as string[],
  });
  const [specs, setSpecs] = useState<SpecItem[]>([{ label: "", value: "" }]);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      if (!isEdit) return null;
      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        sku: existing.sku || "",
        category: existing.category || "",
        brand: existing.brand || "",
        regular_price: Number(existing.regular_price),
        sale_price: existing.sale_price ? Number(existing.sale_price) : null,
        cost_price: existing.cost_price ? Number(existing.cost_price) : null,
        stock_quantity: existing.stock_quantity,
        low_stock_alert: existing.low_stock_alert || 5,
        description: existing.description || "",
        status: existing.status || "active",
        featured: existing.featured || false,
        tags: existing.tags || [],
        images: existing.images || [],
      });
      setSpecs(
        Array.isArray(existing.specifications) && existing.specifications.length > 0
          ? (existing.specifications as unknown as SpecItem[])
          : [{ label: "", value: "" }]
      );
    }
  }, [existing]);

  const ensureBucket = async () => {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.id === "product-images")) {
      await supabase.storage.createBucket("product-images", { public: true });
    }
  };

  const uploadImages = async (files: FileList | File[]) => {
    setUploading(true);
    try {
      await ensureBucket();
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: "ত্রুটি", description: `${file.name} ৫MB এর বেশি`, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) {
          toast({ title: "আপলোড ত্রুটি", description: error.message, variant: "destructive" });
          continue;
        }
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      if (urls.length > 0) {
        setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
        toast({ title: "সফল", description: `${urls.length}টি ছবি আপলোড হয়েছে` });
      }
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadImages(e.dataTransfer.files);
  };

  const setPrimaryImage = (index: number) => {
    setForm((f) => {
      const imgs = [...f.images];
      const [moved] = imgs.splice(index, 1);
      imgs.unshift(moved);
      return { ...f, images: imgs };
    });
  };

  const removeImage = (index: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    setForm((f) => {
      const imgs = [...f.images];
      const newIdx = index + dir;
      if (newIdx < 0 || newIdx >= imgs.length) return f;
      [imgs[index], imgs[newIdx]] = [imgs[newIdx], imgs[index]];
      return { ...f, images: imgs };
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        specifications: specs.filter((s) => s.label && s.value) as any,
      };
      if (isEdit) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "সফল", description: isEdit ? "প্রোডাক্ট আপডেট হয়েছে" : "প্রোডাক্ট তৈরি হয়েছে" });
      navigate("/admin/products");
    },
    onError: (e: any) => {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    },
  });

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm((f) => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const discount = form.sale_price && form.regular_price > 0
    ? Math.round(((form.regular_price - form.sale_price) / form.regular_price) * 100)
    : 0;

  const savingsAmount = form.sale_price ? form.regular_price - form.sale_price : 0;

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "প্রোডাক্ট এডিট করুন" : "নতুন প্রোডাক্ট যোগ করুন"}</h1>
            {isEdit && existing && (
              <p className="text-sm text-muted-foreground">SKU: {existing.sku}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/products")}>
            বাতিল
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
            {mutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> সেভ হচ্ছে...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> {isEdit ? "আপডেট করুন" : "প্রোডাক্ট সংরক্ষণ করুন"}</>
            )}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 প্রোডাক্টের মৌলিক তথ্য</CardTitle>
          <CardDescription>প্রোডাক্টের নাম, SKU এবং মৌলিক তথ্য দিন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">প্রোডাক্ট নাম *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="যেমন: Samsung S24 Ultra 5G"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">SKU (স্টক কিপিং ইউনিট)</label>
              <Input
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="SS24-256-BLK"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">ইউনিক আইডি, ইনভেন্টরি ট্র্যাকিংয়ের জন্য</p>
            </div>
            <div>
              <label className="text-sm font-medium">ব্র্যান্ড</label>
              <Input
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="Samsung"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💰 মূল্য ও ডিসকাউন্ট</CardTitle>
          <CardDescription>প্রোডাক্টের মূল্য, ডিসকাউন্ট এবং কস্ট প্রাইস সেট করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">নিয়মিত মূল্য (৳) *</label>
              <Input
                type="number"
                value={form.regular_price || ""}
                onChange={(e) => setForm((f) => ({ ...f, regular_price: Number(e.target.value) }))}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">বিক্রয় মূল্য (৳)</label>
              <Input
                type="number"
                value={form.sale_price ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value ? Number(e.target.value) : null }))}
                className="mt-1"
                placeholder="ডিসকাউন্ট মূল্য"
              />
            </div>
            <div>
              <label className="text-sm font-medium">কস্ট প্রাইস (৳)</label>
              <Input
                type="number"
                value={form.cost_price ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value ? Number(e.target.value) : null }))}
                className="mt-1"
                placeholder="ক্রয়মূল্য"
              />
            </div>
          </div>
          {discount > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="destructive">{discount}% ছাড়</Badge>
                <span className="text-muted-foreground">
                  সেভিংস: <strong className="text-foreground">৳{savingsAmount.toLocaleString()}</strong>
                </span>
                {form.cost_price && form.sale_price && (
                  <span className="text-muted-foreground">
                    প্রফিট: <strong className="text-foreground">৳{(form.sale_price - form.cost_price).toLocaleString()}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🖼️ প্রোডাক্টের ছবি আপলোড</CardTitle>
          <CardDescription>সর্বোচ্চ ২০টি ছবি আপলোড করুন (JPG, PNG, WEBP | সর্বোচ্চ ৫MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadImages(e.target.files)}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">আপলোড হচ্ছে...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">ড্র্যাগ ও ড্রপ করুন অথবা ক্লিক করুন</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP | সর্বোচ্চ ৫MB প্রতি ছবি</p>
              </div>
            )}
          </div>

          {form.images.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">আপলোড করা ছবি ({form.images.length}টি):</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {form.images.map((img, i) => (
                  <div
                    key={i}
                    className={`relative group rounded-lg border-2 overflow-hidden ${
                      i === 0 ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    <img src={img} className="w-full aspect-square object-cover" alt={`Product ${i + 1}`} />
                    {i === 0 && (
                      <div className="absolute top-1 left-1">
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-primary">
                          <Star className="h-2.5 w-2.5 mr-0.5" /> প্রধান
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {i !== 0 && (
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setPrimaryImage(i)}>
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {i > 0 && (
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(i, -1)}>
                          ◀
                        </Button>
                      )}
                      {i < form.images.length - 1 && (
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(i, 1)}>
                          ▶
                        </Button>
                      )}
                      <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => removeImage(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📦 ইনভেন্টরি ও স্টক</CardTitle>
          <CardDescription>স্টক পরিমাণ ও অ্যালার্ট সেটিংস</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">স্টক পরিমাণ (পিস)</label>
              <Input
                type="number"
                value={form.stock_quantity}
                onChange={(e) => setForm((f) => ({ ...f, stock_quantity: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">লো স্টক অ্যালার্ট</label>
              <Input
                type="number"
                value={form.low_stock_alert}
                onChange={(e) => setForm((f) => ({ ...f, low_stock_alert: Number(e.target.value) }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">এই সংখ্যার নিচে নামলে সতর্কতা দেখাবে</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category & Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏷️ ক্যাটাগরি ও ট্যাগ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">ক্যাটাগরি</label>
              {categories && categories.length > 0 ? (
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="ক্যাটাগরি লিখুন"
                  className="mt-1"
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">ট্যাগ</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="ট্যাগ লিখে Enter চাপুন"
              />
              <Button variant="outline" onClick={addTag}>যোগ</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {["হট", "নতুন", "বেস্টসেলার", "সেল", "লিমিটেড", "প্রি-অর্ডার"].map((preset) => (
                <Badge
                  key={preset}
                  variant={form.tags.includes(preset) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      tags: f.tags.includes(preset)
                        ? f.tags.filter((t) => t !== preset)
                        : [...f.tags, preset],
                    }));
                  }}
                >
                  {preset}
                </Badge>
              ))}
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}>
                    {t} <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📄 প্রোডাক্টের বিবরণ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">পূর্ণাঙ্গ বিবরণ</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={6}
              placeholder="প্রোডাক্টের বিস্তারিত বিবরণ লিখুন..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⚙️ স্পেসিফিকেশন</CardTitle>
          <CardDescription>প্রোডাক্টের প্রযুক্তিগত তথ্য</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="লেবেল (যেমন: RAM)"
                value={s.label}
                onChange={(e) => { const n = [...specs]; n[i].label = e.target.value; setSpecs(n); }}
              />
              <Input
                placeholder="মান (যেমন: 12GB)"
                value={s.value}
                onChange={(e) => { const n = [...specs]; n[i].value = e.target.value; setSpecs(n); }}
              />
              <Button variant="ghost" size="icon" onClick={() => setSpecs(specs.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setSpecs([...specs, { label: "", value: "" }])}>
            <Plus className="mr-1 h-4 w-4" /> স্পেক যোগ করুন
          </Button>
        </CardContent>
      </Card>

      {/* Status & Featured */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔧 প্রোডাক্ট স্ট্যাটাস</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div>
              <label className="text-sm font-medium">স্ট্যাটাস</label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">🟢 সক্রিয় (পাবলিশ)</SelectItem>
                  <SelectItem value="inactive">🔴 নিষ্ক্রিয়</SelectItem>
                  <SelectItem value="draft">📝 ড্রাফট</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
              <label className="text-sm font-medium">ফিচার্ড প্রোডাক্ট</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between sticky bottom-0 bg-background border-t p-4 -mx-4 rounded-t-lg shadow-lg">
        <Button variant="outline" onClick={() => navigate("/admin/products")}>
          বাতিল
        </Button>
        <Button
          size="lg"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.name}
        >
          {mutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> সেভ হচ্ছে...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> {isEdit ? "আপডেট করুন" : "প্রোডাক্ট সংরক্ষণ করুন"}</>
          )}
        </Button>
      </div>
    </div>
  );
}
