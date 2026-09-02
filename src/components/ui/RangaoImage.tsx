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

const BRANDED_PLACEHOLDER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 350" width="100%" height="100%"><rect width="100%" height="100%" fill="%23112a20" opacity="0.06"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="600" fill="%23112a20" opacity="0.35">Rangao</text></svg>`;

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
  const [hasError, setHasError] = useState(false);

  // Helper to generate proxy URLs for different widths
  const getProxyUrl = (originalUrl: string, w: number) => {
    if (!originalUrl || originalUrl.startsWith("data:") || originalUrl.startsWith("blob:")) {
      return originalUrl;
    }

    try {
      const urlObj = new URL(originalUrl);
      if (urlObj.hostname.includes("r2.dev")) {
        const path = urlObj.pathname;
        return `/img${path}?w=${w}&fmt=webp&q=75`;
      }
    } catch (e) {
      if (originalUrl.startsWith("/")) {
        return `/img${originalUrl}?w=${w}&fmt=webp&q=75`;
      }
    }

    return originalUrl;
  };

  const srcSet = useFallback || hasError || !src
    ? undefined
    : `${getProxyUrl(src, 400)} 400w, ${getProxyUrl(src, 800)} 800w, ${getProxyUrl(src, 1200)} 1200w`;

  const displaySrc = hasError || !src
    ? BRANDED_PLACEHOLDER_SVG
    : useFallback
    ? src
    : getProxyUrl(src, 800);

  // 8x8 SVG placeholder acting as an ultra-lightweight low-quality placeholder (LQIP)
  const lqipPlaceholder = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23112a20' opacity='0.15'/></svg>`;

  const aspect = aspectRatio || `${width} / ${height}`;

  const handleError = () => {
    if (!useFallback && src) {
      setUseFallback(true);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

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
        onError={handleError}
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
