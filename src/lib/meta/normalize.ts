// Normalization utilities for Meta Pixel & CAPI according to Meta Specifications

import { DEFAULT_CURRENCY, DEFAULT_CONTENT_TYPE } from "./constants";
import type { EcommerceItem, MetaContentItem } from "./types";

/**
 * Normalizes a Bangladeshi phone number into standard international format for Meta CAPI (no leading +).
 * Input examples: "01712345678", "+8801712345678", "8801712345678", "017-1234-5678", "০১৭১২৩৪৫৬৭৮"
 * Output: "8801712345678"
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";

  // Convert Bengali digits to English
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let cleaned = String(phone).trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(bengaliDigits[i], i.toString());
  }

  // Remove non-digit characters
  cleaned = cleaned.replace(/\D/g, "");

  // Convert to standard 8801XXXXXXXXX
  if (cleaned.startsWith("880") && cleaned.length === 13) {
    return cleaned;
  }
  if (cleaned.startsWith("01") && cleaned.length === 11) {
    return `88${cleaned}`;
  }
  if (cleaned.startsWith("1") && cleaned.length === 10) {
    return `880${cleaned}`;
  }

  return cleaned;
}

/**
 * Normalizes email address according to Meta standards (lowercase, trimmed).
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return String(email).trim().toLowerCase();
}

/**
 * Normalizes general strings (names, cities, states) according to Meta standards.
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return String(str).trim().toLowerCase();
}

/**
 * Normalizes prices to numbers rounded to 2 decimal places.
 */
export function normalizePrice(price: number | string | null | undefined): number {
  if (price === null || price === undefined) return 0;
  const num = typeof price === "number" ? price : parseFloat(String(price));
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Normalizes a product or cart item into standard Meta content format.
 * Supports variable products and combo products.
 */
export function normalizeContentItem(item: EcommerceItem | any): MetaContentItem {
  const id = String(item.sku || item.productId || item.id || "unknown").trim();
  const quantity = Math.max(1, parseInt(String(item.quantity || 1), 10));
  const price = normalizePrice(item.price ?? item.unitPrice ?? item.item_price ?? 0);

  return {
    id,
    quantity,
    item_price: price,
    price,
    title: item.name || item.title || item.product_name || "",
    category: item.category || item.categoryLabel || "",
    brand: item.brand || "Rangao",
  };
}

/**
 * Normalizes an array of items into Meta contents structure.
 */
export function normalizeContents(items: Array<EcommerceItem | any>): MetaContentItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeContentItem);
}

/**
 * Extracts clean list of content_ids for Meta Pixel/CAPI.
 */
export function extractContentIds(items: Array<EcommerceItem | any>): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => String(item.sku || item.productId || item.id || "").trim())
    .filter(Boolean);
}

/**
 * Determines whether an order is eligible for Purchase event reporting.
 * Valid statuses: confirmed, processing, completed, delivered, or pending (for newly submitted orders).
 * Cancelled, refunded, or failed orders are excluded.
 */
export function isPurchaseEligible(order: { order_status?: string; payment_status?: string; total_amount?: number }): boolean {
  if (!order) return false;
  const status = (order.order_status || "").toLowerCase();
  const paymentStatus = (order.payment_status || "").toLowerCase();

  if (status === "cancelled" || status === "refunded" || status === "failed") {
    return false;
  }

  // Total amount must be a positive valid number
  const total = normalizePrice(order.total_amount);
  if (total <= 0) return false;

  return true;
}
