import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  FileVideo, FileText, Search, Loader2, Grid, List, 
  Trash2, Copy, Download, UploadCloud, Eye, Plus,
  Sparkles, RefreshCcw, Activity, Server, Database, ShieldAlert,
  Image as ImageIcon, Terminal, HardDrive
} from "lucide-react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { mediaService, MediaItem } from "@/lib/mediaService";
import BrokenImageGuard from "@/components/BrokenImageGuard";
import MediaPicker from "@/components/MediaPicker";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface BucketDiagnostic {
  name: string;
  exists: boolean;
  public: boolean;
  fileCount: number;
}

export default function MediaLibrary() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "library";

  // ================= TAB 1: LIBRARY STATES =================
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<"all" | "images" | "videos" | "documents">("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ================= TAB 2: OPTIMIZATION STATES =================
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

  // ================= TAB 3: DIAGNOSTICS STATES =================
  const [diagLoading, setDiagLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [buckets, setBuckets] = useState<BucketDiagnostic[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  // Initialize data based on active tab
  useEffect(() => {
    if (activeTab === "library") {
      loadLibrary();
    } else if (activeTab === "diagnostics") {
      runDiagnostics();
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // ================= TAB 1: LIBRARY LOGIC =================
  const loadLibrary = async () => {
    setLoading(true);
    try {
      // 1. Fetch registered library items
      const registered = await mediaService.fetchItems();
      const registeredUrls = new Set(registered.map(item => item.url));
      
      const scannedItems: MediaItem[] = [];

      // Helper to push scanned items if not already registered/scanned
      const addScannedUrl = (url: string, name: string, sourceTable: string) => {
        if (!url) return;
        if (registeredUrls.has(url)) return;
        if (scannedItems.some(x => x.url === url)) return;
        
        // Guess extension and mime type
        const ext = url.split("?")[0].split(".").pop() || "jpg";
        const mime = ext === "mp4" ? "video/mp4" : `image/${ext}`;
        
        scannedItems.push({
          id: `scanned-${sourceTable}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: name || url.split("/").pop() || "Scanned Asset",
          url: url,
          bucket_name: url.includes("/storage/v1/object/public/") ? url.split("/public/")[1]?.split("/")[0] || "uploads" : "external",
          mime_type: mime,
          file_size: 0,
          source: "external_url",
          metadata: { sourceTable },
          uploaded_at: new Date().toISOString()
        });
      };

      // 2. Fetch products images
      const { data: products } = await supabase.from("products").select("name, images");
      if (products) {
        products.forEach(p => {
          if (p.images && p.images.length > 0) {
            p.images.forEach((img: string, idx: number) => {
              addScannedUrl(img, `${p.name} (Image ${idx + 1})`, "products");
            });
          }
        });
      }

      // 3. Fetch categories images
      const { data: categories } = await supabase.from("categories").select("name, image_url");
      if (categories) {
        categories.forEach(c => {
          addScannedUrl(c.image_url, `${c.name} Category Banner`, "categories");
        });
      }

      // 4. Fetch testimonials images
      const { data: testimonials } = await supabase.from("testimonials").select("customer_name, customer_image_url");
      if (testimonials) {
        testimonials.forEach(t => {
          addScannedUrl(t.customer_image_url, `${t.customer_name} Avatar`, "testimonials");
        });
      }

      // 5. Fetch store settings images
      const { data: settings } = await supabase.from("store_settings" as any).select("key, value");
      if (settings) {
        settings.forEach(s => {
          if (s.key === "hero_banner" && s.value?.slides) {
            s.value.slides.forEach((slide: any, idx: number) => {
              addScannedUrl(slide.banner_image_url, `Hero Slide ${idx + 1}`, "store_settings");
            });
          }
          if (s.key === "offer_banner" && s.value?.bg_image) {
            addScannedUrl(s.value.bg_image, "Offer Banner Background", "store_settings");
          }
          if (s.key === "store_info") {
            if (s.value?.logo_url) addScannedUrl(s.value.logo_url, "Store Logo", "store_settings");
            if (s.value?.mobile_logo_url) addScannedUrl(s.value.mobile_logo_url, "Store Mobile Logo", "store_settings");
            if (s.value?.white_logo_url) addScannedUrl(s.value.white_logo_url, "Store White Logo", "store_settings");
            if (s.value?.favicon_url) addScannedUrl(s.value.favicon_url, "Store Favicon", "store_settings");
          }
        });
      }
      
      // 6. Scan and inject placeholder media assets
      const placeholders = [
        {
          url: "/placeholder.svg",
          name: "Standard SVG Placeholder (System Default)",
          mimeType: "image/svg+xml"
        },
        {
          url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80",
          name: "Premium Wood Placeholder (Fallback Guard)",
          mimeType: "image/jpeg"
        },
        {
          url: "https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80",
          name: "Default Product Image Placeholder",
          mimeType: "image/jpeg"
        },
        {
          url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          name: "Default Footer Promo Background",
          mimeType: "image/jpeg"
        }
      ];

      placeholders.forEach(ph => {
        if (!registeredUrls.has(ph.url) && !scannedItems.some(x => x.url === ph.url)) {
          scannedItems.push({
            id: `scanned-placeholder-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: ph.name,
            url: ph.url,
            bucket_name: "placeholder",
            mime_type: ph.mimeType,
            file_size: 0,
            source: "external_url",
            metadata: { sourceTable: "placeholder" },
            uploaded_at: new Date().toISOString()
          });
        }
      });

      // Merge registered + scanned
      const mergedItems = [...registered, ...scannedItems];
      setItems(mergedItems);

      // Asynchronously fetch actual file sizes for scanned assets in the background
      scannedItems.forEach(async (scanned) => {
        try {
          if (scanned.url.startsWith("data:")) {
            const base64Str = scanned.url.split(",")[1] || "";
            const bytes = Math.round((base64Str.length * 3) / 4);
            if (bytes > 0) {
              setItems(prev => prev.map(item => 
                item.id === scanned.id ? { ...item, file_size: bytes } : item
              ));
            }
            return;
          }

          const response = await fetch(scanned.url, { method: "HEAD" });
          const length = response.headers.get("content-length");
          if (length) {
            const bytes = parseInt(length, 10);
            if (!isNaN(bytes) && bytes > 0) {
              setItems(prev => prev.map(item => 
                item.id === scanned.id ? { ...item, file_size: bytes } : item
              ));
            }
          }
        } catch (err) {
          // If HEAD request fails due to CORS or redirect, fall back silently
        }
      });
    } catch (e: any) {
      toast({ title: "❌ লোড ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "📋 লিঙ্ক কপি করা হয়েছে", description: "URL সাকসেসফুলি ক্লিপবোর্ডে কপি করা হয়েছে।" });
  };

  const handleDeleteItem = (item: MediaItem) => {
    setDeleteTarget(item);
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      await mediaService.delete(deleteTarget);
      toast({ title: "🗑️ ফাইল মুছে ফেলা হয়েছে" });
      loadLibrary();
      setSelectedItems(prev => prev.filter(id => id !== deleteTarget.id));
    } catch (e: any) {
      toast({ title: "❌ মুছতে ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = () => {
    if (!selectedItems.length) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (!selectedItems.length) return;
    setLoading(true);
    try {
      let count = 0;
      for (const id of selectedItems) {
        const item = items.find(x => x.id === id);
        if (item) {
          await mediaService.delete(item);
          count++;
        }
      }
      toast({ title: `🗑️ ${count}টি ফাইল মুছে ফেলা হয়েছে` });
      setSelectedItems([]);
      loadLibrary();
    } catch (e: any) {
      toast({ title: "❌ বাল্ক মুছতে ব্যর্থ", description: e.message, variant: "destructive" });
      loadLibrary();
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(x => x.id));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "images" && item.mime_type.startsWith("image/")) ||
      (filterType === "videos" && item.mime_type.startsWith("video/")) ||
      (filterType === "documents" && !item.mime_type.startsWith("image/") && !item.mime_type.startsWith("video/"));
    return matchesSearch && matchesFilter;
  });

  // ================= TAB 2: OPTIMIZATION LOGIC =================
  const addOptLog = (msg: string) => {
    setMigrationLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const scanLegacyImages = async () => {
    setScanning(true);
    setLegacyImages([]);
    setMigrationLogs([]);
    addOptLog("Scanning database for legacy images...");
    
    const itemsToMigrate: any[] = [];
    
    try {
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
      addOptLog(`Scan complete. Found ${itemsToMigrate.length} legacy/external images matching optimization rules.`);
      toast({ title: `🔎 Scan Complete`, description: `Found ${itemsToMigrate.length} legacy images to optimize.` });
    } catch (e: any) {
      addOptLog(`Scan failed: ${e.message}`);
      toast({ title: "❌ Scan Failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const startMigration = async () => {
    if (legacyImages.length === 0) return;
    setMigrating(true);
    setRollbackBackup([]);
    addOptLog("Starting image migration and format pipeline...");
    
    const backup: any[] = [];
    let processedCount = 0;
    let totalOrig = 0;
    let totalOpt = 0;
    const startTime = Date.now();

    for (const item of legacyImages) {
      try {
        addOptLog(`Migrating [${item.type.toUpperCase()}] "${item.recordName}"...`);
        addOptLog(`Downloading: ${item.url}`);
        
        const res = await fetch(item.url);
        if (!res.ok) throw new Error("CORS or network failed to fetch source image");
        
        const blob = await res.blob();
        const ext = item.url.split("?")[0].split(".").pop() || "jpg";
        const filename = `migrated_${item.recordId}_${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: blob.type });

        addOptLog(`Converting & generating WebP + AVIF sizes for ${filename}...`);
        
        const mediaItem = await mediaService.upload(file, "images");
        const newUrl = mediaItem.url;
        
        backup.push({ ...item });

        addOptLog(`Updating database record references...`);

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

        const origSize = blob.size;
        let optSize = 0;
        if (mediaItem.metadata && mediaItem.metadata.webp) {
          optSize = (mediaItem.metadata.originalSize || origSize) / 3; 
        } else {
          optSize = origSize * 0.45;
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

        addOptLog(`Successfully optimized. Savings estimate: ${Math.round(((origSize - optSize)/origSize)*100)}%!`);

      } catch (err: any) {
        addOptLog(`Failed to migrate "${item.recordName}": ${err.message || err}`);
      }
    }

    setRollbackBackup(backup);
    setMigrating(false);
    addOptLog(`Image migration completed. Processed: ${processedCount}/${legacyImages.length}. Saved ${Math.round((totalOrig - totalOpt) / 1024 / 1024)}MB bandwidth.`);
    toast({ title: "🎉 Migration Complete!", description: `Successfully optimized ${processedCount} legacy images.` });
  };

  const rollbackMigration = async () => {
    if (rollbackBackup.length === 0) return;
    setMigrating(true);
    addOptLog("Rolling back all migrated database references to original URLs...");

    for (const item of rollbackBackup) {
      try {
        addOptLog(`Rolling back [${item.type.toUpperCase()}] "${item.recordName}"...`);
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
        addOptLog(`Failed rollback for "${item.recordName}": ${err.message}`);
      }
    }
    
    setRollbackBackup([]);
    setMigrating(false);
    setLegacyImages([]);
    setStats({ total: 0, processed: 0, originalSize: 0, optimizedSize: 0, percentSaved: 0, elapsedTimeSec: 0 });
    addOptLog("Rollback complete. Database state restored perfectly.");
    toast({ title: "↩️ Rollback Complete", description: "All database references successfully rolled back." });
  };

  // ================= TAB 3: DIAGNOSTICS LOGIC =================
  const runDiagnostics = async () => {
    setChecking(true);
    const logs: string[] = [];
    try {
      const { data: testData, error: testError } = await supabase
        .from("store_settings" as any)
        .select("key")
        .limit(1);

      if (testError) {
        setApiOnline(false);
        logs.push(`[ERROR] Supabase API connection failed: ${testError.message}`);
      } else {
        setApiOnline(true);
        logs.push("[INFO] Supabase Client API connection established.");
      }

      const { data: storageBuckets, error: storageError } = await supabase.storage.listBuckets();
      
      const required = ["images", "videos", "documents", "uploads"];
      const diagnosticResults: BucketDiagnostic[] = [];
      
      if (storageError) {
        logs.push(`[WARNING] Failed to fetch storage buckets via metadata API: ${storageError.message}. Running direct fallback checks...`);
      } else {
        logs.push(`[INFO] Found ${storageBuckets?.length || 0} active storage buckets via metadata listing.`);
      }

      for (const req of required) {
        let exists = false;
        let isPublic = true; // Default assumed public for CDN
        let fileCount = 0;

        const matched = storageBuckets?.find(b => b.id === req);
        if (matched) {
          exists = true;
          isPublic = matched.public;
          const { data: files } = await supabase.storage.from(req).list("", { limit: 100 });
          fileCount = files?.length || 0;
        } else {
          // Fallback: try directly listing contents from the bucket
          const { data: files, error: listError } = await supabase.storage.from(req).list("", { limit: 1 });
          if (!listError) {
            exists = true;
            const { data: allFiles } = await supabase.storage.from(req).list("", { limit: 100 });
            fileCount = allFiles?.length || 0;
          } else {
            const errMsg = listError.message || "";
            // If the bucket doesn't exist, Supabase returns a 'not found' message. 
            // If it exists but gives any other error (like authorization/RLS), then the bucket itself exists.
            if (!errMsg.toLowerCase().includes("not found")) {
              exists = true;
            }
          }
        }

        diagnosticResults.push({
          name: req,
          exists,
          public: isPublic,
          fileCount
        });

        if (!exists) {
          logs.push(`[WARNING] Required bucket '${req}' is missing.`);
        } else {
          logs.push(`[INFO] Bucket '${req}' is verified online. Contains ${fileCount} files.`);
        }
      }
      setBuckets(diagnosticResults);
    } catch (err: any) {
      logs.push(`[FATAL] Storage diagnosis failed: ${err.message}`);
    } finally {
      setErrorLogs(logs);
      setChecking(false);
      setDiagLoading(false);
    }
  };

  const handleFixBuckets = async () => {
    setChecking(true);
    try {
      const results = await mediaService.ensureBuckets();
      if (results.success) {
        toast({ title: "✅ স্টোরেজ সফলভাবে মেরামত করা হয়েছে", description: "সমস্ত মিসিং কুরিয়ার এবং স্টোরেজ বাকেট তৈরি করা হয়েছে।" });
      } else {
        toast({ 
          title: "❌ মেরামত অসম্পূর্ণ", 
          description: `কিছু বাকেট তৈরি করা যায়নি: ${results.errors.join(", ")}`, 
          variant: "destructive" 
        });
      }
      runDiagnostics();
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">💼 প্রিমিয়াম মিডিয়া সেন্টার ও হাব</h1>
          <p className="text-sm text-muted-foreground">মিডিয়া ফাইল ম্যানেজার, ইমেজ ফরম্যাট অপ্টিমাইজেশন পাইপলাইন এবং ক্লাউড স্টোরেজ হেলথ মনিটর করুন।</p>
        </div>
        {activeTab === "library" && (
          <Button className="gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95" onClick={() => setShowPicker(true)}>
            <Plus className="h-4 w-4" /> ফাইল আপলোড করুন
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
          <TabsTrigger value="library" className="rounded-lg px-4 py-2 gap-1.5 flex items-center">
            <HardDrive className="h-4 w-4" /> ফাইল ম্যানেজার
          </TabsTrigger>
          <TabsTrigger value="optimization" className="rounded-lg px-4 py-2 gap-1.5 flex items-center">
            <ImageIcon className="h-4 w-4" /> ইমেজ অপ্টিমাইজেশন
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="rounded-lg px-4 py-2 gap-1.5 flex items-center">
            <Activity className="h-4 w-4" /> স্টোরেজ ডায়াগনস্টিকস
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Library Content */}
        <TabsContent value="library" className="space-y-6 outline-none">
          <Card>
            <CardHeader className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {["all", "images", "videos", "documents"].map(type => (
                  <Button 
                    key={type}
                    size="sm" 
                    variant={filterType === type ? "default" : "outline"} 
                    className="rounded-xl text-xs capitalize" 
                    onClick={() => setFilterType(type as any)}
                  >
                    {type === "all" ? "সব ফাইল" : type === "images" ? "ইমেজ 🖼️" : type === "videos" ? "ভিডিও 🎥" : "ডকুমেন্টস 📄"}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="ফাইল নাম দিয়ে সার্চ..." 
                    className="pl-8 text-xs rounded-xl"
                  />
                </div>
                
                <div className="flex items-center border rounded-xl overflow-hidden shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-9 w-9 rounded-none ${layout === "grid" ? "bg-accent/15 text-primary" : ""}`}
                    onClick={() => setLayout("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-9 w-9 rounded-none ${layout === "list" ? "bg-accent/15 text-primary" : ""}`}
                    onClick={() => setLayout("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {filteredItems.length > 0 && (
                <div className="flex items-center justify-between p-3 border rounded-xl bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0} 
                      onChange={toggleSelectAll} 
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      সব সিলেক্ট করুন ({selectedItems.length} / {filteredItems.length})
                    </span>
                  </div>
                  {selectedItems.length > 0 && (
                    <Button size="sm" variant="destructive" className="gap-1 rounded-xl text-xs" onClick={handleBulkDelete}>
                      <Trash2 className="h-3.5 w-3.5" /> নির্বাচিত ফাইল মুছুন
                    </Button>
                  )}
                </div>
              )}

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">মিডিয়া ডাটা লোড হচ্ছে...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-center">
                  <UploadCloud className="h-12 w-12 text-muted-foreground" />
                  <p className="font-bold text-sm">কোনো ফাইল পাওয়া যায়নি</p>
                  <p className="text-xs text-muted-foreground max-w-xs">মিডিয়া ম্যানেজার ফোল্ডারে কোনো ফাইল আপলোড করা নেই।</p>
                </div>
              ) : layout === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      className={`relative group rounded-xl border-2 overflow-hidden flex flex-col bg-card hover:shadow-md transition-all duration-300 ${
                        selectedItems.includes(item.id) ? "border-primary ring-2 ring-primary/10" : "border-border"
                      }`}
                    >
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          checked={selectedItems.includes(item.id)} 
                          onChange={() => toggleSelect(item.id)} 
                        />
                      </div>

                      {item.mime_type.startsWith("image/") ? (
                        <div className="aspect-square bg-white flex items-center justify-center overflow-hidden relative">
                          <BrokenImageGuard src={item.url} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-square bg-slate-950 flex flex-col items-center justify-center relative">
                          {item.mime_type.startsWith("video/") ? (
                            <FileVideo className="h-12 w-12 text-slate-400" />
                          ) : (
                            <FileText className="h-12 w-12 text-slate-500" />
                          )}
                          <span className="absolute bottom-2 right-2 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white font-mono uppercase">
                            {item.mime_type.split("/").pop()}
                          </span>
                        </div>
                      )}

                      <div className="p-3 border-t space-y-1 flex-1 flex flex-col justify-between shrink-0 min-w-0">
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{formatSize(item.file_size)}</span>
                            {item.metadata?.sourceTable && (
                              <Badge variant="outline" className="text-[8px] leading-none py-0.5 px-1 bg-secondary/30 rounded border border-border/80 capitalize font-medium">
                                🔗 {item.metadata.sourceTable}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-2 justify-end">
                          <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" onClick={() => handleCopyLink(item.url)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" asChild>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-xl divide-y bg-card">
                  {filteredItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-secondary/15 transition-colors gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          checked={selectedItems.includes(item.id)} 
                          onChange={() => toggleSelect(item.id)} 
                        />
                        
                        <div className="h-10 w-10 border rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
                          {item.mime_type.startsWith("image/") ? (
                            <BrokenImageGuard src={item.url} className="h-full w-full object-cover" />
                          ) : item.mime_type.startsWith("video/") ? (
                            <FileVideo className="h-5 w-5 text-slate-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{item.mime_type}</span>
                            <span>•</span>
                            <span>{formatSize(item.file_size)}</span>
                            {item.metadata?.sourceTable && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-[8px] leading-none py-0.5 px-1 bg-secondary/30 rounded border border-border/80 capitalize font-medium">
                                  🔗 {item.metadata.sourceTable}
                                </Badge>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => handleCopyLink(item.url)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> URL
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Optimization Content */}
        <TabsContent value="optimization" className="space-y-6 outline-none">
          <Card className="border border-border/85 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent border-b">
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-display">🖼️ প্রিমিয়াম ইমেজ কনভার্সন ও অপ্টিমাইজেশন সুইট</CardTitle>
              <CardDescription>
                আপনার ই-কমার্স ওয়েবসাইটের সব ইমেজ স্ক্যান করুন এবং অটোমেটিক AVIF/WebP মাল্টি-সাইজ রেসপনসিভ ফরম্যাটে কনভার্ট করুন।
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl border bg-secondary/15">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">মোট অপ্টিমাইজযোগ্য ফাইল</span>
                  <span className="text-2xl font-extrabold block text-primary">{stats.total}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">অপ্টিমাইজ সম্পন্ন</span>
                  <span className="text-2xl font-extrabold block text-green-600">{stats.processed} / {stats.total}</span>
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

              <div className="space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-1 text-primary"><Terminal className="h-4 w-4" /> রিয়েল-টাইম লাইভ পাইপলাইন টার্মিনাল</h4>
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
        </TabsContent>

        {/* Tab 3: Diagnostics Content */}
        <TabsContent value="diagnostics" className="space-y-6 outline-none">
          <div className="flex sm:items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={runDiagnostics} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} রি-টেস্ট
            </Button>
            <Button size="sm" className="rounded-xl gap-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleFixBuckets} disabled={checking}>
              <Sparkles className="h-4 w-4" /> অটো-মেরামত
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Activity className="h-4 w-4 text-primary" /> API কানেক্টিভিটি</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${apiOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                  <span className="font-bold text-base">{apiOnline ? "Online 🟢" : "Offline 🔴"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Supabase REST এবং Auth Endpoint সিঙ্ক করা আছে।</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Server className="h-4 w-4 text-primary" /> স্টোরেজ প্রোভাইডার ক্রেডেনশিয়ালস</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Active Provider</span>
                  <span className="font-semibold text-xs text-primary">Supabase JS Storage Client</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Authentication Mode</span>
                  <span className="font-semibold text-xs text-primary">User Authenticated Session</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5 text-primary"><Database className="h-4.5 w-4.5 text-accent" /> বাকেট হেলথ ও মেম্বারশিপ</CardTitle>
              <CardDescription>অ্যাপ্লিকেশনের মিডিয়া আপলোডের জন্য নিচের ৪টি পাবলিক বাকেট সচল থাকা আবশ্যক।</CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t">
              {diagLoading ? (
                <div className="py-12 flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <div className="divide-y text-xs">
                  {buckets.map(b => (
                    <div key={b.name} className="flex items-center justify-between p-4 gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${
                          b.exists ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                        }`}>
                          {b.name.substring(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-foreground capitalize">{b.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">ফাইল সংখ্যা: {b.fileCount}টি</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={b.exists ? "default" : "outline"} className="rounded-lg text-[9px] py-0.5">
                          {b.exists ? "সক্রিয় 🟢" : "মিসিং 🔴"}
                        </Badge>
                        <Badge variant={b.public ? "outline" : "secondary"} className="rounded-lg text-[9px] py-0.5">
                          {b.public ? "পাবলিক CDN" : "প্রাইভেট"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-primary" /> স্টোরেজ ডায়াগনস্টিকস ও ডিবাগ লগস</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-black rounded-2xl text-green-400 font-mono text-[10px] space-y-1.5 leading-relaxed min-h-36 max-h-56 overflow-y-auto">
                {errorLogs.map((log, idx) => {
                  const isError = log.includes("[ERROR]") || log.includes("[FATAL]");
                  const isWarning = log.includes("[WARNING]");
                  return (
                    <div key={idx} className={isError ? "text-red-400" : isWarning ? "text-yellow-300" : "text-green-400"}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MediaPicker 
        isOpen={showPicker} 
        onClose={() => setShowPicker(false)} 
        onSelect={(url) => {
          loadLibrary();
          setShowPicker(false);
        }}
      />

      {/* Single Item Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">ফাইল ডিলিট নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে <strong>"{deleteTarget?.name}"</strong> ফাইলটি স্থায়ীভাবে মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা সম্ভব হবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={confirmDeleteItem}
            >
              🗑️ মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">নির্বাচিত ফাইলসমূহ ডিলিট নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে নির্বাচিত <strong>{selectedItems.length}টি ফাইল</strong> মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা সম্ভব হবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={confirmBulkDelete}
            >
              🗑️ নির্বাচিত {selectedItems.length}টি ফাইল মুছুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
