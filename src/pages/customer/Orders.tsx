import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  pending: "পেন্ডিং", confirmed: "কনফার্মড", processing: "প্রসেসিং",
  shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "ক্যান্সেলড",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800", shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
};

export default function CustomerOrders() {
  const { user } = useCustomer();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 md:py-12">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/account"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="font-display text-2xl font-extrabold">📦 আমার অর্ডার</h1>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">লোড হচ্ছে...</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Package className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">কোনো অর্ডার নেই</p>
            <Link to="/products"><Button className="rounded-xl">শপিং শুরু করুন</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <Card key={order.id} className="rounded-xl">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-bold">{order.order_number}</p>
                      <Badge className={`${statusColors[order.order_status] || ""} text-[10px]`} variant="outline">
                        {statusLabels[order.order_status] || order.order_status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "dd/MM/yyyy")} • ৳{Number(order.total_amount).toLocaleString()}
                    </p>
                  </div>
                  <Link to={`/account/orders/${order.id}`}>
                    <Button size="sm" variant="outline" className="rounded-lg text-xs shrink-0">বিস্তারিত</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
