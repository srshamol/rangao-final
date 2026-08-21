import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useAutoStatistics } from "@/hooks/useHomepageData";

const toBengaliDigits = (numStr: string) => {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return numStr.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

const CountUp = ({ target, duration = 2000, useBengali = true }: { target: number; duration?: number; useBengali?: boolean }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = Date.now();
          const tick = () => {
            if (!active) return;
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [target, duration]);

  const formatted = count.toLocaleString("en");
  return <span ref={ref}>{useBengali ? toBengaliDigits(formatted) : formatted}</span>;
};

const StatisticsSection = () => {
  const { data: settings } = useStoreSettings();
  const { data: autoStats } = useAutoStatistics();
  const config = settings?.statistics;

  const isAuto = config?.mode === "auto";
  const useBengali = config?.use_bengali_digits !== false;

  const stats = [
    {
      value: isAuto ? (autoStats?.customers ?? 0) : (config?.customers ?? 5000),
      label: config?.labels?.customers || "সন্তুষ্ট গ্রাহক",
      suffix: config?.suffixes?.customers || "+",
      icon: config?.icons?.customers || "👥",
    },
    {
      value: isAuto ? (autoStats?.orders ?? 0) : (config?.orders ?? 10000),
      label: config?.labels?.orders || "ডেলিভারি সম্পন্ন",
      suffix: config?.suffixes?.orders || "+",
      icon: config?.icons?.orders || "📦",
    },
    {
      value: isAuto ? (autoStats?.reviews ?? 0) : (config?.reviews ?? 4800),
      label: config?.labels?.reviews || "গ্রাহক রিভিউ",
      suffix: config?.suffixes?.reviews || "+",
      icon: config?.icons?.reviews || "⭐",
    },
    {
      value: isAuto ? (autoStats?.products ?? 0) : (config?.products ?? 200),
      label: config?.labels?.products || "প্রিমিয়াম পণ্য",
      suffix: config?.suffixes?.products || "+",
      icon: config?.icons?.products || "🎨",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02] border-t border-border/10">
      <div className="container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card p-6 text-center shadow-[0_2px_20px_-4px_hsl(var(--foreground)/0.06)] transition-all duration-400 hover:shadow-[0_8px_30px_-8px_hsl(var(--foreground)/0.15)] hover:border-accent/20 hover:-translate-y-1 md:p-8"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative text-3xl mb-3">{stat.icon}</div>
              <div className="relative font-display text-3xl font-extrabold text-foreground md:text-4xl lg:text-5xl">
                <CountUp target={stat.value} useBengali={useBengali} />
                <span className="text-accent">{useBengali ? toBengaliDigits(stat.suffix) : stat.suffix}</span>
              </div>
              <p className="relative mt-2 text-sm font-semibold text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection;
