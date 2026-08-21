/**
 * Utility functions for Bangladeshi Mobile Number Validation & Normalization
 * Supports formats:
 * - 01[3-9]XXXXXXXX (11 digits)
 * - 8801[3-9]XXXXXXXX (13 digits)
 * - +8801[3-9]XXXXXXXX (14 chars)
 */

export const BD_PHONE_REGEX = /^(?:\+?88|88)?(01[3-9]\d{8})$/;

/**
 * Checks if a given phone string is a valid Bangladeshi mobile number
 */
export function isValidBDPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.trim().replace(/[\s-]/g, "");
  return BD_PHONE_REGEX.test(clean);
}

/**
 * Normalizes any valid Bangladeshi phone format (+8801..., 8801..., 01...)
 * into the standard 11-digit local format: 01XXXXXXXXX
 */
export function normalizeBDPhone(phone: string): string {
  if (!phone) return "";
  const clean = phone.trim().replace(/[\s-]/g, "");
  const match = clean.match(BD_PHONE_REGEX);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
}
