import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Truck, Loader2, CheckCircle, Wallet, Zap } from "lucide-react";
import {
  createSteadfastOrder,
  getSteadfastBalance,
  cleanSteadfastAddress,
} from "@/lib/integrations/steadfast";

interface Props {
  order: any;
  onStatusChange: (status: string) => void;
}

export default function OrderCourierTab({ order, onStatusChange }: Props) {
  const shippingData = typeof order.shipping_address === "object" ? order.shipping_address : {};
  const [specialNote, setSpecialNote] = useState(shippingData?.special_note || "");
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const address = cleanSteadfastAddress(shippingData) || order.customer_city || "ঢাকা, বাংলাদেশ";
  const isAlreadyBooked = !!shippingData?.consignment_id;

  const checkBalance = async () => {
    setBalanceLoading(true);
    try {
      const currentBal = await getSteadfastBalance();
      setBalance(currentBal);
    } catch (err: any) {
      toast({ title: "ব্যালেন্স চেক ব্যর্থ", description: err.message || "ব্যালেন্স তথ্য পাওয়া যায়নি।", variant: "destructive" });
    } finally { setBalanceLoading(false); }
  };

  const handleSteadfastTransfer = async () => {
    setSaving(true);
    try {
      const apiResult = await createSteadfastOrder({
        invoice: order.order_number,
        recipient_name: order.customer_name || "Customer",
        recipient_phone: order.customer_phone,
        recipient_address: address,
        cod_amount: Number(order.total_amount) || 0,
        note: specialNote || order.notes || "",
        delivery_type: 0,
      });

      const consignment = apiResult.consignment || apiResult || {};
      const trackingCode = consignment.tracking_code || "";
      const consignmentId = consignment.consignment_id || "";

      // Update order in DB
      const updatedAddress = {
        ...shippingData,
        courier_company: "Steadfast",
        tracking_number: trackingCode,
        consignment_id: consignmentId,
        delivery_type: "standard",
        special_note: specialNote,
        courier_status: consignment.status || "pending",
        booked_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("orders")
        .update({ shipping_address: updatedAddress, order_status: "shipped" as any })
        .eq("id", order.id);
      if (error) throw error;

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "courier_booked",
        details: `Steadfast-এ পাঠানো হয়েছে। ট্র্যাকিং: ${trackingCode}, Consignment: ${consignmentId}`,
        staff_name: "Admin"
      });

      toast({ title: "✅ Steadfast-এ সফলভাবে পাঠানো হয়েছে!", description: `ট্র্যাকিং: ${trackingCode || "সফল"}` });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      onStatusChange("shipped");
    } catch (err: any) {
      toast({ title: "Steadfast ট্রান্সফার ব্যর্থ", description: err.message || "ট্রান্সফার ব্যর্থ হয়েছে।", variant: "destructive" });
    } finally { setSaving(false); }
  };


  return (
    <div className="space-y-4 mt-4">
      {/* Balance Check */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Steadfast ব্যালেন্স:</span>
              {balance !== null && (
                <Badge variant="outline" className="text-sm font-mono">৳{balance.toLocaleString()}</Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={checkBalance} disabled={balanceLoading}>
              {balanceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
              <span className="ml-1">চেক</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Already Booked Info */}
      {isAlreadyBooked && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700 mb-3">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">ইতোমধ্যে Steadfast-এ পাঠানো হয়েছে</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">ট্র্যাকিং কোড</p>
                <p className="font-mono font-medium">{shippingData.tracking_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Consignment ID</p>
                <p className="font-mono font-medium">{shippingData.consignment_id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">স্ট্যাটাস</p>
                <Badge variant="outline">{shippingData.courier_status || "pending"}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">বুকিং সময়</p>
                <p className="text-sm">{shippingData.booked_at ? new Date(shippingData.booked_at).toLocaleString("bn-BD") : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Form */}
      {!isAlreadyBooked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" /> Steadfast কুরিয়ারে পাঠান
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <p><strong>ইনভয়েস:</strong> {order.order_number}</p>
              <p><strong>কাস্টমার:</strong> {order.customer_name}</p>
              <p><strong>ফোন:</strong> {order.customer_phone}</p>
              <p><strong>ঠিকানা:</strong> {address || "ঠিকানা পাওয়া যায়নি"}</p>
              <p><strong>COD অ্যামাউন্ট:</strong> ৳{Number(order.total_amount).toLocaleString()}</p>
            </div>

            <div>
              <Label className="text-xs">স্পেশাল নোট (ঐচ্ছিক)</Label>
              <Textarea value={specialNote} onChange={(e) => setSpecialNote(e.target.value)}
                placeholder="ডেলিভারি সম্পর্কিত বিশেষ নির্দেশনা..." rows={2} />
            </div>

            <Button onClick={handleSteadfastTransfer} disabled={saving} className="w-full gap-1.5" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              🚀 Steadfast-এ পাঠান
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ⚡ পাঠানো হলে অটোমেটিক ট্র্যাকিং কোড পাবেন এবং অর্ডার 'শিপড' হবে
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
