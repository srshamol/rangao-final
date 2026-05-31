import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart, Loader2 } from "lucide-react";
import { useProducts } from "@/hooks/useHomepageData";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { dbToCard } from "./ProductCard";

interface Props {
  title?: string;
  subtitle?: string;
  categorySlug?: string;
  productIds?: string[];
  count?: number;
  filter?: "category" | "manual" | "featured";
}

const IslamicCollection = ({
  title = "অভিজাত ইসলামিক কালেকশন",
  subtitle = "আপনার ঘরের দেয়াল রাঙিয়ে তুলুন ৩ডি ক্যালিগ্রাফি ও গোল্ডেন নিকাহনামা আর্ট",
  categorySlug = "wall_canvas",
  productIds,
  count = 3,
  filter = "category",
}: Props) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const { data: products, isLoading } = useProducts({
    filter: filter === "manual" && productIds?.length ? "manual" : "category",
    limit: count,
    ids: productIds,
    categorySlug,
  });

  if (isLoading) return (
    <section className="relative overflow-hidden py-24 bg-primary text-primary-foreground">
      <div className="container flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    </section>
  );
  if (!products || products.length === 0) return null;

  const handleOrder = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = dbToCard(product);
    addToCart(card as any);
    toast.success(`${product.name} কার্টে যোগ হয়েছে`);
  };

  const formatPrice = (n: number) => `৳${n.toLocaleString("bn-BD")}`;

  return (
    <section className="relative overflow-hidden py-24 bg-primary text-primary-foreground">
      <div className="absolute right-0 top-0 h-[350px] w-[350px] rounded-full bg-accent/4 blur-[130px]" />
      <div className="absolute left-0 bottom-0 h-80 w-80 rounded-full bg-accent/3 blur-[110px]" />

      <div className="container relative">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            প্রিমিয়াম সংগ্রহ
          </motion.span>
          <div className="mx-auto mt-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-accent/40" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent/30" />
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-5 font-display text-3xl font-extrabold md:text-4xl text-primary-foreground"
          >
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-4 text-base text-primary-foreground/75"
          >
            {subtitle}
          </motion.p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {products.map((p, i) => {
            const price = p.sale_price ?? p.regular_price;
            const img = p.images?.[0] || "https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80";
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -8 }}
                onClick={() => navigate(`/product/${p.id}`)}
                className="group relative overflow-hidden rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.03] p-5 transition-all duration-300 hover:border-accent/30 cursor-pointer"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary/10">
                  <img
                    src={img}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="mt-5 space-y-2">
                  <h3 className="font-display text-lg font-bold group-hover:text-accent transition-colors">{p.name}</h3>
                  <p className="text-sm text-primary-foreground/70 font-light line-clamp-2">{p.description?.slice(0, 100)}</p>
                  <div className="flex items-center justify-between pt-3">
                    <span className="font-display text-2xl font-bold text-accent">{formatPrice(price)}</span>
                    <Button
                      size="sm"
                      onClick={(e) => handleOrder(p, e)}
                      className="rounded-xl bg-accent text-accent-foreground font-semibold shadow-[0_0_20px_-4px_hsl(var(--accent)/0.5)] hover:scale-105"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Button
            size="lg"
            className="group rounded-full bg-accent px-8 font-bold text-accent-foreground shadow-[0_0_30px_-8px_hsl(var(--accent)/0.6)] hover:scale-105"
            onClick={() => navigate(`/products${categorySlug ? `?category=${categorySlug}` : ""}`)}
          >
            সম্পূর্ণ কালেকশন দেখুন
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default IslamicCollection;
