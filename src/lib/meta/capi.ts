// Meta Conversions API (CAPI) Client & Dispatcher

import { DEFAULT_GRAPH_API_VERSION, META_GRAPH_API_BASE } from "./constants";
import type { MetaCapiEvent, MetaCapiPayload } from "./types";

/**
 * Sends a batch of CAPI events directly to Meta Graph API server-side.
 * Used inside Next.js / Vercel Serverless Functions or Supabase Edge Functions.
 */
export async function sendMetaCapiEvent(
  events: MetaCapiEvent | MetaCapiEvent[],
  options: {
    pixelId: string;
    accessToken: string;
    testEventCode?: string;
    apiVersion?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { pixelId, accessToken, testEventCode, apiVersion = DEFAULT_GRAPH_API_VERSION } = options;

  if (!pixelId || !accessToken) {
    return { success: false, error: "Missing pixelId or accessToken for Meta CAPI" };
  }

  const eventArray = Array.isArray(events) ? events : [events];
  if (eventArray.length === 0) {
    return { success: false, error: "No events provided" };
  }

  const payload: MetaCapiPayload = {
    data: eventArray,
    access_token: accessToken,
  };

  if (testEventCode && testEventCode.trim()) {
    payload.test_event_code = testEventCode.trim();
  }

  const endpoint = `${META_GRAPH_API_BASE}/${apiVersion}/${pixelId}/events`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      const errMsg = result.error?.message || `HTTP ${response.status}: ${JSON.stringify(result)}`;
      return { success: false, error: errMsg, data: result };
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error while sending Meta CAPI event" };
  }
}

/**
 * Relays an event from the browser to the backend CAPI serverless endpoint asynchronously.
 * Non-blocking: Tracking failures will never interrupt user experience or checkout.
 */
export async function relayClientEventToCapi(eventData: {
  event_name: string;
  event_id: string;
  order_id?: string;
  custom_data?: Record<string, any>;
  user_data?: Record<string, any>;
}): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    let origin = "https://www.rangao.bd";
    if (typeof window !== "undefined") {
      if (window.location?.origin && window.location.origin !== "null") {
        origin = window.location.origin;
      } else if (window.location?.href && window.location.href.startsWith("http")) {
        try {
          origin = new URL(window.location.href).origin;
        } catch {
          // fallback
        }
      }
    }
    const endpoint = `${origin}/api/tracking/meta`;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(eventData),
    }).catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Meta CAPI Relay] Request failed (non-blocking):", err);
      }
    });
  } catch (err) {
    // Non-blocking error handling
  }
}
