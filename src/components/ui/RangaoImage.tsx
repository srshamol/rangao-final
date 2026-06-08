import React, { useState, useEffect } from "react";

interface RangaoImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  aspectRatio?: string;
  style?: React.CSSProperties;
}

export default function RangaoImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = "",
  aspectRatio,
  style,
}: RangaoImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Helper to generate proxy URLs for different widths
  const getProxyUrl = (originalUrl: string, w: number) => {
    // If the image is already a data-url or fallback, return it
    if (originalUrl.startsWith("data:") || originalUrl.startsWith("blob:")) {
      return originalUrl;
    }

    // Extract path from R2 bucket URL
    // e.g., https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/products/frame.jpg
    // we want /img/products/frame.jpg?w=X&fmt=webp
    try {
      const urlObj = new URL(originalUrl);
      if (urlObj.hostname.includes("r2.dev")) {
        const path = urlObj.pathname;
        return `/img${path}?w=${w}&fmt=webp&q=75`;
      }
    } catch (e) {
      // If it's a relative URL
      if (originalUrl.startsWith("/")) {
        return `/img${originalUrl}?w=${w}&fmt=webp&q=75`;
      }
    }

    return originalUrl;
  };

  // If the worker/proxy fails or is not applicable, fall back to the original URL
  const srcSet = useFallback
    ? undefined
    : `${getProxyUrl(src, 400)} 400w, ${getProxyUrl(src, 800)} 800w, ${getProxyUrl(src, 1200)} 1200w`;

  const displaySrc = useFallback
    ? src
    : getProxyUrl(src, 800);

  // 8x8 SVG placeholder acting as an ultra-lightweight low-quality placeholder (LQIP)
  const lqipPlaceholder = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23112a20' opacity='0.15'/></svg>`;

  const aspect = aspectRatio || `${width} / ${height}`;

  return (
    <div
      className="relative overflow-hidden bg-secondary/35"
      style={{
        aspectRatio: aspect,
        width: "100%",
      }}
    >
      {/* Blurred Low Quality Placeholder */}
      {!isLoaded && (
        <img
          src={lqipPlaceholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover blur-md scale-105 transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* Main Image */}
      <img
        src={displaySrc}
        srcSet={srcSet}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        {...({ fetchpriority: priority ? "high" : "auto" } as any)}
        onError={() => setUseFallback(true)}
        onLoad={() => setIsLoaded(true)}
        style={{
          aspectRatio: aspect,
          ...style,
        }}
        className={`h-full w-full object-cover transition-all duration-500 ${
          isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-sm"
        } ${className}`}
      />
    </div>
  );
}
