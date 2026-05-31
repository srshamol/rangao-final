import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Search, CheckCircle2, XCircle, Phone, Mail, User, RefreshCw } from "lucide-react";
import IncompleteOrderConvertModal from "@/components/admin/IncompleteOrderConvertModal";
import { toast } from "sonner";
import { format, isToday, isYesterday, subDays, isAfter } from "date-fns";

type DateFilter = "all" | "today" | "week" | "month";

export default function IncompleteOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [convertOrder, setConvertOrder] = useState<any | null>(null);

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
    refetchInterval: 5 * 60 * 1000, // 5 min auto-refresh
  });

  const filtered = useMemo(() => {
    let result = incompleteOrders;

    // Date filter
    if (dateFilter === "today") {
      result = result.filter((o: any) => isToday(new Date(o.created_at)));
    } else if (dateFilter === "week") {
      const weekAgo = subDays(new Date(), 7);
      result = result.filter((o: any) => isAfter(new Date(o.created_at), weekAgo));
    } else if (dateFilter === "month") {
      const monthAgo = subDays(new Date(), 30);
      result = result.filter((o: any) => isAfter(new Date(o.created_at), monthAgo));
    }

    // Search
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

  // Stats
  const stats = useMemo(() => {
    const all = incompleteOrders;
    const today = all.filter((o: any) => isToday(new Date(o.created_at)));
    const weekAgo = subDays(new Date(), 7);
    const week = all.filter((o: any) => isAfter(new Date(o.created_at), weekAgo));
    const withPhone = all.filter((o: any) => o.customer_phone);
    const withEmail = all.filter((o: any) => o.customer_email);
    return {
      total: all.length,
      today: today.length,
      week: week.length,
      withPhone: withPhone.length,
      withEmail: withEmail.length,
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
    await supabase.from("incomplete_orders" as any).update({ status: "dismissed" }).eq("id", id);
    toast.success("ডিসমিস করা হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
  };

  const handleConverted = () => {
    setConvertOrder(null);
    queryClient.invalidateQueries({ queryKey: ["incomplete-orders"] });
    queryClient.invalidateQueries({ queryKey: ["incomplete-orders-count"] });
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
          { label: "ফোন দিয়েছে", value: stats.withPhone, icon: Phone, color: "text-green-500" },
          { label: "ইমেইল দিয়েছে", value: stats.withEmail, icon: Mail, color: "text-blue-500" },
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
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>সময়</TableHead>
              <TableHead>কাস্টমার</TableHead>
              <TableHead>প্রোডাক্ট</TableHead>
              <TableHead>পেজ</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">লোড হচ্ছে...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">কোনো ইনকমপ্লিট অর্ডার নেই</TableCell>
              </TableRow>
            ) : (
              filtered.map((order: any) => {
                const products = order.product_info || [];
                const firstProduct = products[0];
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className={`h-3 w-3 rounded-full ${getTimeColor(order.created_at).split(" ")[0].replace("/10", "")}`} />
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
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {order.customer_phone}
                          </div>
                        )}
                        {order.customer_email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {order.customer_email}
                          </div>
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
                            <p className="text-[10px] text-muted-foreground">৳{firstProduct.price}</p>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className="rounded-lg bg-success text-success-foreground text-xs hover:bg-success/90"
                          onClick={() => setConvertOrder(order)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> কনফার্ম
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-xs text-muted-foreground"
                          onClick={() => handleDismiss(order.id)}
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

      {/* Convert Modal */}
      {convertOrder && (
        <IncompleteOrderConvertModal
          open={!!convertOrder}
          onOpenChange={(open) => !open && setConvertOrder(null)}
          order={convertOrder}
          onConverted={handleConverted}
        />
      )}
    </div>
  );
}
