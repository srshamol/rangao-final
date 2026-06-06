import { useQuery } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart, DollarSign, Package, AlertTriangle,
  TrendingUp, Clock, CheckCircle, Truck, XCircle, FileSearch,
  ArrowUpRight, ArrowDownRight, Zap, BarChart3, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  in_review: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  processing: "bg-purple-500/15 text-purple-700 border-purple-500/20",
  shipped: "bg-indigo-500/15 text-indigo-700 border-indigo-500/20",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  pending: "পেন্ডিং",
  confirmed: "কনফার্মড",
  in_review: "ইন-রিভিউ",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভার্ড",
  cancelled: "ক্যান্সেলড",
};

const PIE_COLORS = [
  "hsl(43, 100%, 50%)",
  "hsl(210, 80%, 55%)",
  "hsl(30, 90%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(230, 60%, 55%)",
  "hsl(152, 60%, 42%)",
  "hsl(0, 84%, 60%)",
];

const QUICK_STATUS = [
  { label: "পেন্ডিং", icon: Clock, status: "pending", gradient: "from-amber-500 to-orange-500", bg: "bg-amber-500/10", iconColor: "text-amber-600" },
  { label: "কনফার্মড", icon: CheckCircle, status: "confirmed", gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-500/10", iconColor: "text-blue-600" },
  { label: "ইন-রিভিউ", icon: FileSearch, status: "in_review", gradient: "from-orange-500 to-red-400", bg: "bg-orange-500/10", iconColor: "text-orange-600" },
  { label: "প্রসেসিং", icon: Package, status: "processing", gradient: "from-purple-500 to-pink-500", bg: "bg-purple-500/10", iconColor: "text-purple-600" },
  { label: "শিপড", icon: Truck, status: "shipped", gradient: "from-indigo-500 to-blue-600", bg: "bg-indigo-500/10", iconColor: "text-indigo-600" },
  { label: "ক্যান্সেলড", icon: XCircle, status: "cancelled", gradient: "from-red-500 to-rose-600", bg: "bg-red-500/10", iconColor: "text-red-600" },
];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, icon: Icon, gradient, subtitle, trend, trendUp }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/30 bg-card shadow-premium transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">{title}</p>
            <p className="mt-2 font-display text-2xl font-extrabold text-foreground">{value}</p>
            {subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className={`mt-1.5 flex items-center gap-0.5 text-[11px] font-bold ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend}
              </div>
            )}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: steadfastBalance } = useQuery({
    queryKey: ["steadfast-balance-dashboard"],
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

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const [ordersToday, weeklyOrders, monthlyOrders, products, lowStock] = await Promise.all([
        supabase.from("orders").select("id, total_amount").gte("created_at", today),
        supabase.from("orders").select("total_amount").gte("created_at", weekAgo),
        supabase.from("orders").select("total_amount").gte("created_at", monthAgo),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 5),
      ]);

      const weeklyTotal = (weeklyOrders.data || []).reduce((s, o) => s + Number(o.total_amount), 0);
      const monthlyTotal = (monthlyOrders.data || []).reduce((s, o) => s + Number(o.total_amount), 0);
      const todayTotal = (ordersToday.data || []).reduce((s, o) => s + Number(o.total_amount), 0);

      return {
        todayOrders: ordersToday.data?.length || 0,
        todaySales: todayTotal,
        weeklySales: weeklyTotal,
        monthlySales: monthlyTotal,
        totalProducts: products.count || 0,
        lowStockCount: lowStock.count || 0,
      };
    },
  });

  const { data: statusBreakdown } = useQuery({
    queryKey: ["admin-status-breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("order_status");
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((o) => {
        const s = o.order_status || "pending";
        counts[s] = (counts[s] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value, label: statusLabels[name] || name }));
    },
  });

  const { data: dailySales } = useQuery({
    queryKey: ["admin-daily-sales-7"],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dayStart = startOfDay(d).toISOString();
        const dayEnd = new Date(startOfDay(d).getTime() + 86400000).toISOString();
        days.push({ date: format(d, "dd MMM"), dayStart, dayEnd });
      }
      const results = await Promise.all(
        days.map(async (day) => {
          const { data } = await supabase
            .from("orders")
            .select("total_amount")
            .gte("created_at", day.dayStart)
            .lt("created_at", day.dayEnd)
            .not("order_status", "eq", "cancelled");
          const total = (data || []).reduce((s, o) => s + Number(o.total_amount), 0);
          return { day: day.date, sales: total, orders: data?.length || 0 };
        })
      );
      return results;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8);
      return data || [];
    },
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, sku, stock_quantity, low_stock_alert").lt("stock_quantity", 5).order("stock_quantity", { ascending: true }).limit(8);
      return data || [];
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["admin-top-products"],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("product_name, quantity, total_price");
      if (!data) return [];
      const map: Record<string, { name: string; qty: number; revenue: number }> = {};
      data.forEach((item) => {
        if (!map[item.product_name]) map[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
        map[item.product_name].qty += item.quantity;
        map[item.product_name].revenue += Number(item.total_price);
      });
      return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    },
  });

  const totalOrders = statusBreakdown?.reduce((s, i) => s + i.value, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-navy-light to-primary p-6 md:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-accent">Rangao Admin</span>
            </div>
            <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl md:text-3xl">স্বাগতম, অ্যাডমিন! 👋</h1>
            <p className="mt-2 text-sm text-white/70 max-w-md">আপনার স্টোরের সম্পূর্ণ ওভারভিউ এখানে। আজকের সেলস, অর্ডার এবং স্টক ইনসাইটস দেখুন।</p>
          </div>
          <div className="flex items-center gap-3 md:flex-shrink-0">
            <div className="text-left md:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">আজকের তারিখ</p>
              <p className="text-sm font-bold text-white">{format(new Date(), "dd MMM yyyy")}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-left md:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">মোট অর্ডার</p>
              <p className="text-sm font-bold text-accent">{totalOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 md:gap-4">
        <StatCard title="আজকের অর্ডার" value={stats?.todayOrders ?? 0} icon={ShoppingCart} gradient="from-blue-500 to-cyan-500" />
        <StatCard title="আজকের সেলস" value={`৳${(stats?.todaySales ?? 0).toLocaleString()}`} icon={DollarSign} gradient="from-emerald-500 to-teal-500" />
        <StatCard title="সাপ্তাহিক সেলস" value={`৳${(stats?.weeklySales ?? 0).toLocaleString()}`} icon={TrendingUp} gradient="from-violet-500 to-purple-600" />
        <StatCard title="মাসিক সেলস" value={`৳${(stats?.monthlySales ?? 0).toLocaleString()}`} icon={BarChart3} gradient="from-amber-500 to-orange-500" />
        <StatCard title="মোট প্রোডাক্ট" value={stats?.totalProducts ?? 0} icon={Package} gradient="from-indigo-500 to-blue-600" />
        <StatCard title="লো স্টক" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} gradient="from-red-500 to-rose-600" subtitle="স্টক ৫ এর নিচে" />
        <StatCard title="কুরিয়ার ব্যালেন্স" value={`৳${Number(steadfastBalance ?? 0).toLocaleString()}`} icon={Truck} gradient="from-teal-500 to-cyan-600" subtitle="Steadfast" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/30 shadow-premium overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="font-display text-base font-bold">সেলস ট্রেন্ড (গত ৭ দিন)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales || []}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "13px",
                      boxShadow: "0 8px 30px -8px rgba(0,0,0,0.15)",
                    }}
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, "সেলস"]}
                  />
                  <Area type="monotone" dataKey="sales" stroke="hsl(152, 60%, 42%)" fill="url(#salesGrad)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(152, 60%, 42%)", strokeWidth: 2, stroke: "white" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 shadow-premium overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="font-display text-base font-bold">অর্ডার স্ট্যাটাস</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown || []} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" nameKey="label">
                    {(statusBreakdown || []).map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
              {(statusBreakdown || []).map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{s.label} ({s.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Status + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Status */}
        <Card className="border-border/30 shadow-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="font-display text-base font-bold">কুইক স্ট্যাটাস</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {QUICK_STATUS.map((item) => {
                const count = statusBreakdown?.find((s) => s.name === item.status)?.value || 0;
                return (
                  <button
                    key={item.status}
                    onClick={() => navigate(`/admin/orders?status=${item.status}`)}
                    className="group relative flex flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-card p-4 transition-all duration-200 hover:shadow-premium hover:-translate-y-0.5"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} transition-colors`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <p className="text-xl font-extrabold text-foreground">{count}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <div className={`absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="border-border/30 shadow-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="font-display text-base font-bold">টপ সেলিং প্রোডাক্ট</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const maxRevenue = topProducts[0]?.revenue || 1;
                  const widthPercent = Math.max((p.revenue / maxRevenue) * 100, 8);
                  return (
                    <div key={p.name} className="group">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold text-white bg-gradient-to-br ${i === 0 ? "from-amber-500 to-orange-500" : i === 1 ? "from-slate-400 to-slate-500" : "from-amber-700 to-amber-800"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{p.name}</p>
                        </div>
                        <p className="font-display text-sm font-bold text-foreground">৳{p.revenue.toLocaleString()}</p>
                      </div>
                      <div className="ml-9 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${i === 0 ? "from-amber-400 to-orange-500" : "from-blue-400 to-indigo-500"} transition-all duration-500`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <p className="ml-9 mt-0.5 text-[10px] text-muted-foreground">{p.qty} পিস বিক্রি</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">এখনও কোনো সেলস ডেটা নেই</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/30 shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="font-display text-base font-bold">সাম্প্রতিক অর্ডার</CardTitle>
            </div>
            <button onClick={() => navigate("/admin/orders")} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
              সব দেখুন <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="w-full overflow-x-auto -mx-0">
                <Table className="min-w-[420px]">
                  <TableHeader>
                    <TableRow className="border-border/20">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">অর্ডার</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">কাস্টমার</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">টোটাল</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">স্ট্যাটাস</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order: any) => (
                      <TableRow
                        key={order.id}
                        className="border-border/10 hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        <TableCell className="font-mono text-xs font-medium">{order.order_number}</TableCell>
                        <TableCell className="text-sm max-w-[100px] truncate">{order.customer_name}</TableCell>
                        <TableCell className="font-display text-sm font-bold">৳{Number(order.total_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[order.order_status] || ""} rounded-md text-[10px] font-bold border`} variant="outline">
                            {statusLabels[order.order_status] || order.order_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/15 mb-3" />
                <p className="text-muted-foreground text-sm">কোনো অর্ডার নেই</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/30 shadow-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="font-display text-base font-bold">লো স্টক অ্যালার্ট</CardTitle>
            </div>
            <button onClick={() => navigate("/admin/inventory")} className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
              ইনভেন্টরি <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[320px]">
                  <TableHeader>
                    <TableRow className="border-border/20">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">প্রোডাক্ট</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">SKU</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">স্টক</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.map((p: any) => (
                      <TableRow key={p.id} className="border-border/10 hover:bg-secondary/50 transition-colors">
                        <TableCell className="text-sm font-medium max-w-[130px] truncate">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center h-6 min-w-[28px] rounded-md text-[11px] font-bold ${p.stock_quantity === 0 ? "bg-red-500 text-white" : "bg-red-500/15 text-red-700"}`}>
                            {p.stock_quantity}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-10 w-10 text-muted-foreground/15 mb-3" />
                <p className="text-muted-foreground text-sm">সব প্রোডাক্ট পর্যাপ্ত স্টকে আছে ✅</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
