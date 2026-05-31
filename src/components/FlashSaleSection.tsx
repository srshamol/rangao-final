import { useState, useEffect } from "react";
import { products, formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FlashSaleSection = () => {
  const navigate = useNavigate();
  const saleProducts = products.filter((p) => p.originalPrice);

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

  if (saleProducts.length === 0) return null;

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
            <p className="font-bengali text-sm text-muted-foreground">সীমিত সময়ের জন্য বিশেষ ছাড়!</p>
          </div>

          {/* Countdown with pulsing glow */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-bengali text-xs text-muted-foreground">শেষ হতে বাকি:</span>
            {[
              { value: timeLeft.hours, label: "ঘণ্টা" },
              { value: timeLeft.minutes, label: "মিনিট" },
              { value: timeLeft.seconds, label: "সেকেন্ড" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-display text-xl font-extrabold text-primary-foreground shadow-premium">
                  {String(value).padStart(2, "0")}
                  {/* Pulsing glow ring */}
                  <span className="absolute inset-0 rounded-xl animate-pulse-glow" style={{ animationDuration: "2s" }} />
                </span>
                <span className="mt-1.5 text-[10px] font-medium text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
          {saleProducts.map((product, i) => {
            const saved = product.originalPrice! - product.price;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="w-64 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card shadow-premium transition-all duration-500 hover:shadow-card-hover hover:border-accent/20"
                style={{ scrollSnapAlign: "start" }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary to-secondary/30">
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-110" loading="lazy" />
                  <span className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1.5 text-[11px] font-bold text-destructive-foreground shadow-md">
                    {Math.round((1 - product.price / product.originalPrice!) * 100)}% ছাড়
                  </span>
                  {/* Save badge */}
                  <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-accent-foreground shadow-gold">
                    সেভ ৳{saved.toLocaleString("bn-BD")}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-sm font-bold text-card-foreground line-clamp-1">{product.name}</h3>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="font-display text-xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
                    <span className="text-xs text-muted-foreground/60 line-through">{formatPrice(product.originalPrice!)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* View all offers */}
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
