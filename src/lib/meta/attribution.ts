// First-party Meta Attribution & Campaign Tracker (fbp, fbc, fbclid, UTMs)

import type { MetaAttributionContext } from "./types";

const STORAGE_KEY = "rangao_meta_attribution";

/**
 * Gets a cookie value by name.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined" || !document.cookie) return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Sets a first-party cookie with secure defaults.
 */
function setCookie(name: string, value: string, days = 90): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const domain = window.location.hostname === "localhost" ? "" : `; domain=${window.location.hostname}`;
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/${domain}; SameSite=Lax`;
}

/**
 * Extracts and captures attribution parameters from the current URL and browser environment.
 * Runs on initial page load / route changes to guarantee attribution data is never lost.
 */
export function captureAttribution(): MetaAttributionContext {
  if (typeof window === "undefined") {
    return {
      fbp: null,
      fbc: null,
      fbclid: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      referrer: null,
      landing_page: null,
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get("fbclid");
  const utm_source = urlParams.get("utm_source");
  const utm_medium = urlParams.get("utm_medium");
  const utm_campaign = urlParams.get("utm_campaign");
  const utm_content = urlParams.get("utm_content");
  const utm_term = urlParams.get("utm_term");

  // Read existing cookie or generate _fbc if fbclid exists
  let fbc = getCookie("_fbc");
  if (fbclid && (!fbc || fbc.indexOf(fbclid) === -1)) {
    // Format: fb.1.{creation_time_unix_ms}.{fbclid}
    fbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie("_fbc", fbc, 90);
  }

  // Read _fbp cookie (created by Meta Pixel fbevents.js or fallback)
  let fbp = getCookie("_fbp");
  if (!fbp) {
    const storedFbp = localStorage.getItem("rangao_fbp");
    if (storedFbp) {
      fbp = storedFbp;
    }
  } else {
    localStorage.setItem("rangao_fbp", fbp);
  }

  // Load existing saved attribution from localStorage
  let savedContext: Partial<MetaAttributionContext> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) savedContext = JSON.parse(raw);
  } catch {
    savedContext = {};
  }

  const currentContext: MetaAttributionContext = {
    fbp: fbp || savedContext.fbp || null,
    fbc: fbc || savedContext.fbc || null,
    fbclid: fbclid || savedContext.fbclid || null,
    utm_source: utm_source || savedContext.utm_source || null,
    utm_medium: utm_medium || savedContext.utm_medium || null,
    utm_campaign: utm_campaign || savedContext.utm_campaign || null,
    utm_content: utm_content || savedContext.utm_content || null,
    utm_term: utm_term || savedContext.utm_term || null,
    referrer: document.referrer || savedContext.referrer || null,
    landing_page: savedContext.landing_page || window.location.href,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentContext));
  } catch {
    // ignore storage quota errors
  }

  return currentContext;
}

/**
 * Retrieves the current attribution context to attach to orders or CAPI calls.
 */
export function getAttributionContext(): MetaAttributionContext {
  return captureAttribution();
}

/**
 * Returns the current _fbp (Facebook browser pixel ID).
 */
export function getFbp(): string | null {
  return getCookie("_fbp") || (typeof localStorage !== "undefined" ? localStorage.getItem("rangao_fbp") : null);
}

/**
 * Returns the current _fbc (Facebook click ID).
 */
export function getFbc(): string | null {
  return getCookie("_fbc") || getAttributionContext().fbc;
}
