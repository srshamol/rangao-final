import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Truck, RefreshCw, Bell, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { order: any; }

const trackingSteps = [
  { key: "pickup", label: "পিকআপ" },
  { key: "hub", label: "হাব" },
  { key: "destination", label: "গন্তব্য" },
  { key: "out_for_delivery", label: "আউট ফর ডেলিভারি" },
  { key: "delivered", label: "ডেলিভারড" },
];

const steadfastStatusMap: Record<string, number> = {
  pending: 0, in_review: 1, unknown: 1,
  dispatched: 2, delivered_approval_pending: 4, partial_delivered: 4,
  delivered: 5, cancelled: 0, cancelled_approval_pending: 0, hold: 1,
};

function getTrackingStep(orderStatus: string, courierStatus?: string) {
  if (courierStatus && steadfastStatusMap[courierStatus] !== undefined) {
    return steadfastStatusMap[courierStatus];
  }
  switch (orderStatus) {
    case "shipped": return 1;
    case "delivered": return 5;
    default: return 0;
  }
}

export default function OrderTrackingTab({ order }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const shipping = typeof order.shipping_address === "object" ? order.shipping_address : {};
  const currentStep = getTrackingStep(order.order_status, shipping?.courier_status);
  const progressPercent = Math.min((currentStep / (trackingSteps.length - 1)) * 100, 100);

  const refreshTracking = async () => {
    if (!shipping?.tracking_number) {
      toast({ title: "ট্র্যাকিং কোড নেই", variant: "destructive" });
      return;
    }
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("steadfast-courier", {
        body: { action: "status_by_tracking", tracking_code: shipping.tracking_number },
      });
      if (error) throw error;

      const newStatus = data?.delivery_status || shipping.courier_status;
      const updatedAddress = { ...shipping, courier_status: newStatus, last_tracking_update: new Date().toISOString() };

      // Map to order status
      let orderStatus = order.order_status;
      if (newStatus === "delivered") orderStatus = "delivered";
      else if (newStatus === "cancelled" || newStatus === "cancelled_approval_pending") orderStatus = "cancelled";

      await supabase.from("orders")
        .update({ shipping_address: updatedAddress, order_status: orderStatus as any })
        .eq("id", order.id);

      await supabase.from("order_history" as any).insert({
        order_id: order.id, action: "tracking_updated",
        details: `Steadfast স্ট্যাটাস: ${newStatus}`, staff_name: "System"
      });

      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      toast({ title: "ট্র্যাকিং আপডেট হয়েছে", description: `স্ট্যাটাস: ${newStatus}` });
    } catch (err: any) {
      toast({ title: "ট্র্যাকিং রিফ্রেশ ব্যর্থ", description: err.message, variant: "destructive" });
    } finally { setRefreshing(false); }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Tracking Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" /> ট্র্যাকিং ইনফো
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">কুরিয়ার</p>
              <p className="font-medium">{shipping?.courier_company || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ট্র্যাকিং নম্বর</p>
              <p className="font-mono font-medium">{shipping?.tracking_number || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Steadfast স্ট্যাটাস</p>
              <Badge variant="outline">{shipping?.courier_status || "—"}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">শেষ আপডেট</p>
              <p className="font-medium">
                {shipping?.last_tracking_update
                  ? new Date(shipping.last_tracking_update).toLocaleString("bn-BD")
                  : new Date(order.updated_at).toLocaleString("bn-BD")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={refreshTracking} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              লাইভ স্ট্যাটাস চেক
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={() => toast({ title: "কাস্টমারকে নোটিফাই করা হয়েছে" })}>
              <Bell className="h-3.5 w-3.5" /> কাস্টমারকে নোটিফাই
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <Card>
        <CardHeader><CardTitle className="text-base">শিপমেন্ট প্রগ্রেস</CardTitle></CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2 mb-4" />
          <div className="flex justify-between">
            {trackingSteps.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? "bg-primary text-primary-foreground" :
                    active ? "bg-primary/20 text-primary border-2 border-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs text-center ${active ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">ট্র্যাকিং টাইমলাইন</CardTitle></CardHeader>
        <CardContent>
          {currentStep === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              এখনও শিপমেন্ট শুরু হয়নি। কুরিয়ার ট্যাব থেকে Steadfast-এ পাঠান।
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Steadfast-এ বুকিং সম্পন্ন</p>
                  <p className="text-xs text-muted-foreground">
                    {shipping?.booked_at ? new Date(shipping.booked_at).toLocaleString("bn-BD") : new Date(order.updated_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="text-xs text-muted-foreground">ট্র্যাকিং: {shipping?.tracking_number || "—"}</p>
                </div>
              </div>
              {shipping?.courier_status && shipping.courier_status !== "pending" && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">স্ট্যাটাস: {shipping.courier_status}</p>
                    <p className="text-xs text-muted-foreground">
                      {shipping?.last_tracking_update ? new Date(shipping.last_tracking_update).toLocaleString("bn-BD") : "—"}
                    </p>
                  </div>
                </div>
              )}
              {order.order_status === "delivered" && (
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-600">ডেলিভারি সম্পন্ন ✅</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.updated_at).toLocaleString("bn-BD")}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
