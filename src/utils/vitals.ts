import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";

/**
 * Send a Web Vital metric to GA4 via GTM dataLayer.
 * Falls back to console.debug in development so you can see values locally.
 */
const sendToAnalytics = (metric: Metric) => {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    console.debug(`[Web Vital] ${metric.name}:`, Math.round(metric.value), metric.rating);
  }

  // Push to GTM dataLayer → GA4 picks it up via a custom event trigger
  if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
    (window as any).dataLayer.push({
      event: "web_vital",
      metric_name: metric.name,        // e.g. "LCP"
      metric_value: Math.round(metric.value), // milliseconds (or unitless for CLS)
      metric_delta: Math.round(metric.delta),
      metric_rating: metric.rating,    // "good" | "needs-improvement" | "poor"
      metric_id: metric.id,
    });
  }
};

/**
 * Register all Core Web Vitals.
 * Call this once after the app mounts.
 * Only call when the user has accepted analytics cookies.
 */
export function registerVitals(): void {
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
