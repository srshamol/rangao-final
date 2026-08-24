import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  RefreshCw,
  MapPin,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Package,
  Home,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  fetchSteadfastConsignmentDetails,
  parseNumericFee,
  parseParcelWeight,
  parseShippingAddress,
} from "@/lib/integrations/steadfast";

interface Props {
  order: any;
  onStatusChange?: (params: { status: string; note?: string; paymentStatus?: string }) => void;
}

const trackingSteps = [
  { key: "placed", label: "অর্ডার প্লেসড", icon: Clock },
  { key: "confirmed", label: "কনফার্মড", icon: CheckCircle2 },
  { key: "processing", label: "প্রসেসিং / কুরিয়ার", icon: Package },
  { key: "in_transit", label: "ইন ট্রানজিট / হাব", icon: Truck },
  { key: "out_for_delivery", label: "আউট ফর ডেলিভারি", icon: MapPin },
  { key: "delivered", label: "ডেলিভারড", icon: Home },
];

const courierStatusBengali: Record<string, string> = {
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
  cancelled_approval_pending: "ক্যান্সেলেশন অনুমোদনের অপেক্ষায়",
  hold: "হোল্ড (স্থগিত)",
  return: "রিটার্ন প্রক্রিয়াধীন",
  returned: "রিটার্ন সম্পন্ন",
  unknown: "অজ্ঞাত অবস্থা",
};

function getTrackingProgressIndex(orderStatus: string, courierStatus?: string): number {
  if (orderStatus === "cancelled" || orderStatus === "courier_cancelled") {
    return 1;
  }
  if (orderStatus === "delivered" || courierStatus === "delivered" || courierStatus === "delivered_approval_pending") {
    return 5;
  }
  if (courierStatus === "out_for_delivery") {
    return 4;
  }
  if (
    courierStatus === "in_transit" ||
    courierStatus === "dispatched" ||
    courierStatus === "picked" ||
    courierStatus === "pickup_done" ||
    orderStatus === "shipped"
  ) {
    return 3;
  }
  if (orderStatus === "processing" || courierStatus === "pending" || courierStatus === "in_review") {
    return 2;
  }
  if (orderStatus === "confirmed" || orderStatus === "in_review" || orderStatus === "hold") {
    return 1;
  }
  return 0;
}

export default function OrderTrackingTab({ order, onStatusChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const shipping = parseShippingAddress(order?.shipping_address);
  const currentStep = getTrackingProgressIndex(order.order_status, shipping.courier_status);
  const progressPercent = Math.min((currentStep / (trackingSteps.length - 1)) * 100, 100);

  const refreshTracking = async () => {
    if (!shipping.tracking_number && !shipping.consignment_id && !order.order_number) {
      toast({
        title: "ট্র্যাকিং নম্বর পাওয়া যায়নি",
        description: "কুরিয়ার ট্যাব থেকে আগে কুরিয়ার বুকিং করুন।",
        variant: "destructive",
      });
      return;
    }

    setRefreshing(true);
    try {
      const details = await fetchSteadfastConsignmentDetails({
        tracking_code: shipping.tracking_number,
        consignment_id: shipping.consignment_id,
        invoice: order.order_number,
      });

      const deliveryStatus = details.delivery_status || shipping.courier_status;
      const nowIso = new Date().toISOString();

      let newOrderStatus = order.order_status;
      let paymentStatus = order.payment_status;

      if (deliveryStatus === "delivered") {
        newOrderStatus = "delivered";
        if (order.payment_method === "cod") {
          paymentStatus = "completed";
        }
      } else if (deliveryStatus === "in_transit" || deliveryStatus === "dispatched" || deliveryStatus === "out_for_delivery") {
        if (order.order_status === "processing" || order.order_status === "confirmed") {
          newOrderStatus = "shipped";
        }
      } else if (deliveryStatus === "cancelled" || deliveryStatus === "cancelled_delivery" || deliveryStatus === "return" || deliveryStatus === "returned") {
        newOrderStatus = "courier_cancelled";
      }

      const totalAmount = Number(order.total_amount) || 0;
      const isCod = order.payment_method === "cod" || !order.payment_method;
      const isInsideDhaka =
        (shipping.city || shipping.address || "").toLowerCase().includes("dhaka") ||
        (shipping.city || shipping.address || "").includes("ঢাকা");
      const defaultCourierCharge = isInsideDhaka ? 60 : 120;

      const syncedDeliveryCharge = details.delivery_charge > 0
        ? details.delivery_charge
        : (shipping.courier_delivery_charge !== undefined
            ? parseNumericFee(shipping.courier_delivery_charge, defaultCourierCharge)
            : defaultCourierCharge);

      const syncedCodFee = isCod
        ? (details.cod_charge > 0
            ? details.cod_charge
            : (shipping.courier_cod_charge !== undefined
                ? parseNumericFee(shipping.courier_cod_charge, Math.round(totalAmount * 0.01))
                : Math.round(totalAmount * 0.01)))
        : 0;

      const syncedWeight = details.weight || shipping.parcel_weight || "1.0 kg";
      const syncedPayable = isCod ? Math.max(0, totalAmount - syncedDeliveryCharge - syncedCodFee) : totalAmount;

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
      };

      const updatePayload: any = {
        shipping_address: updatedAddress,
        order_status: newOrderStatus,
      };
      if (paymentStatus) {
        updatePayload.payment_status = paymentStatus;
      }

      const { error } = await supabase.from("orders").update(updatePayload).eq("id", order.id);
      if (error) throw error;

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "tracking_updated",
        details: `Steadfast লাইভ ট্র্যাকিং সিঙ্ক: ${courierStatusBengali[deliveryStatus] || deliveryStatus} (অর্ডার: ${newOrderStatus})`,
        staff_name: "System",
      });

      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });

      toast({
        title: "✅ ট্র্যাকিং আপডেট সফল!",
        description: `বর্তমান কুরিয়ার স্ট্যাটাস: ${courierStatusBengali[deliveryStatus] || deliveryStatus}`,
      });
    } catch (err: any) {
      toast({
        title: "ট্র্যাকিং সিঙ্ক ব্যর্থ",
        description: err.message || "লাইভ ট্র্যাকিং তথ্য আনা সম্ভব হয়নি।",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const trackingUrl =
    shipping?.courier_company === "Steadfast" && shipping?.tracking_number
      ? `https://steadfast.com.bd/tracking?tracking_code=${shipping.tracking_number}`
      : null;

  const sendCustomerNotification = () => {
    const trackingMsg = encodeURIComponent(
      `প্রিয় ${order.customer_name}, Rangao থেকে আপনার অর্ডার #${order.order_number} কুরিয়ারে পাঠানো হয়েছে। কুরিয়ার: ${shipping?.courier_company || "Steadfast"}, ট্র্যাকিং নম্বর: ${shipping?.tracking_number || "প্রক্রিয়াধীন"}। ${trackingUrl ? `লাইভ ট্র্যাক করতে ভিজিট করুন: ${trackingUrl}` : ""}`
    );
    window.open(`https://wa.me/88${String(order.customer_phone || "").replace(/^0/, "")}?text=${trackingMsg}`, "_blank");
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Tracking Header */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                লাইভ ট্র্যাকিং তথ্য
              </CardTitle>
              <CardDescription className="text-xs">
                কুরিয়ারের বর্তমান ডেলিভারি স্ট্যাটাস ও টাইমলাইন
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 text-orange-700 hover:bg-orange-50">
                    <ExternalLink className="h-3.5 w-3.5" /> কুরিয়ার ট্র্যাকিং লিংক
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 text-green-700 hover:bg-green-50"
                onClick={sendCustomerNotification}
              >
                <WhatsAppIcon className="h-3.5 w-3.5" /> কাস্টমারকে নোটিফাই
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={refreshTracking}
                disabled={refreshing || !shipping?.tracking_number}
              >
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                লাইভ রিফ্রেশ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <p className="text-xs text-muted-foreground">কুরিয়ার সার্ভিস</p>
              <p className="font-semibold text-foreground mt-0.5">{shipping?.courier_company || "অ্যাসাইন করা হয়নি"}</p>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <p className="text-xs text-muted-foreground">ট্র্যাকিং নম্বর</p>
              <p className="font-mono font-bold text-primary mt-0.5">{shipping?.tracking_number || "—"}</p>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <p className="text-xs text-muted-foreground">কুরিয়ার লাইভ স্ট্যাটাস</p>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                  {courierStatusBengali[shipping?.courier_status] || shipping?.courier_status || "বুকিং পেন্ডিং"}
                </Badge>
              </div>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <p className="text-xs text-muted-foreground">শেষ সিঙ্ক আপডেট</p>
              <p className="text-xs font-medium text-foreground mt-0.5">
                {shipping?.last_tracking_update
                  ? new Date(shipping.last_tracking_update).toLocaleString("bn-BD")
                  : shipping?.booked_at
                  ? new Date(shipping.booked_at).toLocaleString("bn-BD")
                  : new Date(order.updated_at).toLocaleString("bn-BD")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Shipment Progress */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">শিপমেন্ট প্রগ্রেস ট্র্যাক</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <Progress value={progressPercent} className="h-2.5 bg-muted" />

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {trackingSteps.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center text-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs transition-all shadow-xs ${
                      done
                        ? "bg-primary text-primary-foreground font-bold ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground border border-border"
                    } ${active ? "ring-4 ring-primary/40 scale-105" : ""}`}
                  >
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-[11px] leading-tight font-medium ${
                      active ? "font-bold text-primary" : done ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Chronological Tracking Timeline */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            ট্র্যাকিং মাইলস্টোন টাইমলাইন
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!shipping?.tracking_number && order.order_status === "pending" ? (
            <div className="text-center py-6 text-sm text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p>অর্ডারটি এখনও কুরিয়ারে পাঠানো হয়নি।</p>
              <p className="text-xs">কুরিয়ার ট্যাব থেকে পার্সেল বুকিং করলে এখানে লাইভ টাইমলাইন দৃশ্যমান হবে।</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/30 ml-4 pl-5 space-y-5 py-2">
              {/* Event 1: Order Placed */}
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-background" />
                <p className="text-sm font-semibold text-foreground">🛍️ অর্ডার প্লেস করা হয়েছে</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {new Date(order.created_at).toLocaleString("bn-BD")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">অর্ডার নম্বর #{order.order_number}, মূল্য: ৳{Number(order.total_amount).toLocaleString()}</p>
              </div>

              {/* Event 2: Order Confirmed */}
              {(order.order_status !== "pending" || order.confirmed_at) && (
                <div className="relative">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-background" />
                  <p className="text-sm font-semibold text-foreground">📌 অর্ডার কনফার্মেশন সম্পন্ন</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {new Date(order.updated_at || order.created_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">গ্রাহকের ডেলিভারি ঠিকানা ও আইটেম প্রস্তুত</p>
                </div>
              )}

              {/* Event 3: Courier Booked */}
              {shipping?.tracking_number && (
                <div className="relative">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 ring-4 ring-background" />
                  <p className="text-sm font-semibold text-foreground">🚚 কুরিয়ার বুকিং সম্পন্ন ({shipping?.courier_company || "Steadfast"})</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {shipping?.booked_at ? new Date(shipping.booked_at).toLocaleString("bn-BD") : new Date(order.updated_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ট্র্যাকিং কোড: <strong className="font-mono text-foreground">{shipping.tracking_number}</strong>
                    {shipping.consignment_id ? ` (CID: ${shipping.consignment_id})` : ""}
                  </p>
                </div>
              )}

              {/* Event 4: Latest Courier Status */}
              {shipping?.courier_status && shipping.courier_status !== "pending" && (
                <div className="relative">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-purple-600 ring-4 ring-background" />
                  <p className="text-sm font-semibold text-foreground">
                    📍 {courierStatusBengali[shipping.courier_status] || shipping.courier_status}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {shipping?.last_tracking_update ? new Date(shipping.last_tracking_update).toLocaleString("bn-BD") : "—"}
                  </p>
                </div>
              )}

              {/* Event 5: Delivered */}
              {order.order_status === "delivered" && (
                <div className="relative">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-green-600 ring-4 ring-background" />
                  <p className="text-sm font-semibold text-green-700">✅ ডেলিভারি সম্পন্ন হয়েছে</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {new Date(order.updated_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">গ্রাহকের কাছে সফলভাবে পার্সেল হস্তান্তর করা হয়েছে</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
