import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { processImage, TARGET_WIDTHS, compressImage } from "@/utils/imagePipeline";
import { sanitizeAdminError } from "@/lib/permissions";

// Helper function to generate standard UUID v4
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
};

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  file_path?: string;
  bucket_name: string;
  mime_type: string;
  file_size: number;
  source: "upload" | "external_url" | "media_library";
  metadata?: {
    width?: number;
    height?: number;
    alt?: string;
    [key: string]: any;
  };
  uploaded_at: string;
}

const REQUIRED_BUCKETS = ["images", "videos", "documents", "uploads"];

class MediaService {
  private get client() {
    const isAdminPath = typeof window !== "undefined" && window.location.pathname.includes("/admin");
    return isAdminPath ? supabaseAdmin : supabase;
  }
  /**
   * Automatically initializes all required public storage buckets if they do not exist
   */
  async ensureBuckets(): Promise<{ success: boolean; created: string[]; errors: string[] }> {
    const created: string[] = [];
    const errors: string[] = [];
    
    // Attempt list first, but if it fails (due to RLS/policies), swallow it and proceed to direct creation
    let existingBuckets: string[] = [];
    try {
      const { data: buckets } = await this.client.storage.listBuckets();
      if (buckets) {
        existingBuckets = buckets.map(b => b.id);
      }
    } catch (e) {
      // Swallowed: listBuckets might be restricted to admin keys
    }

    try {
      for (const bucketName of REQUIRED_BUCKETS) {
        // If we successfully fetched the list and it exists, skip creation
        if (existingBuckets.includes(bucketName)) {
          continue;
        }

        const { error: createError } = await this.client.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: bucketName === "images" 
            ? ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif", "image/avif"]
            : bucketName === "videos"
            ? ["video/mp4", "video/webm", "video/quicktime"]
            : undefined
        });

        if (createError) {
          const msg = createError.message || "";
          if (
            msg.toLowerCase().includes("already exists") || 
            msg.toLowerCase().includes("duplicate") ||
            msg.toLowerCase().includes("conflict")
          ) {
            // Safe to ignore if bucket already exists
          } else if (
            msg.toLowerCase().includes("row-level security") ||
            msg.toLowerCase().includes("violates") ||
            msg.toLowerCase().includes("security policy") ||
            msg.toLowerCase().includes("permission")
          ) {
            errors.push(`${bucketName}: permission denied (please create this public bucket manually in your Supabase Storage dashboard or run SQL)`);
          } else {
            errors.push(`${bucketName}: ${msg}`);
          }
        } else {
          created.push(bucketName);
        }
      }
      return { success: errors.length === 0, created, errors };
    } catch (err: any) {
      return { success: false, created, errors: [err.message] };
    }
  }

  /**
   * Validates a file before upload.
   * For images: only the POST-compression size matters.
   * Call validateFile(file, type, isCompressed=true) after compression.
   */
  validateFile(
    file: File,
    type: "images" | "videos" | "documents" | "uploads",
    isCompressed = false
  ): { valid: boolean; error?: string } {
    const maxSizes = {
      images: 5 * 1024 * 1024,   // 5MB — applied to compressed output
      videos: 50 * 1024 * 1024,  // 50MB
      documents: 15 * 1024 * 1024, // 15MB
      uploads: 20 * 1024 * 1024  // 20MB
    };

    // Pre-compression sanity limit: block files that are unreasonably large (>50MB for images)
    // so the browser doesn't OOM trying to load them into canvas
    const sanityLimits = {
      images: 50 * 1024 * 1024,  // 50MB raw input limit
      videos: 50 * 1024 * 1024,
      documents: 15 * 1024 * 1024,
      uploads: 20 * 1024 * 1024
    };

    const limit = isCompressed ? maxSizes[type] : sanityLimits[type];
    if (file.size > limit) {
      if (!isCompressed && type === "images") {
        return { valid: false, error: `ফাইল অনেক বড়। সর্বোচ্চ গ্রহণযোগ্য সাইজ: 50MB (স্বয়ংক্রিয় কম্প্রেশন সত্ত্বেও)` };
      }
      const sizeText = type === "images" ? "5MB" : type === "videos" ? "50MB" : "15MB";
      return { valid: false, error: `কম্প্রেশনের পরেও ফাইল অনেক বড়। সর্বোচ্চ সাইজ: ${sizeText}` };
    }

    if (type === "images" && !file.type.startsWith("image/")) {
      return { valid: false, error: "শুধুমাত্র ছবি আপলোড করা যাবে" };
    }
    if (type === "videos" && !file.type.startsWith("video/")) {
      return { valid: false, error: "শুধুমাত্র ভিডিও আপলোড করা যাবে" };
    }

    const ALLOWED_MIMES: Record<string, string[]> = {
      images: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif", "image/avif"],
      videos: ["video/mp4", "video/webm", "video/quicktime"],
      documents: ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      uploads: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif", "image/avif", "application/pdf"],
    };

    const allowedList = ALLOWED_MIMES[type];
    if (allowedList && file.type && !allowedList.includes(file.type.toLowerCase())) {
      return { valid: false, error: `অকার্যকর ফাইল ফরম্যাট (${file.type})। অনুমোদিত ফরম্যাট: ${allowedList.map(m => m.split('/')[1] || m).join(', ')}` };
    }

    return { valid: true };
  }

  /**
   * Uploads a file to Supabase storage and registers it in the media library
   * If storage upload fails due to bucket or RLS restrictions, gracefully falls back to a base64 data URL.
   */
  async upload(
    file: File,
    bucket: "images" | "videos" | "documents" | "uploads" = "images",
    customPath?: string
  ): Promise<MediaItem> {
    // 1. Pre-validation (sanity check only — large images will be compressed first)
    const preValidation = this.validateFile(file, bucket, false);
    if (!preValidation.valid) {
      throw new Error(preValidation.error);
    }

    // 2. Ensure Buckets Exist
    try {
      await this.ensureBuckets();
    } catch (e) {
      console.warn("Bucket pre-checks failed, will try upload or Base64 fallback", e);
    }

    // 3. Compress images BEFORE final validation — this is the key fix
    // Large images (e.g. 10MB DSLR photos) get reduced to well under 5MB
    const isConvertibleImage = file.type.startsWith("image/") && file.type !== "image/svg+xml";
    let activeFile: File = file;

    if (isConvertibleImage) {
      try {
        // First pass: compress to 1600px wide at 85% quality
        let compressedBlob = await compressImage(file, 1600, 0.85);

        // If still above 4.5MB, retry with more aggressive settings
        if (compressedBlob.size > 4.5 * 1024 * 1024) {
          console.warn(`[Compression] First pass (${(compressedBlob.size / 1024 / 1024).toFixed(1)}MB) still too large, retrying at 1200px / 72% quality`);
          compressedBlob = await compressImage(file, 1200, 0.72);
        }

        // If still above 4.5MB, one final attempt
        if (compressedBlob.size > 4.5 * 1024 * 1024) {
          console.warn(`[Compression] Second pass (${(compressedBlob.size / 1024 / 1024).toFixed(1)}MB) still large, final attempt at 1024px / 60% quality`);
          compressedBlob = await compressImage(file, 1024, 0.60);
        }

        activeFile = new File([compressedBlob], file.name, { type: compressedBlob.type || file.type });
        console.log(
          `[Compression] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(activeFile.size / 1024 / 1024).toFixed(2)}MB ` +
          `(${Math.round((1 - activeFile.size / file.size) * 100)}% reduction)`
        );
      } catch (err) {
        console.warn("Image pre-compression failed, using original file", err);
      }

      // 4. Post-compression validation — check the compressed file size
      const postValidation = this.validateFile(activeFile, bucket, true);
      if (!postValidation.valid) {
        throw new Error(postValidation.error);
      }
    }

    const ext = activeFile.name.split(".").pop() || "";
    const cleanName = activeFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const baseNameWithoutExt = activeFile.name.substring(0, activeFile.name.lastIndexOf('.')) || activeFile.name;
    const cleanBaseName = baseNameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_");
    
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sanitizedCustomPath = customPath
      ? customPath.replace(/\.\./g, "").replace(/[^a-zA-Z0-9_\-\/.]/g, "_").replace(/^\/+/, "")
      : undefined;
    const path = sanitizedCustomPath || `${uniqueId}_${cleanName}`;
    
    let uploadError = null;
    let actualBucket = bucket;
    let fileUrl = "";
    let isFallbackBase64 = false;
    let metadata: any = {};
    
    if (isConvertibleImage) {
      const startTime = performance.now();
      try {
        // Run conversion pipeline
        const pipelineResult = await processImage(activeFile);
        
        // Upload Original as backup
        const originalPath = `original/${path}`;
        const originalResult = await this.client.storage.from(bucket).upload(originalPath, activeFile, { cacheControl: "31536000" });
        if (originalResult.error) throw originalResult.error;
        
        const { data: originalUrlData } = this.client.storage.from(bucket).getPublicUrl(originalPath);
        fileUrl = originalUrlData.publicUrl;
        
        const webpUrls: { [key: string]: string } = {};
        const avifUrls: { [key: string]: string } = {};
        
        // Upload resized versions in parallel
        const uploadPromises: Promise<any>[] = [];
        
        TARGET_WIDTHS.forEach((w) => {
          const webpBlob = pipelineResult.webpSizes[w];
          if (webpBlob) {
            const webpPath = `webp/${w}w/${uniqueId}_${cleanBaseName}.webp`;
            uploadPromises.push(
              this.client.storage.from(bucket).upload(webpPath, webpBlob, { contentType: "image/webp", cacheControl: "31536000" })
                .then(res => {
                  if (res.error) throw res.error;
                  const { data } = this.client.storage.from(bucket).getPublicUrl(webpPath);
                  webpUrls[`${w}w`] = data.publicUrl;
                })
            );
          }
          
          const avifBlob = pipelineResult.avifSizes[w];
          if (avifBlob) {
            const avifPath = `avif/${w}w/${uniqueId}_${cleanBaseName}.avif`;
            uploadPromises.push(
              this.client.storage.from(bucket).upload(avifPath, avifBlob, { contentType: "image/avif", cacheControl: "31536000" })
                .then(res => {
                  if (res.error) throw res.error;
                  const { data } = this.client.storage.from(bucket).getPublicUrl(avifPath);
                  avifUrls[`${w}w`] = data.publicUrl;
                })
            );
          }
        });
        
        await Promise.all(uploadPromises);
        
        const endTime = performance.now();
        const conversionTime = endTime - startTime;
        
        // Calculate total size of generated files vs original size
        let totalOptimizedSize = 0;
        Object.values(pipelineResult.webpSizes).forEach(b => totalOptimizedSize += b.size);
        Object.values(pipelineResult.avifSizes).forEach(b => totalOptimizedSize += b.size);
        const savingsPercent = Math.max(0, Math.round(((activeFile.size - totalOptimizedSize / (TARGET_WIDTHS.length * 2)) / activeFile.size) * 100));
        
        console.log(`[ImagePipeline] Conversion succeeded in ${conversionTime.toFixed(1)}ms. Average savings: ${savingsPercent}%`);
        
        metadata = {
          width: pipelineResult.width,
          height: pipelineResult.height,
          originalSize: activeFile.size,
          original: fileUrl,
          webp: webpUrls,
          avif: avifUrls,
          conversionTimeMs: conversionTime,
          savingsPercent
        };
      } catch (e: any) {
        console.error("Optimized conversion or upload failed, falling back to standard upload:", e);
        uploadError = e;
      }
    }
    
    // Fallback standard upload if not converted or if conversion failed
    if (!isConvertibleImage || uploadError) {
      uploadError = null;
      try {
        const result = await this.client.storage.from(bucket).upload(path, activeFile, { cacheControl: "31536000" });
        uploadError = result.error;
        
        if (uploadError && bucket !== "uploads") {
          const msg = uploadError.message || "";
          if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("bucket")) {
            const fallbackResult = await this.client.storage.from("uploads").upload(path, activeFile, { cacheControl: "31536000" });
            uploadError = fallbackResult.error;
            actualBucket = "uploads";
          }
        }
      } catch (e: any) {
        uploadError = e;
      }

      if (uploadError) {
        // Only use Base64 fallback for images — videos/docs cannot be embedded as base64
        if (!isConvertibleImage || bucket === "images") {
          console.warn(`Supabase Storage upload failed, activating Base64 resilient failover. Error: ${uploadError.message || uploadError}`);
          try {
            fileUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(activeFile);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = error => reject(error);
            });
            isFallbackBase64 = true;
          } catch (base64Err: any) {
            throw new Error(`Upload and Base64 conversion failed: ${uploadError.message || uploadError}`);
          }
        } else {
          // For videos and other non-image media, base64 is not viable — surface the error
          throw new Error(`ভিডিও আপলোড ব্যর্থ হয়েছে: ${uploadError.message || uploadError}`);
        }
      } else {
        const { data: urlData } = this.client.storage.from(actualBucket).getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }
    }

    // 5. Save to Media Library
    const newItem: MediaItem = {
      id: generateUUID(),
      name: file.name,
      url: fileUrl,
      file_path: isFallbackBase64 ? undefined : (isConvertibleImage ? `original/${path}` : path),
      bucket_name: isFallbackBase64 ? "base64_fallback" : actualBucket,
      mime_type: activeFile.type,
      file_size: activeFile.size,
      source: "upload",
      uploaded_at: new Date().toISOString()
    };

    if (isConvertibleImage && !uploadError) {
      newItem.metadata = metadata;
    } else if (activeFile.type.startsWith("image/")) {
      try {
        const dimensions = await this.getImageDimensions(fileUrl);
        newItem.metadata = {
          width: dimensions.width,
          height: dimensions.height,
          is_base64: isFallbackBase64
        };
      } catch (e) {
        // Ignore dimension parsing errors
      }
    }

    await this.saveItemMetadata(newItem);
    return newItem;
  }


  /**
   * Registers an external URL asset into the media library
   */
  async registerExternalUrl(url: string, name: string): Promise<MediaItem> {
    if (!url || !url.trim()) throw new Error("URL cannot be empty");
    
    const newItem: MediaItem = {
      id: generateUUID(),
      name: name || url.split("/").pop() || "External Asset",
      url: url,
      bucket_name: "uploads",
      mime_type: url.endsWith(".mp4") ? "video/mp4" : "image/jpeg", // fallback guess
      file_size: 0,
      source: "external_url",
      uploaded_at: new Date().toISOString()
    };

    if (!url.endsWith(".mp4") && !url.endsWith(".webm")) {
      try {
        const dimensions = await this.getImageDimensions(url);
        newItem.metadata = { width: dimensions.width, height: dimensions.height };
      } catch (e) {}
    }

    await this.saveItemMetadata(newItem);
    return newItem;
  }

  /**
   * Retrieves all items registered in the media library
   */
  async fetchItems(): Promise<MediaItem[]> {
    try {
      // 1. Try fetching from media_library table first
      const { data, error } = await this.client
        .from("media_library" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return (data as any[]).map(item => ({
          id: item.id,
          name: item.name,
          url: item.url,
          file_path: item.file_path,
          bucket_name: item.bucket_name,
          mime_type: item.mime_type,
          file_size: Number(item.file_size),
          source: item.source as any,
          metadata: item.metadata,
          uploaded_at: item.created_at
        }));
      }
    } catch (e) {
      // Fail silently to trigger fallback
    }

    // 2. Fallback: load from store_settings JSON array
    const { data } = await this.client
      .from("store_settings" as any)
      .select("value")
      .eq("key", "media_library_items")
      .maybeSingle();

    return (data?.value as MediaItem[]) || [];
  }

  /**
   * Deletes a media item from storage and metadata registries
   */
  async delete(item: MediaItem): Promise<void> {
    // 1. Remove from Storage Bucket if it was uploaded
    if (item.source === "upload" && item.file_path) {
      await this.client.storage.from(item.bucket_name).remove([item.file_path]);
    }

    // 2. Try removing from media_library table
    try {
      const { error } = await this.client
        .from("media_library" as any)
        .delete()
        .eq("id", item.id);

      if (!error) return;
    } catch (e) {}

    // 3. Fallback: filter and save back to store_settings
    const { data } = await this.client
      .from("store_settings" as any)
      .select("value")
      .eq("key", "media_library_items")
      .maybeSingle();

    const current: MediaItem[] = (data?.value as MediaItem[]) || [];
    const updated = current.filter(x => x.id !== item.id);
    
    await this.client.from("store_settings" as any).upsert({
      key: "media_library_items",
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });
  }

  /**
   * Helper to write item metadata in database with fallback
   */
  private async saveItemMetadata(item: MediaItem): Promise<void> {
    // 1. Try table insertion
    try {
      const payload = {
        id: item.id,
        name: item.name,
        url: item.url,
        file_path: item.file_path,
        bucket_name: item.bucket_name,
        mime_type: item.mime_type,
        file_size: item.file_size,
        source: item.source,
        metadata: item.metadata || {},
        created_at: item.uploaded_at
      };

      const { error } = await this.client
        .from("media_library" as any)
        .insert(payload as any);

      if (!error) return;
    } catch (e) {}

    // 2. Fallback: fetch JSON list from store_settings, append and upsert
    const { data } = await this.client
      .from("store_settings" as any)
      .select("value")
      .eq("key", "media_library_items")
      .maybeSingle();

    const current: MediaItem[] = (data?.value as MediaItem[]) || [];
    // Prevent duplicate IDs
    const filtered = current.filter(x => x.id !== item.id);
    const updated = [item, ...filtered];

    await this.client.from("store_settings" as any).upsert({
      key: "media_library_items",
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });
  }

  /**
   * Gets image dimensions asynchronously
   */
  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  }
}

export const mediaService = new MediaService();
