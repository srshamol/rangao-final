/**
 * Core Image Conversion & Resizing Pipeline
 * Handles client-side scaling and format conversions (AVIF / WebP) using the browser Canvas API
 */

export interface ProcessedImageResult {
  original: File;
  width: number;
  height: number;
  originalSize: number;
  webpSizes: { [width: number]: Blob };
  avifSizes: { [width: number]: Blob };
}

export const TARGET_WIDTHS = [320, 640, 1024, 1600, 2400] as const;

let avifConversionSupported: boolean | null = null;

/**
 * Checks if the browser's Canvas.toBlob supports AVIF encoding.
 */
export async function checkAvifSupport(): Promise<boolean> {
  if (avifConversionSupported !== null) return avifConversionSupported;
  
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      canvas.toBlob((blob) => {
        avifConversionSupported = blob?.type === "image/avif";
        resolve(avifConversionSupported);
      }, "image/avif");
    } catch (e) {
      avifConversionSupported = false;
      resolve(false);
    }
  });
}

/**
 * Helper to load a File into an HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image into element"));
    };
    img.src = url;
  });
}

/**
 * Helper to convert an image URL or image element into another format & size via canvas
 */
export async function resizeAndConvert(
  img: HTMLImageElement,
  format: "image/webp" | "image/avif",
  targetWidth: number,
  quality: number
): Promise<Blob> {
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;
  
  // Do NOT upscale images
  const finalWidth = Math.min(targetWidth, originalWidth);
  const scaleFactor = finalWidth / originalWidth;
  const finalHeight = Math.round(originalHeight * scaleFactor);
  
  const canvas = document.createElement("canvas");
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context from canvas");
  
  // Enable high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  
  ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`Failed to create blob for ${format} at width ${targetWidth}`));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Process a given image File. Generates responsive sizes for WebP and AVIF.
 */
export async function processImage(file: File): Promise<ProcessedImageResult> {
  // Do NOT convert SVGs
  if (file.type === "image/svg+xml") {
    throw new Error("SVG files should not be converted");
  }

  const img = await loadImage(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  
  const webpSizes: { [width: number]: Blob } = {};
  const avifSizes: { [width: number]: Blob } = {};
  
  const hasAvifSupport = await checkAvifSupport();
  
  for (const targetWidth of TARGET_WIDTHS) {
    // WebP conversions (Quality: 70–80%, using 0.75 as sweet spot)
    const webpBlob = await resizeAndConvert(img, "image/webp", targetWidth, 0.75);
    webpSizes[targetWidth] = webpBlob;
    
    // AVIF conversions (Quality: 45–60%, using 0.50 as sweet spot)
    if (hasAvifSupport) {
      try {
        const avifBlob = await resizeAndConvert(img, "image/avif", targetWidth, 0.50);
        avifSizes[targetWidth] = avifBlob;
      } catch (e) {
        console.warn(`AVIF conversion failed for width ${targetWidth}, falling back to WebP blob`, e);
        avifSizes[targetWidth] = webpBlob; // Fallback to WebP blob if AVIF fails natively
      }
    } else {
      // Fallback: browser does not support AVIF canvas export, so WebP acts as WebP/AVIF fallback
      avifSizes[targetWidth] = webpBlob;
    }
  }
  
  return {
    original: file,
    width,
    height,
    originalSize: file.size,
    webpSizes,
    avifSizes
  };
}
