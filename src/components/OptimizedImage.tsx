import React, { useMemo, useEffect } from "react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  metadata?: {
    width?: number;
    height?: number;
    original?: string;
    webp?: { [key: string]: string };
    avif?: { [key: string]: string };
    [key: string]: any;
  };
  aspectRatio?: string;
  containerClassName?: string;
}

const RESPONSIVE_WIDTHS = [320, 640, 1024, 1600, 2400];

export default function OptimizedImage({
  src,
  alt = "Optimized Image",
  metadata,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  loading = "lazy",
  fetchPriority = "auto",
  className = "",
  aspectRatio,
  containerClassName = "",
  style,
  ...props
}: OptimizedImageProps) {

  // Process and extract source sets dynamically or from metadata
  const sources = useMemo(() => {
    if (!src) return { avif: null, webp: null, fallback: src, isOptimized: false };

    // 1. If explicit metadata exists
    if (metadata && (metadata.avif || metadata.webp)) {
      const avifSrcSet = metadata.avif
        ? Object.entries(metadata.avif)
            .map(([widthKey, url]) => `${url} ${widthKey.replace("w", "")}w`)
            .join(", ")
        : null;

      const webpSrcSet = metadata.webp
        ? Object.entries(metadata.webp)
            .map(([widthKey, url]) => `${url} ${widthKey.replace("w", "")}w`)
            .join(", ")
        : null;

      return {
        avif: avifSrcSet,
        webp: webpSrcSet,
        fallback: metadata.original || src,
        isOptimized: true
      };
    }

    // 2. Unsplash Dynamic URL Optimization
    if (src.includes("images.unsplash.com")) {
      const baseUrl = src.split("?")[0];
      const avifSrcSet = RESPONSIVE_WIDTHS.map(w => `${baseUrl}?auto=format&fm=avif&w=${w}&q=60 ${w}w`).join(", ");
      const webpSrcSet = RESPONSIVE_WIDTHS.map(w => `${baseUrl}?auto=format&fm=webp&w=${w}&q=75 ${w}w`).join(", ");
      
      return {
        avif: avifSrcSet,
        webp: webpSrcSet,
        fallback: `${baseUrl}?auto=format&w=1200&q=80`,
        isOptimized: true
      };
    }

    // 3. Supabase Storage Deterministic Path Mapping
    // Matches public Supabase URLs: .../storage/v1/object/public/bucket/original/171542456_my_photo.png
    // Or bucket root uploads: .../storage/v1/object/public/bucket/171542456_my_photo.png
    const supabaseMatch = src.match(/(.*\/storage\/v1\/object\/public\/)([a-zA-Z0-9_-]+)\/(original\/)?([0-9]+-[a-z0-9]+)_(.*)/);
    if (supabaseMatch) {
      const [_, baseUrl, bucket, __, uniqueId, fullFilename] = supabaseMatch;
      const baseNameWithoutExt = fullFilename.substring(0, fullFilename.lastIndexOf(".")) || fullFilename;
      const cleanBaseName = baseNameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_");
      
      const avifSrcSet = RESPONSIVE_WIDTHS.map(w => `${baseUrl}${bucket}/avif/${w}w/${uniqueId}_${cleanBaseName}.avif ${w}w`).join(", ");
      const webpSrcSet = RESPONSIVE_WIDTHS.map(w => `${baseUrl}${bucket}/webp/${w}w/${uniqueId}_${cleanBaseName}.webp ${w}w`).join(", ");
      
      return {
        avif: avifSrcSet,
        webp: webpSrcSet,
        fallback: src,
        isOptimized: true
      };
    }

    return { avif: null, webp: null, fallback: src, isOptimized: false };
  }, [src, metadata]);

  // Inject preload hint synchronously (not in useEffect) so it fires before paint.
  // IMPORTANT: The preload link's `href` must match the URL the browser actually downloads
  // from the <picture><source> element, otherwise the browser warns "preloaded but not used".
  // When imagesrcset is set, the browser picks a candidate based on viewport — we set href to
  // the 1600w candidate (the most likely winner for full-width hero images) so it can match.
  if (
    typeof window !== "undefined" &&
    loading === "eager" &&
    fetchPriority === "high" &&
    sources.fallback
  ) {
    // Key the dedup check on the src so each unique image gets exactly one preload
    const existingPreload = document.querySelector(`link[rel="preload"][data-src="${sources.fallback}"]`);
    if (!existingPreload) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      // Tag for dedup — avoids double-injecting for the same src on re-renders
      link.setAttribute("data-src", sources.fallback);

      if (sources.avif) {
        // Extract the 1600w AVIF URL as the primary href so the browser can match it
        const avifEntries = sources.avif.split(",").map((s) => s.trim());
        const candidate1600 = avifEntries.find((s) => s.includes("1600w")) || avifEntries[avifEntries.length - 1];
        const candidateUrl = candidate1600.split(" ")[0];
        link.href = candidateUrl;
        link.setAttribute("imagesrcset", sources.avif);
        link.setAttribute("imagesizes", sizes as string);
        link.setAttribute("type", "image/avif");
      } else if (sources.webp) {
        const webpEntries = sources.webp.split(",").map((s) => s.trim());
        const candidate1600 = webpEntries.find((s) => s.includes("1600w")) || webpEntries[webpEntries.length - 1];
        const candidateUrl = candidate1600.split(" ")[0];
        link.href = candidateUrl;
        link.setAttribute("imagesrcset", sources.webp);
        link.setAttribute("imagesizes", sizes as string);
        link.setAttribute("type", "image/webp");
      } else {
        link.href = sources.fallback;
      }

      link.setAttribute("fetchpriority", "high");
      document.head.prepend(link); // prepend = highest priority
    }
  }



  // Handle visual properties to prevent layout shifts (CLS)
  const computedStyle = useMemo(() => {
    const finalStyle: React.CSSProperties = { ...style };
    
    // Set custom aspect ratio or use default from metadata if available
    if (aspectRatio) {
      finalStyle.aspectRatio = aspectRatio;
    } else if (metadata?.width && metadata?.height) {
      finalStyle.aspectRatio = `${metadata.width} / ${metadata.height}`;
    }
    
    return finalStyle;
  }, [aspectRatio, metadata, style]);

  if (!src) return null;

  const imageElement = (
    <img
      src={sources.fallback}
      alt={alt}
      loading={loading}
      {...({ fetchpriority: fetchPriority } as any)}
      style={computedStyle}
      className={`w-full h-auto transition-all duration-300 ${className}`}
      {...props}
    />
  );

  if (sources.isOptimized) {
    return (
      <picture className={`block w-full h-full overflow-hidden ${containerClassName}`}>
        {sources.avif && <source srcSet={sources.avif} sizes={sizes} type="image/avif" />}
        {sources.webp && <source srcSet={sources.webp} sizes={sizes} type="image/webp" />}
        {imageElement}
      </picture>
    );
  }

  return imageElement;
}
