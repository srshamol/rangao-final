import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Truck,
  Loader2,
  CheckCircle,
  Wallet,
  Zap,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Building2,
  Scale,
  Percent,
  Banknote,
  RefreshCw,
} from "lucide-react";
import {
  createSteadfastOrder,
  getSteadfastBalance,
  cleanSteadfastAddress,
  fetchSteadfastConsignmentDetails,
  parseNumericFee,
  parseParcelWeight,
  parseShippingAddress,
} from "@/lib/integrations/steadfast";

interface Props {
  order: any;
  onStatusChange?: (params: { status: string; note?: string; paymentStatus?: string }) => void;
}

const commonCouriers = [
  "Steadfast",
  "Pathao",
  "RedX",
  "Paperfly",
  "Sundarban Courier",
  "SA Paribahan",
  "ইন-হাউস ডেলিভারি (In-House)",
  "অন্যান্য (Other)",
];

export default function OrderCourierTab({ order }: Props) {
  const shippingData = parseShippingAddress(order?.shipping_address);
  const [specialNote, setSpecialNote] = useState(shippingData.special_note || "");
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManualAssign, setShowManualAssign] = useState(false);
  const [syncingCourier, setSyncingCourier] = useState(false);

  const totalAmount = Number(order.total_amount) || 0;
  const isCod = order.payment_method === "cod" || !order.payment_method;
  const isInsideDhaka =
    (shippingData.city || shippingData.address || "").toLowerCase().includes("dhaka") ||
    (shippingData.city || shippingData.address || "").includes("ঢাকা");
  const defaultCourierCharge = isInsideDhaka ? 60 : 120;

  const [bookingWeight, setBookingWeight] = useState(
    parseParcelWeight(shippingData.parcel_weight || shippingData.weight, "1.0 kg")
  );
  const [bookingDeliveryCharge, setBookingDeliveryCharge] = useState<number>(
    shippingData.courier_delivery_charge !== undefined
      ? parseNumericFee(shippingData.courier_delivery_charge, defaultCourierCharge)
      : defaultCourierCharge
  );

  // Manual courier form state
  const [manualForm, setManualForm] = useState({
    courier_company: shippingData.courier_company || "Steadfast",
    tracking_number: shippingData.tracking_number || "",
    consignment_id: shippingData.consignment_id || "",
    status: order?.order_status === "shipped" ? "shipped" : "processing",
    parcel_weight: parseParcelWeight(shippingData.parcel_weight || shippingData.weight, "1.0 kg"),
    courier_delivery_charge:
      shippingData.courier_delivery_charge !== undefined
        ? parseNumericFee(shippingData.courier_delivery_charge, defaultCourierCharge)
        : defaultCourierCharge,
    note: "",
  });

  const { toast } = useToast();
  const qc = useQueryClient();

  const address = cleanSteadfastAddress(shippingData) || order.customer_city || "ঢাকা, বাংলাদেশ";
  const isAlreadyBooked = !!shippingData.consignment_id || !!shippingData.tracking_number;

  const checkBalance = async () => {
    setBalanceLoading(true);
    try {
      const currentBal = await getSteadfastBalance();
      setBalance(currentBal);
      toast({ title: `Steadfast ব্যালেন্স: ৳${currentBal.toLocaleString()}` });
    } catch (err: any) {
      toast({
        title: "ব্যালেন্স চেক ব্যর্থ",
        description: err.message || "ব্যালেন্স তথ্য পাওয়া যায়নি।",
        variant: "destructive",
      });
    } finally {
      setBalanceLoading(false);
    }
  };

  const copyTracking = () => {
    if (!shippingData.tracking_number) return;
    navigator.clipboard.writeText(shippingData.tracking_number);
    setCopied(true);
    toast({ title: "📋 ট্র্যাকিং নম্বর কপি হয়েছে" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSteadfastTransfer = async () => {
    setSaving(true);
    try {
      const apiResult = await createSteadfastOrder({
        invoice: order.order_number,
        recipient_name: order.customer_name || "Customer",
        recipient_phone: order.customer_phone,
        recipient_address: address,
        cod_amount: totalAmount,
        note: specialNote || order.notes || "",
        delivery_type: 0,
      });

      const consignment = apiResult.consignment || apiResult || {};
      const trackingCode = consignment.tracking_code || "";
      const consignmentId = consignment.consignment_id || "";

      const rawCharge = consignment.delivery_charge ?? consignment.delivery_fee ?? bookingDeliveryCharge;
      const charge = parseNumericFee(rawCharge, bookingDeliveryCharge);
      const rawCodFee = consignment.cod_charge ?? consignment.cod_fee;
      const codFee = isCod ? (parseNumericFee(rawCodFee, 0) || Math.round(totalAmount * 0.01)) : 0;
      const payable = isCod ? Math.max(0, totalAmount - charge - codFee) : totalAmount;
      const weight = parseParcelWeight(consignment.weight || bookingWeight, "1.0 kg");

      // Update order in DB
      const updatedAddress = {
        ...shippingData,
        courier_company: "Steadfast",
        tracking_number: trackingCode,
        consignment_id: String(consignmentId),
        delivery_type: "standard",
        special_note: specialNote,
        courier_status: consignment.status || "pending",
        parcel_weight: weight,
        courier_delivery_charge: charge,
        courier_cod_charge: codFee,
        courier_payable: payable,
        booked_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("orders")
        .update({ shipping_address: updatedAddress, order_status: "processing" as any })
        .eq("id", order.id);
      if (error) throw error;

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "courier_booked",
        details: `Steadfast-এ পাঠানো হয়েছে। ট্র্যাকিং: ${trackingCode}, Consignment: ${consignmentId} | ওজন: ${weight}, চার্জ: ৳${charge}, ১% COD: ৳${codFee}`,
        staff_name: "Admin",
      });

      // Send Telegram notification
      try {
        const { sendTelegramNotification } = await import("@/lib/telegram");
        const oldStatusBangla = order.order_status;
        const message =
          `🚚 <b>অর্ডার কুরিয়ারে পাঠানো হয়েছে (Steadfast)!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${order.order_number}\n` +
          `<b>গ্রাহকের নাম:</b> ${order.customer_name}\n` +
          `<b>মোবাইল:</b> ${order.customer_phone}\n` +
          `<b>ট্র্যাকিং কোড:</b> <code>${trackingCode}</code>\n` +
          `<b>পার্সেল ওজন:</b> ${weight}\n` +
          `<b>কুরিয়ার চার্জ:</b> ৳${charge}\n` +
          `<b>পূর্বের স্ট্যাটাস:</b> ${oldStatusBangla}\n` +
          `<b>বর্তমান স্ট্যাটাস:</b> প্রসেসিং`;

        await sendTelegramNotification(message, { isStatusUpdate: true });
      } catch (tgErr) {
        console.error("Error triggering telegram courier notification:", tgErr);
      }

      toast({ title: "✅ Steadfast-এ সফলভাবে পাঠানো হয়েছে!", description: `ট্র্যাকিং: ${trackingCode || "সফল"}` });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
    } catch (err: any) {
      toast({
        title: "Steadfast বুকিং ব্যর্থ",
        description: err.message || "বুকিং করা সম্ভব হয়নি।",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    setSaving(true);
    try {
      const charge = parseNumericFee(manualForm.courier_delivery_charge, defaultCourierCharge);
      const codFee = isCod ? Math.round(totalAmount * 0.01) : 0;
      const payable = isCod ? Math.max(0, totalAmount - charge - codFee) : totalAmount;
      const weight = parseParcelWeight(manualForm.parcel_weight, "1.0 kg");

      const updatedAddress = {
        ...shippingData,
        courier_company: manualForm.courier_company,
        tracking_number: manualForm.tracking_number.trim(),
        consignment_id: manualForm.consignment_id.trim() || undefined,
        courier_status: "pending",
        parcel_weight: weight,
        courier_delivery_charge: charge,
        courier_cod_charge: codFee,
        courier_payable: payable,
        booked_at: shippingData.booked_at || new Date().toISOString(),
      };

      const { error } = await supabase
        .from("orders")
        .update({
          shipping_address: updatedAddress,
          order_status: manualForm.status as any,
        })
        .eq("id", order.id);

      if (error) throw error;

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "courier_booked",
        details: `কুরিয়ার আপডেট (${manualForm.courier_company})। ট্র্যাকিং: ${manualForm.tracking_number || "—"} | ওজন: ${weight}, চার্জ: ৳${charge}, ১% COD: ৳${codFee}${manualForm.note ? ` | নোট: ${manualForm.note}` : ""}`,
        staff_name: "Admin",
      });

      toast({ title: "✅ কুরিয়ার তথ্য সেভ হয়েছে" });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
      setShowManualAssign(false);
    } catch (err: any) {
      toast({ title: "কুরিয়ার তথ্য আপডেট ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const syncLiveCourierData = async () => {
    if (!shippingData.tracking_number && !shippingData.consignment_id && !order.order_number) {
      toast({ title: "ট্র্যাকিং তথ্য নেই", variant: "destructive" });
      return;
    }

    setSyncingCourier(true);
    try {
      const details = await fetchSteadfastConsignmentDetails({
        tracking_code: shippingData.tracking_number,
        consignment_id: shippingData.consignment_id,
        invoice: order.order_number,
      });

      const syncedWeight = details.weight || shippingData.parcel_weight || "1.0 kg";
      const syncedDeliveryCharge = details.delivery_charge > 0
        ? details.delivery_charge
        : (shippingData.courier_delivery_charge !== undefined
            ? parseNumericFee(shippingData.courier_delivery_charge, defaultCourierCharge)
            : defaultCourierCharge);

      const syncedCodFee = isCod
        ? (details.cod_charge > 0
            ? details.cod_charge
            : (shippingData.courier_cod_charge !== undefined
                ? parseNumericFee(shippingData.courier_cod_charge, Math.round(totalAmount * 0.01))
                : Math.round(totalAmount * 0.01)))
        : 0;

      const syncedPayable = isCod
        ? Math.max(0, totalAmount - syncedDeliveryCharge - syncedCodFee)
        : totalAmount;

      const updatedAddress = {
        ...shippingData,
        courier_company: shippingData.courier_company || "Steadfast",
        tracking_number: details.tracking_code || shippingData.tracking_number,
        consignment_id: details.consignment_id || shippingData.consignment_id,
        courier_status: details.delivery_status || shippingData.courier_status || "pending",
        parcel_weight: syncedWeight,
        courier_delivery_charge: syncedDeliveryCharge,
        courier_cod_charge: syncedCodFee,
        courier_payable: syncedPayable,
        last_tracking_update: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("orders")
        .update({ shipping_address: updatedAddress })
        .eq("id", order.id);

      if (error) throw error;

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "tracking_updated",
        details: `Steadfast থেকে সিঙ্ক: ওজন: ${syncedWeight}, ডেলিভারি চার্জ: ৳${syncedDeliveryCharge}, ১% COD: ৳${syncedCodFee}`,
        staff_name: "Admin",
      });

      toast({
        title: "✅ কুরিয়ার থেকে সফলভাবে সিঙ্ক হয়েছে!",
        description: `ওজন: ${syncedWeight} | চার্জ: ৳${syncedDeliveryCharge} | ১% COD: ৳${syncedCodFee}`,
      });

      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
    } catch (err: any) {
      toast({
        title: "কুরিয়ার সিঙ্ক ব্যর্থ",
        description: err.message || "Steadfast থেকে তথ্য আনা সম্ভব হয়নি।",
        variant: "destructive",
      });
    } finally {
      setSyncingCourier(false);
    }
  };

  const bookedCodFee = isCod
    ? (shippingData.courier_cod_charge !== undefined
        ? parseNumericFee(shippingData.courier_cod_charge, Math.round(totalAmount * 0.01))
        : Math.round(totalAmount * 0.01))
    : 0;

  const bookedCourierCharge =
    shippingData.courier_delivery_charge !== undefined
      ? parseNumericFee(shippingData.courier_delivery_charge, defaultCourierCharge)
      : defaultCourierCharge;

  const bookedNetPayout = isCod
    ? Math.max(0, totalAmount - bookedCourierCharge - bookedCodFee)
    : totalAmount;

  return (
    <div className="space-y-4 mt-4">
      {/* Wallet Balance Card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Steadfast অ্যাকাউন্ট ব্যালেন্স</p>
              <div className="flex items-center gap-2 mt-0.5">
                {balance !== null ? (
                  <Badge variant="outline" className="text-sm font-mono font-bold text-primary bg-primary/5">
                    ৳{balance.toLocaleString()}
                  </Badge>
                ) : (
                  <span className="text-xs font-medium text-foreground">ব্যালেন্স চেক করুন</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={checkBalance} disabled={balanceLoading} className="text-xs h-8 gap-1.5">
            {balanceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
            চেক ব্যালেন্স
          </Button>
        </CardContent>
      </Card>

      {/* Booked Courier Information Card */}
      {isAlreadyBooked && !showManualAssign && (
        <Card className="border-green-300/80 bg-green-50/20 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">কুরিয়ার অ্যাসাইন করা হয়েছে</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 bg-background border-primary/30 text-primary hover:bg-primary/5"
                onClick={syncLiveCourierData}
                disabled={syncingCourier}
              >
                {syncingCourier ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                সিঙ্ক করুন
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 bg-background"
                onClick={() => {
                  setManualForm({
                    courier_company: shippingData.courier_company || "Steadfast",
                    tracking_number: shippingData.tracking_number || "",
                    consignment_id: shippingData.consignment_id || "",
                    status: order?.order_status || "processing",
                    parcel_weight: parseParcelWeight(shippingData.parcel_weight || shippingData.weight, "1.0 kg"),
                    courier_delivery_charge: bookedCourierCharge,
                    note: "",
                  });
                  setShowManualAssign(true);
                }}
              >
                <Edit className="h-3 w-3" /> এডিট / পরিবর্তন
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">কুরিয়ার কোম্পানি</p>
                <p className="font-semibold text-foreground mt-0.5">{shippingData.courier_company || "Steadfast"}</p>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">ট্র্যাকিং কোড</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="font-mono font-bold text-primary">{shippingData.tracking_number || "—"}</p>
                  {shippingData.tracking_number && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={copyTracking}>
                      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </Button>
                  )}
                </div>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">Consignment ID</p>
                <p className="font-mono font-medium text-foreground mt-0.5">{shippingData.consignment_id || "—"}</p>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">বুকিং সময়</p>
                <p className="text-xs font-medium text-foreground mt-0.5">
                  {shippingData.booked_at ? new Date(shippingData.booked_at).toLocaleString("bn-BD") : "—"}
                </p>
              </div>
            </div>

            {/* Synced Courier Fees Breakdown */}
            <div className="bg-background/80 border border-border/60 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Scale className="h-3 w-3 text-amber-600" /> ওজন:
                </span>
                <span className="font-bold text-foreground font-mono">
                  {parseParcelWeight(shippingData.parcel_weight || shippingData.weight, "1.0 kg")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3 text-blue-600" /> কুরিয়ার চার্জ:
                </span>
                <span className="font-bold text-foreground font-mono">৳{bookedCourierCharge.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3 text-purple-600" /> ১% COD ফি:
                </span>
                <span className="font-bold text-foreground font-mono">
                  {isCod ? `৳${bookedCodFee.toLocaleString()}` : "৳০"}
                </span>
              </div>
              <div>
                <span className="text-green-700 font-medium flex items-center gap-1">
                  <Banknote className="h-3 w-3 text-green-600" /> নিট প্রাপ্তি:
                </span>
                <span className="font-black text-green-700 font-mono">৳{bookedNetPayout.toLocaleString()}</span>
              </div>
            </div>

            {shippingData.courier_company === "Steadfast" && shippingData.tracking_number && (
              <div className="pt-1 flex justify-end">
                <a
                  href={`https://steadfast.com.bd/tracking?tracking_code=${shippingData.tracking_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 text-orange-700 hover:bg-orange-50">
                    <ExternalLink className="h-3.5 w-3.5" /> Steadfast ট্র্যাকিং পোর্টাল
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steadfast Automated Booking Card */}
      {!isAlreadyBooked && !showManualAssign && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                Steadfast কুরিয়ারে অটো-বুকিং পাঠান
              </CardTitle>
              <CardDescription className="text-xs">
                এক ক্লিকে Steadfast API-এর মাধ্যমে পার্সেল কনসাইনমেন্ট তৈরি করুন
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setShowManualAssign(true)}
            >
              <Building2 className="h-3 w-3" /> ম্যানুয়াল কুরিয়ার
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="bg-muted/40 rounded-lg p-3.5 space-y-1.5 text-xs sm:text-sm border border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p><span className="text-muted-foreground">ইনভয়েস:</span> <strong className="font-mono text-foreground">#{order.order_number}</strong></p>
                <p><span className="text-muted-foreground">কাস্টমার নাম:</span> <strong className="text-foreground">{order.customer_name}</strong></p>
                <p><span className="text-muted-foreground">মোবাইল ফোন:</span> <strong className="font-mono text-foreground">{order.customer_phone}</strong></p>
                <p><span className="text-muted-foreground">COD অ্যামাউন্ট:</span> <strong className="text-primary font-bold">৳{totalAmount.toLocaleString()}</strong></p>
              </div>
              <p className="pt-1 border-t border-border/40"><span className="text-muted-foreground">ডেলিভারি ঠিকানা:</span> <strong className="text-foreground">{address || "ঠিকানা পাওয়া যায়নি"}</strong></p>
            </div>

            {/* Weight & Estimated Courier Fee Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">পার্সেল ওজন (Weight)</Label>
                <Input
                  className="h-9 text-sm mt-1 font-mono"
                  placeholder="e.g. 1.0 kg, 0.5 kg"
                  value={bookingWeight}
                  onChange={(e) => setBookingWeight(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">কুরিয়ার ডেলিভারি চার্জ (৳)</Label>
                <Input
                  type="number"
                  className="h-9 text-sm mt-1 font-mono"
                  placeholder="e.g. 60 or 120"
                  value={bookingDeliveryCharge}
                  onChange={(e) => setBookingDeliveryCharge(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Real-time Settlement Preview */}
            <div className="bg-muted/20 border border-border/60 rounded-md p-2.5 text-xs grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-muted-foreground">কুরিয়ার চার্জ</p>
                <p className="font-bold text-foreground font-mono">৳{bookingDeliveryCharge.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">১% COD ফি</p>
                <p className="font-bold text-foreground font-mono">৳{Math.round(totalAmount * 0.01).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">প্রত্যাশিত নিট মার্জিন</p>
                <p className="font-black text-green-700 font-mono">
                  ৳{Math.max(0, totalAmount - bookingDeliveryCharge - Math.round(totalAmount * 0.01)).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">স্পেশাল ডেলিভারি নোট (ঐচ্ছিক)</Label>
              <Textarea
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                placeholder="যেমন: ডেলিভারির পূর্বে ফোন দিন, ভঙ্গুর পণ্য, ইত্যাদি..."
                rows={2}
                className="text-sm mt-1"
              />
            </div>

            <Button
              onClick={handleSteadfastTransfer}
              disabled={saving}
              className="w-full gap-2 h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              🚀 Steadfast কুরিয়ারে বুকিং সম্পন্ন করুন
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              ⚡ পাঠানো হলে সাথে সাথে Steadfast ট্র্যাকিং কোড জেনারেট হবে এবং অর্ডার স্ট্যাটাস 'প্রসেসিং' এ আপডেট হবে।
            </p>
          </CardContent>
        </Card>
      )}

      {/* Manual Courier Assignment / Edit Form */}
      {showManualAssign && (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                ম্যানুয়াল কুরিয়ার সেটিংস
              </CardTitle>
              <CardDescription className="text-xs">
                অন্যান্য কুরিয়ার (Pathao, RedX, Sundarban ইত্যাদি) বা কাস্টম ট্র্যাকিং সেট করুন
              </CardDescription>
            </div>
            {isAlreadyBooked && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setShowManualAssign(false)}
              >
                বাতিল
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">কুরিয়ার সার্ভিস</Label>
                <Select
                  value={manualForm.courier_company}
                  onValueChange={(v) => setManualForm((p) => ({ ...p, courier_company: v }))}
                >
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue placeholder="কুরিয়ার সিলেক্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonCouriers.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">ট্র্যাকিং নম্বর (Tracking Code)</Label>
                <Input
                  className="h-9 text-sm mt-1 font-mono"
                  placeholder="যেমন: TRK123456"
                  value={manualForm.tracking_number}
                  onChange={(e) => setManualForm((p) => ({ ...p, tracking_number: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">কনসাইনমেন্ট আইডি (ঐচ্ছিক)</Label>
                <Input
                  className="h-9 text-sm mt-1 font-mono"
                  placeholder="Consignment / Parcel ID"
                  value={manualForm.consignment_id}
                  onChange={(e) => setManualForm((p) => ({ ...p, consignment_id: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">পার্সেল ওজন</Label>
                <Input
                  className="h-9 text-sm mt-1 font-mono"
                  placeholder="1.0 kg"
                  value={manualForm.parcel_weight}
                  onChange={(e) => setManualForm((p) => ({ ...p, parcel_weight: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">কুরিয়ার ডেলিভারি চার্জ (৳)</Label>
                <Input
                  type="number"
                  className="h-9 text-sm mt-1 font-mono"
                  placeholder="60 or 120"
                  value={manualForm.courier_delivery_charge}
                  onChange={(e) => setManualForm((p) => ({ ...p, courier_delivery_charge: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">অর্ডার স্ট্যাটাস সেট করুন</Label>
                <Select
                  value={manualForm.status}
                  onValueChange={(v) => setManualForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue placeholder="স্ট্যাটাস" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">প্রসেসিং (Processing)</SelectItem>
                    <SelectItem value="shipped">শিপড (Shipped)</SelectItem>
                    <SelectItem value="delivered">ডেলিভারড (Delivered)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">নোট (ঐচ্ছিক)</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="কুরিয়ার সংক্রান্ত কোনো মন্তব্য..."
                value={manualForm.note}
                onChange={(e) => setManualForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => setShowManualAssign(false)}
              >
                বন্ধ করুন
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={handleManualSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                কুরিয়ার তথ্য সেভ করুন
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
