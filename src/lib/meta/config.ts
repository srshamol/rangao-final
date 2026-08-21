import { DEFAULT_GRAPH_API_VERSION, META_GRAPH_API_BASE } from "./constants";

export const AUTHORITATIVE_META_DATASET_ID = "1862583688445311";
export const INVALID_META_DATASET_IDS: readonly string[] = ["18625836884445311"];

/**
 * Validates if a Meta Dataset / Pixel ID is valid and NOT in the invalid list or placeholder.
 */
export function isMetaDatasetIdValid(pixelId?: string | null): boolean {
  if (!pixelId) return false;
  const clean = String(pixelId).trim();
  if (INVALID_META_DATASET_IDS.includes(clean)) return false;
  if (clean === "123456789012345" || clean.length < 5) return false;
  return /^\d+$/.test(clean);
}

/**
 * Returns the single authoritative Meta Dataset / Pixel ID.
 * Any occurrence of the invalid 17-digit ID (18625836884445311) is strictly rejected
 * and replaced with the authoritative 16-digit ID (1862583688445311).
 */
export function getMetaDatasetId(providedId?: string | null): string {
  if (providedId && typeof providedId === "string") {
    const clean = providedId.trim();
    if (INVALID_META_DATASET_IDS.includes(clean)) {
      return AUTHORITATIVE_META_DATASET_ID;
    }
    if (isMetaDatasetIdValid(clean)) {
      return clean;
    }
  }

  // Check client-side environment variables (Vite / Next.js)
  const envId =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_META_PIXEL_ID) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.NEXT_PUBLIC_META_PIXEL_ID) ||
    (typeof process !== "undefined" && (process.env?.META_PIXEL_ID || process.env?.NEXT_PUBLIC_META_PIXEL_ID || process.env?.VITE_META_PIXEL_ID));

  if (envId && typeof envId === "string") {
    const cleanEnv = envId.trim();
    if (isMetaDatasetIdValid(cleanEnv)) {
      return cleanEnv;
    }
  }

  return AUTHORITATIVE_META_DATASET_ID;
}

/**
 * Returns the sanitized Meta Graph API Version (e.g. "v21.0").
 */
export function getMetaGraphApiVersion(providedVersion?: string | null): string {
  if (providedVersion && typeof providedVersion === "string") {
    const clean = providedVersion.trim();
    if (/^v\d+\.\d+$/.test(clean)) {
      return clean;
    }
  }

  const envVersion =
    (typeof process !== "undefined" && process.env?.META_GRAPH_API_VERSION) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.META_GRAPH_API_VERSION);

  if (envVersion && typeof envVersion === "string" && /^v\d+\.\d+$/.test(envVersion.trim())) {
    return envVersion.trim();
  }

  return DEFAULT_GRAPH_API_VERSION;
}

/**
 * Returns the full Meta Graph API events endpoint for CAPI.
 */
export function getMetaCapiEndpoint(datasetId?: string | null, apiVersion?: string | null): string {
  const id = getMetaDatasetId(datasetId);
  const version = getMetaGraphApiVersion(apiVersion);
  return `${META_GRAPH_API_BASE}/${version}/${id}/events`;
}
