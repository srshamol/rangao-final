import { supabaseAdmin as supabase } from "@/integrations/supabase/client";

export interface TrackingUpdateItem {
  status: string;
  status_display?: string;
  message?: string;
  location?: string;
  timestamp: string;
  source?: "steadfast_api" | "steadfast_webhook" | "steadfast_portal" | "system" | "admin";
}

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

export const courierStatusBengali: Record<string, string> = {
  pending: "পেন্ডিং (পিকআপ রিকোয়েস্ট)",
  in_review: "পর্যালোচনায় (In Review)",
  picked: "পিকআপ সম্পন্ন",
  pickup_done: "পিকআপ সম্পন্ন",
  dispatched: "হাবে পাঠানো হয়েছে",
  in_transit: "ট্রানজিটে আছে (গন্তব্যে যাচ্ছে)",
  out_for_delivery: "ডেলিভারির উদ্দেশ্যে বের হয়েছে",
  delivered: "ডেলিভারি সম্পন্ন ✅",
  partial_delivered: "আংশিক ডেলিভারি",
  delivered_approval_pending: "ডেলিভারি অনুমোদনের অপেক্ষায়",
  cancelled: "ক্যান্সেলড ❌",
  cancelled_delivery: "ক্যান্সেলড ❌",
  cancelled_approval_pending: "ক্যান্সেলেশন অনুমোদনের অপেক্ষায়",
  hold: "হোল্ড (স্থগিত)",
  return: "রিটার্ন প্রক্রিয়াধীন",
  returned: "রিটার্ন সম্পন্ন",
  unknown: "অজ্ঞাত অবস্থা",
};

export function getCourierStatusBadgeClass(status?: string): string {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-300";
  const s = status.toLowerCase();
  if (s.includes("delivered")) return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
  if (s.includes("cancel") || s.includes("return")) return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300";
  if (s.includes("out_for_delivery")) return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
  if (s.includes("transit") || s.includes("dispatch")) return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
  if (s.includes("picked")) return "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300";
  if (s.includes("hold") || s.includes("review")) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
  return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
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
 * Appends a new tracking update to an array of tracking updates, avoiding immediate duplicates.
 */
export function appendTrackingUpdate(
  existingUpdates: TrackingUpdateItem[] | undefined,
  newUpdate: TrackingUpdateItem
): TrackingUpdateItem[] {
  const updates = Array.isArray(existingUpdates) ? [...existingUpdates] : [];
  if (!newUpdate || !newUpdate.status) return updates;

  // Deduplicate if identical status exists within 2 minutes
  const last = updates[updates.length - 1];
  if (last && last.status === newUpdate.status) {
    const timeDiff = Math.abs(new Date(newUpdate.timestamp).getTime() - new Date(last.timestamp).getTime());
    if (isNaN(timeDiff) || timeDiff < 120000) {
      if (newUpdate.message && !last.message) {
        last.message = newUpdate.message;
      }
      return updates;
    }
  }

  updates.push(newUpdate);
  return updates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Synchronizes Tracking Updates and consignment metrics from Steadfast Courier into the Order record.
 */
export async function syncOrderTrackingFromSteadfast(
  order: any,
  options: { sendTelegram?: boolean; staffName?: string } = {}
) {
  const shipping = parseShippingAddress(order?.shipping_address);
  const trackingCode = shipping.tracking_number || "";
  const consignmentId = shipping.consignment_id || "";
  const invoice = order.order_number || "";

  if (!trackingCode && !consignmentId && !invoice) {
    throw new Error("অর্ডারে কোনো ট্র্যাকিং নম্বর, কনসাইনমেন্ট আইডি বা ইনভয়েস পাওয়া যায়নি।");
  }

  const details = await fetchSteadfastConsignmentDetails({
    tracking_code: trackingCode,
    consignment_id: consignmentId,
    invoice,
  });

  const deliveryStatus = details.delivery_status || shipping.courier_status || "pending";
  const nowIso = new Date().toISOString();

  let newOrderStatus = order.order_status;
  let paymentStatus = order.payment_status;

  if (deliveryStatus === "delivered") {
    newOrderStatus = "delivered";
    if (order.payment_method === "cod") {
      paymentStatus = "completed";
    }
  } else if (
    deliveryStatus === "in_transit" ||
    deliveryStatus === "dispatched" ||
    deliveryStatus === "out_for_delivery" ||
    deliveryStatus === "picked" ||
    deliveryStatus === "pickup_done"
  ) {
    if (order.order_status === "processing" || order.order_status === "confirmed") {
      newOrderStatus = "shipped";
    }
  } else if (
    deliveryStatus === "cancelled" ||
    deliveryStatus === "cancelled_delivery" ||
    deliveryStatus === "return" ||
    deliveryStatus === "returned"
  ) {
    newOrderStatus = "courier_cancelled";
  }

  const totalAmount = Number(order.total_amount) || 0;
  const isCod = order.payment_method === "cod" || !order.payment_method;
  const isInsideDhaka =
    (shipping.city || shipping.address || "").toLowerCase().includes("dhaka") ||
    (shipping.city || shipping.address || "").includes("ঢাকা");
  const defaultCourierCharge = isInsideDhaka ? 60 : 120;

  const syncedDeliveryCharge =
    details.delivery_charge > 0
      ? details.delivery_charge
      : shipping.courier_delivery_charge !== undefined
      ? parseNumericFee(shipping.courier_delivery_charge, defaultCourierCharge)
      : defaultCourierCharge;

  const syncedCodFee = isCod
    ? details.cod_charge > 0
      ? details.cod_charge
      : shipping.courier_cod_charge !== undefined
      ? parseNumericFee(shipping.courier_cod_charge, Math.round(totalAmount * 0.01))
      : Math.round(totalAmount * 0.01)
    : 0;

  const syncedWeight = details.weight || shipping.parcel_weight || "1.0 kg";
  const syncedPayable = isCod ? Math.max(0, totalAmount - syncedDeliveryCharge - syncedCodFee) : totalAmount;

  // Build new Tracking Update Item
  const newUpdateItem: TrackingUpdateItem = {
    status: deliveryStatus,
    status_display: courierStatusBengali[deliveryStatus] || deliveryStatus,
    message: courierStatusBengali[deliveryStatus]
      ? `Steadfast স্ট্যাটাস: ${courierStatusBengali[deliveryStatus]}`
      : `Steadfast লাইভ ট্র্যাকিং আপডেট`,
    timestamp: nowIso,
    source: "steadfast_api",
  };

  const updatedTrackingUpdates = appendTrackingUpdate(shipping.tracking_updates, newUpdateItem);

  const updatedAddress = {
    ...shipping,
    courier_company: shipping.courier_company || "Steadfast",
    tracking_number: details.tracking_code || shipping.tracking_number,
    consignment_id: details.consignment_id || shipping.consignment_id,
    courier_status: deliveryStatus,
    parcel_weight: syncedWeight,
    courier_delivery_charge: syncedDeliveryCharge,
    courier_cod_charge: syncedCodFee,
    courier_payable: syncedPayable,
    last_tracking_update: nowIso,
    tracking_updates: updatedTrackingUpdates,
  };

  const updatePayload: Record<string, any> = {
    shipping_address: updatedAddress,
    order_status: newOrderStatus,
  };
  if (paymentStatus) {
    updatePayload.payment_status = paymentStatus;
  }

  const { error: dbError } = await supabase.from("orders").update(updatePayload).eq("id", order.id);
  if (dbError) throw dbError;

  const statusBengali = courierStatusBengali[deliveryStatus] || deliveryStatus;
  await supabase.from("order_history" as any).insert({
    order_id: order.id,
    action: "tracking_updated",
    details: `Steadfast লাইভ ট্র্যাকিং সিঙ্ক: ${statusBengali} (অর্ডার স্ট্যাটাস: ${newOrderStatus})`,
    staff_name: options.staffName || "System",
  });

  const changed = order.order_status !== newOrderStatus || shipping.courier_status !== deliveryStatus;

  // Send Telegram notification if enabled and status changed
  if (changed && options.sendTelegram !== false) {
    try {
      const { sendTelegramNotification } = await import("@/lib/telegram");
      const autoMessage =
        `🔄 <b>অর্ডার ট্র্যাকিং সিঙ্ক আপডেট (Steadfast)!</b>\n\n` +
        `<b>অর্ডার নং:</b> #${order.order_number}\n` +
        `<b>গ্রাহক:</b> ${order.customer_name} (${order.customer_phone})\n` +
        `<b>ট্র্যাকিং কোড:</b> <code>${details.tracking_code || shipping.tracking_number || "—"}</code>\n` +
        `<b>Steadfast স্ট্যাটাস:</b> ${statusBengali}\n` +
        `<b>বর্তমান অর্ডার অবস্থা:</b> ${newOrderStatus}`;
      await sendTelegramNotification(autoMessage, { isStatusUpdate: true });
    } catch (tgErr) {
      console.error("Error triggering auto-sync telegram notification:", tgErr);
    }
  }

  return {
    success: true,
    changed,
    old_order_status: order.order_status,
    new_order_status: newOrderStatus,
    courier_status: deliveryStatus,
    courier_status_display: statusBengali,
    updated_address: updatedAddress,
    details,
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
