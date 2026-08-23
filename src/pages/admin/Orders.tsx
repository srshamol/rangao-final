import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Search, Eye, Truck, Loader2, Phone, MessageCircle, CheckCircle, ShoppingCart, Clock, PackageCheck, Ban, Package,
  ChevronDown, ChevronUp, Zap, RefreshCw, FileSearch, Download, Rocket, Pencil, Trash2, XCircle, RotateCcw, MapPin, Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrderConfirmModal from "@/components/admin/OrderConfirmModal";
import CourierResultCards from "@/components/admin/CourierResultCards";

import { checkCourier } from "@/lib/integrations/bdcourier";
import {
  createSteadfastOrder,
  getSteadfastStatusByTracking,
  cleanSteadfastAddress,
  cleanBangladeshiPhone,
  invokeSteadfastEdge,
} from "@/lib/integrations/steadfast";


const statusLabels: Record<string, string> = {
  pending: "পেন্ডিং", confirmed: "কনফার্মড", hold: "হোল্ড", in_review: "ইন-রিভিউ", processing: "প্রসেসিং",
  shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "ক্যান্সেলড", courier_cancelled: "কুরিয়ার ক্যান্সেলড",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  hold: "bg-orange-100 text-orange-800",
  in_review: "bg-amber-100 text-amber-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  courier_cancelled: "bg-orange-100 text-orange-800",
};

const statusDotColors: Record<string, string> = {
  pending: "bg-red-500",
  confirmed: "bg-blue-500",
  hold: "bg-orange-600",
  in_review: "bg-amber-500",
  processing: "bg-purple-500",
  shipped: "bg-indigo-700",
  delivered: "bg-green-500",
  cancelled: "bg-gray-800",
  courier_cancelled: "bg-orange-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  all: <ShoppingCart className="h-3.5 w-3.5" />,
  pending: <Clock className="h-3.5 w-3.5" />,
  confirmed: <CheckCircle className="h-3.5 w-3.5" />,
  hold: <Pause className="h-3.5 w-3.5" />,
  in_review: <FileSearch className="h-3.5 w-3.5" />,
  processing: <Package className="h-3.5 w-3.5" />,
  shipped: <Truck className="h-3.5 w-3.5" />,
  delivered: <PackageCheck className="h-3.5 w-3.5" />,
  cancelled: <Ban className="h-3.5 w-3.5" />,
  courier_cancelled: <Ban className="h-3.5 w-3.5" />,
};

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const statusFilter = searchParams.get("status") || "all";
  const setStatusFilter = (s: string) => {
    if (s === "all") { setSearchParams({}); }
    else { setSearchParams({ status: s }); }
  };
  const [page, setPage] = useState(0);
  const [confirmOrder, setConfirmOrder] = useState<any>(null);
  const [expandedCourier, setExpandedCourier] = useState<string | null>(null);
  const [courierResults, setCourierResults] = useState<Record<string, any>>({});
  const [courierLoading, setCourierLoading] = useState<string | null>(null);
  const [steadfastLoading, setSteadfastLoading] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const pageSize = 20;
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const checkCourierInline = async (orderId: string, phone: string) => {
    if (expandedCourier === orderId && courierResults[phone]) {
      setExpandedCourier(null);
      return;
    }
    if (courierResults[phone]) {
      setExpandedCourier(orderId);
      return;
    }
    setCourierLoading(orderId);
    setExpandedCourier(orderId);
    try {
      const data = await checkCourier(phone);
      setCourierResults(prev => ({ ...prev, [phone]: data }));
    } catch (e: any) {
      toast({ title: "কুরিয়ার চেক ব্যর্থ", description: e.message, variant: "destructive" });
      setExpandedCourier(null);
    } finally {
      setCourierLoading(null);
    }
  };

  const getMiniStats = (phone: string) => {
    const r = courierResults[phone];
    if (!r) return null;
    
    // Nested format (check both courierData and data keys)
    const courierObj = r.courierData || r.data;
    if (courierObj?.summary) {
      const s = courierObj.summary;
      return { total: s.total_parcel, success: s.success_parcel, cancel: s.cancelled_parcel };
    }
    
    // Direct BDCourier root-level format
    if (r.total_orders !== undefined || r.total_parcel !== undefined || r.success_ratio !== undefined) {
      return {
        total: r.total_orders ?? r.total_parcel ?? 0,
        success: r.successful_orders ?? r.success_parcel ?? 0,
        cancel: r.returned_orders ?? r.cancelled_parcel ?? 0
      };
    }
    
    return null;
  };

  const sendToSteadfast = async (order: any) => {
    setSteadfastLoading(order.id);
    try {
      const shippingData = typeof order.shipping_address === "object" ? order.shipping_address : {};
      const address = cleanSteadfastAddress(shippingData) || order.customer_city || "ঢাকা, বাংলাদেশ";

      const apiResult = await createSteadfastOrder({
        invoice: order.order_number,
        recipient_name: order.customer_name || "Customer",
        recipient_phone: order.customer_phone,
        recipient_address: address,
        cod_amount: Number(order.total_amount) || 0,
        note: order.notes || "",
      });

      const consignment = apiResult.consignment || apiResult || {};
      const trackingCode = consignment.tracking_code || "";
      const consignmentId = consignment.consignment_id || "";

      const updatedAddress = {
        ...shippingData,
        courier_company: "Steadfast",
        tracking_number: trackingCode,
        consignment_id: consignmentId,
        courier_status: consignment.status || "pending",
        booked_at: new Date().toISOString(),
      };

      await supabase.from("orders").update({ shipping_address: updatedAddress, order_status: "processing" as any }).eq("id", order.id);
      await supabase.from("order_history" as any).insert({
        order_id: order.id, action: "courier_booked",
        details: `Steadfast-এ পাঠানো। ট্র্যাকিং: ${trackingCode}`, staff_name: "Admin"
      });

      // Send Telegram notification
      try {
        const { sendTelegramNotification } = await import("@/lib/telegram");
        const oldStatusBangla = statusLabels[order.order_status] || order.order_status;
        const newStatusBangla = statusLabels["processing"] || "প্রসেসিং";
        const message = `🚚 <b>অর্ডার কুরিয়ারে পাঠানো হয়েছে (Steadfast)!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${order.order_number}\n` +
          `<b>গ্রাহকের নাম:</b> ${order.customer_name}\n` +
          `<b>মোবাইল:</b> ${order.customer_phone}\n` +
          `<b>ট্র্যাকিং কোড:</b> <code>${trackingCode}</code>\n` +
          `<b>পূর্বের স্ট্যাটাস:</b> ${oldStatusBangla}\n` +
          `<b>বর্তমান স্ট্যাটাস:</b> ${newStatusBangla}`;

        await sendTelegramNotification(message, { isStatusUpdate: true });
      } catch (tgErr) {
        console.error("Error triggering telegram courier booking notification:", tgErr);
      }

      toast({ title: "✅ Steadfast-এ পাঠানো হয়েছে!", description: `ট্র্যাকিং: ${trackingCode || "সফল"}` });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
    } catch (e: any) {
      toast({ title: "Steadfast ব্যর্থ", description: e.message || "Steadfast-এ বুকিং করা যায়নি।", variant: "destructive" });
    } finally {
      setSteadfastLoading(null);
    }
  };

  const syncAllShipped = async () => {
    setSyncingAll(true);
    try {
      const trackable = data?.orders.filter((o: any) => 
        (o.order_status === "processing" || o.order_status === "shipped") && (o.shipping_address as any)?.tracking_number
      ) || [];
      if (!trackable.length) { toast({ title: "সিঙ্ক করার মতো অর্ডার নেই" }); return; }

      let updated = 0;
      for (const order of trackable) {
        const sd = order.shipping_address as any;
        try {
          const result = await getSteadfastStatusByTracking(sd?.tracking_number);
          const deliveryStatus = result?.delivery_status;
          let newStatus: string | null = null;
          if (deliveryStatus === "in_transit" || deliveryStatus === "dispatched") newStatus = "shipped";
          else if (deliveryStatus === "delivered") newStatus = "delivered";
          else if (deliveryStatus === "cancelled" || deliveryStatus === "cancelled_delivery") newStatus = "courier_cancelled";

          if (newStatus && newStatus !== order.order_status) {
            await supabase.from("orders").update({
              order_status: newStatus as any,
              shipping_address: { ...(sd || {}), courier_status: deliveryStatus }
            }).eq("id", order.id);
            await supabase.from("order_history" as any).insert({
              order_id: order.id, action: "auto_status_sync",
              details: `Steadfast স্ট্যাটাস: ${deliveryStatus} → ${newStatus}`, staff_name: "System"
            });

            // Send Telegram notification for auto-synced status changes
            try {
              const { sendTelegramNotification } = await import("@/lib/telegram");
              const oldStatusBangla = statusLabels[order.order_status] || order.order_status;
              const newStatusBangla = statusLabels[newStatus] || newStatus;
              const autoMessage = `🔄 <b>অর্ডার স্ট্যাটাস অটো-আপডেট (Steadfast)!</b>\n\n` +
                `<b>অর্ডার নং:</b> #${order.order_number}\n` +
                `<b>গ্রাহকের নাম:</b> ${order.customer_name}\n` +
                `<b>মোবাইল:</b> ${order.customer_phone}\n` +
                `<b>Steadfast স্ট্যাটাস:</b> ${deliveryStatus}\n` +
                `<b>পূর্বের স্ট্যাটাস:</b> ${oldStatusBangla}\n` +
                `<b>বর্তমান স্ট্যাটাস:</b> ${newStatusBangla}`;
              await sendTelegramNotification(autoMessage, { isStatusUpdate: true });
            } catch (tgErr) {
              console.error("Error triggering auto-sync telegram notification:", tgErr);
            }

            updated++;
          }
        } catch (itemErr) {
          console.warn(`Order #${order.order_number} tracking sync failed:`, itemErr);
        }
      }
      toast({ title: `✅ সিঙ্ক সম্পন্ন`, description: `${updated}টি অর্ডার আপডেট হয়েছে` });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
    } catch (e: any) {
      toast({ title: "সিঙ্ক ব্যর্থ", description: e.message || "স্ট্যাটাস সিঙ্ক ব্যর্থ হয়েছে", variant: "destructive" });
    } finally {
      setSyncingAll(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };


  const bulkSendToSteadfast = async () => {
    if (!selectedOrders.length) return;
    setBulkLoading(true);
    try {
      const bulkData = selectedOrders.map((o: any) => {
        const sd = typeof o.shipping_address === "object" ? o.shipping_address : {};
        return {
          invoice: o.order_number,
          recipient_name: o.customer_name || "Customer",
          recipient_phone: cleanBangladeshiPhone(o.customer_phone),
          recipient_address: cleanSteadfastAddress(sd) || o.customer_city || "ঢাকা, বাংলাদেশ",
          cod_amount: Number(o.total_amount) || 0,
          note: o.notes || "",
        };
      });
      await invokeSteadfastEdge("bulk_create", { orders: bulkData });

      // Update each order status
      for (const order of selectedOrders) {
        await supabase.from("orders").update({ order_status: "processing" as any }).eq("id", order.id);
        await supabase.from("order_history" as any).insert({
          order_id: order.id, action: "bulk_courier_booked",
          details: `বাল্ক শিপিং দিয়ে Steadfast-এ পাঠানো`, staff_name: "Admin"
        });
      }

      // Send bulk Telegram notification
      try {
        const { sendTelegramNotification } = await import("@/lib/telegram");
        const orderNumbers = selectedOrders.map((o: any) => `#${o.order_number}`).join(", ");
        const bulkMessage = `🚚 <b>বাল্ক অর্ডার Steadfast-এ পাঠানো হয়েছে!</b>\n\n` +
          `<b>মোট অর্ডার:</b> ${selectedOrders.length}টি\n` +
          `<b>অর্ডার নং সমূহ:</b> ${orderNumbers}\n` +
          `<b>স্ট্যাটাস:</b> প্রসেসিং`;
        await sendTelegramNotification(bulkMessage, { isStatusUpdate: true });
      } catch (tgErr) {
        console.error("Error triggering bulk steadfast telegram notification:", tgErr);
      }

      toast({ title: "✅ বাল্ক শিপিং সফল!", description: `${selectedOrders.length}টি অর্ডার পাঠানো হয়েছে` });
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
    } catch (e: any) {
      toast({ title: "বাল্ক শিপিং ব্যর্থ", description: e.message || "বাল্ক বুকিং ব্যর্থ হয়েছে", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  const deleteOrder = async (order: any) => {
    try {
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("order_notes").delete().eq("order_id", order.id);
      await supabase.from("order_history").delete().eq("order_id", order.id);
      const { error } = await supabase.from("orders").delete().eq("id", order.id);
      if (error) throw error;
      toast({ title: "🗑️ অর্ডার ডিলিট হয়েছে" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
    } catch (e: any) {
      toast({ title: "ডিলিট ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const restoreOrder = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: "pending", note: "রিস্টোর করা হয়েছে" });
  };

  const exportCSV = () => {
    const orders = data?.orders;
    if (!orders?.length) return;
    const header = "\uFEFFঅর্ডার,কাস্টমার,ফোন,টোটাল,স্ট্যাটাস,তারিখ\n";
    const rows = orders.map((o: any) => {
      const name = (o.customer_name || "").replace(/"/g, '""');
      const phone = (o.customer_phone || "").replace(/"/g, '""');
      const status = statusLabels[o.order_status] || o.order_status;
      const date = new Date(o.created_at).toLocaleDateString("bn-BD");
      return `"${o.order_number}","${name}","${phone}","${o.total_amount}","${status}","${date}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: allOrders } = useQuery({
    queryKey: ["admin-orders-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("orders").select("order_status, created_at");
      return data || [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const statusCounts = allOrders?.reduce((acc: Record<string, number>, o: any) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const todayCount = allOrders?.filter((o: any) => {
    const d = new Date(o.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length || 0;


  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, note }: { orderId: string; status: string; note?: string }) => {
      const orderObj = data?.orders?.find((o: any) => o.id === orderId);
      const wasPending = orderObj?.order_status === "pending";

      const { error } = await supabase.from("orders").update({ order_status: status as any }).eq("id", orderId);
      if (error) throw error;
      if (note) {
        await supabase.from("order_notes" as any).insert({ order_id: orderId, note, staff_name: "Admin" });
      }
      await supabase.from("order_history" as any).insert({
        order_id: orderId, action: "status_changed",
        details: `স্ট্যাটাস পরিবর্তন: ${status}${note ? ` — ${note}` : ""}`, staff_name: "Admin"
      });

      // Send Facebook CAPI event for confirmed orders if Strict Purchase Mode is enabled
      if (status === "confirmed" && wasPending) {
        try {
          const { data: trackingRow } = await supabase
            .from("store_settings" as any)
            .select("value")
            .eq("key", "tracking_settings")
            .maybeSingle();
          const trackingConfig = trackingRow?.value as any;
          if (trackingConfig?.meta_strict_purchase_mode === true) {
            await supabase.functions.invoke("fb-capi", {
              body: { order_id: orderId, event_name: "Purchase" },
            });
          }
        } catch (fbErr) {
          console.error("FB CAPI error (non-blocking):", fbErr);
        }
      }
    },
    onSuccess: (resData, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      toast({ title: "স্ট্যাটাস আপডেট হয়েছে" });

      // Send Telegram notification
      const orderObj = data?.orders?.find((o: any) => o.id === variables.orderId);
      if (orderObj) {
        (async () => {
          try {
            const { sendTelegramNotification } = await import("@/lib/telegram");
            const oldStatusBangla = statusLabels[orderObj.order_status] || orderObj.order_status;
            const newStatusBangla = statusLabels[variables.status] || variables.status;
            const message = `🔔 <b>অর্ডারের স্ট্যাটাস পরিবর্তন!</b>\n\n` +
              `<b>অর্ডার নং:</b> #${orderObj.order_number}\n` +
              `<b>গ্রাহকের নাম:</b> ${orderObj.customer_name}\n` +
              `<b>মোবাইল:</b> ${orderObj.customer_phone}\n` +
              `<b>পূর্বের স্ট্যাটাস:</b> ${oldStatusBangla}\n` +
              `<b>বর্তমান স্ট্যাটাস:</b> ${newStatusBangla}`;

            sendTelegramNotification(message, { isStatusUpdate: true });
          } catch (tgErr) {
            console.error("Error sending status change telegram notification:", tgErr);
          }
        })();
      }

      setConfirmOrder(null);
    },
    onError: (err: any) => {
      toast({ title: "❌ স্ট্যাটাস আপডেট ব্যর্থ", description: err.message, variant: "destructive" });
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", search, statusFilter, page],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, order_items(product_name, quantity, product_id), order_notes(note, staff_name, created_at)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (search) q = q.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      if (statusFilter !== "all") q = q.eq("order_status", statusFilter as any);
      const { data, count } = await q;

      // Fetch product images - by product_id or by product_name fallback
      const productIds = new Set<string>();
      const productNames = new Set<string>();
      (data || []).forEach((o: any) => o.order_items?.forEach((i: any) => {
        if (i.product_id) productIds.add(i.product_id);
        else if (i.product_name) productNames.add(i.product_name);
      }));
      let productImages: Record<string, string> = {};
      if (productIds.size > 0) {
        const { data: products } = await supabase.from("products").select("id, images").in("id", Array.from(productIds));
        products?.forEach((p: any) => { if (p.images?.[0]) productImages[p.id] = p.images[0]; });
      }
      // Fallback: match by name for items without product_id
      if (productNames.size > 0) {
        const { data: products } = await supabase.from("products").select("id, name, images").in("name", Array.from(productNames));
        products?.forEach((p: any) => { if (p.images?.[0]) productImages[`name:${p.name}`] = p.images[0]; });
      }

      return { orders: data || [], total: count || 0, productImages };
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const totalPages = Math.ceil((data?.total || 0) / pageSize);
  const selectableStatuses = ["pending", "confirmed", "in_review"];
  const selectableOrders = data?.orders.filter((o: any) => selectableStatuses.includes(o.order_status)) || [];
  const selectedOrders = data?.orders.filter((o: any) => selectedIds.has(o.id)) || [];
  const selectedTotal = selectedOrders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);

  return (
    <div className="space-y-4">
      {/* Header Stats Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" /> অর্ডার ম্যানেজমেন্ট
        </h1>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          {selectedIds.size > 0 && (
            <Button size="sm" className="gap-1.5" onClick={bulkSendToSteadfast} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              বাল্ক শিপিং ({selectedIds.size}টি — ৳{selectedTotal.toLocaleString()})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={syncAllShipped} disabled={syncingAll}>
            {syncingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            স্ট্যাটাস সিঙ্ক
          </Button>
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
            <Clock className="h-3.5 w-3.5" /> আজ: {todayCount}টি
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5 border-yellow-300 text-yellow-700 bg-yellow-50">
            <Clock className="h-3.5 w-3.5" /> পেন্ডিং: {statusCounts.pending || 0}টি
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5 border-green-300 text-green-700 bg-green-50">
            <PackageCheck className="h-3.5 w-3.5" /> ডেলিভারড: {statusCounts.delivered || 0}টি
          </Badge>
        </div>
      </div>


      {/* Status Filter Tags */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "সব", count: allOrders?.length || 0 },
          { key: "pending", label: "পেন্ডিং", count: statusCounts.pending || 0 },
          { key: "confirmed", label: "কনফার্মড", count: statusCounts.confirmed || 0 },
          { key: "hold", label: "হোল্ড", count: statusCounts.hold || 0 },
          { key: "processing", label: "প্রসেসিং", count: statusCounts.processing || 0 },
          { key: "shipped", label: "শিপড", count: statusCounts.shipped || 0 },
          { key: "delivered", label: "ডেলিভারড", count: statusCounts.delivered || 0 },
          { key: "cancelled", label: "ক্যান্সেলড", count: statusCounts.cancelled || 0 },
          { key: "courier_cancelled", label: "কুরিয়ার ক্যান্সেলড", count: statusCounts.courier_cancelled || 0 },
        ].map(f => (
          <Button
            key={f.key}
            variant={statusFilter === f.key ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => { setStatusFilter(f.key); setPage(0); }}
          >
            {statusIcons[f.key]}
            {f.label}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{f.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="অর্ডার ID, নাম বা ফোন দিয়ে সার্চ..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</p>
          ) : (
            <>
              <div className="w-full overflow-x-auto -mx-0">
                <Table className="min-w-[780px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={selectableOrders.length > 0 && selectableOrders.every((o: any) => selectedIds.has(o.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(new Set(selectableOrders.map((o: any) => o.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-6"></TableHead>
                      <TableHead>অর্ডার</TableHead>
                      <TableHead>কাস্টমার</TableHead>
                      <TableHead>ফোন</TableHead>
                      <TableHead>প্রোডাক্ট</TableHead>
                      <TableHead>টোটাল</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.orders.map((order: any) => {
                      const mini = getMiniStats(order.customer_phone);
                      return (
                        <Fragment key={order.id}>
                          <TableRow>
                            <TableCell className="pr-0">
                              {selectableStatuses.includes(order.order_status) ? (
                                <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                              ) : <div className="w-4" />}
                            </TableCell>
                            <TableCell className="pr-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${statusDotColors[order.order_status] || "bg-gray-400"}`} />
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs font-medium">{order.order_number}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString("bn-BD")}{" "}
                                {new Date(order.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </p>
                              {order.notes && (
                                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/50 rounded-lg px-2 py-0.5 mt-1 max-w-[180px] truncate" title={order.notes}>
                                  ✍️ {order.notes}
                                </div>
                              )}
                              {(() => {
                                const latestStaffNote = order.order_notes && order.order_notes.length > 0
                                  ? [...order.order_notes].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                                  : null;
                                return latestStaffNote ? (
                                  <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200/50 rounded-lg px-2 py-0.5 mt-1 max-w-[180px] truncate" title={latestStaffNote.note}>
                                    📝 {latestStaffNote.note}
                                  </div>
                                ) : null;
                              })()}
                            </TableCell>
                            <TableCell className="font-medium">{order.customer_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{order.customer_phone}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6"
                                  onClick={() => checkCourierInline(order.id, order.customer_phone)} title="কুরিয়ার চেক">
                                  {courierLoading === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : expandedCourier === order.id ? <ChevronUp className="h-3.5 w-3.5" />
                                    : <Truck className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                              {mini && (
                                <div className="flex gap-1.5 mt-0.5">
                                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">📦 {mini.total}</span>
                                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ {mini.success}</span>
                                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">✗ {mini.cancel}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const orderItems = (order as any).order_items || [];
                                if (!orderItems.length) return <span className="text-xs text-muted-foreground">—</span>;
                                const first = orderItems[0];
                                const img = first.product_id
                                  ? data?.productImages?.[first.product_id]
                                  : data?.productImages?.[`name:${first.product_name}`] || null;
                                const totalQty = orderItems.reduce((s: number, i: any) => s + i.quantity, 0);
                                return (
                                  <div className="flex items-center gap-2">
                                    {img ? (
                                      <img src={img} alt="" className="w-8 h-8 rounded object-cover border" />
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs">📦</div>
                                    )}
                                    <div>
                                      <p className="text-xs font-medium leading-tight line-clamp-1">{first.product_name}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {totalQty}টি{orderItems.length > 1 ? ` · ${orderItems.length} আইটেম` : ""}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="font-semibold">৳{Number(order.total_amount).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[order.order_status] || ""} variant="outline">
                                {statusLabels[order.order_status] || order.order_status}
                              </Badge>
                              {order.order_status === "processing" && (order.shipping_address as any)?.consignment_id && (
                                <p className="text-[10px] font-mono text-purple-600 mt-0.5">
                                  Parcel Id: #{(order.shipping_address as any).consignment_id}
                                </p>
                              )}
                              {(order.order_status === "shipped" || order.order_status === "delivered") && (order.shipping_address as any)?.tracking_number && (
                                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                  🚚 {(order.shipping_address as any).tracking_number}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5 flex-wrap">
                                {/* Status-specific primary actions */}
                                {order.order_status === "pending" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"
                                      onClick={() => setConfirmOrder(order)} title="কনফার্ম">
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })} title="ক্যান্সেল">
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => navigate(`/admin/orders/${order.id}`)} title="এডিট">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                      onClick={() => setDeleteTarget(order)} title="ডিলিট">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {order.order_status === "hold" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"
                                      onClick={() => setConfirmOrder(order)} title="কনফার্ম">
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })} title="ক্যান্সেল">
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => navigate(`/admin/orders/${order.id}`)} title="এডিট">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                      onClick={() => setDeleteTarget(order)} title="ডিলিট">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {order.order_status === "confirmed" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-500"
                                      onClick={() => sendToSteadfast(order)} title="Steadfast-এ পাঠান"
                                      disabled={steadfastLoading === order.id}>
                                      {steadfastLoading === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => navigate(`/admin/orders/${order.id}`)} title="এডিট">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })} title="ক্যান্সেল">
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {order.order_status === "in_review" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-500"
                                      onClick={() => sendToSteadfast(order)} title="Steadfast-এ পাঠান"
                                      disabled={steadfastLoading === order.id}>
                                      {steadfastLoading === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => navigate(`/admin/orders/${order.id}`)} title="এডিট">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })} title="ক্যান্সেল">
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {(order.order_status === "processing" || order.order_status === "shipped") && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600"
                                      onClick={() => navigate(`/admin/orders/${order.id}`)} title="ট্র্যাক">
                                      <MapPin className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => navigate(`/admin/orders/${order.id}`)} title="এডিট">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })} title="ক্যান্সেল">
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {order.order_status === "delivered" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => navigate(`/admin/orders/${order.id}`)} title="ভিউ">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500"
                                      onClick={() => restoreOrder(order.id)} title="রিস্টোর">
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {order.order_status === "cancelled" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500"
                                      onClick={() => restoreOrder(order.id)} title="রিস্টোর">
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                      onClick={() => setDeleteTarget(order)} title="ডিলিট">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {/* Common quick contact */}
                                <a href={`tel:${order.customer_phone}`} title="কল">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600">
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedCourier === order.id && courierResults[order.customer_phone] && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/20 p-4">
                                <CourierResultCards data={courierResults[order.customer_phone]} />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                    {data?.orders.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">কোনো অর্ডার নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Quick Stats Footer */}
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground flex flex-wrap gap-3">
                  <span>📊 কুইক স্ট্যাটস:</span>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${statusDotColors[k]}`} />
                      {v}: {statusCounts[k] || 0}
                    </span>
                  ))}
                </p>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">মোট {data?.total}টি অর্ডার</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>আগের</Button>
                    <span className="text-sm py-1 px-2">{page + 1}/{totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>পরের</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm Modal */}
      <OrderConfirmModal
        open={!!confirmOrder}
        onOpenChange={(open) => !open && setConfirmOrder(null)}
        order={confirmOrder}
        loading={updateStatusMutation.isPending}
        onConfirm={(note) => updateStatusMutation.mutate({ orderId: confirmOrder.id, status: "confirmed", note })}
        onCancel={(note) => updateStatusMutation.mutate({ orderId: confirmOrder.id, status: "cancelled", note })}
        onHold={(note) => updateStatusMutation.mutate({ orderId: confirmOrder.id, status: "hold", note })}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>অর্ডার ডিলিট করুন?</AlertDialogTitle>
            <AlertDialogDescription>
              অর্ডার <strong>{deleteTarget?.order_number}</strong> এবং এর সাথে সম্পর্কিত সমস্ত ডাটা স্থায়ীভাবে মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteOrder(deleteTarget)}>
              🗑️ ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
