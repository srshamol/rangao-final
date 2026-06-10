import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/admin/StatsCard";
import { Package, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function AdminInventory() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustType, setAdjustType] = useState("stock_in");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["admin-inventory", "stats"],
    queryFn: async () => {
      const { data: products } = await supabase.from("products").select("stock_quantity, cost_price, low_stock_alert");
      const total = products?.length || 0;
      const totalValue = (products || []).reduce((s, p) => s + (p.stock_quantity * Number(p.cost_price || 0)), 0);
      const lowStock = (products || []).filter((p) => p.stock_quantity <= (p.low_stock_alert ?? 5)).length;
      return { total, totalValue, lowStock };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      // Fetch products and filter client-side or use a query that respects low_stock_alert.
      // Since low_stock_alert is dynamic per row, we query all products or filter appropriately.
      // We can query products where stock_quantity is low. To be safe and efficient, we can fetch basic details.
      const { data } = await supabase.from("products").select("*");
      const filtered = (data || []).filter((p) => p.stock_quantity <= (p.low_stock_alert ?? 5));
      // Sort by stock_quantity
      filtered.sort((a, b) => a.stock_quantity - b.stock_quantity);
      return filtered;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: logs } = useQuery({
    queryKey: ["admin-inventory", "logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_log")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjustProduct) return;
      const stockBefore = adjustProduct.stock_quantity;
      const change = adjustType === "stock_in" ? adjustQty : -adjustQty;
      const stockAfter = stockBefore + change;

      await supabase.from("products").update({ stock_quantity: stockAfter }).eq("id", adjustProduct.id);
      await supabase.from("inventory_log").insert({
        product_id: adjustProduct.id,
        type: adjustType as any,
        quantity_change: change,
        stock_before: stockBefore,
        stock_after: stockAfter,
        note: adjustNote,
      } as any);

      // Low stock notification trigger
      if (stockAfter <= (adjustProduct.low_stock_alert || 5)) {
        try {
          const { sendTelegramNotification } = await import("@/lib/telegram");
          const message = `⚠️ <b>লো স্টক অ্যালার্ট!</b>\n\n` +
            `<b>প্রোডাক্ট:</b> ${adjustProduct.name}\n` +
            `<b>SKU:</b> ${adjustProduct.sku || "N/A"}\n` +
            `<b>বর্তমান স্টক:</b> ${stockAfter} পিস (সীমা: ${adjustProduct.low_stock_alert || 5} পিস)`;
          
          await sendTelegramNotification(message, { isLowStock: true });
        } catch (tgErr) {
          console.error("Error triggering low stock telegram notification:", tgErr);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["admin-low-stock"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-products-stats"] });
      setAdjustOpen(false);
      setAdjustProduct(null);
      setAdjustQty(0);
      setAdjustNote("");
      toast({ title: "স্টক আপডেট হয়েছে" });
    },
  });

  const openAdjust = (product: any) => {
    setAdjustProduct(product);
    setAdjustOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ইনভেন্টরি ম্যানেজমেন্ট</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="মোট প্রোডাক্ট" value={stats?.total ?? 0} icon={Package} />
        <StatsCard title="মোট স্টক ভ্যালু" value={`৳${(stats?.totalValue ?? 0).toLocaleString()}`} icon={DollarSign} />
        <StatsCard title="লো স্টক আইটেম" value={stats?.lowStock ?? 0} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader><CardTitle>লো স্টক আইটেম (স্টক ৫ এর নিচে)</CardTitle></CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[420px]">
              <TableHeader>
                <TableRow>
                  <TableHead>প্রোডাক্ট</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>বর্তমান স্টক</TableHead>
                  <TableHead>মিনিমাম</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell><Badge variant="destructive">{p.stock_quantity}</Badge></TableCell>
                    <TableCell>{p.low_stock_alert}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openAdjust(p)}>স্টক যোগ</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!lowStockProducts || lowStockProducts.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">সব ঠিক আছে!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>স্টক মুভমেন্ট লগ</CardTitle></CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>প্রোডাক্ট</TableHead>
                  <TableHead>টাইপ</TableHead>
                  <TableHead>পরিমাণ</TableHead>
                  <TableHead>আগে</TableHead>
                  <TableHead>পরে</TableHead>
                  <TableHead>নোট</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{new Date(log.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    <TableCell>{(log as any).products?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{log.type}</Badge></TableCell>
                    <TableCell className={log.quantity_change > 0 ? "text-green-600" : "text-red-500"}>
                      {log.quantity_change > 0 ? "+" : ""}{log.quantity_change}
                    </TableCell>
                    <TableCell>{log.stock_before}</TableCell>
                    <TableCell>{log.stock_after}</TableCell>
                    <TableCell className="text-xs">{log.note || "—"}</TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">কোনো লগ নেই</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>স্টক অ্যাডজাস্ট: {adjustProduct?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">বর্তমান স্টক: <strong>{adjustProduct?.stock_quantity}</strong></p>
            <div>
              <label className="text-sm font-medium">টাইপ</label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_in">স্টক ইন</SelectItem>
                  <SelectItem value="adjustment">অ্যাডজাস্টমেন্ট (বিয়োগ)</SelectItem>
                  <SelectItem value="return">রিটার্ন</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">পরিমাণ</label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className="text-sm font-medium">নোট</label>
              <Input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="কারণ লিখুন" />
            </div>
            <Button className="w-full" onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending || adjustQty <= 0}>
              {adjustMutation.isPending ? "আপডেট হচ্ছে..." : "স্টক আপডেট"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
