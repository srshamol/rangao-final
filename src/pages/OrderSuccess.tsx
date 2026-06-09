import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { analytics } from "@/services/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Home, ShoppingBag, MapPin, Phone, User, CreditCard, Truck, Package, Clock, Search } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderState {
  id?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: {
    division: string;
    district: string;
    thana: string;
    address: string;
  };
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
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

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", target.trim())
      .single();

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
  const order = location.state as OrderState | null;

  useEffect(() => {
    if (order) {
      const sessionKey = `purchase_tracked_${order.orderNumber}`;
      if (sessionStorage.getItem(sessionKey)) {
        console.log("[Purchase Tracking] Already tracked in this session:", order.orderNumber);
        return;
      }
      sessionStorage.setItem(sessionKey, "true");

      const checkAndTrack = async () => {
        try {
          const { data } = await supabase
            .from("store_settings" as any)
            .select("value")
            .eq("key", "public_tracking_settings")
            .maybeSingle();

          const config = data?.value as any;
          const isStrict = config?.meta_strict_purchase_mode !== false;

          if (isStrict) {
            const trackedOrdersStr = localStorage.getItem("fb_tracked_orders") || "[]";
            let trackedOrders: string[] = [];
            try {
              trackedOrders = JSON.parse(trackedOrdersStr);
            } catch {
              trackedOrders = [];
            }

            if (trackedOrders.includes(order.orderNumber)) {
              console.log("[Strict Purchase Mode] Duplicate purchase tracking prevented for:", order.orderNumber);
              return;
            }

            trackedOrders.push(order.orderNumber);
            localStorage.setItem("fb_tracked_orders", JSON.stringify(trackedOrders));
          }

          // Map items properly
          const mappedItems = order.items.map((i) => ({
            name: i.name,
            unitPrice: i.unitPrice,
            quantity: i.quantity
          }));

          analytics.purchase({
            orderNumber: order.orderNumber,
            total: order.total,
            items: mappedItems
          });

          // Trigger Conversions API (Server-side tracking) immediately on checkout completion
          if (order.id) {
            supabase.functions.invoke("fb-capi", {
              body: { order_id: order.id, event_name: "Purchase" }
            }).then(({ data, error }) => {
              console.log("[Conversions API Checkout completion trigger]:", data, error);
            });
          }
        } catch (e) {
          console.error("Error checking strict purchase mode:", e);
          const mappedItems = order.items.map((i) => ({
            name: i.name,
            unitPrice: i.unitPrice,
            quantity: i.quantity
          }));

          analytics.purchase({
            orderNumber: order.orderNumber,
            total: order.total,
            items: mappedItems
          });

          if (order.id) {
            supabase.functions.invoke("fb-capi", {
              body: { order_id: order.id, event_name: "Purchase" }
            }).catch(err => console.error("Error in fallback CAPI trigger:", err));
          }
        }
      };

      checkAndTrack();
    }
  }, [order]);

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

        if (data?.value) {
          const val = data.value as any;
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

          {order ? (
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
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
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
            /* Fallback: Order tracking by order number */
            <OrderTracker orderNumber={orderNumber} />
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
