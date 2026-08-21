import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { getProductUrl } from "@/lib/utils";

export default function CustomerWishlist() {
  const { user } = useCustomer();
  const { addToCart } = useCart();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-wishlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("wishlists" as any)
        .select("*, products(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("wishlists" as any).delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-wishlist"] });
      toast.success("উইশলিস্ট থেকে সরানো হয়েছে");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 md:py-12">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/account"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="font-display text-2xl font-extrabold">❤️ উইশলিস্ট</h1>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">লোড হচ্ছে...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Heart className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">আপনার উইশলিস্ট খালি</p>
            <Link to="/products"><Button className="rounded-xl">প্রোডাক্ট দেখুন</Button></Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => {
              const product = item.products;
              if (!product) return null;
              const price = product.sale_price || product.regular_price;
              return (
                <Card key={item.id} className="rounded-xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex gap-3 p-3">
                      {product.images?.[0] && (
                        <Link to={getProductUrl(product)}>
                          <img src={product.images[0]} alt={product.name} className="h-20 w-20 rounded-lg object-cover" />
                        </Link>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link to={getProductUrl(product)}>
                          <p className="text-sm font-semibold line-clamp-2 hover:text-accent">{product.name}</p>
                        </Link>
                        <p className="mt-1 font-display text-base font-extrabold">৳{Number(price).toLocaleString()}</p>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" className="rounded-lg text-xs gap-1" onClick={() => {
                            const pData = { id: product.id, name: product.name, price, images: product.images || [], category: (product.category || "home-decor") as any, rating: product.rating || 0, reviewCount: product.review_count || 0, shortDescription: "", fullDescription: product.description || "", features: [], categoryLabel: product.category || "", specs: [], stock: product.stock_quantity || 0, featured: false };
                            addToCart(pData);
                            toast.success("কার্টে যোগ হয়েছে");
                          }}>
                            <ShoppingCart className="h-3 w-3" /> কার্টে
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-lg text-xs text-destructive" onClick={() => removeItem.mutate(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
