import {
  ShieldCheck, Truck, Headset, RotateCcw, Banknote, MapPin,
  Package, Star, Gift, Zap, Heart, Clock, ArrowRight, LucideIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck, Truck, Headset, RotateCcw, Banknote, MapPin,
  Package, Star, Gift, Zap, Heart, Clock,
};

const WhyChooseUs = () => {
  const { data: settings } = useStoreSettings();
  const items = settings?.trustFeatures || [];

  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28 border-t border-border/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.03)_0%,transparent_50%)]" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-accent/2 blur-[100px]" />

      <div className="container relative">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            কেন রাঙাও সেরা?
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
            className="mt-5 font-display text-3xl font-extrabold text-foreground md:text-4xl"
          >
            কেন আমরাই সেরা কালেকশন
          </motion.h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 4).map((item, i) => {
            const Icon = ICON_MAP[item.icon] || ShieldCheck;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card p-8 text-center transition-all duration-400 hover:border-accent/30 hover:shadow-[0_12px_45px_-8px_hsl(var(--foreground)/0.15)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-all duration-400 group-hover:bg-primary/20 group-hover:scale-110">
                  <div className="absolute -inset-1 rounded-full bg-primary/5 animate-[pulse_3s_infinite] opacity-50" />
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="relative mt-6 font-display text-lg font-bold text-card-foreground">{item.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
