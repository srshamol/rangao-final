import { Watch, Headphones, BatteryCharging, Home, ArrowRight } from "lucide-react";
import { categories, products, type Category } from "@/data/products";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = { Watch, Headphones, BatteryCharging, Home };

interface Props {
  onSelect: (cat: Category | null) => void;
  selected: Category | null;
}

const CategorySection = ({ onSelect, selected }: Props) => {
  const getCatCount = (catId: string) => products.filter(p => p.category === catId).length;

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            ক্যাটাগরি
          </motion.span>
          {/* Decorative line ornament */}
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
            আপনার পছন্দের গ্যাজেট খুঁজুন
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-4 text-base text-muted-foreground"
          >
            সব ধরনের প্রিমিয়াম গ্যাজেট এখানে পাবেন
          </motion.p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon];
            const isActive = selected === cat.id;
            const count = getCatCount(cat.id);
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(isActive ? null : cat.id)}
                className={`group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border-2 p-6 transition-all duration-400 md:p-10 ${
                  isActive
                    ? "border-accent bg-accent/5 shadow-gold"
                    : "border-transparent bg-card shadow-premium hover:shadow-card-hover"
                }`}
              >
                {/* Gradient border effect on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br transition-opacity duration-500 ${
                  isActive
                    ? "from-accent/10 to-transparent opacity-100"
                    : "from-accent/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100"
                }`} />

                {/* Hover border glow */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-accent/0 transition-all duration-500 group-hover:border-accent/20" />
                )}

                <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-400 ${
                  isActive
                    ? "bg-accent text-accent-foreground shadow-gold"
                    : "bg-secondary text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent group-hover:scale-110"
                }`}>
                  <Icon className="h-7 w-7 transition-transform duration-500 group-hover:rotate-6" />
                </div>

                <span className="relative font-bengali text-sm font-bold text-card-foreground md:text-base">{cat.name}</span>

                {/* Product count badge */}
                <span className={`relative rounded-full px-3 py-0.5 text-[10px] font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "bg-secondary text-muted-foreground/70 group-hover:bg-accent/10 group-hover:text-accent"
                }`}>
                  {count}টি প্রোডাক্ট
                </span>

                <span className={`relative flex items-center gap-1 text-xs font-medium transition-all duration-300 ${
                  isActive ? "text-accent" : "text-muted-foreground group-hover:text-accent group-hover:gap-2"
                }`}>
                  {isActive ? "সব দেখুন" : "ব্রাউজ করুন"}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
