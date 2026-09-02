import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { analytics } from "@/services/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Home, ShoppingBag, MapPin, Phone, User, CreditCard, Truck, Package, Clock, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { courierStatusBengali, parseShippingAddress, getCourierStatusBadgeClass } from "@/lib/integrations/steadfast";

export interface OrderItem {
  id?: string;
  productId?: string;
  sku?: string;
  name: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface OrderState {
  id?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: {
    division?: string;
    district?: string;
    thana?: string;
    address?: string;
  };
  paymentMethod?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentStatus?: string;
  orderStatus?: string;
}

// In-memory module-level set to prevent re-tracking across renders in same JS session
const inMemoryTrackedOrders = new Set<string>();

export function isPurchaseTracked(orderNumber?: string | null): boolean {
  if (!orderNumber || typeof orderNumber !== "string") return false;
  const cleanOrderNumber = orderNumber.trim();
  if (!cleanOrderNumber) return false;

  // 1. In-memory guard (catches React StrictMode double mounts & rapid re-renders)
  if (inMemoryTrackedOrders.has(cleanOrderNumber)) return true;

  // 2. SessionStorage guard (catches in-tab navigations)
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(`meta_purchase_tracked_${cleanOrderNumber}`)) {
      return true;
    }
  } catch {
    // sessionStorage access fallback
  }

  // 3. LocalStorage guard (bounded single key per order, catches refreshes)
  try {
    if (typeof localStorage !== "undefined") {
      if (localStorage.getItem(`meta_purchase_tracked_${cleanOrderNumber}`)) {
        return true;
      }
      // Backwards compatibility with fb_tracked_orders JSON array
      const oldTrackedStr = localStorage.getItem("fb_tracked_orders");
      if (oldTrackedStr) {
        const oldTracked = JSON.parse(oldTrackedStr);
        if (Array.isArray(oldTracked) && oldTracked.includes(cleanOrderNumber)) {
          return true;
        }
      }
    }
  } catch {
    // localStorage access fallback
  }

  return false;
}

/**
 * Marks a purchase event as tracked across in-memory, sessionStorage, and localStorage.
 */
export function markPurchaseTracked(orderNumber: string): void {
  if (!orderNumber || typeof orderNumber !== "string") return;
  const cleanOrderNumber = orderNumber.trim();
  if (!cleanOrderNumber) return;

  inMemoryTrackedOrders.add(cleanOrderNumber);

  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`meta_purchase_tracked_${cleanOrderNumber}`, "true");
    }
  } catch {
    // ignore sessionStorage errors
  }

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`meta_purchase_tracked_${cleanOrderNumber}`, "true");
    }
  } catch {
    // ignore localStorage errors
  }
}

const statusLabels: Record<string, string> = {
  pending: "⏳ পেন্ডিং",
  confirmed: "✅ কনফার্মড",
  in_review: "🔍 রিভিউতে",
  processing: "📦 প্রসেসিং",
  shipped: "🚚 শিপড",
  delivered: "✔️ ডেলিভারড",
  cancelled: "❌ ক্যান্সেলড",
};

function OrderTracker({ orderNumber }: { orderNumber?: string }) {
  const [searchNum, setSearchNum] = useState(orderNumber || "");
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [trackedItems, setTrackedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const trackOrder = async (num?: string) => {
    const target = num || searchNum;
    if (!target.trim()) return;
    setLoading(true);
    setNotFound(false);

    try {
      const { data: orderData, error: rpcErr } = await (supabase.rpc as any)(
        "get_order_summary_by_number",
        { p_order_number: target.trim() }
      );

      if (rpcErr || !orderData) {
        // Fallback for direct select if authenticated staff
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("order_number", target.trim())
          .maybeSingle();

        if (!order) {
          setNotFound(true);
          setTrackedOrder(null);
          setLoading(false);
          return;
        }

        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        setTrackedOrder(order);
        setTrackedItems(items || []);
        setLoading(false);
        return;
      }

      setTrackedOrder(orderData);
      setTrackedItems(orderData.items || []);
    } catch (e) {
      console.error("Tracking order error:", e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) trackOrder(orderNumber);
  }, [orderNumber]);

  return (
    <div className="mt-8 space-y-4">
      {/* Search bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border bg-card p-5"
      >
        <h2 className="font-display text-lg font-bold text-card-foreground mb-3">📦 অর্ডার ট্র্যাক করুন</h2>
        <div className="flex gap-2">
          <Input
            value={searchNum}
            onChange={(e) => setSearchNum(e.target.value)}
            placeholder="অর্ডার নম্বর দিন (ORD-XXXXXX-XXXX)"
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && trackOrder()}
          />
          <Button onClick={() => trackOrder()} disabled={loading} className="rounded-xl">
            <Search className="h-4 w-4 mr-1" /> ট্র্যাক
          </Button>
        </div>
      </motion.div>

      {notFound && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center"
        >
          <p className="text-destructive font-medium">অর্ডার পাওয়া যায়নি। অর্ডার নম্বর চেক করুন।</p>
        </motion.div>
      )}

      {trackedOrder && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">অর্ডার নম্বর</p>
              <p className="font-mono font-bold">{trackedOrder.order_number}</p>
            </div>
            <div className="text-lg font-bold">
              {statusLabels[trackedOrder.order_status] || trackedOrder.order_status}
            </div>
          </div>

          {/* Order items */}
          <div className="space-y-2 border-t pt-3">
            {trackedItems.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.product_name} x{item.quantity}</span>
                <span className="font-semibold">৳{Number(item.total_price).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
              <span>৳{Number(trackedOrder.delivery_charge || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>মোট</span>
              <span>৳{Number(trackedOrder.total_amount).toLocaleString()}</span>
            </div>
          </div>

          {/* Courier Tracking Details */}
          {(() => {
            const ship = parseShippingAddress(trackedOrder.shipping_address);
            if (!ship.tracking_number && !ship.consignment_id) return null;
            const updates = Array.isArray(ship.tracking_updates) ? ship.tracking_updates : [];
            const isSteadfast = (ship.courier_company || "Steadfast").toLowerCase().includes("steadfast");

            return (
              <div className="border-t pt-3 space-y-2 bg-muted/20 p-3 rounded-xl border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-primary" /> {ship.courier_company || "Steadfast Courier"}
                  </span>
                  {ship.courier_status && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getCourierStatusBadgeClass(ship.courier_status)}`}>
                      {courierStatusBengali[ship.courier_status] || ship.courier_status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>ট্র্যাকিং কোড: <strong className="font-mono text-foreground">{ship.tracking_number || "—"}</strong></p>
                </div>
                {updates.length > 0 && (
                  <div className="space-y-1.5 border-l-2 border-primary/40 ml-1.5 pl-2.5 pt-1">
                    {updates.slice(-2).map((u: any, i: number) => (
                      <div key={i} className="text-[11px]">
                        <p className="font-medium text-foreground">{courierStatusBengali[u.status] || u.status_display || u.status}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(u.timestamp).toLocaleString("bn-BD")}</p>
                      </div>
                    ))}
                  </div>
                )}
                {isSteadfast && ship.tracking_number && (
                  <a
                    href={`https://steadfast.com.bd/tracking?tracking_code=${ship.tracking_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block pt-1"
                  >
                    <Button variant="outline" size="sm" className="text-xs h-7 rounded-lg">
                      লাইভ কুরিয়ার ট্র্যাকিং দেখুন
                    </Button>
                  </a>
                )}
              </div>
            );
          })()}

          <div className="border-t pt-3 text-sm text-muted-foreground">
            <p>📅 অর্ডার তারিখ: {new Date(trackedOrder.created_at).toLocaleDateString("bn-BD")}</p>
            <p>👤 {trackedOrder.customer_name} | 📱 {trackedOrder.customer_phone}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const OrderSuccess = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoice_id");
  const [verifying, setVerifying] = useState(!!invoiceId);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<OrderState | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const verificationAttemptedRef = useRef<string | null>(null);
  const loadingOrderRef = useRef(false);

  const order = (location.state as OrderState | null) || localOrder;

  // 1. Online Payment Verification (UddoktaPay)
  useEffect(() => {
    const verifyAndLoad = async () => {
      if (!invoiceId || !orderNumber) return;
      if (verificationAttemptedRef.current === invoiceId) return;
      verificationAttemptedRef.current = invoiceId;

      try {
        setVerifying(true);
        setVerificationError(null);

        const res = await fetch("/api/uddoktapay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || contentType.includes("text/html")) {
          throw new Error("Serverless verify function unavailable");
        }

        const data = await res.json();
        
        if (data.verified) {
          const { data: dbOrder, error: orderErr } = await (supabase.rpc as any)(
            "get_order_summary_by_number",
            { p_order_number: orderNumber.trim() }
          );

          if (orderErr || !dbOrder) throw new Error("অর্ডার লোড করতে সমস্যা হয়েছে");

          setLocalOrder({
            id: dbOrder.id,
            orderNumber: dbOrder.order_number,
            customerName: dbOrder.customer_name,
            customerPhone: dbOrder.customer_phone,
            customerEmail: dbOrder.customer_email || "",
            shippingAddress: (dbOrder.shipping_address as any) || {
              division: "",
              district: "",
              thana: "",
              address: "",
            },
            paymentMethod: dbOrder.payment_method || "",
            items: (dbOrder.items || []).map((item: any) => ({
              id: item.product_id || item.name,
              productId: item.product_id || item.name,
              sku: item.product_id || "",
              name: item.name,
              image: "",
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              totalPrice: Number(item.total_price),
            })),
            subtotal: Number(dbOrder.subtotal || 0),
            deliveryCharge: Number(dbOrder.delivery_charge || 0),
            total: Number(dbOrder.total_amount),
            paymentStatus: dbOrder.payment_status,
            orderStatus: dbOrder.order_status,
          });
        } else {
          throw new Error(data.message || "পেমেন্ট ভেরিফিকেশন সম্পন্ন হয়নি");
        }
      } catch (err: any) {
        console.error("UddoktaPay verification error:", err);
        setVerificationError(err.message || "পেমেন্ট ভেরিফাই করতে সমস্যা হয়েছে");
      } finally {
        setVerifying(false);
      }
    };

    if (invoiceId) {
      verifyAndLoad();
    }
  }, [invoiceId, orderNumber]);

  // 2. Load order from Supabase if not present in location.state (e.g. direct URL visit or refresh)
  useEffect(() => {
    if (!location.state && !localOrder && orderNumber && !invoiceId && !loadingOrderRef.current) {
      const loadOrderByNumber = async () => {
        try {
          loadingOrderRef.current = true;
          setLoadingOrder(true);
          const { data: dbOrder, error: orderErr } = await (supabase.rpc as any)(
            "get_order_summary_by_number",
            { p_order_number: orderNumber.trim() }
          );

          if (orderErr || !dbOrder) {
            return;
          }

          setLocalOrder({
            id: dbOrder.id,
            orderNumber: dbOrder.order_number,
            customerName: dbOrder.customer_name,
            customerPhone: dbOrder.customer_phone,
            customerEmail: dbOrder.customer_email || "",
            shippingAddress: (dbOrder.shipping_address as any) || {
              division: "",
              district: "",
              thana: "",
              address: "",
            },
            paymentMethod: dbOrder.payment_method || "",
            items: (dbOrder.items || []).map((item: any) => ({
              id: item.product_id || item.name,
              productId: item.product_id || item.name,
              sku: item.product_id || "",
              name: item.name,
              image: "",
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              totalPrice: Number(item.total_price),
            })),
            subtotal: Number(dbOrder.subtotal || 0),
            deliveryCharge: Number(dbOrder.delivery_charge || 0),
            total: Number(dbOrder.total_amount),
            paymentStatus: dbOrder.payment_status,
            orderStatus: dbOrder.order_status,
          });
        } catch (e) {
          console.error("Error loading order by number:", e);
        } finally {
          setLoadingOrder(false);
        }
      };

      loadOrderByNumber();
    }
  }, [location.state, localOrder, orderNumber, invoiceId]);

  // 3. Purchase tracking with multi-layered idempotency and Browser + Server deduplication
  useEffect(() => {
    // 1. Guard against missing or invalid order
    if (!order || !order.orderNumber || typeof order.orderNumber !== "string") {
      return;
    }

    const currentOrderNumber = order.orderNumber.trim();
    if (!currentOrderNumber) return;

    // 2. Guard against in-progress or failed payment verification
    if (verifying || verificationError) {
      console.log("[Meta Purchase] Skipped - payment still verifying or verification error");
      return;
    }

    // 3. For online payments, ensure payment is verified/completed
    const isOnlinePayment = Boolean(
      invoiceId ||
      order.paymentMethod?.toLowerCase().includes("online") ||
      order.paymentMethod?.toLowerCase().includes("uddoktapay")
    );
    if (isOnlinePayment && order.paymentStatus && order.paymentStatus !== "completed") {
      console.log("[Meta Purchase] Skipped - online payment status is not completed:", order.paymentStatus);
      return;
    }

    // 4. Guard against duplicate tracking across in-memory, session, and local storage
    if (isPurchaseTracked(currentOrderNumber)) {
      console.log(`[Meta Purchase] Skipped - already tracked: ${currentOrderNumber}`);
      return;
    }

    // 5. Evaluate and dispatch Purchase event with deterministic event ID
    let isCancelled = false;

    const evaluateAndDispatchPurchase = async () => {
      try {
        console.log(`[Meta Purchase] Evaluating eligibility for: ${currentOrderNumber}`);

        // Re-check idempotency guard before executing
        if (isPurchaseTracked(currentOrderNumber)) {
          console.log(`[Meta Purchase] Skipped - already tracked: ${currentOrderNumber}`);
          return;
        }

        const expectedEventId = `evt_purchase_${currentOrderNumber}`;
        console.log(`[Meta Purchase] Eligible & Dispatching for: ${currentOrderNumber} (Event ID: ${expectedEventId})`);

        // Map items with stable IDs
        const mappedItems = (order.items || []).map((i) => {
          const itemId = String(i.productId || i.id || i.sku || i.name || "product");
          return {
            id: itemId,
            productId: itemId,
            sku: String(i.sku || itemId),
            name: i.name || "Product",
            unitPrice: Number(i.unitPrice || 0),
            quantity: Number(i.quantity || 1),
            category: i.category || "General",
          };
        });

        // Dispatch via authoritative analytics abstraction FIRST
        const dispatchedEventId = analytics.purchase(
          {
            orderNumber: currentOrderNumber,
            orderId: order.id,
            total: Number(order.total || 0),
            items: mappedItems,
            customer: {
              phone: order.customerPhone,
              email: order.customerEmail,
              fullName: order.customerName,
              city: order.shippingAddress?.division || order.shippingAddress?.district || "",
            },
          },
          expectedEventId
        );

        if (isCancelled) return;

        // Mark as tracked AFTER successful dispatch to prevent accidental suppression
        if (dispatchedEventId) {
          markPurchaseTracked(currentOrderNumber);
          console.log(
            `[Meta Purchase] fbq command issued for: ${currentOrderNumber} (${dispatchedEventId})`,
            "| Verify browser delivery via DevTools Network → filter: tr?id=1862583688445311"
          );
        } else {
          console.warn(`[Meta Purchase] fbq command NOT issued for: ${currentOrderNumber} — validation failed or fbq unavailable.`);
        }
      } catch (err) {
        console.error("[Meta Purchase] Error during purchase tracking execution:", err);
      }
    };

    evaluateAndDispatchPurchase();

    return () => {
      isCancelled = true;
    };
  }, [order, verifying, verificationError, invoiceId]);

  const [deliveryTimes, setDeliveryTimes] = useState<{ inside: string; outside: string }>({
    inside: "৩-৫ কার্যদিবস",
    outside: "৫-৭ কার্যদিবস"
  });

  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const { data } = await supabase
          .from("store_settings" as any)
          .select("value")
          .eq("key", "delivery_charges")
          .maybeSingle();

        if ((data as any)?.value) {
          const val = (data as any).value as any;
          setDeliveryTimes({
            inside: val.delivery_time_inside || "৩-৫ কার্যদিবস",
            outside: val.delivery_time_outside || "৫-৭ কার্যদিবস"
          });
        }
      } catch (err) {
        console.error("Error fetching delivery times:", err);
      }
    };
    fetchDeliverySettings();
  }, []);

  // Estimate delivery: dynamic values from settings with fallback
  const isDhaka = order?.shippingAddress?.division === "ঢাকা সিটির ভিতরে" || 
                  order?.shippingAddress?.division === "ঢাকা";
  const deliveryEstimate = isDhaka ? deliveryTimes.inside : deliveryTimes.outside;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="অর্ডার সফল সম্পন্ন হয়েছে" noIndex={true} />
      <Header />
      <main className="py-10 md:py-16">
        <div className="container max-w-3xl">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10"
            >
              <CheckCircle className="h-14 w-14 text-success" />
            </motion.div>

            <h1 className="mt-5 font-display text-3xl font-extrabold text-foreground md:text-4xl">
              অর্ডার সফল হয়েছে! 🎉
            </h1>
            <p className="mt-2 text-muted-foreground">
              আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।
            </p>
          </motion.div>

          {/* Order Number Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 rounded-2xl border-2 border-success/30 bg-success/5 p-5 text-center"
          >
            <p className="text-sm font-medium text-muted-foreground">অর্ডার নম্বর</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-foreground">
              {orderNumber}
            </p>
          </motion.div>

          {verifying && (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border bg-card mt-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground">অনলাইন পেমেন্ট যাচাই করা হচ্ছে...</h2>
              <p className="text-muted-foreground mt-1 text-sm">অনুগ্রহ করে ব্রাউজার রিফ্রেশ বা ব্যাক করবেন না।</p>
            </div>
          )}

          {verificationError && (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-destructive/20 bg-destructive/5 mt-8">
              <span className="text-destructive text-3xl mb-3">⚠️</span>
              <h2 className="font-display text-lg font-bold text-destructive">পেমেন্ট ভেরিফিকেশন ব্যর্থ</h2>
              <p className="text-muted-foreground mt-1 text-sm max-w-md">{verificationError}</p>
            </div>
          )}

          {loadingOrder && !order && !verifying && !verificationError && (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border bg-card mt-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground">অর্ডারের তথ্য লোড করা হচ্ছে...</h2>
            </div>
          )}

          {!verifying && !verificationError && !loadingOrder && (
            order ? (
              <div className="mt-8 space-y-6">
                {/* Delivery Estimate */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Truck className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground">আনুমানিক ডেলিভারি সময়</p>
                    <p className="text-sm text-muted-foreground">
                      {deliveryEstimate} ({isDhaka ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"})
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                </motion.div>

                {/* Order Items */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="rounded-2xl border bg-card p-5"
                >
                  <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-card-foreground">
                    <Package className="h-5 w-5 text-accent" /> অর্ডারকৃত প্রোডাক্ট
                  </h2>
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-card-foreground line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}x {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                        <p className="font-display text-sm font-bold text-foreground whitespace-nowrap">
                          {formatPrice(item.totalPrice)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Price Breakdown */}
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>সাবটোটাল</span>
                      <span className="font-semibold text-foreground">{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>ডেলিভারি চার্জ</span>
                      <span className={`font-semibold ${order.deliveryCharge === 0 ? "text-success" : "text-foreground"}`}>
                        {order.deliveryCharge === 0 ? "ফ্রি" : formatPrice(order.deliveryCharge)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-base font-bold text-foreground">মোট</span>
                      <span className="font-display text-2xl font-extrabold text-foreground">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Customer & Delivery Info Grid */}
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Customer Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-2xl border bg-card p-5"
                  >
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-card-foreground">
                      <User className="h-5 w-5 text-accent" /> কাস্টমার তথ্য
                    </h2>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{order.customerName}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{order.customerPhone}</span>
                      </div>
                      {order.customerEmail && (
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-muted-foreground shrink-0">✉️</span>
                          <span className="text-foreground">{order.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <CreditCard className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{order.paymentMethod}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Delivery Address */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="rounded-2xl border bg-card p-5"
                  >
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-card-foreground">
                      <MapPin className="h-5 w-5 text-accent" /> ডেলিভারি ঠিকানা
                    </h2>
                    <div className="space-y-1.5 text-sm text-foreground">
                      <p>{order.shippingAddress.address}</p>
                      {order.shippingAddress.thana && <p>{order.shippingAddress.thana}</p>}
                      {order.shippingAddress.district && <p>{order.shippingAddress.district}</p>}
                      <p className="font-medium">{order.shippingAddress.division}</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
              <OrderTracker orderNumber={orderNumber} />
            )
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button onClick={() => navigate("/")} variant="outline" size="lg" className="w-full rounded-xl sm:w-auto">
              <Home className="mr-2 h-4 w-4" /> হোম পেজ
            </Button>
            <Button onClick={() => navigate("/products")} size="lg" className="w-full rounded-xl sm:w-auto">
              <ShoppingBag className="mr-2 h-4 w-4" /> আরও শপিং করুন
            </Button>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderSuccess;
