import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, CheckCircle, XCircle, Pencil, Trash2, Pause, Printer, Zap, Loader2, MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrderOverviewTab from "@/components/admin/order-tabs/OverviewTab";
import OrderConfirmationTab from "@/components/admin/order-tabs/ConfirmationTab";
import OrderCourierTab from "@/components/admin/order-tabs/CourierTab";
import OrderTrackingTab from "@/components/admin/order-tabs/TrackingTab";
import OrderDeliveryTab from "@/components/admin/order-tabs/DeliveryTab";
import OrderHistoryTab from "@/components/admin/order-tabs/HistoryTab";

const statusLabels: Record<string, string> = {
  pending: "পেন্ডিং", confirmed: "কনফার্মড", in_review: "ইন-রিভিউ", processing: "প্রসেসিং",
  shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "ক্যান্সেলড", courier_cancelled: "কুরিয়ার ক্যান্সেলড",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_review: "bg-amber-100 text-amber-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  courier_cancelled: "bg-orange-100 text-orange-800",
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);
  const [steadfastLoading, setSteadfastLoading] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id).single();
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["admin-order-items", id],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", id);
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("orders").update({ order_status: status as any }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_history").insert({
        order_id: id!, action: "status_changed",
        details: `স্ট্যাটাস পরিবর্তন: ${statusLabels[status] || status}`, staff_name: "Admin"
      });

      // Send Facebook CAPI event for confirmed/delivered orders
      if (status === "confirmed" || status === "delivered") {
        try {
          await supabase.functions.invoke("fb-capi", {
            body: { order_id: id, event_name: "Purchase" },
          });
        } catch (fbErr) {
          console.error("FB CAPI error (non-blocking):", fbErr);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      toast({ title: "স্ট্যাটাস আপডেট হয়েছে" });
    },
  });

  const deleteOrder = async () => {
    try {
      await supabase.from("order_items").delete().eq("order_id", id!);
      await supabase.from("order_notes").delete().eq("order_id", id!);
      await supabase.from("order_history").delete().eq("order_id", id!);
      await supabase.from("orders").delete().eq("id", id!);
      toast({ title: "🗑️ অর্ডার ডিলিট হয়েছে" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      navigate("/admin/orders");
    } catch (e: any) {
      toast({ title: "ডিলিট ব্যর্থ", description: e.message, variant: "destructive" });
    }
  };

  const sendToSteadfast = async () => {
    if (!order) return;
    setSteadfastLoading(true);
    try {
      const sd = typeof order.shipping_address === "object" ? order.shipping_address : {};
      const address = (sd as any)?.address || (sd as any)?.city || (sd as any)?.area || "";
      const { data: result, error } = await supabase.functions.invoke("steadfast-courier", {
        body: {
          action: "create_order",
          invoice: order.order_number,
          recipient_name: order.customer_name,
          recipient_phone: order.customer_phone,
          recipient_address: address,
          cod_amount: Number(order.total_amount),
          note: order.notes || "",
        },
      });
      if (error) throw error;
      if (result?.status !== 200 && !result?.consignment) {
        throw new Error(result?.message || JSON.stringify(result?.errors) || "Steadfast API ত্রুটি");
      }
      const consignment = result.consignment || {};
      await supabase.from("orders").update({
        shipping_address: {
          ...(sd as any || {}),
          courier_company: "Steadfast",
          tracking_number: consignment.tracking_code || "",
          consignment_id: consignment.consignment_id || "",
          courier_status: consignment.status || "pending",
          booked_at: new Date().toISOString(),
        },
        order_status: "processing" as any,
      }).eq("id", order.id);
      await supabase.from("order_history").insert({
        order_id: order.id, action: "courier_booked",
        details: `Steadfast-এ পাঠানো। ট্র্যাকিং: ${consignment.tracking_code}`, staff_name: "Admin"
      });
      toast({ title: "✅ Steadfast-এ পাঠানো হয়েছে!", description: `ট্র্যাকিং: ${consignment.tracking_code}` });
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: any) {
      toast({ title: "Steadfast ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSteadfastLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (isLoading || !order) return <p className="text-center py-8">লোড হচ্ছে...</p>;

  const s = order.order_status;
  const canConfirm = s === "pending";
  const canCancel = s !== "delivered" && s !== "cancelled" && s !== "courier_cancelled";
  const canDelete = s === "cancelled" || s === "courier_cancelled" || s === "pending";
  const canSendCourier = s === "confirmed" || s === "in_review";

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">অর্ডার: {order.order_number}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString("bn-BD")}
            </p>
          </div>
        </div>
        <Badge className={`text-sm px-3 py-1 ${statusColors[order.order_status] || ""}`} variant="outline">
          {statusLabels[order.order_status] || order.order_status}
        </Badge>
      </div>

      {/* ===== TOP ACTION BAR ===== */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2 flex-wrap items-center">
            {canConfirm && (
              <Button size="sm" className="gap-1.5" onClick={() => updateStatus.mutate("confirmed")}
                disabled={updateStatus.isPending}>
                <CheckCircle className="h-4 w-4" /> কনফার্ম
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => updateStatus.mutate("cancelled")}
                disabled={updateStatus.isPending}>
                <XCircle className="h-4 w-4" /> ক্যান্সেল
              </Button>
            )}
            {canSendCourier && (
              <Button size="sm" variant="outline" className="gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={sendToSteadfast} disabled={steadfastLoading}>
                {steadfastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Steadfast-এ পাঠান
              </Button>
            )}
            {(s === "processing" || s === "shipped") && (
              <Button size="sm" variant="outline" className="gap-1.5">
                <MapPin className="h-4 w-4" /> ট্র্যাক
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> প্রিন্ট
            </Button>
            {canDelete && (
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" /> ডিলিট
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">🧾 ওভারভিউ</TabsTrigger>
          <TabsTrigger value="confirmation" className="text-xs sm:text-sm">📌 কনফার্মেশন</TabsTrigger>
          <TabsTrigger value="courier" className="text-xs sm:text-sm">🚚 কুরিয়ার</TabsTrigger>
          <TabsTrigger value="tracking" className="text-xs sm:text-sm">📍 ট্র্যাকিং</TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs sm:text-sm">📦 ডেলিভারি</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">📋 হিস্টোরি</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OrderOverviewTab order={order} items={items || []} />
        </TabsContent>
        <TabsContent value="confirmation">
          <OrderConfirmationTab order={order} onStatusChange={(s) => updateStatus.mutate(s)} loading={updateStatus.isPending} />
        </TabsContent>
        <TabsContent value="courier">
          <OrderCourierTab order={order} onStatusChange={(s) => updateStatus.mutate(s)} />
        </TabsContent>
        <TabsContent value="tracking">
          <OrderTrackingTab order={order} />
        </TabsContent>
        <TabsContent value="delivery">
          <OrderDeliveryTab order={order} onStatusChange={(s) => updateStatus.mutate(s)} />
        </TabsContent>
        <TabsContent value="history">
          <OrderHistoryTab orderId={order.id} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>অর্ডার ডিলিট করুন?</AlertDialogTitle>
            <AlertDialogDescription>
              অর্ডার <strong>{order.order_number}</strong> এবং সম্পর্কিত সমস্ত ডাটা স্থায়ীভাবে মুছে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteOrder}>
              🗑️ ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
