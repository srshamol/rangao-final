import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useHomepageData";

const FlashSaleSection = () => {
  const navigate = useNavigate();
  const { data: saleProducts, isLoading } = useProducts({ filter: "sale", limit: 8 });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !saleProducts || saleProducts.length === 0) return null;

  const formatPrice = (n: number) => `৳${n.toLocaleString("bn-BD")}`;

  return (
    <section className="relative overflow-hidden border-y border-border/30 bg-gradient-to-r from-destructive/[0.03] via-background to-accent/[0.03] py-14 md:py-20">
      <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-destructive/5 blur-[100px]" />
      <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-accent/5 blur-[100px]" />

      <div className="container relative">
        <div className="mb-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <div className="mb-3 flex items-center justify-center gap-2.5 sm:justify-start">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <Flame className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">ফ্ল্যাশ সেল</h2>
            </div>
            <p className="text-sm text-muted-foreground">সীমিত সময়ের জন্য বিশেষ ছাড়!</p>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">শেষ হতে বাকি:</span>
            {[
              { value: timeLeft.hours, label: "ঘণ্টা" },
              { value: timeLeft.minutes, label: "মিনিট" },
              { value: timeLeft.seconds, label: "সেকেন্ড" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-display text-xl font-extrabold text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="mt-1.5 text-[10px] font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4" style={{ scrollSnapType: "x mandatory" }}>
          {saleProducts.map((product, i) => {
            const price = product.sale_price!;
            const original = product.regular_price;
            const img = product.images?.[0] || "https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=400&q=80";
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="w-64 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[0_2px_20px_-4px_hsl(var(--foreground)/0.08)] transition-all duration-500 hover:shadow-[0_12px_40px_-8px_hsl(var(--foreground)/0.2)] hover:border-accent/20"
                style={{ scrollSnapAlign: "start" }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary to-secondary/30">
                  <img src={img} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-110" loading="lazy" />
                  <span className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1.5 text-[11px] font-bold text-destructive-foreground shadow-md">
                    {Math.round((1 - price / original) * 100)}% ছাড়
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-accent-foreground shadow-[0_0_15px_-3px_hsl(var(--accent)/0.5)]">
                    সেভ ৳{(original - price).toLocaleString("bn-BD")}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-sm font-bold text-card-foreground line-clamp-1">{product.name}</h3>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="font-display text-xl font-extrabold text-foreground">{formatPrice(price)}</span>
                    <span className="text-xs text-muted-foreground/60 line-through">{formatPrice(original)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            className="group rounded-full border-destructive/20 px-6 text-sm font-semibold text-destructive transition-all duration-300 hover:border-destructive/40 hover:bg-destructive/5"
            onClick={() => navigate("/products")}
          >
            সব অফার দেখুন
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FlashSaleSection;
