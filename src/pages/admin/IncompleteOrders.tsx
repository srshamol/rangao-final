import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Search, CheckCircle2, XCircle, Phone, Mail, User, RefreshCw, PhoneCall, Eye, Package, MapPin, Clock, Smartphone, Globe } from "lucide-react";
import IncompleteOrderConvertModal from "@/components/admin/IncompleteOrderConvertModal";
import { toast } from "sonner";
import { format, isToday, isYesterday, subDays, isAfter } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

type DateFilter = "all" | "today" | "week" | "month";

export default function IncompleteOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [convertOrder, setConvertOrder] = useState<any | null>(null);
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<any | null>(null);

  const { data: incompleteOrders = [], isLoading, refetch } = useQuery({
    queryKey: ["incomplete-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incomplete_orders" as any)
        .select("*")
        .in("status", ["abandoned", "contacted"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // fallback — Realtime handles instant updates
  });

  const filtered = useMemo(() => {
    let result = incompleteOrders;

    if (dateFilter === "today") {
      result = result.filter((o: any) => isToday(new Date(o.created_at)));
    } else if (dateFilter === "week") {
      const weekAgo = subDays(new Date(), 7);
      result = result.filter((o: any) => isAfter(new Date(o.created_at), weekAgo));
    } else if (dateFilter === "month") {
      const monthAgo = subDays(new Date(), 30);
      result = result.filter((o: any) => isAfter(new Date(o.created_at), monthAgo));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (o: any) =>
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.customer_email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [incompleteOrders, dateFilter, search]);

  const stats = useMemo(() => {
    const all = incompleteOrders;
    const today = all.filter((o: any) => isToday(new Date(o.created_at)));
    const weekAgo = subDays(new Date(), 7);
    const week = all.filter((o: any) => isAfter(new Date(o.created_at), weekAgo));
    const withPhone = all.filter((o: any) => o.customer_phone);
    const contacted = all.filter((o: any) => o.status === "contacted");
    return {
      total: all.length,
      today: today.length,
      week: week.length,
      withPhone: withPhone.length,
      contacted: contacted.length,
    };
  }, [incompleteOrders]);

  const getTimeColor = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "bg-destructive/10 text-destructive";
    if (isYesterday(d)) return "bg-yellow-500/10 text-yellow-600";
    const weekAgo = subDays(new Date(), 7);
    if (isAfter(d, weekAgo)) return "bg-orange-500/10 text-orange-600";
    return "bg-blue-500/10 text-blue-600";
  };

  const handleDismiss = async (id: string) => {
    const { error } = await supabase.from("incomplete_orders" as any).delete().eq("id", id);
    if (error) {
      toast.error("ডিসমিস ব্যর্থ হয়েছে: " + error.message);
    } else {
      toast.success("ডিসমিস করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-order-counts"] });
    }
    setDismissTarget(null);
  };

  const handleToggleContacted = async (order: any) => {
    const newStatus = order.status === "contacted" ? "abandoned" : "contacted";
    const { error } = await supabase
      .from("incomplete_orders" as any)
      .update({ status: newStatus })
      .eq("id", order.id);
    if (error) {
      toast.error("স্ট্যাটাস আপডেট ব্যর্থ");
    } else {
      toast.success(newStatus === "contacted" ? "✅ কন্টাক্টেড মার্ক করা হয়েছে" : "🔄 আবার অ্যাবান্ডনড এ ফিরে এসেছে");
      queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
    }
  };

  const handleConverted = () => {
    setConvertOrder(null);
    queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
    queryClient.invalidateQueries({ queryKey: ["incomplete-orders-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sidebar-order-counts"] });
  };

  const pageSourceLabel: Record<string, string> = {
    checkout: "চেকআউট",
    cod_modal: "COD মডাল",
    product_page: "প্রোডাক্ট পেজ",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            ইনকমপ্লিট অর্ডার
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            যারা অর্ডার সম্পন্ন না করে চলে গেছে
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" /> রিফ্রেশ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "মোট ইনকমপ্লিট", value: stats.total, icon: AlertTriangle, color: "text-yellow-500" },
          { label: "আজকে", value: stats.today, icon: AlertTriangle, color: "text-destructive" },
          { label: "এই সপ্তাহে", value: stats.week, icon: AlertTriangle, color: "text-orange-500" },
          { label: "ফোন আছে", value: stats.withPhone, icon: Phone, color: "text-green-500" },
          { label: "কন্টাক্টেড", value: stats.contacted, icon: PhoneCall, color: "text-blue-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="mt-1 font-display text-2xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ফোন, নাম বা ইমেইল সার্চ করুন..."
            className="rounded-xl pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "today", "week", "month"] as DateFilter[]).map((f) => (
            <Button
              key={f}
              variant={dateFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter(f)}
              className="rounded-xl text-xs"
            >
              {f === "all" ? "সব" : f === "today" ? "আজ" : f === "week" ? "৭ দিন" : "৩০ দিন"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>সময়</TableHead>
              <TableHead>কাস্টমার</TableHead>
              <TableHead>প্রোডাক্ট</TableHead>
              <TableHead>পেজ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">লোড হচ্ছে...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">কোনো ইনকমপ্লিট অর্ডার নেই</TableCell>
              </TableRow>
            ) : (
              filtered.map((order: any) => {
                const products = order.product_info || [];
                const firstProduct = products[0];
                const isContacted = order.status === "contacted";
                return (
                  <TableRow key={order.id} className={isContacted ? "opacity-60" : ""}>
                    <TableCell>
                      <div className={`h-3 w-3 rounded-full ${isContacted ? "bg-blue-400" : getTimeColor(order.created_at).split(" ")[0].replace("/10", "")}`} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={`${getTimeColor(order.created_at)} border-0 text-[10px]`}>
                        {format(new Date(order.created_at), "dd/MM HH:mm")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {order.customer_name && (
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <User className="h-3 w-3" /> {order.customer_name}
                          </div>
                        )}
                        {order.customer_phone && (
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Phone className="h-3 w-3" /> {order.customer_phone}
                          </a>
                        )}
                        {order.customer_email && (
                          <a
                            href={`mailto:${order.customer_email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Mail className="h-3 w-3" /> {order.customer_email}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {firstProduct ? (
                        <div className="flex items-center gap-2">
                          {firstProduct.image && (
                            <img src={firstProduct.image} alt="" className="h-8 w-8 rounded object-cover" />
                          )}
                          <div>
                            <p className="text-xs font-medium line-clamp-1">{firstProduct.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              ৳{firstProduct.price}
                              {products.length > 1 && (
                                <span className="ml-1 text-muted-foreground">+{products.length - 1} আরো</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {pageSourceLabel[order.page_source] || order.page_source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border-0 ${isContacted ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}
                      >
                        {isContacted ? "কন্টাক্টেড" : "অ্যাবান্ডনড"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View details */}
                        <Button
                          size="sm"
                          variant="outline"
                          title="বিস্তারিত দেখুন"
                          className="rounded-lg text-xs border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                          onClick={() => setViewOrder(order)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {/* Mark contacted / uncontacted toggle */}
                        <Button
                          size="sm"
                          variant="outline"
                          title={isContacted ? "আবার অ্যাবান্ডনড করুন" : "কন্টাক্টেড মার্ক করুন"}
                          className={`rounded-lg text-xs ${isContacted ? "border-blue-300 text-blue-600 hover:bg-blue-50" : "border-green-300 text-green-600 hover:bg-green-50"}`}
                          onClick={() => handleToggleContacted(order)}
                        >
                          <PhoneCall className="h-3 w-3" />
                        </Button>
                        {/* Convert to full order */}
                        <Button
                          size="sm"
                          className="rounded-lg bg-success text-success-foreground text-xs hover:bg-success/90"
                          onClick={() => setConvertOrder(order)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> কনফার্ম
                        </Button>
                        {/* Dismiss with confirm */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => setDismissTarget(order.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dismiss Confirm Dialog */}
      <AlertDialog open={!!dismissTarget} onOpenChange={(open) => !open && setDismissTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ডিসমিস করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই ইনকমপ্লিট অর্ডারটি ডিসমিস করা হবে এবং লিস্ট থেকে সরে যাবে। এটি পূর্বাবস্থায় আনা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => dismissTarget && handleDismiss(dismissTarget)}
            >
              ডিসমিস করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Modal */}
      {convertOrder && (
        <IncompleteOrderConvertModal
          open={!!convertOrder}
          onOpenChange={(open) => !open && setConvertOrder(null)}
          order={convertOrder}
          onConverted={handleConverted}
        />
      )}

      {/* View Detail Sheet */}
      <Sheet open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {viewOrder && (() => {
            const vProducts = viewOrder.product_info || [];
            const vFormData = viewOrder.form_data || {};
            const vIsContacted = viewOrder.status === "contacted";
            return (
              <>
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2 font-display text-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ইনকমপ্লিট অর্ডার বিস্তারিত
                  </SheetTitle>
                  <SheetDescription>
                    <Badge
                      variant="outline"
                      className={`border-0 text-xs ${
                        vIsContacted ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {vIsContacted ? "কন্টাক্টেড" : "অ্যাবান্ডনড"}
                    </Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {format(new Date(viewOrder.created_at), "dd MMM yyyy, HH:mm")}
                    </span>
                  </SheetDescription>
                </SheetHeader>

                {/* Customer Info */}
                <div className="mb-5 rounded-xl border bg-card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <User className="h-4 w-4 text-primary" /> কাস্টমার তথ্য
                  </h3>
                  <div className="space-y-2">
                    {viewOrder.customer_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">নাম</span>
                        <span className="text-sm font-medium">{viewOrder.customer_name}</span>
                      </div>
                    )}
                    {viewOrder.customer_phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">মোবাইল</span>
                        <a href={`tel:${viewOrder.customer_phone}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />{viewOrder.customer_phone}
                        </a>
                      </div>
                    )}
                    {viewOrder.customer_email && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">ইমেইল</span>
                        <a href={`mailto:${viewOrder.customer_email}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                          <Mail className="h-3 w-3" />{viewOrder.customer_email}
                        </a>
                      </div>
                    )}
                    {!viewOrder.customer_name && !viewOrder.customer_phone && !viewOrder.customer_email && (
                      <p className="text-xs text-muted-foreground">কোনো কাস্টমার তথ্য নেই</p>
                    )}
                  </div>
                </div>

                {/* Products */}
                <div className="mb-5 rounded-xl border bg-card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Package className="h-4 w-4 text-primary" /> পণ্যসমূহ ({vProducts.length}টি)
                  </h3>
                  {vProducts.length > 0 ? (
                    <div className="space-y-3">
                      {vProducts.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          {p.image && (
                            <img src={p.image} alt={p.name} className="h-12 w-12 rounded-lg object-cover shrink-0 border" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ৳{p.price} × {p.quantity || 1} =
                              <span className="font-semibold text-foreground ml-1">৳{p.price * (p.quantity || 1)}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                      {/* Total */}
                      <div className="border-t pt-2 mt-2 flex justify-between">
                        <span className="text-xs text-muted-foreground">মোট (আনুমানিক)</span>
                        <span className="text-sm font-bold text-primary">
                          ৳{vProducts.reduce((sum: number, p: any) => sum + p.price * (p.quantity || 1), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">কোনো পণ্য তথ্য নেই</p>
                  )}
                </div>

                {/* Form Data / Address */}
                {(vFormData.division || vFormData.address || vFormData.shipping) && (
                  <div className="mb-5 rounded-xl border bg-card p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <MapPin className="h-4 w-4 text-primary" /> ঠিকানা তথ্য
                    </h3>
                    <div className="space-y-2">
                      {vFormData.division && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">বিভাগ</span>
                          <span className="text-sm">{vFormData.division}</span>
                        </div>
                      )}
                      {vFormData.address && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0 mt-0.5">ঠিকানা</span>
                          <span className="text-sm">{vFormData.address}</span>
                        </div>
                      )}
                      {vFormData.shipping && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">শিপিং</span>
                          <span className="text-sm">{vFormData.shipping === "dhaka" ? "ঢাকা সিটি (৳৭০)" : vFormData.shipping === "outside" ? "ঢাকার বাইরে (৳১৩০)" : vFormData.shipping}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="mb-6 rounded-xl border bg-card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Globe className="h-4 w-4 text-primary" /> মেটা তথ্য
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">পেজ সোর্স</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {pageSourceLabel[viewOrder.page_source] || viewOrder.page_source || "—"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">তারিখ ও সময়</span>
                      <span className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(viewOrder.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </span>
                    </div>
                    {viewOrder.updated_at && viewOrder.updated_at !== viewOrder.created_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">আপডেট</span>
                        <span className="text-xs">{format(new Date(viewOrder.updated_at), "dd/MM/yyyy HH:mm:ss")}</span>
                      </div>
                    )}
                    {viewOrder.ip_address && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">IP ঠিকানা</span>
                        <span className="text-xs font-mono">{viewOrder.ip_address}</span>
                      </div>
                    )}
                    {viewOrder.session_id && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground w-24 shrink-0 mt-0.5">Session ID</span>
                        <span className="text-[10px] font-mono text-muted-foreground break-all">{viewOrder.session_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full rounded-xl bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => { setViewOrder(null); setConvertOrder(viewOrder); }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> অর্ডার কনফার্ম করুন
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={`flex-1 rounded-xl text-sm ${
                        vIsContacted
                          ? "border-blue-300 text-blue-600 hover:bg-blue-50"
                          : "border-green-300 text-green-600 hover:bg-green-50"
                      }`}
                      onClick={() => { handleToggleContacted(viewOrder); setViewOrder((v: any) => v ? { ...v, status: v.status === "contacted" ? "abandoned" : "contacted" } : null); }}
                    >
                      <PhoneCall className="mr-2 h-4 w-4" />
                      {vIsContacted ? "অ্যাবান্ডনড করুন" : "কন্টাক্টেড মার্ক করুন"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl text-sm text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => { setViewOrder(null); setDismissTarget(viewOrder.id); }}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> ডিসমিস করুন
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
