import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRecentErrors, clearRecentErrors, type SanitizedErrorReport } from "@/lib/errorMonitoring";
import { getLatestVitals, VITALS_THRESHOLDS, type VitalSnapshot } from "@/utils/vitals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, AlertTriangle, CheckCircle2, Copy, Gauge, 
  PackageX, RefreshCw, ShieldCheck, Terminal, Trash2 
} from "lucide-react";
import { toast } from "sonner";

export default function OperationalHealth() {
  const [clientErrors, setClientErrors] = useState<readonly SanitizedErrorReport[]>([]);
  const [vitals, setVitals] = useState<Record<string, VitalSnapshot>>({});

  const refreshDiagnostics = () => {
    setClientErrors([...getRecentErrors()]);
    setVitals(getLatestVitals());
  };

  useEffect(() => {
    refreshDiagnostics();
    const interval = setInterval(refreshDiagnostics, 5000);
    return () => clearInterval(interval);
  }, []);

  // 1. Query Out-of-Stock Active Products
  const { data: outOfStockProducts = [], isLoading: loadingStock } = useQuery({
    queryKey: ["health-out-of-stock"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products" as any)
        .select("id, name, sku, stock_quantity, status")
        .eq("status", "active")
        .lte("stock_quantity", 0)
        .limit(10);
      return (data as any[]) || [];
    },
  });

  // 2. Query Orders with Pending Payment > 2 Hours
  const { data: stuckPendingOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["health-pending-orders"],
    queryFn: async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("orders" as any)
        .select("id, order_number, total_amount, payment_status, payment_method, created_at")
        .eq("payment_status", "pending")
        .lte("created_at", twoHoursAgo)
        .limit(10);
      return (data as any[]) || [];
    },
  });

  // 3. Query Incomplete Orders (Last 24h conversion rate)
  const { data: incompleteStats } = useQuery({
    queryKey: ["health-incomplete-stats"],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("incomplete_orders" as any)
        .select("id, converted, created_at")
        .gte("created_at", oneDayAgo);

      const items = (data as any[]) || [];
      const total = items.length;
      const converted = items.filter((i) => i.converted).length;
      const rate = total > 0 ? Math.round((converted / total) * 100) : 0;
      return { total, converted, rate };
    },
  });

  const handleCopyQuery = (queryText: string) => {
    navigator.clipboard.writeText(queryText);
    toast.success("SQL কুয়েরি ক্লিপবোর্ডে কপি হয়েছে");
  };

  const handleClearErrors = () => {
    clearRecentErrors();
    setClientErrors([]);
    toast.success("ক্লায়েন্ট এরর লগ পরিষ্কার করা হয়েছে");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            অপারেশনাল হেলথ ও সিস্টেম মনিটরিং
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            রিয়েল-টাইম পারফরম্যান্স, কোর ওয়েব ভাইটালস, এরর টেলিমেট্রি ও ডাটাবেস অ্যানোমালি ট্র্যাকার।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshDiagnostics} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            রিফ্রেশ
          </Button>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1 px-2.5 gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            সিস্টেম সচল
          </Badge>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core Web Vitals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Core Web Vitals
              <Gauge className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vitals.LCP ? `${vitals.LCP.value}ms` : "Active"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              LCP রেটিং: <span className="font-semibold text-emerald-600">{vitals.LCP?.rating || "good"}</span>
            </p>
          </CardContent>
        </Card>

        {/* Client Error Ring Buffer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              সাম্প্রতিক ক্লায়েন্ট এরর
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientErrors.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {clientErrors.length === 0 ? "কোনো আনহ্যান্ডল্ড ত্রুটি নেই" : "PII সুরক্ষিত লগ জমা আছে"}
            </p>
          </CardContent>
        </Card>

        {/* Stock Anomalies */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              স্টক শেষ হওয়া পণ্য
              <PackageX className="w-4 h-4 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outOfStockProducts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              সক্রিয় ক্যাটালগে স্টক ০ বা ঋণাত্মক
            </p>
          </CardContent>
        </Card>

        {/* Checkout Conversion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              চেকআউট কনভার্সন (২৪ঘণ্টা)
              <Activity className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incompleteStats ? `${incompleteStats.rate}%` : "--%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incompleteStats ? `${incompleteStats.converted} / ${incompleteStats.total} ড্রাফট সফল` : "লোড হচ্ছে..."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="vitals">ওয়েব পারফরম্যান্স (Vitals)</TabsTrigger>
          <TabsTrigger value="telemetry">ক্লায়েন্ট এরর লগ ({clientErrors.length})</TabsTrigger>
          <TabsTrigger value="anomalies">স্টক ও অর্ডার সতর্কতা</TabsTrigger>
          <TabsTrigger value="queries">ডায়াগনস্টিক SQL কুয়েরি</TabsTrigger>
        </TabsList>

        {/* Tab 1: Core Web Vitals */}
        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Core Web Vitals মেট্রিক্স</CardTitle>
              <CardDescription>
                ব্রাউজারে রিয়েল ইউজার এক্সপেরিয়েন্স এবং লোডিং স্পিড ট্র্যাক করে।
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(VITALS_THRESHOLDS).map(([name, threshold]) => {
                  const metric = vitals[name];
                  const rating = metric?.rating || "good";
                  const value = metric ? metric.value : "--";

                  return (
                    <div key={name} className="p-4 rounded-xl border border-border/60 bg-card/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{name}</span>
                        <Badge
                          variant="outline"
                          className={
                            rating === "good"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : rating === "needs-improvement"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {rating}
                        </Badge>
                      </div>
                      <div className="text-xl font-bold">
                        {value} {threshold.unit}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex justify-between">
                        <span>Good: &lt; {threshold.good}{threshold.unit}</span>
                        <span>Poor: &gt; {threshold.poor}{threshold.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Client Error Ring Buffer */}
        <TabsContent value="telemetry" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">নিরাপদ ফ্রন্টএন্ড এরর লগ (সর্বশেষ ৫০টি)</CardTitle>
                <CardDescription>
                  গ্রাহকের ফোন নম্বর, ইমেইল ও ক্রেডেনশিয়াল স্বয়ংক্রিয়ভাবে স্ক্রাব করা হয়েছে।
                </CardDescription>
              </div>
              {clientErrors.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearErrors} className="gap-1 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                  ক্লিয়ার
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {clientErrors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-medium">কোনো ক্লায়েন্ট এরর রেকর্ড করা হয়নি!</p>
                  <p className="text-xs">ব্রাউজার সেশন স্থিতিশীল এবং ত্রুটিমুক্ত।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientErrors.map((err) => (
                    <div key={err.id} className="p-3 rounded-lg border border-border/60 bg-muted/30 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span>ID: {err.id}</span>
                        <span>{new Date(err.timestamp).toLocaleTimeString("bn-BD")}</span>
                      </div>
                      <div className="font-semibold text-destructive break-all">{err.message}</div>
                      <div className="text-muted-foreground">রুট: {err.route}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Stock & Order Anomalies */}
        <TabsContent value="anomalies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Out of Stock Active Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">স্টক শেষ হওয়া সক্রিয় পণ্য</CardTitle>
                <CardDescription>পণ্য সচল কিন্তু স্টক নেই (গ্রাহক কিনতে পারবেন না)</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStock ? (
                  <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>
                ) : outOfStockProducts.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-medium">সব সক্রিয় পণ্যের স্টক পর্যাপ্ত রয়েছে।</p>
                ) : (
                  <div className="space-y-2">
                    {outOfStockProducts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-border/40 text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="text-muted-foreground">SKU: {p.sku || "--"}</p>
                        </div>
                        <Badge variant="destructive">স্টক: {p.stock_quantity}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stuck Pending Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">পেন্ডিং পেমেন্ট সতর্কতা (&gt; ২ ঘণ্টা)</CardTitle>
                <CardDescription>অনলাইন পেমেন্ট গেটওয়েতে আটকে থাকা সম্ভাব্য অর্ডার</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>
                ) : stuckPendingOrders.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-medium">কোনো দীর্ঘমেয়াদী পেন্ডিং অর্ডার নেই।</p>
                ) : (
                  <div className="space-y-2">
                    {stuckPendingOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between p-2 rounded-lg border border-border/40 text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{o.order_number}</p>
                          <p className="text-muted-foreground">পদ্ধতি: {o.payment_method} | ৳{o.total_amount}</p>
                        </div>
                        <Badge variant="outline" className="text-amber-600 border-amber-500/20">পেন্ডিং</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: SQL Queries */}
        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">অপারেশনাল ডায়াগনস্টিক SQL কুয়েরিসমূহ</CardTitle>
              <CardDescription>
                Supabase SQL Editor-এ এক ক্লিকে কপি করে সরাসরি রান করতে পারেন।
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    ১. পেন্ডিং অনলাইন পেমেন্ট ফিল্টার (&gt; ২ ঘণ্টা)
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    onClick={() =>
                      handleCopyQuery(`SELECT id, order_number, customer_phone, payment_method, total_amount, created_at
FROM orders
WHERE payment_status = 'pending'
  AND payment_method IN ('uddoktapay', 'bkash', 'nagad')
  AND created_at < NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;`)
                    }
                  >
                    <Copy className="w-3 h-3" /> কপি
                  </Button>
                </div>
                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto p-2 bg-background/60 rounded">
                  SELECT id, order_number, customer_phone, payment_method, total_amount, created_at FROM orders WHERE payment_status = &apos;pending&apos; AND payment_method IN (&apos;uddoktapay&apos;, &apos;bkash&apos;, &apos;nagad&apos;) AND created_at &lt; NOW() - INTERVAL &apos;2 hours&apos;;
                </pre>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    ২. নোটিফিকেশন বা এসএমএস ফেইলিয়র অডিট
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    onClick={() =>
                      handleCopyQuery(`SELECT oh.id, o.order_number, oh.action, oh.details, oh.created_at
FROM order_history oh
LEFT JOIN orders o ON o.id = oh.order_id
WHERE oh.details ILIKE '%failed%' OR oh.details ILIKE '%error%'
ORDER BY oh.created_at DESC LIMIT 50;`)
                    }
                  >
                    <Copy className="w-3 h-3" /> কপি
                  </Button>
                </div>
                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto p-2 bg-background/60 rounded">
                  SELECT oh.id, o.order_number, oh.action, oh.details FROM order_history oh WHERE oh.details ILIKE &apos;%failed%&apos; OR oh.details ILIKE &apos;%error%&apos; ORDER BY oh.created_at DESC LIMIT 50;
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
