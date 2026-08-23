import { supabase } from "@/integrations/supabase/client";

/**
 * Sanitizes Bangladeshi mobile numbers into the standard 11-digit format (01XXXXXXXXX)
 */
export function cleanBangladeshiPhone(rawPhone?: string): string {
  if (!rawPhone) return "";
  let cleaned = String(rawPhone).replace(/[^\d+]/g, "").trim();
  
  if (cleaned.startsWith("+880")) {
    cleaned = "0" + cleaned.substring(4);
  } else if (cleaned.startsWith("880")) {
    cleaned = "0" + cleaned.substring(3);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits starting with 1 (e.g. 1712345678), add leading 0
  if (cleaned.length === 10 && cleaned.startsWith("1")) {
    cleaned = "0" + cleaned;
  }

  return cleaned.trim();
}

/**
 * Cleanly formats the delivery address for Steadfast courier
 */
export function cleanSteadfastAddress(shippingData: any): string {
  if (!shippingData) return "";
  
  if (typeof shippingData === "string") {
    return shippingData.trim();
  }

  const parts = [
    shippingData.address,
    shippingData.area,
    shippingData.city,
    shippingData.district,
    shippingData.division,
    shippingData.postal_code ? `Postal: ${shippingData.postal_code}` : ""
  ].filter(Boolean).map((p: string) => String(p).trim());

  // Remove exact duplicates while preserving order
  const uniqueParts = Array.from(new Set(parts));
  const fullAddress = uniqueParts.join(", ");

  return fullAddress || shippingData.address || shippingData.city || "";
}

/**
 * Formats API errors from Steadfast response into user-friendly messages
 */
function extractErrorMessage(result: any, error: any): string {
  if (result) {
    if (result.message && typeof result.message === "string") {
      const rawMsg = result.message.trim();
      if (rawMsg.toLowerCase().includes("account is not active")) {
        return "আপনার Steadfast অ্যাকাউন্টটি এখনও সক্রিয় (Active) নয়। Steadfast মার্চেন্ট পোর্টালে (portal.steadfast.com.bd) লগইন করে আপনার অ্যাকাউন্ট ভেরিফাই/অ্যাক্টিভ করুন অথবা Steadfast সাপোর্টে যোগাযোগ করুন।";
      }
      if (rawMsg.toLowerCase().includes("unauthorized") || rawMsg.toLowerCase().includes("invalid api credentials")) {
        return "Steadfast API Key বা Secret Key সঠিক নয়। Settings > কুরিয়ার সেটিংস এ গিয়ে সঠিক ক্রেডেনশিয়াল দিন।";
      }
      if (rawMsg.toLowerCase().includes("invoice has already been taken") || rawMsg.toLowerCase().includes("already exists")) {
        return "এই ইনভয়েস নম্বরে ইতোমধ্যেই Steadfast-এ পার্সেল তৈরি করা হয়েছে।";
      }
      return rawMsg;
    }
    if (result.error && typeof result.error === "string") {
      const rawErr = result.error.trim();
      if (rawErr.toLowerCase().includes("account is not active")) {
        return "আপনার Steadfast অ্যাকাউন্টটি এখনও সক্রিয় (Active) নয়। Steadfast মার্চেন্ট পোর্টালে (portal.steadfast.com.bd) লগইন করে আপনার অ্যাকাউন্ট ভেরিফাই/অ্যাক্টিভ করুন অথবা Steadfast সাপোর্টে যোগাযোগ করুন।";
      }
      return rawErr;
    }

    if (result.errors && typeof result.errors === "object") {
      const errorStrings = Object.entries(result.errors).map(([field, msgs]) => {
        const fieldNameMap: Record<string, string> = {
          recipient_phone: "গ্রাহকের ফোন নম্বর",
          recipient_name: "গ্রাহকের নাম",
          recipient_address: "গ্রাহকের ঠিকানা",
          cod_amount: "ক্যাশ অন ডেলিভারি (COD) পরিমাণ",
          invoice: "ইনভয়েস নম্বর",
          note: "নোট",
        };
        const bnField = fieldNameMap[field] || field;
        const msgList = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
        return `${bnField}: ${msgList}`;
      });
      return errorStrings.join(" | ");
    }
  }

  if (error) {
    if (error.message && !error.message.includes("non-2xx")) {
      return error.message;
    }
  }

  return "Steadfast API সার্ভার থেকে কোনো সফল উত্তর পাওয়া যায়নি। অনুগ্রহ করে সেটিংস এবং ক্রেডেনশিয়াল চেক করুন।";
}

/**
 * Low-level function to invoke the steadfast-courier Supabase Edge Function
 */
export async function invokeSteadfastEdge(action: string, payload: Record<string, any> = {}) {
  let result: any = null;
  let apiError: any = null;

  try {
    const response = await supabase.functions.invoke("steadfast-courier", {
      body: {
        action,
        ...payload,
      },
    });
    result = response.data;
    apiError = response.error;
  } catch (err: any) {
    apiError = err;
  }

  // If supabase-js returned an HTTP error, attempt to extract response context
  if (apiError && !result) {
    try {
      if (apiError.context && typeof apiError.context.json === "function") {
        result = await apiError.context.json();
      }
    } catch {
      // Ignore context parsing failure
    }
  }

  // Handle errors
  if (result && (result.status === 400 || result.status === 401 || result.status === 403 || result.status === 500 || result.success === false)) {
    const msg = extractErrorMessage(result, apiError);
    throw new Error(msg);
  }

  if (apiError && !result) {
    throw new Error(extractErrorMessage(null, apiError));
  }

  return result;
}

export interface SteadfastOrderParams {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  delivery_type?: number;
}

/**
 * Creates an order/consignment in Steadfast
 */
export async function createSteadfastOrder(params: SteadfastOrderParams) {
  const phone = cleanBangladeshiPhone(params.recipient_phone);
  if (!phone || phone.length < 11) {
    throw new Error(`গ্রাহকের ফোন নম্বর সঠিক নয় (${params.recipient_phone || "খালি"})। ১১ ডিজিটের সঠিক মোবাইল নম্বর দিন।`);
  }

  const address = (params.recipient_address || "").trim();
  if (!address || address.length < 5) {
    throw new Error("গ্রাহকের ঠিকানা অসম্পূর্ণ বা খালি। অনুগ্রহ করে পূর্ণাঙ্গ ঠিকানা দিন।");
  }

  const result = await invokeSteadfastEdge("create_order", {
    invoice: String(params.invoice || "").trim(),
    recipient_name: String(params.recipient_name || "Customer").trim(),
    recipient_phone: phone,
    recipient_address: address,
    cod_amount: Math.round(Number(params.cod_amount) || 0),
    note: params.note || "",
    delivery_type: params.delivery_type ?? 0,
  });

  if (result?.status !== 200 && !result?.consignment) {
    throw new Error(extractErrorMessage(result, null));
  }

  return result;
}

/**
 * Retrieves current balance from Steadfast account
 */
export async function getSteadfastBalance(): Promise<number> {
  const result = await invokeSteadfastEdge("get_balance");
  if (result?.current_balance !== undefined) {
    return Number(result.current_balance);
  }
  if (result?.balance !== undefined) {
    return Number(result.balance);
  }
  return 0;
}

/**
 * Tests connection to Steadfast using stored credentials
 */
export async function testSteadfastConnection(): Promise<{ success: boolean; balance: number; message: string }> {
  try {
    const result = await invokeSteadfastEdge("test_connection");
    const balance = result?.current_balance ?? result?.balance ?? 0;
    return {
      success: true,
      balance: Number(balance),
      message: `কানেকশন সফল! বর্তমান ব্যালেন্স: ৳${Number(balance).toLocaleString()}`,
    };
  } catch (err: any) {
    return {
      success: false,
      balance: 0,
      message: err.message || "Steadfast কানেকশন ব্যর্থ হয়েছে। API Key ও Secret Key সঠিক কিনা যাচাই করুন।",
    };
  }
}

/**
 * Fetches order status from Steadfast by tracking code
 */
export async function getSteadfastStatusByTracking(trackingCode: string) {
  if (!trackingCode) {
    throw new Error("ট্র্যাকিং কোড পাওয়া যায়নি।");
  }
  return invokeSteadfastEdge("status_by_tracking", { tracking_code: trackingCode.trim() });
}

/**
 * Fetches order status from Steadfast by invoice number
 */
export async function getSteadfastStatusByInvoice(invoice: string) {
  if (!invoice) {
    throw new Error("ইনভয়েস নম্বর পাওয়া যায়নি।");
  }
  return invokeSteadfastEdge("status_by_invoice", { invoice: invoice.trim() });
}

/**
 * Creates a return request in Steadfast
 */
export async function createSteadfastReturn(params: {
  consignment_id?: string;
  tracking_code?: string;
  invoice?: string;
  reason?: string;
}) {
  return invokeSteadfastEdge("create_return", params);
}
