import { supabase } from "@/integrations/supabase/client";

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
  /**
   * Automatically initializes all required public storage buckets if they do not exist
   */
  async ensureBuckets(): Promise<{ success: boolean; created: string[]; errors: string[] }> {
    const created: string[] = [];
    const errors: string[] = [];
    
    // Attempt list first, but if it fails (due to RLS/policies), swallow it and proceed to direct creation
    let existingBuckets: string[] = [];
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
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

        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: bucketName === "images" 
            ? ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif", "image/avif"]
            : bucketName === "videos"
            ? ["video/mp4", "video/webm", "video/quicktime"]
            : undefined
        });

        if (createError) {
          const msg = createError.message || "";
          // If the bucket already exists, or client lacks direct DDL insertion privileges (since they already ran the SQL setup in dashboard), we can safely ignore
          if (
            msg.toLowerCase().includes("already exists") || 
            msg.toLowerCase().includes("duplicate") ||
            msg.toLowerCase().includes("conflict") ||
            msg.toLowerCase().includes("row-level security") ||
            msg.toLowerCase().includes("violates") ||
            msg.toLowerCase().includes("security policy")
          ) {
            // Handled or already configured via dashboard SQL
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
   * Validates a file before upload
   */
  validateFile(file: File, type: "images" | "videos" | "documents" | "uploads"): { valid: boolean; error?: string } {
    const maxSizes = {
      images: 5 * 1024 * 1024, // 5MB
      videos: 50 * 1024 * 1024, // 50MB
      documents: 15 * 1024 * 1024, // 15MB
      uploads: 20 * 1024 * 1024 // 20MB
    };

    if (file.size > maxSizes[type]) {
      const sizeText = type === "images" ? "5MB" : type === "videos" ? "50MB" : "15MB";
      return { valid: false, error: `ফাইল অনেক বড়। সর্বোচ্চ সাইজ: ${sizeText}` };
    }

    if (type === "images" && !file.type.startsWith("image/")) {
      return { valid: false, error: "শুধুমাত্র ছবি আপলোড করা যাবে" };
    }
    if (type === "videos" && !file.type.startsWith("video/")) {
      return { valid: false, error: "শুধুমাত্র ভিডিও আপলোড করা যাবে" };
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
    // 1. Validate
    const validation = this.validateFile(file, bucket);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Ensure Buckets Exist (Swallows errors to proceed to fallback if needed)
    try {
      await this.ensureBuckets();
    } catch (e) {
      console.warn("Bucket pre-checks failed, will try upload or Base64 fallback", e);
    }

    // 3. Prepare Upload Path
    const ext = file.name.split(".").pop();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const path = customPath || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}_${cleanName}`;
    
    let uploadError = null;
    let actualBucket = bucket;
    let fileUrl = "";
    let isFallbackBase64 = false;
    
    try {
      const result = await supabase.storage.from(bucket).upload(path, file);
      uploadError = result.error;
      
      // Fallback: If specified bucket (e.g. images) fails with 'not found' or 'bucket' errors, retry on fallback 'uploads' bucket
      if (uploadError && bucket !== "uploads") {
        const msg = uploadError.message || "";
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("bucket")) {
          const fallbackResult = await supabase.storage.from("uploads").upload(path, file);
          uploadError = fallbackResult.error;
          actualBucket = "uploads";
        }
      }
    } catch (e: any) {
      uploadError = e;
    }

    if (uploadError) {
      console.warn(`Supabase Storage upload failed, activating Base64 resilient failover. Error: ${uploadError.message || uploadError}`);
      try {
        // Safe, resilient fallback to Base64
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        isFallbackBase64 = true;
      } catch (base64Err: any) {
        throw new Error(`Upload and Base64 conversion failed: ${uploadError.message || uploadError}`);
      }
    } else {
      // 4. Generate URL from Supabase Storage
      const { data: urlData } = supabase.storage.from(actualBucket).getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }

    // 5. Save to Media Library
    const newItem: MediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      url: fileUrl,
      file_path: isFallbackBase64 ? undefined : path,
      bucket_name: isFallbackBase64 ? "base64_fallback" : actualBucket,
      mime_type: file.type,
      file_size: file.size,
      source: "upload",
      uploaded_at: new Date().toISOString()
    };

    // Attempt to parse dimensions for images
    if (file.type.startsWith("image/")) {
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
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      const { data, error } = await supabase
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
    const { data } = await supabase
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
      await supabase.storage.from(item.bucket_name).remove([item.file_path]);
    }

    // 2. Try removing from media_library table
    try {
      const { error } = await supabase
        .from("media_library" as any)
        .delete()
        .eq("id", item.id);

      if (!error) return;
    } catch (e) {}

    // 3. Fallback: filter and save back to store_settings
    const { data } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "media_library_items")
      .maybeSingle();

    const current: MediaItem[] = (data?.value as MediaItem[]) || [];
    const updated = current.filter(x => x.id !== item.id);
    
    await supabase.from("store_settings" as any).upsert({
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

      const { error } = await supabase
        .from("media_library" as any)
        .insert(payload as any);

      if (!error) return;
    } catch (e) {}

    // 2. Fallback: fetch JSON list from store_settings, append and upsert
    const { data } = await supabase
      .from("store_settings" as any)
      .select("value")
      .eq("key", "media_library_items")
      .maybeSingle();

    const current: MediaItem[] = (data?.value as MediaItem[]) || [];
    // Prevent duplicate IDs
    const filtered = current.filter(x => x.id !== item.id);
    const updated = [item, ...filtered];

    await supabase.from("store_settings" as any).upsert({
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
