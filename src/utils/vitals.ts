import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";

export interface VitalSnapshot {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  timestamp: string;
}

// In-memory store of recent vitals for local health monitoring & admin diagnostics
const vitalsSnapshot: Record<string, VitalSnapshot> = {};

/**
 * Standard thresholds defined by Google Core Web Vitals
 */
export const VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: "ms" },
  INP: { good: 200, poor: 500, unit: "ms" },
  CLS: { good: 0.1, poor: 0.25, unit: "score" },
  FCP: { good: 1800, poor: 3000, unit: "ms" },
  TTFB: { good: 800, poor: 1800, unit: "ms" },
} as const;

/**
 * Send a Web Vital metric to GA4 via GTM dataLayer and store in local diagnostics.
 */
const sendToAnalytics = (metric: Metric) => {
  const isDev = import.meta.env.DEV;
  const roundedVal = metric.name === "CLS" ? Number(metric.value.toFixed(3)) : Math.round(metric.value);

  vitalsSnapshot[metric.name] = {
    name: metric.name,
    value: roundedVal,
    rating: metric.rating,
    delta: Math.round(metric.delta),
    id: metric.id,
    timestamp: new Date().toISOString(),
  };

  if (isDev) {
    if (metric.rating === "poor") {
      console.warn(`[Web Vital POOR] ${metric.name}: ${roundedVal} (${metric.rating})`);
    } else {
      console.debug(`[Web Vital] ${metric.name}:`, roundedVal, metric.rating);
    }
  }

  // Push to GTM dataLayer → GA4 picks it up via a custom event trigger
  if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
    (window as any).dataLayer.push({
      event: "web_vital",
      metric_name: metric.name,
      metric_value: roundedVal,
      metric_delta: Math.round(metric.delta),
      metric_rating: metric.rating,
      metric_id: metric.id,
    });
  }
};

/**
 * Register all Core Web Vitals.
 * Call this once after the app mounts.
 */
export function registerVitals(): void {
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

/**
 * Returns latest recorded Web Vitals snapshot for operational health
 */
export function getLatestVitals(): Record<string, VitalSnapshot> {
  return { ...vitalsSnapshot };
}
