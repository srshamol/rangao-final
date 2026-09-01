import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Plus, X, Upload, Image as ImageIcon, GripVertical, Star, Trash2, 
  Save, Eye, Loader2, Bold, Highlighter, Link, List, ListOrdered, Palette, Truck, CheckCircle
} from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import ProductVariationsSection from "@/components/admin/ProductVariationsSection";
import ProductPairsWellWithSection from "@/components/admin/ProductPairsWellWithSection";
import { type VariationOption, type ProductVariant } from "@/types/productVariations";

import { mediaService } from "@/lib/mediaService";

function slugify(text: string): string {
  if (!text) return "";
  
  const textStr = text.toString().toLowerCase().trim();
  
  // Transliteration map for Bengali category slugs/names to English
  const transliteMap: Record<string, string> = {
    "উডেন-ডেকোর-আইটেম": "wooden-decor",
    "উডেন ডেকোর আইটেম": "wooden-decor",
    "উডেন-ডেকোর": "wooden-decor",
    "এক্রেলিক-ডেকোর-আইটেম": "acrylic-decor",
    "এক্রেলিক ডেকোর আইটেম": "acrylic-decor",
    "এক্রেলিক-ডেকোর": "acrylic-decor",
    "3d-বর্ডার-ওয়াল-ক্যানভাস": "3d-border-wall-canvas",
    "3d বর্ডার ওয়াল ক্যানভাস": "3d-border-wall-canvas",
    "দোয়া-স্টিকার": "dua-stickers",
    "দোয়া স্টিকার": "dua-stickers",
    "ডেকোরেটিভ-লাইটস": "decorative-lights",
    "ডেকোরেটিভ লাইটস": "decorative-lights",
    "ইসলামিক-এক্সাসরিজ": "islamic-accessories",
    "ইসলামিক এক্সাসরিজ": "islamic-accessories",
    "গ্লাস-ফ্রেম": "glass-frames",
    "গ্লাস ফ্রেম": "glass-frames",
  };

  const key = textStr.replace(/\s+/g, "-");
  if (transliteMap[key]) {
    return transliteMap[key];
  }

  return textStr
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^a-z0-9-]/g, "") // Keep only English alphanumeric and hyphens
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Trim hyphens from start
    .replace(/-+$/, ""); // Trim hyphens from end
}

const FormattingToolbar = ({ 
  onInsert 
}: { 
  onInsert: (type: "bold" | "highlight" | "link" | "ul" | "ol" | "color", value?: string) => void 
}) => {
  const [showColors, setShowColors] = useState(false);
  
  const colors = [
    { label: "লাল", value: "#EF4444", class: "bg-red-500" },
    { label: "সবুজ", value: "#10B981", class: "bg-emerald-500" },
    { label: "নীল", value: "#3B82F6", class: "bg-blue-500" },
    { label: "সোনালী", value: "#C5A85C", class: "bg-[#C5A85C]" },
    { label: "বেগুনি", value: "#8B5CF6", class: "bg-purple-500" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 bg-secondary/35 rounded-lg border mb-1.5 w-fit">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
        title="বোল্ড (Bold)"
        onClick={() => onInsert("bold")}
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
        title="হাইলাইট (Highlight)"
        onClick={() => onInsert("highlight")}
      >
        <Highlighter className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
        title="লিংক"
        onClick={() => onInsert("link")}
      >
        <Link className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
        title="বুলেট লিস্ট"
        onClick={() => onInsert("ul")}
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
        title="নম্বর লিস্ট"
        onClick={() => onInsert("ol")}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 rounded-md hover:text-foreground ${showColors ? "text-primary bg-secondary/80" : "text-muted-foreground"}`}
          title="রং"
          onClick={() => setShowColors(!showColors)}
        >
          <Palette className="h-4 w-4" />
        </Button>
        {showColors && (
          <div className="absolute left-0 top-9 z-[100] flex items-center gap-1.5 p-2 bg-popover text-popover-foreground rounded-lg border shadow-lg animate-in fade-in slide-in-from-top-1">
            {colors.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`h-5 w-5 rounded-full ${c.class} hover:scale-110 transition-transform active:scale-95 shrink-0`}
                title={c.label}
                onClick={() => {
                  onInsert("color", c.value);
                  setShowColors(false);
                }}
              />
            ))}
            <div className="h-4 w-[1px] bg-border mx-1 shrink-0" />
            <input
              type="color"
              className="h-5 w-5 p-0 bg-transparent border-0 cursor-pointer rounded-full shrink-0"
              title="কাস্টম কালার"
              onChange={(e) => {
                onInsert("color", e.target.value);
                setShowColors(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface SpecItem {
  label: string;
  value: string;
}

const DEFAULT_FAQS = [
  {
    question: "ডেলিভারি চার্জ কত এবং কত সময় লাগবে?",
    answer: "ঢাকা সিটির ভেতরে ডেলিভারি চার্জ ৬০ টাকা (১-২ দিন) এবং ঢাকা সিটির বাইরে ১৫০ টাকা (৩-৫ দিন)।"
  },
  {
    question: "প্রোডাক্ট কি ক্যাশ অন ডেলিভারি পাওয়া যাবে?",
    answer: "জি, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি (Cash on Delivery) সুবিধা রয়েছে। প্রোডাক্ট হাতে পেয়ে মূল্য পরিশোধ করতে পারবেন।"
  },
  {
    question: "অর্ডার কনফার্ম করার জন্য কি অগ্রিম পেমেন্ট করতে হবে?",
    answer: "না, কাস্টমাইজড প্রোডাক্ট ছাড়া সাধারণ প্রোডাক্ট অর্ডারের ক্ষেত্রে কোনো অগ্রিম পেমেন্ট করতে হবে না।"
  },
  {
    question: "প্রোডাক্টে কোনো সমস্যা থাকলে কি রিটার্ন করা যাবে?",
    answer: "জি, ডেলিভারি ম্যান থাকা অবস্থায় প্রোডাক্ট চেক করে দেখে নিতে পারবেন। কোনো ডিফেক্ট থাকলে সাথে সাথে রিটার্ন করতে পারবেন।"
  }
];

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== "new" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const shortDescriptionRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    type: "bold" | "highlight" | "link" | "ul" | "ol" | "color",
    colorValue?: string
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    switch (type) {
      case "bold":
        replacement = `**${selectedText || "bold text"}**`;
        break;
      case "highlight":
        replacement = `==${selectedText || "highlighted text"}==`;
        break;
      case "link":
        replacement = `[${selectedText || "Link text"}](https://example.com)`;
        break;
      case "ul":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line) => (line.trim().startsWith("-") ? line : `- ${line}`))
              .join("\n")
          : "- Item";
        break;
      case "ol":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line, idx) => (line.trim().match(/^\d+\./) ? line : `${idx + 1}. ${line}`))
              .join("\n")
          : "1. Item";
        break;
      case "color":
        replacement = `{color:${colorValue || "red"}}(${selectedText || "colored text"})`;
        break;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    
    if (textareaRef === descriptionRef) {
      setForm((f) => ({ ...f, description: newText }));
    } else {
      setForm((f) => ({ ...f, short_description: newText }));
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

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
    short_description: "",
    status: "active" as string,
    featured: false,
    is_free_delivery: false,
    tags: [] as string[],
    images: [] as string[],
  });
  const [specs, setSpecs] = useState<SpecItem[]>([{ label: "", value: "" }]);
  const [hasVariants, setHasVariants] = useState(false);
  const [variationOptions, setVariationOptions] = useState<VariationOption[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [pairedProductIds, setPairedProductIds] = useState<string[]>([]);

  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [seoForm, setSeoForm] = useState({
    title: "",
    description: "",
    canonical_url: "",
  });
  const [isUrlEdited, setIsUrlEdited] = useState(false);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>(
    isEdit ? [{ question: "", answer: "" }] : DEFAULT_FAQS
  );

  // Load SEO & FAQ settings and variation fallback settings
  useEffect(() => {
    const loadProductSettings = async () => {
      if (!isEdit || !id) return;
      
      // Load SEO
      const { data: seoData } = await supabase
        .from("store_settings" as any)
        .select("value")
        .eq("key", `product_seo_${id}`)
        .maybeSingle();
      if (seoData?.value) {
        const val = seoData.value as any;
        setSeoForm({
          title: val.seo_title || "",
          description: val.seo_description || "",
          canonical_url: val.canonical_url || "",
        });
        if (val.canonical_url) {
          setIsUrlEdited(true);
        }
        if (val.is_free_delivery !== undefined) {
          setForm((f) => ({ ...f, is_free_delivery: Boolean(val.is_free_delivery) }));
        }
        setFaqs(val.faqs && val.faqs.length > 0 ? val.faqs : [{ question: "", answer: "" }]);
      }

      // Load Variations fallback from store_settings if not in products table
      const { data: varData } = await supabase
        .from("store_settings" as any)
        .select("value")
        .eq("key", `product_variations_${id}`)
        .maybeSingle();
      if (varData?.value) {
        const val = varData.value as any;
        if (val.has_variants !== undefined) setHasVariants((prev) => prev || Boolean(val.has_variants));
        if (Array.isArray(val.variation_options) && val.variation_options.length > 0) {
          setVariationOptions((prev) => (prev.length > 0 ? prev : val.variation_options));
        }
        if (Array.isArray(val.variants) && val.variants.length > 0) {
          setVariants((prev) => (prev.length > 0 ? prev : val.variants));
        }
        if (Array.isArray(val.paired_product_ids) && val.paired_product_ids.length > 0) {
          setPairedProductIds((prev) => (prev.length > 0 ? prev : val.paired_product_ids));
        }
      }
    };
    loadProductSettings();
  }, [isEdit, id]);

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: existing, isLoading: isProductLoading, error: productError } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      if (!isEdit) return null;
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching product:", error);
        throw error;
      }
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      const isFreeDel = Boolean(
        (existing as any).is_free_delivery ||
        existing.tags?.includes("ফ্রি ডেলিভারি") ||
        existing.tags?.includes("free_delivery")
      );

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
        short_description: existing.short_description || "",
        status: existing.status || "active",
        featured: existing.featured || false,
        is_free_delivery: isFreeDel,
        tags: existing.tags || [],
        images: existing.images || [],
      });
      setSpecs(
        Array.isArray(existing.specifications) && existing.specifications.length > 0
          ? (existing.specifications as unknown as SpecItem[])
          : [{ label: "", value: "" }]
      );

      // Load variations & paired products from database row
      if ((existing as any).has_variants !== undefined) {
        if ((existing as any).has_variants || ((existing as any).variants?.length > 0)) {
          setHasVariants(true);
        }
      }
      if (Array.isArray((existing as any).variation_options) && (existing as any).variation_options.length > 0) {
        setVariationOptions((existing as any).variation_options);
      }
      if (Array.isArray((existing as any).variants) && (existing as any).variants.length > 0) {
        setVariants((existing as any).variants);
      }
      if (Array.isArray((existing as any).paired_product_ids) && (existing as any).paired_product_ids.length > 0) {
        setPairedProductIds((existing as any).paired_product_ids);
      }
    }
  }, [existing]);

  const uploadImages = async (files: FileList | File[]) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const mediaItem = await mediaService.upload(file, "images");
        urls.push(mediaItem.url);
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
      // Validate Variations if enabled
      if (hasVariants) {
        if (variants.length === 0) {
          throw new Error("ভ্যারিয়েশন সক্রিয় করা আছে কিন্তু কোনো ভ্যারিয়েন্ট জেনারেট করা হয়নি। অনুগ্রহ করে ভ্যারিয়েন্ট জেনারেট করুন অথবা ভ্যারিয়েশন অপশনটি বন্ধ করুন।");
        }

        const skuList = variants.map((v) => v.sku?.trim()).filter(Boolean);
        if (new Set(skuList).size !== skuList.length) {
          throw new Error("একাধিক ভ্যারিয়েন্টের SKU একই রাখা যাবে না। অনুগ্রহ করে প্রতিটি ভ্যারিয়েন্টের জন্য স্বতন্ত্র ও ইউনিক SKU দিন।");
        }
      }

      // Check for duplicate canonical URL before saving
      if (seoForm.canonical_url?.trim()) {
        const canonical = seoForm.canonical_url.trim();
        const currentSeoKey = isEdit ? `product_seo_${id}` : `product_seo_new_product_placeholder`;
        const { data: duplicateCheck, error: checkError } = await supabase
          .from("store_settings" as any)
          .select("key")
          .neq("key", currentSeoKey)
          .eq("value->>canonical_url", canonical);
          
        if (checkError) {
          console.error("Error checking duplicate URL:", checkError);
        } else if (duplicateCheck && duplicateCheck.length > 0) {
          throw new Error("এই প্রোডাক্ট URL (ক্যানোনিকাল URL) টি ইতিমধ্যেই অন্য একটি প্রোডাক্টে ব্যবহৃত হচ্ছে। অনুগ্রহ করে একটি ইউনিক URL বা SKU ব্যবহার করুন।");
        }
      }

      let updatedTags = [...form.tags];
      if (form.is_free_delivery) {
        if (!updatedTags.includes("ফ্রি ডেলিভারি")) {
          updatedTags.push("ফ্রি ডেলিভারি");
        }
      } else {
        updatedTags = updatedTags.filter((t) => t !== "ফ্রি ডেলিভারি" && t !== "free_delivery");
      }

      const totalStock = hasVariants && variants.length > 0
        ? variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        : form.stock_quantity;

      const payload: any = {
        ...form,
        stock_quantity: totalStock,
        has_variants: hasVariants,
        variation_options: variationOptions,
        variants: variants,
        paired_product_ids: pairedProductIds,
        tags: updatedTags,
        specifications: specs.filter((s) => s.label && s.value) as any,
      };

      const seoSettingsValue = {
        seo_title: seoForm.title,
        seo_description: seoForm.description,
        canonical_url: seoForm.canonical_url,
        is_free_delivery: form.is_free_delivery,
        faqs: faqs.filter((f) => f.question && f.answer),
      };

      const variationSettingsValue = {
        has_variants: hasVariants,
        variation_options: variationOptions,
        variants: variants,
        paired_product_ids: pairedProductIds,
      };

      if (isEdit) {
        // Try updating with all columns; fallback if any column not migrated
        let updateRes = await supabase.from("products").update(payload).eq("id", id);
        if (updateRes.error) {
          console.warn("Retrying update without custom columns fallback:", updateRes.error.message);
          const { has_variants: _h, variation_options: _vo, variants: _v, paired_product_ids: _p, is_free_delivery: _f, ...fallbackPayload } = payload;
          updateRes = await supabase.from("products").update(fallbackPayload as any).eq("id", id);
        }
        if (updateRes.error) throw updateRes.error;

        await Promise.all([
          supabase
            .from("store_settings" as any)
            .upsert({
              key: `product_seo_${id}`,
              value: seoSettingsValue,
            }, { onConflict: "key" }),
          supabase
            .from("store_settings" as any)
            .upsert({
              key: `product_variations_${id}`,
              value: variationSettingsValue,
            }, { onConflict: "key" }),
        ]);
      } else {
        let insertRes = await supabase.from("products").insert(payload).select("id").single();
        if (insertRes.error) {
          console.warn("Retrying insert without custom columns fallback:", insertRes.error.message);
          const { has_variants: _h, variation_options: _vo, variants: _v, paired_product_ids: _p, is_free_delivery: _f, ...fallbackPayload } = payload;
          insertRes = await supabase.from("products").insert(fallbackPayload as any).select("id").single();
        }
        if (insertRes.error) throw insertRes.error;

        const newId = insertRes.data?.id;
        if (newId) {
          await Promise.all([
            supabase
              .from("store_settings" as any)
              .upsert({
                key: `product_seo_${newId}`,
                value: seoSettingsValue,
              }, { onConflict: "key" }),
            supabase
              .from("store_settings" as any)
              .upsert({
                key: `product_variations_${newId}`,
                value: variationSettingsValue,
              }, { onConflict: "key" }),
          ]);
        }
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
    if (tagInput.trim()) {
      const newTags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t && !form.tags.includes(t));
      if (newTags.length > 0) {
        setForm((f) => ({ ...f, tags: [...f.tags, ...newTags] }));
      }
      setTagInput("");
    }
  };

  const discount = form.sale_price && form.regular_price > 0
    ? Math.round(((form.regular_price - form.sale_price) / form.regular_price) * 100)
    : 0;

  const savingsAmount = form.sale_price ? form.regular_price - form.sale_price : 0;

  if (isEdit && isProductLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-bengali">প্রোডাক্ট তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  if (isEdit && productError) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2 text-destructive">
        <p className="font-semibold">ত্রুটি: প্রোডাক্ট তথ্য লোড করতে ব্যর্থ হয়েছে</p>
        <p className="text-xs text-muted-foreground">{(productError as Error)?.message || "অনাকাঙ্ক্ষিত ত্রুটি"}</p>
        <Button onClick={() => navigate("/admin/products")} className="mt-2">প্রোডাক্ট তালিকায় ফিরে যান</Button>
      </div>
    );
  }

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
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                }}
                placeholder="যেমন: সূরা ইখলাস উডেন ক্যালিগ্রাফি"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">প্রোডাক্ট URL (ক্যানোনিকাল URL) *</label>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border font-mono shrink-0">
                  {`https://www.rangao.bd/${form.category ? slugify(form.category) : "category"}/`}
                </span>
                <Input
                  value={seoForm.canonical_url.split("/").pop() || ""}
                  onChange={(e) => {
                    const slug = slugify(e.target.value);
                    const catSlug = form.category ? slugify(form.category) : "category";
                    setSeoForm((prev) => ({
                      ...prev,
                      canonical_url: slug ? `https://www.rangao.bd/${catSlug}/${slug}` : "",
                    }));
                    setIsUrlEdited(true);
                  }}
                  placeholder="wooden-calligraphy"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">সার্চ ইঞ্জিন ফ্রেন্ডলি ইউনিক URL (অটো-সাজেস্টেড কিন্তু পরিবর্তনযোগ্য)</p>
            </div>
            <div>
              <label className="text-sm font-medium">SKU (স্টক কিপিং ইউনিট)</label>
              <Input
                value={form.sku}
                onChange={(e) => {
                  const sku = e.target.value;
                  setForm((f) => ({ ...f, sku }));
                  if (!isUrlEdited) {
                    const slug = slugify(sku);
                    const catSlug = form.category ? slugify(form.category) : "category";
                    setSeoForm((prev) => ({
                      ...prev,
                      canonical_url: slug ? `https://www.rangao.bd/${catSlug}/${slug}` : "",
                    }));
                  }
                }}
                placeholder="যেমন: RG-DEC-001"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">ইউনিক আইডি, ইনভেন্টরি ট্র্যাকিংয়ের জন্য</p>
            </div>
            <div>
              <label className="text-sm font-medium">ব্র্যান্ড</label>
              <Input
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="যেমন: রাঙাও"
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

      {/* Delivery Options */}
      <Card className={form.is_free_delivery ? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> ডেলিভারি সুবিধা (Delivery Option)
            </CardTitle>
            <Badge 
              variant={form.is_free_delivery ? "default" : "outline"}
              className={form.is_free_delivery ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bengali" : "font-bengali text-muted-foreground"}
            >
              {form.is_free_delivery ? "✓ ফ্রি ডেলিভারি সক্রিয়" : "স্ট্যান্ডার্ড ডেলিভারি"}
            </Badge>
          </div>
          <CardDescription>
            এই নির্দিষ্ট প্রোডাক্টের জন্য ফ্রি ডেলিভারি অন বা অফ করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/70 backdrop-blur-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label htmlFor="free-delivery-toggle" className="text-sm sm:text-base font-semibold cursor-pointer select-none text-foreground flex items-center gap-1.5">
                  🚚 এই প্রোডাক্টে ফ্রি ডেলিভারি (Free Delivery)
                </label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                সক্রিয় থাকলে গ্রাহক এই প্রোডাক্ট অর্ডার করার সময় কোনো ডেলিভারি চার্জ (ঢাকা/ঢাকার বাইরে) প্রযোজ্য হবে না এবং প্রোডাক্ট কার্ড, ডিটেলস ও চেকআউটে আকর্ষণীয় "ফ্রি ডেলিভারি" ব্যাজ প্রদর্শিত হবে।
              </p>
            </div>
            <Switch
              id="free-delivery-toggle"
              checked={form.is_free_delivery}
              onCheckedChange={(checked) => {
                setForm((f) => ({
                  ...f,
                  is_free_delivery: checked,
                  tags: checked
                    ? (f.tags.includes("ফ্রি ডেলিভারি") ? f.tags : [...f.tags, "ফ্রি ডেলিভারি"])
                    : f.tags.filter((t) => t !== "ফ্রি ডেলিভারি" && t !== "free_delivery"),
                }));
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Variations */}
      <ProductVariationsSection
        hasVariants={hasVariants}
        onHasVariantsChange={setHasVariants}
        options={variationOptions}
        onOptionsChange={setVariationOptions}
        variants={variants}
        onVariantsChange={setVariants}
        baseProduct={{
          sku: form.sku,
          regular_price: form.regular_price,
          sale_price: form.sale_price,
          cost_price: form.cost_price,
          stock_quantity: form.stock_quantity,
          images: form.images,
        }}
      />

      {/* Image Upload */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg">🖼️ প্রোডাক্টের ছবি আপলোড</CardTitle>
            <CardDescription>সর্বোচ্চ ২০টি ছবি আপলোড করুন (JPG, PNG, WEBP | সর্বোচ্চ ৫MB)</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1 text-xs" onClick={() => setShowPicker(true)}>
            📂 মিডিয়া লাইব্রেরি থেকে সিলেক্ট
          </Button>
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
                <Select 
                  value={form.category} 
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, category: v }));
                    if (!isUrlEdited && form.sku) {
                      const slug = slugify(form.sku);
                      const catSlug = v ? slugify(v) : "category";
                      setSeoForm((prev) => ({
                        ...prev,
                        canonical_url: slug ? `https://www.rangao.bd/${catSlug}/${slug}` : "",
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.category}
                  onChange={(e) => {
                    const catVal = e.target.value;
                    setForm((f) => ({ ...f, category: catVal }));
                    if (!isUrlEdited && form.sku) {
                      const slug = slugify(form.sku);
                      const catSlug = catVal ? slugify(catVal) : "category";
                      setSeoForm((prev) => ({
                        ...prev,
                        canonical_url: slug ? `https://www.rangao.bd/${catSlug}/${slug}` : "",
                      }));
                    }
                  }}
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
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.endsWith(",")) {
                    const tagToAdd = val.slice(0, -1).trim();
                    if (tagToAdd && !form.tags.includes(tagToAdd)) {
                      setForm((f) => ({ ...f, tags: [...f.tags, tagToAdd] }));
                    }
                    setTagInput("");
                  } else {
                    setTagInput(val);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="ট্যাগ লিখে কমা (,) বা Enter চাপুন"
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
            <label className="text-sm font-medium block mb-1">সংক্ষিপ্ত বিবরণ</label>
            <FormattingToolbar onInsert={(type, val) => insertFormatting(shortDescriptionRef, type, val)} />
            <Textarea
              ref={shortDescriptionRef}
              value={form.short_description}
              onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
              rows={3}
              placeholder="প্রোডাক্টের সংক্ষিপ্ত বিবরণ লিখুন..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">পূর্ণাঙ্গ বিবরণ</label>
            <FormattingToolbar onInsert={(type, val) => insertFormatting(descriptionRef, type, val)} />
            <Textarea
              ref={descriptionRef}
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
                placeholder="লেবেল (যেমন: উপাদান)"
                value={s.label}
                onChange={(e) => { const n = [...specs]; n[i].label = e.target.value; setSpecs(n); }}
              />
              <Input
                placeholder="মান (যেমন: সেগুন কাঠ)"
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

      {/* Pairs Well With / Add-ons */}
      <ProductPairsWellWithSection
        currentProductId={isEdit ? id : undefined}
        pairedProductIds={pairedProductIds}
        onChange={setPairedProductIds}
      />

      {/* SEO & FAQ Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 সার্চ ইঞ্জিন অপ্টিমাইজেশন (SEO) ও FAQ</CardTitle>
          <CardDescription>এই প্রোডাক্ট পেইজের কাস্টম SEO মেটা ট্যাগ এবং FAQ প্রশ্ন-উত্তর সেট করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium">কাস্টম SEO টাইটেল</label>
              <Input
                value={seoForm.title}
                onChange={(e) => setSeoForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="যেমন: সেরা উডেন ক্যালিগ্রাফি ফ্রেম"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">কাস্টম SEO ডেসক্রিপশন</label>
            <Textarea
              value={seoForm.description}
              onChange={(e) => setSeoForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="প্রোডাক্টের আকর্ষণীয় ডেসক্রিপশন লিখুন যা গুগলে দেখাবে..."
              className="mt-1"
              rows={3}
            />
          </div>

          <Separator className="my-4" />
          
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">প্রোডাক্ট FAQ সেকশন</h3>
            {faqs.map((faq, idx) => (
              <div key={idx} className="space-y-2 p-3 rounded-lg border bg-secondary/10 relative">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-1 right-1 h-6 w-6 text-destructive"
                  onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                >
                  <X className="h-4.5 w-4.5" />
                </Button>
                <div>
                  <label className="text-xs font-semibold">প্রশ্ন {idx + 1}</label>
                  <Input
                    value={faq.question}
                    onChange={(e) => {
                      const nextFaqs = [...faqs];
                      nextFaqs[idx].question = e.target.value;
                      setFaqs(nextFaqs);
                    }}
                    placeholder="যেমন: প্রোডাক্টের উপাদান কি?"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">উত্তর {idx + 1}</label>
                  <Textarea
                    value={faq.answer}
                    onChange={(e) => {
                      const nextFaqs = [...faqs];
                      nextFaqs[idx].answer = e.target.value;
                      setFaqs(nextFaqs);
                    }}
                    placeholder="যেমন: এটি প্রিমিয়াম কোয়ালিটির কাঠ দিয়ে তৈরি।"
                    className="mt-1 text-xs"
                    rows={2}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}>
              <Plus className="mr-1 h-4 w-4" /> FAQ যোগ করুন
            </Button>
          </div>
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

      <MediaPicker 
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(url) => {
          setForm((f) => ({ ...f, images: [...f.images, url] }));
          setShowPicker(false);
        }}
        type="images"
      />
    </div>
  );
}
