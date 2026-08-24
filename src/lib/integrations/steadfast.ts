import { supabaseAdmin as supabase } from "@/integrations/supabase/client";

export interface SteadfastOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  delivery_type?: number;
}

export interface SteadfastOrderResponse {
  status: number;
  message?: string;
  consignment?: {
    consignment_id: number;
    invoice: string;
    tracking_code: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    status: string;
    delivery_charge?: any;
    delivery_fee?: any;
    cod_charge?: any;
    cod_fee?: any;
    weight?: any;
    parcel_weight?: any;
    note: string;
    created_at: string;
    updated_at: string;
  };
  delivery_charge?: any;
  delivery_fee?: any;
  weight?: any;
  parcel_weight?: any;
  cod_amount?: any;
  cod_charge?: any;
  delivery_status?: string;
  tracking_code?: string;
  consignment_id?: any;
  errors?: Record<string, string[]>;
}

export interface SteadfastBalanceResponse {
  status: number;
  current_balance?: number;
  balance?: number;
  message?: string;
}

/**
 * Safely parses any numeric fee from strings like "95 TK", " 95.00 ", "৳ 990", or numbers like 95
 */
export function parseNumericFee(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number" && !isNaN(val)) return val;
  const cleaned = String(val).replace(/,/g, "").match(/[\d.]+/);
  if (cleaned) {
    const num = parseFloat(cleaned[0]);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

/**
 * Safely parses parcel weight from strings like "1.7KG", "1.7 kg", "1.7", 1.7
 */
export function parseParcelWeight(val: any, fallback = "1.0 kg"): string {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number" && !isNaN(val)) return `${val} kg`;
  const str = String(val).trim();
  if (!str) return fallback;
  const match = str.match(/([\d.]+)\s*(kg|g|gm|)/i);
  if (match) {
    const num = match[1];
    const unit = (match[2] || "kg").toLowerCase();
    const cleanUnit = unit === "g" || unit === "gm" ? "g" : "kg";
    return `${num} ${cleanUnit}`;
  }
  return str;
}

/**
 * Safely parses shipping address whether it is an object, JSON string, or plain text
 */
export function parseShippingAddress(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : { address: raw };
    } catch {
      return { address: raw };
    }
  }
  return {};
}

/**
 * Invokes the steadfast-courier edge function
 */
export async function invokeSteadfastEdge(action: string, payload: Record<string, any> = {}): Promise<any> {
  const { data, error } = await supabase.functions.invoke("steadfast-courier", {
    body: { action, ...payload },
  });

  if (error) {
    throw new Error(error.message || "Steadfast Courier Edge Function invocation failed");
  }

  if (data?.status && data.status >= 400) {
    const errorMsg = data.message || data.error || (data.errors ? Object.values(data.errors).flat().join(", ") : "Steadfast API error");
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Formats BD phone number
 */
export function cleanSteadfastPhone(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, "").trim();
  if (clean.startsWith("+880")) clean = "0" + clean.substring(4);
  else if (clean.startsWith("880")) clean = "0" + clean.substring(3);
  else if (clean.startsWith("+")) clean = clean.substring(1);
  if (clean.length === 10 && clean.startsWith("1")) clean = "0" + clean;
  return clean;
}

export const cleanBangladeshiPhone = cleanSteadfastPhone;

/**
 * Cleans and formats address for Steadfast
 */
export function cleanSteadfastAddress(shippingAddress: any): string {
  if (!shippingAddress) return "";
  const parsed = parseShippingAddress(shippingAddress);
  const parts = [
    parsed.address,
    parsed.area,
    parsed.city,
    parsed.district,
  ].filter(Boolean);
  return parts.join(", ").trim();
}

/**
 * Creates an order in Steadfast
 */
export async function createSteadfastOrder(payload: SteadfastOrderPayload): Promise<SteadfastOrderResponse> {
  const cleanedPhone = cleanSteadfastPhone(payload.recipient_phone);
  if (!cleanedPhone || cleanedPhone.length < 11) {
    throw new Error(`গ্রাহকের ফোন নম্বর সঠিক নয় (${payload.recipient_phone || "খালি"})। ১১ ডিজিটের সঠিক মোবাইল নম্বর দিন।`);
  }

  const cleanedAddress = payload.recipient_address.trim();
  if (!cleanedAddress || cleanedAddress.length < 5) {
    throw new Error("গ্রাহকের ঠিকানা অসম্পূর্ণ বা খালি। অনুগ্রহ করে পূর্ণাঙ্গ ঠিকানা দিন।");
  }

  return invokeSteadfastEdge("create_order", {
    ...payload,
    recipient_phone: cleanedPhone,
    recipient_address: cleanedAddress,
  });
}

/**
 * Gets Steadfast account balance
 */
export async function getSteadfastBalance(): Promise<number> {
  const result: SteadfastBalanceResponse = await invokeSteadfastEdge("get_balance");
  if (result && typeof result.current_balance === "number") {
    return result.current_balance;
  }
  if (result && typeof result.balance === "number") {
    return result.balance;
  }
  return 0;
}

/**
 * Tests connection to Steadfast
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
 * Fetches order status from Steadfast by consignment ID
 */
export async function getSteadfastStatusByCid(consignmentId: string | number) {
  if (!consignmentId) {
    throw new Error("Consignment ID পাওয়া যায়নি।");
  }
  return invokeSteadfastEdge("status_by_cid", { consignment_id: String(consignmentId).trim() });
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
 * Robustly fetches courier parcel details (weight, delivery charge, COD fee, status) from Steadfast
 * by querying consignment ID, invoice, and tracking code in parallel/sequence and merging all fields.
 */
export async function fetchSteadfastConsignmentDetails(params: {
  tracking_code?: string;
  invoice?: string;
  consignment_id?: string | number;
}) {
  let statusResult: any = null;
  let consignmentResult: any = null;

  // 1. Try consignment ID to get full parcel record with weight & charges
  if (params.consignment_id) {
    try {
      const res = await getSteadfastStatusByCid(params.consignment_id);
      if (res && (res.status === 200 || res.consignment || res.delivery_charge || res.weight || res.data)) {
        consignmentResult = res;
      }
    } catch (e) {
      console.warn("Consignment ID lookup fallback:", e);
    }
  }

  // 2. Try invoice number if consignmentResult is missing or lacks weight/charge
  const hasDetails = consignmentResult?.consignment || consignmentResult?.delivery_charge || consignmentResult?.weight;
  if (!hasDetails && params.invoice) {
    try {
      const res = await getSteadfastStatusByInvoice(params.invoice);
      if (res && (res.status === 200 || res.consignment || res.delivery_charge || res.weight || res.data)) {
        consignmentResult = res;
      }
    } catch (e) {
      console.warn("Invoice lookup fallback:", e);
    }
  }

  // 3. Try tracking code for delivery status, weight, and delivery charge
  if (params.tracking_code) {
    try {
      const res = await getSteadfastStatusByTracking(params.tracking_code);
      if (res && (res.status === 200 || res.delivery_status || res.weight || res.delivery_charge || res.data)) {
        statusResult = res;
      }
    } catch (e) {
      console.warn("Tracking code lookup fallback:", e);
    }
  }

  const primaryObj = statusResult || consignmentResult;
  if (!primaryObj) {
    throw new Error("Steadfast থেকে পার্সেলের তথ্য পাওয়া যায়নি। API Credentials ও ট্র্যাকিং কোড যাচাই করুন।");
  }

  const consignment =
    statusResult?.consignment ||
    statusResult?.data ||
    consignmentResult?.consignment ||
    consignmentResult?.data ||
    primaryObj;

  // Extract raw fields from all possible paths
  const rawWeight =
    statusResult?.weight ??
    statusResult?.parcel_weight ??
    statusResult?.actual_weight ??
    consignment?.weight ??
    consignment?.parcel_weight ??
    consignment?.actual_weight ??
    consignmentResult?.weight ??
    consignmentResult?.parcel_weight;

  const rawDeliveryCharge =
    statusResult?.delivery_charge ??
    statusResult?.delivery_fee ??
    statusResult?.charge ??
    consignment?.delivery_charge ??
    consignment?.delivery_fee ??
    consignment?.charge ??
    consignment?.shipping_charge ??
    consignment?.total_charge ??
    consignmentResult?.delivery_charge ??
    consignmentResult?.delivery_fee;

  const rawCodAmount =
    statusResult?.cod_amount ??
    statusResult?.amount ??
    consignment?.cod_amount ??
    consignment?.amount ??
    consignment?.collectable_amount ??
    consignmentResult?.cod_amount;

  const rawCodCharge =
    statusResult?.cod_charge ??
    statusResult?.cod_fee ??
    consignment?.cod_charge ??
    consignment?.cod_fee ??
    consignmentResult?.cod_charge;

  const weight = parseParcelWeight(rawWeight, "1.0 kg");
  const deliveryCharge = parseNumericFee(rawDeliveryCharge, 0);
  const codAmount = parseNumericFee(rawCodAmount, 0);

  let codCharge = parseNumericFee(rawCodCharge, 0);
  if (codCharge === 0 && codAmount > 0) {
    codCharge = Math.round(codAmount * 0.01 * 10) / 10;
  }

  const deliveryStatus =
    statusResult?.delivery_status ??
    consignment?.status ??
    consignment?.delivery_status ??
    consignmentResult?.delivery_status ??
    "pending";

  const trackingCode =
    consignment?.tracking_code ||
    statusResult?.tracking_code ||
    params.tracking_code ||
    "";

  const consignmentId = String(
    consignment?.consignment_id ||
    consignment?.id ||
    consignment?.cid ||
    consignmentResult?.consignment_id ||
    consignmentResult?.id ||
    statusResult?.consignment_id ||
    statusResult?.id ||
    params.consignment_id ||
    ""
  );

  return {
    raw: { statusResult, consignmentResult },
    consignment,
    delivery_status: String(deliveryStatus).toLowerCase(),
    weight,
    delivery_charge: deliveryCharge,
    cod_amount: codAmount,
    cod_charge: codCharge,
    tracking_code: trackingCode,
    consignment_id: consignmentId,
  };
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
