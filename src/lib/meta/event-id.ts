// Deterministic and Collision-Safe Event ID Generator for Meta Pixel & CAPI Deduplication

/**
 * Generates an event ID for Meta deduplication.
 * When an explicit seed (such as orderNumber or cartActionId) is provided,
 * it generates a deterministic event ID so that both Browser Pixel and Server CAPI
 * share the exact same ID.
 *
 * @param eventName - Name of the event (e.g., 'Purchase', 'AddToCart', 'PageView')
 * @param seed - Optional unique business key (e.g. order number, user ID, item ID)
 * @returns Standardized event_id string e.g. "evt_purchase_ORD-2026-1001"
 */
export function generateEventId(eventName: string, seed?: string): string {
  const cleanName = eventName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (seed && seed.trim()) {
    const cleanSeed = seed.trim().replace(/\s+/g, "_");
    return `evt_${cleanName}_${cleanSeed}`;
  }

  // Non-seeded events (e.g. PageView, Search): generate high-entropy timestamped ID
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `evt_${cleanName}_${timestamp}_${randomPart}`;
}

/**
 * Generates a dedicated purchase event ID guaranteed to match across client and server.
 * @param orderNumber - The unique order number (e.g. 'ORD-260821-4821')
 */
export function generatePurchaseEventId(orderNumber: string): string {
  return generateEventId("purchase", orderNumber);
}
