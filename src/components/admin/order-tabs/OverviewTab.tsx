import { useState, useEffect } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Phone,
  Mail,
  Pencil,
  Save,
  X,
  Copy,
  Check,
  CreditCard,
  ShoppingBag,
  Tag,
  Scale,
  Truck,
  Percent,
  Banknote,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { isValidBDPhone, normalizeBDPhone } from "@/lib/phoneValidation";
import {
  fetchSteadfastConsignmentDetails,
  parseNumericFee,
  parseParcelWeight,
  parseShippingAddress,
} from "@/lib/integrations/steadfast";

interface Props {
  order: any;
  items: any[];
}

const statusLabels: Record<string, string> = {
  pending: "পেন্ডিং",
  confirmed: "কনফার্মড",
  hold: "হোল্ড",
  in_review: "ইন-রিভিউ",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভারড",
  cancelled: "ক্যান্সেলড",
  courier_cancelled: "কুরিয়ার ক্যান্সেলড",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  hold: "bg-orange-100 text-orange-800 border-orange-300",
  in_review: "bg-amber-100 text-amber-800 border-amber-300",
  processing: "bg-purple-100 text-purple-800 border-purple-300",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  courier_cancelled: "bg-orange-100 text-orange-800 border-orange-300",
};

const paymentColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  refunded: "bg-purple-100 text-purple-800 border-purple-300",
};

export default function OrderOverviewTab({ order, items }: Props) {
  const address = parseShippingAddress(order?.shipping_address);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [syncingCourier, setSyncingCourier] = useState(false);

  // Local synced state for immediate reactive UI update
  const [localSynced, setLocalSynced] = useState<{
    weight?: string;
    delivery_charge?: number;
    cod_charge?: number;
  } | null>(null);

  const { data: notes } = useQuery({
    queryKey: ["order-notes", order.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_notes" as any)
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [editing, setEditing] = useState(false);
  const [editingCourier, setEditingCourier] = useState(false);

  const [form, setForm] = useState({
    customer_name: order.customer_name || "",
    customer_phone: order.customer_phone || "",
    customer_email: order.customer_email || "",
    address: address.address || address.city || "",
  });

  const totalAmount = Number(order.total_amount || 0);

  // Payment check
  const rawMethod = String(order.payment_method || "").toLowerCase();
  const isPrepaid =
    (rawMethod.includes("bkash") ||
      rawMethod.includes("nagad") ||
      rawMethod.includes("card") ||
      rawMethod.includes("online") ||
      rawMethod.includes("ssl")) &&
    order.payment_status === "completed";
  const isCod = !isPrepaid;

  // Courier Metrics Calculation
  const isInsideDhaka =
    (address.city || address.address || "").toLowerCase().includes("dhaka") ||
    (address.city || address.address || "").includes("ঢাকা");
  const defaultCourierCharge = isInsideDhaka ? 60 : 120;

  const currentParcelWeight =
    localSynced?.weight ||
    parseParcelWeight(address.parcel_weight || address.weight, "1.0 kg");

  const currentCourierCharge =
    localSynced?.delivery_charge !== undefined
      ? localSynced.delivery_charge
      : address.courier_delivery_charge !== undefined
      ? parseNumericFee(address.courier_delivery_charge, defaultCourierCharge)
      : parseNumericFee(order.delivery_charge, defaultCourierCharge);

  const currentCodCharge =
    localSynced?.cod_charge !== undefined
      ? localSynced.cod_charge
      : address.courier_cod_charge !== undefined
      ? parseNumericFee(address.courier_cod_charge, isCod ? Math.round(totalAmount * 0.01) : 0)
      : isCod
      ? Math.round(totalAmount * 0.01)
      : 0;

  const expectedNetPayout = isCod
    ? Math.max(0, totalAmount - currentCourierCharge - currentCodCharge)
    : totalAmount;

  // Courier edit form state
  const [courierForm, setCourierForm] = useState({
    parcel_weight: currentParcelWeight,
    courier_delivery_charge: currentCourierCharge,
  });

  const [saving, setSaving] = useState(false);

  const copyToClipboard = async (text: string, label: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(key);
      toast({ title: `📋 ${label} কপি হয়েছে` });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: "কপি ব্যর্থ", variant: "destructive" });
    }
  };

  const copyOrderSummary = () => {
    const itemsList = items
      .map((i) => `- ${i.product_name} x ${i.quantity} (৳${Number(i.total_price).toLocaleString()})`)
      .join("\n");
    const summaryText = `অর্ডার নম্বর: #${order.order_number}\nগ্রাহক: ${order.customer_name}\nফোন: ${order.customer_phone}\nঠিকানা: ${address.address || address.city || "—"}\nআইটেমসমূহ:\n${itemsList}\nসর্বমোট: ৳${Number(order.total_amount).toLocaleString()}\nপেমেন্ট: ${order.payment_method?.toUpperCase()} (${order.payment_status})\nপার্সেল ওজন: ${currentParcelWeight}\nকুরিয়ার ডেলিভারি চার্জ: ৳${currentCourierCharge}\n১% COD চার্জ: ৳${currentCodCharge}\nপ্রত্যাশিত নিট প্রাপ্তি: ৳${expectedNetPayout}`;
    copyToClipboard(summaryText, "সম্পূর্ণ অর্ডার বিবরণ", "summary");
  };

  const saveCustomerInfo = async () => {
    let cleanPhone = form.customer_phone.trim();
    if (cleanPhone) {
      if (!isValidBDPhone(cleanPhone)) {
        toast({
          title: "ভুল মোবাইল নাম্বার",
          description: "সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 01XXXXXXXXX, 8801XXXXXXXXX বা +8801XXXXXXXXX)",
          variant: "destructive",
        });
        return;
      }
      cleanPhone = normalizeBDPhone(cleanPhone);
    }

    setSaving(true);
    try {
      const updatedAddress = { ...address, address: form.address };
      const { error } = await supabase
        .from("orders")
        .update({
          customer_name: form.customer_name.trim(),
          customer_phone: cleanPhone,
          customer_email: form.customer_email.trim() || null,
          shipping_address: updatedAddress,
        })
        .eq("id", order.id);

      if (error) throw error;

      await supabase.from("order_history").insert({
        order_id: order.id,
        action: "customer_info_edited",
        details: `কাস্টমার তথ্য আপডেট: ${form.customer_name} (${cleanPhone})`,
        staff_name: "Admin",
      });

      toast({ title: "✅ কাস্টমার তথ্য আপডেট হয়েছে" });
      setForm((p) => ({ ...p, customer_phone: cleanPhone }));
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
      setEditing(false);
    } catch (e: any) {
      toast({ title: "আপডেট ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveCourierMetrics = async () => {
    setSaving(true);
    try {
      const charge = parseNumericFee(courierForm.courier_delivery_charge, defaultCourierCharge);
      const codFee = isCod ? Math.round(totalAmount * 0.01) : 0;
      const payable = isCod ? Math.max(0, totalAmount - charge - codFee) : totalAmount;
      const weight = parseParcelWeight(courierForm.parcel_weight, "1.0 kg");

      const updatedAddress = {
        ...address,
        parcel_weight: weight,
        courier_delivery_charge: charge,
        courier_cod_charge: codFee,
        courier_payable: payable,
      };

      const { error } = await supabase
        .from("orders")
        .update({ shipping_address: updatedAddress })
        .eq("id", order.id);

      if (error) throw error;

      setLocalSynced({
        weight,
        delivery_charge: charge,
        cod_charge: codFee,
      });

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "courier_booked",
        details: `কুরিয়ার চার্জ ও পার্সেল ওজন আপডেট: ওজন: ${weight}, চার্জ: ৳${charge}, ১% COD: ৳${codFee}`,
        staff_name: "Admin",
      });

      toast({ title: "✅ কুরিয়ার চার্জ ও ওজন সংরক্ষিত হয়েছে" });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
      setEditingCourier(false);
    } catch (e: any) {
      toast({ title: "সংরক্ষণ ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Sync directly from Steadfast Courier API
  const syncFromCourierAPI = async (silent = false) => {
    const trackingCode = address.tracking_number;
    const consignmentId = address.consignment_id;
    const invoice = order.order_number;

    if (!trackingCode && !consignmentId && !invoice) {
      if (!silent) {
        toast({
          title: "কুরিয়ার ট্র্যাকিং তথ্য নেই",
          description: "আগে কুরিয়ার বুকিং সম্পন্ন করুন বা ট্র্যাকিং কোড দিন।",
          variant: "destructive",
        });
      }
      return;
    }

    setSyncingCourier(true);
    try {
      const details = await fetchSteadfastConsignmentDetails({
        tracking_code: trackingCode,
        consignment_id: consignmentId,
        invoice: invoice,
      });

      const syncedWeight = details.weight || address.parcel_weight || "1.0 kg";
      const syncedDeliveryCharge = details.delivery_charge > 0
        ? details.delivery_charge
        : (address.courier_delivery_charge !== undefined
            ? parseNumericFee(address.courier_delivery_charge, defaultCourierCharge)
            : defaultCourierCharge);

      const syncedCodFee = isCod
        ? (details.cod_charge > 0
            ? details.cod_charge
            : (address.courier_cod_charge !== undefined
                ? parseNumericFee(address.courier_cod_charge, Math.round(totalAmount * 0.01))
                : Math.round(totalAmount * 0.01)))
        : 0;

      const syncedPayable = isCod
        ? Math.max(0, totalAmount - syncedDeliveryCharge - syncedCodFee)
        : totalAmount;

      // Update immediate local state
      setLocalSynced({
        weight: syncedWeight,
        delivery_charge: syncedDeliveryCharge,
        cod_charge: syncedCodFee,
      });

      const updatedAddress = {
        ...address,
        courier_company: address.courier_company || "Steadfast",
        tracking_number: details.tracking_code || trackingCode,
        consignment_id: details.consignment_id || consignmentId,
        courier_status: details.delivery_status || address.courier_status || "pending",
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
        details: `Steadfast থেকে লাইভ সিঙ্ক: ওজন: ${syncedWeight}, ডেলিভারি চার্জ: ৳${syncedDeliveryCharge}, ১% COD ফি: ৳${syncedCodFee} (নিট: ৳${syncedPayable})`,
        staff_name: "Admin",
      });

      if (!silent) {
        toast({
          title: "✅ কুরিয়ার থেকে সফলভাবে সিঙ্ক হয়েছে!",
          description: `ওজন: ${syncedWeight} | চার্জ: ৳${syncedDeliveryCharge} | ১% COD: ৳${syncedCodFee}`,
        });
      }

      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
    } catch (err: any) {
      if (!silent) {
        toast({
          title: "কুরিয়ার সিঙ্ক ব্যর্থ",
          description: err.message || "Steadfast থেকে তথ্য আনা সম্ভব হয়নি।",
          variant: "destructive",
        });
      }
    } finally {
      setSyncingCourier(false);
    }
  };

  // Auto-sync on mount if courier is booked
  useEffect(() => {
    if ((address.tracking_number || address.consignment_id) && (!address.parcel_weight || address.parcel_weight === "1.0 kg" || !address.courier_delivery_charge)) {
      syncFromCourierAPI(true);
    }
  }, [order.id]);

  const waMessage = encodeURIComponent(
    `আসসালামু আলাইকুম ${order.customer_name || ""}, Rangao থেকে আপনার #${order.order_number} নম্বর অর্ডারের ব্যাপারে যোগাযোগ করা হচ্ছে। সর্বমোট মূল্য: ৳${Number(order.total_amount).toLocaleString()}। ধন্যবাদ!`
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Quick Actions & High-level Status: Order & Payment Breakdown */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              অর্ডার বিবরণ ও পেমেন্ট
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => syncFromCourierAPI(false)}
                disabled={syncingCourier}
              >
                {syncingCourier ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                কুরিয়ার থেকে সিঙ্ক
              </Button>

              {!editingCourier ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCourierForm({
                      parcel_weight: currentParcelWeight,
                      courier_delivery_charge: currentCourierCharge,
                    });
                    setEditingCourier(true);
                  }}
                >
                  <Pencil className="h-3 w-3" /> এডিট
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" className="gap-1 text-xs h-8" onClick={saveCourierMetrics} disabled={saving}>
                    <Save className="h-3 w-3" /> সেভ
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setEditingCourier(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={copyOrderSummary}>
                {copiedField === "summary" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                অর্ডার সামারি কপি
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Main 4 Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <p className="text-muted-foreground text-xs">তারিখ ও সময়</p>
              <p className="font-medium mt-0.5">{new Date(order.created_at).toLocaleString("bn-BD")}</p>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <p className="text-muted-foreground text-xs">অর্ডার স্ট্যাটাস</p>
              <div className="mt-1">
                <Badge className={`text-xs px-2.5 py-0.5 ${statusColors[order.order_status] || ""}`} variant="outline">
                  {statusLabels[order.order_status] || order.order_status}
                </Badge>
              </div>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40">
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> পেমেন্ট বিবরণ
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-semibold text-xs uppercase">{order.payment_method || "COD"}</span>
                <Badge className={`text-[10px] px-1.5 py-0 ${paymentColors[order.payment_status] || ""}`} variant="outline">
                  {order.payment_status === "completed" ? "পেইড" : order.payment_status === "pending" ? "বাকি / COD" : order.payment_status}
                </Badge>
              </div>
            </div>
            <div className="bg-primary/5 p-2.5 rounded-lg border border-primary/20">
              <p className="text-muted-foreground text-xs">সর্বমোট কাস্টমার বিল</p>
              <p className="font-black text-lg text-primary mt-0.5">৳{Number(order.total_amount).toLocaleString()}</p>
            </div>
          </div>

          {/* Courier Sync & Financial Breakdown Row (Parcel weight, Courier Delivery Charge, 1% COD, Net Payout) */}
          <div className="bg-muted/20 border border-border/60 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                কুরিয়ার ফিন্যান্স ও পার্সেল বিবরণ
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-mono">
                  কুরিয়ার: {address.courier_company || "Steadfast"}
                  {address.consignment_id ? ` (Parcel #${address.consignment_id})` : address.tracking_number ? ` (#${address.tracking_number})` : ""}
                </span>
              </div>
            </div>

            {editingCourier ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">পার্সেল ওজন (Parcel Weight)</label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={courierForm.parcel_weight}
                    onChange={(e) => setCourierForm((p) => ({ ...p, parcel_weight: e.target.value }))}
                    placeholder="যেমন: 1.7KG, 1.0 kg"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">কুরিয়ার ডেলিভারি চার্জ (৳)</label>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={courierForm.courier_delivery_charge}
                    onChange={(e) => setCourierForm((p) => ({ ...p, courier_delivery_charge: Number(e.target.value) }))}
                    placeholder="যেমন: 95, 60, 120"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* 1. Parcel Weight */}
                <div className="bg-background p-2.5 rounded-md border border-border/50">
                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                    <Scale className="h-3.5 w-3.5 text-amber-600" />
                    <span>পার্সেল ওজন:</span>
                  </div>
                  <p className="font-bold text-foreground font-mono text-sm">{currentParcelWeight}</p>
                </div>

                {/* 2. Courier Delivery Charge */}
                <div className="bg-background p-2.5 rounded-md border border-border/50">
                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                    <Truck className="h-3.5 w-3.5 text-blue-600" />
                    <span>কুরিয়ার ডেলিভারি চার্জ:</span>
                  </div>
                  <p className="font-bold text-foreground font-mono text-sm">৳{currentCourierCharge.toLocaleString()}</p>
                </div>

                {/* 3. 1% COD Charge */}
                <div className="bg-background p-2.5 rounded-md border border-border/50">
                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                    <Percent className="h-3.5 w-3.5 text-purple-600" />
                    <span>১% COD চার্জ:</span>
                  </div>
                  <p className="font-bold text-foreground font-mono text-sm">
                    {isCod ? `৳${currentCodCharge.toLocaleString()}` : "— (প্রিপেইড)"}
                  </p>
                </div>

                {/* 4. Estimated Net Payout */}
                <div className="bg-green-50/50 p-2.5 rounded-md border border-green-200">
                  <div className="flex items-center gap-1 text-green-700 mb-0.5 font-medium">
                    <Banknote className="h-3.5 w-3.5 text-green-600" />
                    <span>প্রত্যাশিত নিট প্রাপ্তি:</span>
                  </div>
                  <p className="font-black text-green-700 font-mono text-sm">৳{expectedNetPayout.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Info - Editable & Actionable */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            কাস্টমার ইনফরমেশন
          </CardTitle>
          {!editing ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => copyToClipboard(address.address || address.city || "", "ঠিকানা", "address")}
              >
                {copiedField === "address" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                ঠিকানা কপি
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" /> এডিট
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" className="gap-1 text-xs h-7" onClick={saveCustomerInfo} disabled={saving}>
                <Save className="h-3 w-3" /> সেভ
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/30 p-2.5 rounded-lg border border-border/30">
              <p className="text-muted-foreground text-xs mb-1">গ্রাহকের নাম</p>
              {editing ? (
                <Input
                  className="h-8 text-sm"
                  value={form.customer_name}
                  onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                />
              ) : (
                <p className="font-semibold text-foreground">{order.customer_name || "—"}</p>
              )}
            </div>
            <div className="bg-muted/30 p-2.5 rounded-lg border border-border/30">
              <p className="text-muted-foreground text-xs mb-1">মোবাইল ফোন</p>
              {editing ? (
                <Input
                  className="h-8 text-sm"
                  value={form.customer_phone}
                  onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-mono font-semibold text-foreground">{order.customer_phone}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(order.customer_phone, "ফোন নম্বর", "phone")}
                  >
                    {copiedField === "phone" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </div>
              )}
            </div>
            <div className="bg-muted/30 p-2.5 rounded-lg border border-border/30">
              <p className="text-muted-foreground text-xs mb-1">ইমেইল ঠিকানা</p>
              {editing ? (
                <Input
                  className="h-8 text-sm"
                  value={form.customer_email}
                  onChange={(e) => setForm((p) => ({ ...p, customer_email: e.target.value }))}
                />
              ) : (
                <p className="font-medium text-foreground">{order.customer_email || "—"}</p>
              )}
            </div>
            <div className="bg-muted/30 p-2.5 rounded-lg border border-border/30">
              <p className="text-muted-foreground text-xs mb-1">ডেলিভারি ঠিকানা</p>
              {editing ? (
                <Input
                  className="h-8 text-sm"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              ) : (
                <p className="font-medium text-foreground leading-snug">
                  {address.address || address.city || "ঠিকানা প্রদান করা হয়নি"}
                </p>
              )}
            </div>
          </div>

          {!editing && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              <a href={`tel:${order.customer_phone}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  <Phone className="h-3.5 w-3.5 text-blue-600" /> সরাসরি কল করুন
                </Button>
              </a>
              <a
                href={`https://wa.me/88${String(order.customer_phone || "").replace(/^0/, "")}?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-green-700 hover:text-green-800 hover:bg-green-50">
                  <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp মেসেজ
                </Button>
              </a>
              {order.customer_email && (
                <a href={`mailto:${order.customer_email}`}>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                    <Mail className="h-3.5 w-3.5" /> ইমেইল পাঠান
                  </Button>
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products & Breakdown */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            অর্ডারের আইটেম ও মূল্য বিবরণ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-xs">প্রোডাক্ট নাম</TableHead>
                  <TableHead className="text-right font-semibold text-xs">ইউনিট মূল্য</TableHead>
                  <TableHead className="text-center font-semibold text-xs">পরিমাণ</TableHead>
                  <TableHead className="text-right font-semibold text-xs">মোট মূল্য</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items && items.length > 0 ? (
                  items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <p className="font-semibold text-foreground">{item.product_name}</p>
                        {item.product_id && (
                          <p className="text-[10px] text-muted-foreground font-mono">ID: {item.product_id}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">৳{Number(item.unit_price).toLocaleString()}</TableCell>
                      <TableCell className="text-center font-bold text-xs sm:text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right font-bold text-xs sm:text-sm">৳{Number(item.total_price).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-xs">
                      কোনো প্রোডাক্ট তথ্য পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full sm:w-80 bg-muted/30 border border-border/60 rounded-lg p-3 space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>সাবটোটাল:</span>
                <span className="font-medium text-foreground">৳{Number(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>কাস্টমার ডেলিভারি চার্জ:</span>
                <span className="font-medium text-foreground">৳{Number(order.delivery_charge || 0).toLocaleString()}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span className="flex items-center gap-1">
                    ডিসকাউন্ট {order.coupon_code ? `(${order.coupon_code})` : ""}:
                  </span>
                  <span>-৳{Number(order.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 font-bold text-sm sm:text-base text-foreground">
                <span>সর্বমোট কাস্টমার বিল:</span>
                <span className="text-primary font-black">৳{Number(order.total_amount || 0).toLocaleString()}</span>
              </div>

              {/* Courier Settlement Summary */}
              <div className="border-t border-border/60 pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>কুরিয়ার ডেলিভারি চার্জ:</span>
                  <span className="font-mono font-medium text-foreground">৳{currentCourierCharge.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>কুরিয়ার ১% COD ফি:</span>
                  <span className="font-mono font-medium text-foreground">
                    {isCod ? `৳${currentCodCharge.toLocaleString()}` : "৳০ (প্রিপেইড)"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-dashed border-border/60 font-semibold text-green-700">
                  <span>প্রত্যাশিত নিট মার্জিন / প্রাপ্তি:</span>
                  <span className="font-mono font-bold">৳{expectedNetPayout.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      {(order.notes || (notes && notes.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.notes && (
            <Card className="border-amber-300/60 bg-amber-50/20 shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  ✍️ কাস্টমার নোট (Customer Note)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-amber-950 font-medium leading-relaxed pt-0">
                {order.notes}
              </CardContent>
            </Card>
          )}

          {notes && notes.length > 0 && (
            <Card className="border-blue-300/60 bg-blue-50/10 shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  📝 সাম্প্রতিক স্টাফ নোটসমূহ (Staff Notes)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-56 overflow-y-auto pt-0">
                {notes.map((n: any) => (
                  <div key={n.id} className="bg-background border rounded-lg p-2.5 text-xs shadow-xs space-y-0.5">
                    <p className="font-medium text-foreground">{n.note}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {n.staff_name} • {new Date(n.created_at).toLocaleString("bn-BD")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
