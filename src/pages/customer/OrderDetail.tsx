import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/context/CustomerContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Clock, MapPin, CreditCard, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

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

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCustomer();

  const isUuid = !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["customer-order", id],
    queryFn: async () => {
      if (!user || !isUuid) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isUuid,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["customer-order-items", id],
    queryFn: async () => {
      if (!isUuid) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      if (error) throw error;
      return data || [];
    },
    enabled: isUuid,
  });

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

  const isLoading = orderLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">লোড হচ্ছে...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-muted-foreground">অর্ডারটি খুঁজে পাওয়া যায়নি অথবা আপনি এটি দেখার জন্য অনুমোদিত নন।</p>
          <Link to="/account/orders"><Button className="rounded-xl">অর্ডারের তালিকা</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  const address = typeof order.shipping_address === "object" ? order.shipping_address : {};

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 md:py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/account/orders")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-display text-xl md:text-2xl font-extrabold">অর্ডার: {order.order_number}</h1>
              <p className="text-xs text-muted-foreground">
                {format(new Date(order.created_at), "dd/MM/yyyy hh:mm a")}
              </p>
            </div>
          </div>
          <Badge className={`text-xs px-3 py-1 ${statusColors[order.order_status] || ""}`} variant="outline">
            {statusLabels[order.order_status] || order.order_status}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Items Card */}
            <Card className="rounded-2xl border-border/40">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                <CardTitle className="text-base font-bold">অর্ডারকৃত পণ্যসমূহ</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border/30 p-0">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ৳{Number(item.unit_price).toLocaleString()} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-sm text-foreground">
                      ৳{Number(item.total_price).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Price Summary */}
            <Card className="rounded-2xl border-border/40">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">সাবটোটাল</span>
                  <span className="font-medium">৳{Number(order.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                  <span className="font-medium">৳{Number(order.delivery_charge || 0).toLocaleString()}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>ডিসকাউন্ট</span>
                    <span>-৳{Number(order.discount_amount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                  <span>সর্বমোট</span>
                  <span className="text-accent">৳{Number(order.total_amount).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Delivery address */}
            <Card className="rounded-2xl border-border/40">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <CardTitle className="text-sm font-bold">ডেলিভারি ঠিকানা</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 text-muted-foreground">
                <p className="font-bold text-foreground text-sm">{order.customer_name}</p>
                <p className="font-semibold text-foreground">{order.customer_phone}</p>
                {order.customer_email && <p>{order.customer_email}</p>}
                <p className="pt-1 text-foreground">{(address as any)?.address || (address as any)?.city || "—"}</p>
              </CardContent>
            </Card>

            {/* Payment status */}
            <Card className="rounded-2xl border-border/40">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" />
                <CardTitle className="text-sm font-bold">পেমেন্ট বিবরণ</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>পেমেন্ট মেথড:</span>
                  <span className="font-bold text-foreground uppercase">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span>পেমেন্ট স্ট্যাটাস:</span>
                  <span className="font-bold text-foreground uppercase">{order.payment_status}</span>
                </div>
              </CardContent>
            </Card>

            {/* Courier Tracking */}
            {(address as any)?.tracking_number && (
              <Card className="rounded-2xl border-border/40 bg-accent/5">
                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-bold">কুরিয়ার ট্র্যাকিং</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1.5 text-muted-foreground">
                  <p>কুরিয়ার কোম্পানি: <strong className="text-foreground">{(address as any).courier_company}</strong></p>
                  <p>ট্র্যাকিং নম্বর: <strong className="text-foreground font-mono">{(address as any).tracking_number}</strong></p>
                  {((address as any).courier_company || "").toLowerCase() === "steadfast" && (
                    <a
                      href={`https://www.steadfastcourier.com.bd/tracking?consignment_id=${(address as any).consignment_id || ""}&phone=${order.customer_phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block pt-1"
                    >
                      <Button size="sm" variant="outline" className="w-full text-xs font-semibold rounded-lg">
                        অনলাইন ট্র্যাকিং দেখুন
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
