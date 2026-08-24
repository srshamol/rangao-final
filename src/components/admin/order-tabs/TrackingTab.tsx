import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  AlertCircle,
  Copy,
  Check,
  Scale,
  DollarSign,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  syncOrderTrackingFromSteadfast,
  courierStatusBengali,
  getCourierStatusBadgeClass,
  parseShippingAddress,
  TrackingUpdateItem,
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

function getTrackingProgressIndex(orderStatus: string, courierStatus?: string): number {
  if (orderStatus === "cancelled" || orderStatus === "courier_cancelled") {
    return 1;
  }
  if (
    orderStatus === "delivered" ||
    courierStatus === "delivered" ||
    courierStatus === "delivered_approval_pending"
  ) {
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

function getStatusIcon(status?: string) {
  if (!status) return MapPin;
  const s = status.toLowerCase();
  if (s.includes("delivered")) return CheckCircle2;
  if (s.includes("cancel") || s.includes("return")) return RotateCcw;
  if (s.includes("out_for_delivery")) return MapPin;
  if (s.includes("transit") || s.includes("dispatch")) return Truck;
  if (s.includes("picked")) return Package;
  return Clock;
}

export default function OrderTrackingTab({ order, onStatusChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedCid, setCopiedCid] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const shipping = parseShippingAddress(order?.shipping_address);
  const currentStep = getTrackingProgressIndex(order.order_status, shipping.courier_status);
  const progressPercent = Math.min((currentStep / (trackingSteps.length - 1)) * 100, 100);

  const trackingUpdates: TrackingUpdateItem[] = Array.isArray(shipping.tracking_updates)
    ? shipping.tracking_updates
    : [];

  const copyTracking = () => {
    if (!shipping.tracking_number) return;
    navigator.clipboard.writeText(shipping.tracking_number);
    setCopiedTracking(true);
    toast({ title: "📋 ট্র্যাকিং কোড কপি হয়েছে" });
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const copyCid = () => {
    if (!shipping.consignment_id) return;
    navigator.clipboard.writeText(String(shipping.consignment_id));
    setCopiedCid(true);
    toast({ title: "📋 Consignment ID কপি হয়েছে" });
    setTimeout(() => setCopiedCid(false), 2000);
  };

  const refreshTracking = async () => {
    if (!shipping.tracking_number && !shipping.consignment_id && !order.order_number) {
      toast({
        title: "ট্র্যাকিং নম্বর পাওয়া যায়নি",
        description: "কুরিয়ার ট্যাব থেকে আগে কুরিয়ার বুকিং সম্পন্ন করুন।",
        variant: "destructive",
      });
      return;
    }

    setRefreshing(true);
    try {
      const syncResult = await syncOrderTrackingFromSteadfast(order, { staffName: "Admin" });

      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });

      toast({
        title: "✅ Steadfast ট্র্যাকিং সিঙ্ক সম্পন্ন!",
        description: `বর্তমান স্ট্যাটাস: ${syncResult.courier_status_display} (অর্ডার অবস্থা: ${syncResult.new_order_status})`,
      });

      if (onStatusChange && syncResult.changed) {
        onStatusChange({
          status: syncResult.new_order_status,
          note: `Steadfast লাইভ ট্র্যাকিং সিঙ্ক: ${syncResult.courier_status_display}`,
        });
      }
    } catch (err: any) {
      toast({
        title: "ট্র্যাকিং সিঙ্ক ব্যর্থ",
        description: err.message || "Steadfast থেকে লাইভ ট্র্যাকিং তথ্য আনা সম্ভব হয়নি।",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddManualNote = async () => {
    if (!manualNote.trim()) return;
    setSavingNote(true);
    try {
      const nowIso = new Date().toISOString();
      const newUpdateItem: TrackingUpdateItem = {
        status: shipping.courier_status || order.order_status || "in_transit",
        status_display: courierStatusBengali[shipping.courier_status] || "ম্যানুয়াল ট্র্যাকিং নোট",
        message: manualNote.trim(),
        timestamp: nowIso,
        source: "admin",
      };

      const updatedList = [...trackingUpdates, newUpdateItem];
      const updatedAddress = {
        ...shipping,
        tracking_updates: updatedList,
        last_tracking_update: nowIso,
      };

      const { error } = await supabase
        .from("orders")
        .update({ shipping_address: updatedAddress })
        .eq("id", order.id);

      if (error) throw error;

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "tracking_note_added",
        details: `ট্র্যাকিং নোট যোগ করা হয়েছে: ${manualNote.trim()}`,
        staff_name: "Admin",
      });

      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });

      setManualNote("");
      setShowAddNote(false);
      toast({ title: "✅ ট্র্যাকিং নোট সেভ হয়েছে" });
    } catch (err: any) {
      toast({
        title: "নোট সেভ ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingNote(false);
    }
  };

  const trackingUrl =
    shipping?.courier_company?.toLowerCase() === "steadfast" || shipping?.tracking_number
      ? `https://steadfast.com.bd/tracking?tracking_code=${shipping.tracking_number || ""}`
      : null;

  const currentStatusDisplay =
    courierStatusBengali[shipping?.courier_status] ||
    shipping?.courier_status ||
    (shipping?.tracking_number ? "প্রসেসিং" : "বুকিং পেন্ডিং");

  const sendCustomerNotification = () => {
    const trackingMsg = encodeURIComponent(
      `প্রিয় ${order.customer_name}, Rangao থেকে আপনার অর্ডার #${order.order_number} কুরিয়ারে পাঠানো হয়েছে।\n\n` +
      `📦 কুরিয়ার: ${shipping?.courier_company || "Steadfast Courier"}\n` +
      `🔖 ট্র্যাকিং কোড: ${shipping?.tracking_number || "প্রক্রিয়াধীন"}\n` +
      `📍 বর্তমান অবস্থা: ${currentStatusDisplay}\n\n` +
      `${trackingUrl ? `🌐 লাইভ ট্র্যাক করতে ভিজিট করুন: ${trackingUrl}` : ""}`
    );
    window.open(`https://wa.me/88${String(order.customer_phone || "").replace(/^0/, "")}?text=${trackingMsg}`, "_blank");
  };

  return (
    <div className="space-y-4 mt-4">
      {/* 1. Live Tracking Info Header Card */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4.5 w-4.5 text-primary" />
                Steadfast লাইভ ট্র্যাকিং তথ্য
              </CardTitle>
              <CardDescription className="text-xs">
                কুরিয়ারের বর্তমান ডেলিভারি স্ট্যাটাস, পার্সেল ডিটেইলস ও টাইমলাইন
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 text-orange-700 hover:bg-orange-50 border-orange-200">
                    <ExternalLink className="h-3.5 w-3.5" /> কুরিয়ার ট্র্যাকিং লিংক
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 text-green-700 hover:bg-green-50 border-green-200"
                onClick={sendCustomerNotification}
              >
                <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp নোটিফাই
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={refreshTracking}
                disabled={refreshing || (!shipping?.tracking_number && !shipping?.consignment_id && !order?.order_number)}
              >
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Steadfast সিঙ্ক
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
            {/* Courier Name */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <p className="text-xs text-muted-foreground font-medium">কুরিয়ার সার্ভিস</p>
              <p className="font-semibold text-foreground mt-1 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {shipping?.courier_company || "Steadfast Courier"}
              </p>
            </div>

            {/* Tracking Code */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">ট্র্যাকিং কোড</p>
                {shipping?.tracking_number && (
                  <button
                    onClick={copyTracking}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="কপি করুন"
                  >
                    {copiedTracking ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <p className="font-mono font-bold text-primary mt-1 text-sm tracking-wide">
                {shipping?.tracking_number || "—"}
              </p>
            </div>

            {/* Consignment ID */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">Consignment ID</p>
                {shipping?.consignment_id && (
                  <button
                    onClick={copyCid}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="কপি করুন"
                  >
                    {copiedCid ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <p className="font-mono font-semibold text-foreground mt-1 text-sm">
                {shipping?.consignment_id || "—"}
              </p>
            </div>

            {/* Live Courier Status */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <p className="text-xs text-muted-foreground font-medium">কুরিয়ার লাইভ অবস্থা</p>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${getCourierStatusBadgeClass(
                    shipping?.courier_status
                  )}`}
                >
                  <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                  </span>
                  {currentStatusDisplay}
                </Badge>
              </div>
            </div>

            {/* Parcel Weight */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Scale className="h-3 w-3" /> পার্সেল ওজন
              </p>
              <p className="font-semibold text-foreground mt-1">
                {shipping?.parcel_weight || "1.0 kg"}
              </p>
            </div>

            {/* Courier Delivery Charge */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <p className="text-xs text-muted-foreground font-medium">কুরিয়ার ডেলিভারি চার্জ</p>
              <p className="font-bold text-foreground mt-1 text-primary">
                ৳{Number(shipping?.courier_delivery_charge ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Courier COD Fee */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <p className="text-xs text-muted-foreground font-medium">১% COD চার্জ</p>
              <p className="font-bold text-foreground mt-1">
                ৳{Number(shipping?.courier_cod_charge ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Last Tracking Update Time */}
            <div className="bg-background/80 p-3 rounded-xl border border-border/50 shadow-2xs">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> শেষ সিঙ্ক আপডেট
              </p>
              <p className="text-xs font-medium text-foreground mt-1">
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

      {/* 2. Visual Shipment Progress Bar */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>শিপমেন্ট প্রগ্রেস ট্র্যাক</span>
            <span className="text-xs font-normal text-muted-foreground">
              স্টেপ: {currentStep + 1} / {trackingSteps.length}
            </span>
          </CardTitle>
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

      {/* 3. Chronological Tracking Updates Timeline */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Steadfast ট্র্যাকিং আপডেটস টাইমলাইন
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7.5"
                onClick={() => setShowAddNote(!showAddNote)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                ট্র্যাকিং নোট যোগ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Add Manual Note Form */}
          {showAddNote && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2.5">
              <p className="text-xs font-semibold text-foreground">ম্যানুয়াল ট্র্যাকিং আপডেট / নোট</p>
              <div className="flex gap-2">
                <Input
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="যেমন: হাবে পৌঁছেছে, রাইডারকে ফোন দেওয়া হয়েছে..."
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && handleAddManualNote()}
                />
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={handleAddManualNote}
                  disabled={savingNote || !manualNote.trim()}
                >
                  {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "সেভ"}
                </Button>
              </div>
            </div>
          )}

          {!shipping?.tracking_number && order.order_status === "pending" && trackingUpdates.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-semibold text-foreground">পার্সেল এখনও কুরিয়ারে পাঠানো হয়নি</p>
              <p className="text-xs max-w-sm mx-auto">
                কুরিয়ার ট্যাব থেকে পার্সেল বুকিং সম্পন্ন করলে স্বয়ংক্রিয়ভাবে Steadfast লাইভ ট্র্যাকিং আপডেট রেকর্ড হবে।
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/30 ml-4 pl-5 space-y-6 py-2">
              {/* Event 1: Order Placed */}
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">🛍️ অর্ডার প্লেস করা হয়েছে</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted">সিস্টেম</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {new Date(order.created_at).toLocaleString("bn-BD")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  অর্ডার নম্বর #{order.order_number} | মোট মূল্য: ৳{Number(order.total_amount).toLocaleString()}
                </p>
              </div>

              {/* Event 2: Order Confirmed */}
              {(order.order_status !== "pending" || order.confirmed_at) && (
                <div className="relative">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-background" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">📌 অর্ডার কনফার্মেশন সম্পন্ন</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700">কনফার্মড</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {new Date(order.updated_at || order.created_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    গ্রাহকের ডেলিভারি ঠিকানা ও আইটেম প্রস্তুত করা হয়েছে।
                  </p>
                </div>
              )}

              {/* Event 3: Courier Booked */}
              {shipping?.tracking_number && (
                <div className="relative">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 ring-4 ring-background" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      🚚 Steadfast কুরিয়ার বুকিং সম্পন্ন
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-orange-50 text-orange-700">বুকড</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {shipping?.booked_at
                      ? new Date(shipping.booked_at).toLocaleString("bn-BD")
                      : new Date(order.updated_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ট্র্যাকিং কোড: <strong className="font-mono text-foreground">{shipping.tracking_number}</strong>
                    {shipping.consignment_id ? ` (CID: ${shipping.consignment_id})` : ""}
                  </p>
                </div>
              )}

              {/* Dynamic Steadfast Tracking Updates List */}
              {trackingUpdates.map((update, idx) => {
                const UpdateIcon = getStatusIcon(update.status);
                const badgeClass = getCourierStatusBadgeClass(update.status);

                return (
                  <div key={`${update.timestamp}-${idx}`} className="relative">
                    <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-accent ring-4 ring-background" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <UpdateIcon className="h-3.5 w-3.5 text-primary" />
                        {courierStatusBengali[update.status] || update.status_display || update.status}
                      </span>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${badgeClass}`}>
                        {update.source === "steadfast_webhook"
                          ? "Steadfast Webhook"
                          : update.source === "steadfast_api"
                          ? "Steadfast API"
                          : update.source === "admin"
                          ? "এডমিন নোট"
                          : "লাইভ সিঙ্ক"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {new Date(update.timestamp).toLocaleString("bn-BD")}
                    </p>
                    {update.message && (
                      <p className="text-xs text-foreground/80 mt-0.5 bg-muted/30 p-1.5 rounded-md border border-border/40 inline-block">
                        {update.message}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Fallback if tracking updates array is empty but shipping courier status exists */}
              {trackingUpdates.length === 0 &&
                shipping?.courier_status &&
                shipping.courier_status !== "pending" && (
                  <div className="relative">
                    <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-purple-600 ring-4 ring-background" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        📍 {courierStatusBengali[shipping.courier_status] || shipping.courier_status}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-purple-50 text-purple-700">লাইভ স্ট্যাটাস</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {shipping?.last_tracking_update
                        ? new Date(shipping.last_tracking_update).toLocaleString("bn-BD")
                        : "—"}
                    </p>
                  </div>
                )}

              {/* Final Event: Delivered */}
              {(order.order_status === "delivered" || shipping?.courier_status === "delivered") && (
                <div className="relative">
                  <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-background" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-700">
                      ✅ ডেলিভারি সম্পন্ন হয়েছে
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-100 text-emerald-800 border-emerald-300">
                      সফল
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {new Date(order.updated_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    গ্রাহকের কাছে সফলভাবে পার্সেল হস্তান্তর করা হয়েছে।
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
