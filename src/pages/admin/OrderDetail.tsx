import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { useStoreSettings } from "@/hooks/useStoreSettings";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
  const [printType, setPrintType] = useState<"invoice" | "packing_slip" | null>(null);
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintType(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const triggerPrint = (type: "invoice" | "packing_slip") => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 200);
  };


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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Printer className="h-4 w-4" /> প্রিন্ট
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem className="cursor-pointer font-medium" onClick={() => triggerPrint("invoice")}>
                  🧾 ইনভয়েস প্রিন্ট (Invoice)
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer font-medium" onClick={() => triggerPrint("packing_slip")}>
                  📦 প্যাকিং স্লিপ প্রিন্ট (Packing Slip)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* ================= PRINT ZONE (Only visible during print) ================= */}
      {printType && createPortal(
        <div id="printable-area" className="p-3 font-sans bg-white text-black text-[10px] leading-snug">
          {printType === "invoice" ? (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-2">
                <div>
                  {settings?.storeInfo?.logo_url ? (
                    <img
                      src={settings.storeInfo.logo_url}
                      alt={settings.storeInfo.name || "Rangao"}
                      className="h-8 object-contain mb-1"
                    />
                  ) : (
                    <h2 className="text-base font-bold tracking-tight text-gray-900">
                      {settings?.storeInfo?.name || "Rangao - রাঙাও"}
                    </h2>
                  )}
                  {settings?.storeInfo?.tagline && (
                    <p className="text-[9px] text-gray-500 italic mb-0.5">{settings.storeInfo.tagline}</p>
                  )}
                  <p className="text-[9px] text-gray-600">
                    {settings?.storeInfo?.address || "ঢাকা, বাংলাদেশ"}
                  </p>
                  <p className="text-[9px] text-gray-600">
                    ফোন: {settings?.storeInfo?.phone || "01812-345678"} | ইমেইল: {settings?.storeInfo?.email || "hello@rangao.com.bd"}
                  </p>
                </div>
                <div className="text-right">
                  <h1 className="text-lg font-black text-gray-900 tracking-wider">INVOICE</h1>
                  <p className="text-[10px] font-bold text-gray-800 mt-0.5">অর্ডার নম্বর: {order.order_number}</p>
                  <p className="text-[9px] text-gray-600">
                    তারিখ: {new Date(order.created_at).toLocaleDateString("bn-BD")}
                  </p>
                </div>
              </div>

              {/* Details (Bill/Ship to + Payment Info) */}
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div className="border rounded-md p-2 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 border-b pb-0.5 mb-1">ডেলিভারি ঠিকানা (Shipping Address)</h3>
                  <p className="font-bold text-gray-900">{order.customer_name}</p>
                  <p className="font-medium text-gray-800 mt-0.5">ফোন: {order.customer_phone}</p>
                  <p className="text-gray-700 mt-0.5">{(address as any)?.address || (address as any)?.city || "—"}</p>
                  {order.notes && (
                    <div className="mt-1.5 text-[8.5px] border-t pt-1 text-gray-600 italic">
                      নোট: {order.notes}
                    </div>
                  )}
                </div>

                <div className="border rounded-md p-2 bg-gray-50/50 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 border-b pb-0.5 mb-1">পেমেন্ট ও অর্ডার বিবরণ</h3>
                    <div className="grid grid-cols-2 gap-y-0.5 text-[9.5px] text-gray-700">
                      <span className="font-medium">পেমেন্ট মেথড:</span>
                      <span className="font-semibold text-right">{order.payment_method}</span>
                      
                      <span className="font-medium">পেমেন্ট স্ট্যাটাস:</span>
                      <span className="font-semibold text-right">{order.payment_status}</span>

                      <span className="font-medium">অর্ডার স্ট্যাটাস:</span>
                      <span className="font-semibold text-right">{statusLabels[order.order_status] || order.order_status}</span>
                    </div>
                  </div>
                  {(address as any)?.tracking_number && (
                    <div className="mt-1.5 text-[8.5px] border-t pt-1 text-gray-600">
                      কুরিয়ার: <span className="font-semibold">{(address as any).courier_company}</span> | ট্র্যাকিং: <span className="font-semibold font-mono">{(address as any).tracking_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-left text-[9.5px]">
                  <thead>
                    <tr className="bg-gray-100 border-b font-bold text-gray-900">
                      <th className="px-3 py-1 w-10 text-center">ক্রমিক</th>
                      <th className="px-3 py-1">আইটেম বিবরণ</th>
                      <th className="px-3 py-1 text-right">ইউনিট মূল্য</th>
                      <th className="px-3 py-1 text-center w-12">পরিমাণ</th>
                      <th className="px-3 py-1 text-right w-20">মোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-800">
                    {items && items.map((item: any, i: number) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 text-center">{i + 1}</td>
                        <td className="px-3 py-1.5">
                          <p className="font-semibold text-gray-900">{item.product_name}</p>
                        </td>
                        <td className="px-3 py-1.5 text-right">৳{Number(item.unit_price).toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-center">{item.quantity}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">৳{Number(item.total_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing breakdown */}
              <div className="flex justify-end">
                <div className="w-52 border rounded-md p-2 bg-gray-50/50 space-y-1 text-[9.5px] text-gray-800">
                  <div className="flex justify-between">
                    <span>সাবটোটাল:</span>
                    <span>৳{Number(order.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ডেলিভারি চার্জ:</span>
                    <span>৳{Number(order.delivery_charge || 0).toLocaleString()}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>ডিসকাউন্ট:</span>
                      <span>-৳{Number(order.discount_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-bold text-[10px] text-gray-900">
                    <span>সর্বমোট:</span>
                    <span>৳{Number(order.total_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Divider & Footer signature */}
              <div className="pt-4 flex justify-between items-end text-[9px] text-gray-600">
                <div>
                  <p className="font-semibold text-gray-800">আমাদের থেকে কেনাকাটা করার জন্য ধন্যবাদ!</p>
                  <p className="text-[8px] mt-0.5 text-gray-500 font-mono">কোনো জিজ্ঞাসা থাকলে যোগাযোগ করুন: {settings?.storeInfo?.phone}</p>
                </div>
                <div className="text-center w-28 border-t pt-1">
                  <p className="font-semibold text-gray-900">কর্তৃপক্ষের স্বাক্ষর</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Packing Slip Header */}
              <div className="flex justify-between items-start border-b pb-2">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-gray-900">
                    {settings?.storeInfo?.name || "Rangao - রাঙাও"}
                  </h2>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Fulfillment Packing Slip</p>
                </div>
                <div className="text-right">
                  <h1 className="text-lg font-black text-gray-900 tracking-wider">PACKING SLIP</h1>
                  <p className="text-[10px] font-bold text-gray-800 mt-0.5">অর্ডার নম্বর: {order.order_number}</p>
                  <p className="text-[9px] text-gray-600">
                    তারিখ: {new Date(order.created_at).toLocaleDateString("bn-BD")}
                  </p>
                </div>
              </div>

              {/* Delivery and Packing Details */}
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div className="border rounded-md p-2 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 border-b pb-0.5 mb-1">ডেলিভারি গ্রহীতা (Recipient)</h3>
                  <p className="font-bold text-gray-900">{order.customer_name}</p>
                  <p className="font-bold text-gray-800 mt-0.5">ফোন: {order.customer_phone}</p>
                  <p className="text-gray-700 mt-0.5">{(address as any)?.address || (address as any)?.city || "—"}</p>
                </div>

                <div className="border rounded-md p-2 bg-gray-50/50 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 border-b pb-0.5 mb-1">শিপিং ও কুরিয়ার বিবরণ</h3>
                    <div className="grid grid-cols-2 gap-y-0.5 text-gray-700">
                      <span className="font-medium">কুরিয়ার কোম্পানি:</span>
                      <span className="font-bold text-right">{(address as any)?.courier_company || "Not Assigned"}</span>

                      <span className="font-medium">ট্র্যাকিং নম্বর:</span>
                      <span className="font-bold font-mono text-right">{(address as any)?.tracking_number || "—"}</span>

                      <span className="font-medium">পেমেন্ট টাইপ:</span>
                      <span className="font-bold text-right text-red-600">{order.payment_method === "cod" ? `ক্যাশ অন ডেলিভারি (৳${Number(order.total_amount).toLocaleString()})` : "প্রিপেইড (Prepaid)"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Notes / Instructions */}
              {order.notes && (
                <div className="border-l-2 border-amber-500 bg-amber-50/50 p-2 rounded-r-md text-[9.5px]">
                  <span className="font-bold text-amber-800 block mb-0.5">কাস্টমার নির্দেশনা (Order Note):</span>
                  <p className="text-gray-800">{order.notes}</p>
                </div>
              )}

              {/* Items checklist */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-left text-[9.5px]">
                  <thead>
                    <tr className="bg-gray-100 border-b font-bold text-gray-900">
                      <th className="px-3 py-1 w-12 text-center">চেক [✓]</th>
                      <th className="px-3 py-1">আইটেম বিবরণ</th>
                      <th className="px-3 py-1 text-center w-20">পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-800">
                    {items && items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-center">
                          <div className="w-4 h-4 mx-auto border border-gray-400 rounded bg-white"></div>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-bold text-gray-900">{item.product_name}</p>
                          <p className="text-[8.5px] text-gray-500 mt-0.5">আইটেম আইডি: {item.id}</p>
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-xs text-gray-900">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Packing Footer */}
              <div className="pt-4 grid grid-cols-2 gap-4 text-[9px] text-gray-600">
                <div>
                  <p className="mb-2">প্যাকার সাইন: ___________________________</p>
                  <p>তারিখ ও সময়: ____/____/________   ____ : ____</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">রাঙাও - অর্ডার প্রসেসিং শীট</p>
                  <p className="text-[8px] mt-0.5">পণ্যটি ডেলিভারি কুরিয়ারে হস্তান্তরের পূর্বে সতর্কতার সাথে মিলিয়ে নিন।</p>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

