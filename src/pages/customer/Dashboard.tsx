import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Heart, Settings, Truck, CheckCircle2, XCircle, ShoppingBag } from "lucide-react";
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

export default function CustomerDashboard() {
  const { user, profile, signOut } = useCustomer();

  const { data: orders = [] } = useQuery({
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

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("wishlists" as any)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const activeOrders = orders.filter((o: any) => !["delivered", "cancelled"].includes(o.order_status));
  const deliveredOrders = orders.filter((o: any) => o.order_status === "delivered");
  const totalSpent = orders.filter((o: any) => o.order_status !== "cancelled").reduce((s: number, o: any) => s + Number(o.total_amount), 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-muted-foreground">অনুগ্রহ করে লগইন করুন</p>
          <Link to="/login"><Button className="rounded-xl">লগইন করুন</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 md:py-12">
        {/* Welcome */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold md:text-3xl">
              👋 স্বাগতম, {profile?.full_name || "গ্রাহক"}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={signOut}>লগআউট</Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "মোট অর্ডার", value: orders.length, icon: Package, color: "text-accent" },
            { label: "চলমান", value: activeOrders.length, icon: Truck, color: "text-blue-500" },
            { label: "ডেলিভারড", value: deliveredOrders.length, icon: CheckCircle2, color: "text-green-500" },
            { label: "উইশলিস্ট", value: wishlistCount, icon: Heart, color: "text-pink-500" },
          ].map((s) => (
            <Card key={s.label} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="mt-1 font-display text-2xl font-extrabold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active orders */}
        {activeOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 font-display text-lg font-bold">📌 চলমান অর্ডার</h2>
            <div className="space-y-3">
              {activeOrders.slice(0, 5).map((order: any) => (
                <Card key={order.id} className="rounded-xl">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-display text-sm font-bold">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">৳{Number(order.total_amount).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColors[order.order_status] || ""} text-xs`} variant="outline">
                        {statusLabels[order.order_status] || order.order_status}
                      </Badge>
                      <Link to={`/account/orders/${order.id}`}>
                        <Button size="sm" variant="outline" className="rounded-lg text-xs">বিস্তারিত</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "সব অর্ডার", icon: Package, href: "/account/orders" },
            { label: "উইশলিস্ট", icon: Heart, href: "/account/wishlist" },
            { label: "প্রোফাইল", icon: Settings, href: "/account/profile" },
            { label: "শপিং করুন", icon: ShoppingBag, href: "/products" },
          ].map((item) => (
            <Link key={item.label} to={item.href}>
              <Card className="rounded-2xl transition-all hover:shadow-md hover:border-accent/30 cursor-pointer">
                <CardContent className="flex flex-col items-center gap-2 p-6">
                  <item.icon className="h-6 w-6 text-accent" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
