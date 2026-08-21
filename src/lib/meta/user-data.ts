// User matching data extractor, normalizer, and SHA-256 hasher for Meta CAPI

import { normalizePhone, normalizeEmail, normalizeString } from "./normalize";
import { getFbp, getFbc } from "./attribution";
import type { RawUserData, MetaUserData } from "./types";

/**
 * Computes SHA-256 hash of a string using Web Crypto API or Node crypto fallback.
 * Returns lowercase hex string.
 */
export async function sha256(value: string): Promise<string> {
  if (!value) return "";

  const cryptoObj =
    typeof globalThis !== "undefined" && globalThis.crypto
      ? globalThis.crypto
      : typeof window !== "undefined"
      ? window.crypto
      : null;

  if (cryptoObj?.subtle) {
    const msgBuffer = new TextEncoder().encode(value.trim());
    const hashBuffer = await cryptoObj.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  return "";
}

/**
 * Builds Meta-compliant user_data object with SHA-256 hashed fields.
 * Unhashed fields: client_ip_address, client_user_agent, fbp, fbc.
 */
export async function buildHashedUserData(raw: RawUserData): Promise<MetaUserData> {
  const userData: MetaUserData = {};

  // Email (em)
  const cleanEmail = normalizeEmail(raw.email);
  if (cleanEmail) {
    const hashed = await sha256(cleanEmail);
    if (hashed) userData.em = [hashed];
  }

  // Phone (ph) - Bangladesh E.164 (e.g. 8801712345678)
  const cleanPhone = normalizePhone(raw.phone);
  if (cleanPhone) {
    const hashed = await sha256(cleanPhone);
    if (hashed) userData.ph = [hashed];
  }

  // Name (fn, ln)
  let firstName = normalizeString(raw.firstName);
  let lastName = normalizeString(raw.lastName);

  if (!firstName && raw.fullName) {
    const parts = raw.fullName.trim().split(/\s+/);
    if (parts.length > 0) firstName = normalizeString(parts[0]);
    if (parts.length > 1) lastName = normalizeString(parts[parts.length - 1]);
  }

  if (firstName) {
    const hashed = await sha256(firstName);
    if (hashed) userData.fn = [hashed];
  }
  if (lastName) {
    const hashed = await sha256(lastName);
    if (hashed) userData.ln = [hashed];
  }

  // City (ct)
  const cleanCity = normalizeString(raw.city);
  if (cleanCity) {
    const hashed = await sha256(cleanCity);
    if (hashed) userData.ct = [hashed];
  }

  // State / Division (st)
  const cleanState = normalizeString(raw.state);
  if (cleanState) {
    const hashed = await sha256(cleanState);
    if (hashed) userData.st = [hashed];
  }

  // Zip Code (zp)
  const cleanZip = normalizeString(raw.zipCode);
  if (cleanZip) {
    const hashed = await sha256(cleanZip);
    if (hashed) userData.zp = [hashed];
  }

  // Country (country) - default "bd"
  const country = normalizeString(raw.country || "bd");
  if (country) {
    const hashed = await sha256(country);
    if (hashed) userData.country = [hashed];
  }

  // External ID (external_id)
  if (raw.externalId) {
    const hashed = await sha256(String(raw.externalId).trim());
    if (hashed) userData.external_id = [hashed];
  }

  // Non-hashed parameters
  const fbp = raw.fbp || getFbp();
  if (fbp) userData.fbp = fbp;

  const fbc = raw.fbc || getFbc();
  if (fbc) userData.fbc = fbc;

  if (raw.clientIp) {
    userData.client_ip_address = raw.clientIp;
  }

  const userAgent = raw.clientUserAgent || (typeof navigator !== "undefined" ? navigator.userAgent : undefined);
  if (userAgent) {
    userData.client_user_agent = userAgent;
  }

  return userData;
}
