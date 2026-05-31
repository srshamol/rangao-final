import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { DollarSign, Truck, TrendingUp, Clock, Wallet, RotateCcw, Download, Activity } from "lucide-react";
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from "date-fns";

type DateFilter = "today" | "week" | "month";

export default function Finance() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");

  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === "today") return startOfDay(now).toISOString();
    if (dateFilter === "week") return startOfWeek(now, { weekStartsOn: 6 }).toISOString();
    return startOfMonth(now).toISOString();
  };

  const { data: kpi } = useQuery({
    queryKey: ["finance-kpi", dateFilter],
    queryFn: async () => {
      const from = getDateRange();
      const { data: orders } = await supabase.from("orders").select("total_amount, delivery_charge, order_status").gte("created_at", from);
      const all = orders || [];
      const totalSales = all.filter(o => o.order_status !== "cancelled").reduce((s, o) => s + Number(o.total_amount), 0);
      const totalDelivery = all.filter(o => o.order_status !== "cancelled").reduce((s, o) => s + Number(o.delivery_charge || 0), 0);
      const pending = all.filter(o => o.order_status === "shipped" || o.order_status === "processing").reduce((s, o) => s + Number(o.total_amount), 0);
      const returnCharge = all.filter(o => o.order_status === "cancelled").reduce((s, o) => s + Number(o.delivery_charge || 0), 0);
      return { totalSales, totalDelivery, netProfit: totalSales - totalDelivery, pending, returnCharge };
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["steadfast-balance"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("steadfast-courier", { body: { action: "get_balance" } });
        if (error) throw error;
        return data?.current_balance ?? data?.balance ?? 0;
      } catch (err) {
        console.warn("Steadfast Courier Edge Function is offline or restricted in local dev environment:", err);
        return 0;
      }
    },
    staleTime: 60000,
  });

  const { data: dailySales } = useQuery({
    queryKey: ["finance-daily-sales"],
    queryFn: async () => {
      const results = [];
      for (let i = 29; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dayStart = startOfDay(d).toISOString();
        const dayEnd = new Date(startOfDay(d).getTime() + 86400000).toISOString();
        const { data } = await supabase.from("orders").select("total_amount").gte("created_at", dayStart).lt("created_at", dayEnd).not("order_status", "eq", "cancelled");
        const total = (data || []).reduce((s, o) => s + Number(o.total_amount), 0);
        results.push({ day: format(d, "dd/MM"), sales: total });
      }
      return results;
    },
    staleTime: 300000,
  });

  const { data: transactions } = useQuery({
    queryKey: ["finance-transactions", dateFilter],
    queryFn: async () => {
      const from = getDateRange();
      const { data } = await supabase.from("orders").select("order_number, customer_name, total_amount, delivery_charge, order_status, created_at, shipping_address")
        .gte("created_at", from).in("order_status", ["delivered", "cancelled"]).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const exportCSV = () => {
    if (!transactions?.length) return;
    const header = "তারিখ,অর্ডার,কাস্টমার,অ্যামাউন্ট,ডেলিভারি চার্জ,স্ট্যাটাস\n";
    const rows = transactions.map(t =>
      `${format(new Date(t.created_at!), "dd/MM/yyyy")},${t.order_number},${t.customer_name},${t.total_amount},${t.delivery_charge || 0},${t.order_status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finance-${dateFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { title: "মোট সেলস", value: `৳${(kpi?.totalSales ?? 0).toLocaleString()}`, icon: DollarSign, gradient: "from-emerald-500 to-teal-500" },
    { title: "কুরিয়ার চার্জ", value: `৳${(kpi?.totalDelivery ?? 0).toLocaleString()}`, icon: Truck, gradient: "from-blue-500 to-cyan-500" },
    { title: "নেট প্রফিট", value: `৳${(kpi?.netProfit ?? 0).toLocaleString()}`, icon: TrendingUp, gradient: "from-violet-500 to-purple-600" },
    { title: "পেন্ডিং পেমেন্ট", value: `৳${(kpi?.pending ?? 0).toLocaleString()}`, icon: Clock, gradient: "from-amber-500 to-orange-500" },
    { title: "কুরিয়ার ব্যালেন্স", value: `৳${Number(balance ?? 0).toLocaleString()}`, icon: Wallet, gradient: "from-indigo-500 to-blue-600" },
    { title: "রিটার্ন চার্জ", value: `৳${(kpi?.returnCharge ?? 0).toLocaleString()}`, icon: RotateCcw, gradient: "from-red-500 to-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" /> ফাইন্যান্স</h1>
        <div className="flex gap-2">
          {(["today", "week", "month"] as DateFilter[]).map(f => (
            <Button key={f} variant={dateFilter === f ? "default" : "outline"} size="sm" onClick={() => setDateFilter(f)}>
              {f === "today" ? "আজ" : f === "week" ? "সপ্তাহ" : "মাস"}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5 mr-1" /> এক্সপোর্ট</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {kpiCards.map(c => (
          <Card key={c.title} className="group relative overflow-hidden border-border/30 shadow-sm hover:shadow-md transition-all">
            <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity`} />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">{c.title}</p>
                  <p className="mt-2 text-xl font-extrabold text-foreground">{c.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} shadow-lg`}>
                  <c.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <Card className="border-border/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-base font-bold">মাসিক সেলস ট্রেন্ড (৩০ দিন)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySales || []}>
                <defs>
                  <linearGradient id="finSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(v: number) => [`৳${v.toLocaleString()}`, "সেলস"]} />
                <Area type="monotone" dataKey="sales" stroke="hsl(152, 60%, 42%)" fill="url(#finSalesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily Transactions */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">ডেইলি ট্রানজেকশন</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>অর্ডার</TableHead>
                  <TableHead>কাস্টমার</TableHead>
                  <TableHead>অ্যামাউন্ট</TableHead>
                  <TableHead>ডেলিভারি</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((t: any) => (
                  <TableRow key={t.order_number}>
                    <TableCell className="text-xs">{format(new Date(t.created_at), "dd/MM/yy")}</TableCell>
                    <TableCell className="font-mono text-xs">{t.order_number}</TableCell>
                    <TableCell className="text-sm">{t.customer_name}</TableCell>
                    <TableCell className="font-semibold">৳{Number(t.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">৳{Number(t.delivery_charge || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.order_status === "delivered" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {t.order_status === "delivered" ? "✅ ডেলিভারড" : "❌ ক্যান্সেলড"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!transactions || transactions.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো ট্রানজেকশন নেই</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
