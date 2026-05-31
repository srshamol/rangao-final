import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useAutoStatistics } from "@/hooks/useHomepageData";

const CountUp = ({ target, duration = 2000 }: { target: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString("en")}</span>;
};

const StatisticsSection = () => {
  const { data: settings } = useStoreSettings();
  const { data: autoStats } = useAutoStatistics();
  const config = settings?.statistics;

  const isAuto = config?.mode === "auto";
  const stats = [
    {
      value: isAuto ? (autoStats?.customers || 0) : (config?.customers || 5000),
      label: "সন্তুষ্ট গ্রাহক",
      suffix: "+",
      icon: "👥",
    },
    {
      value: isAuto ? (autoStats?.orders || 0) : (config?.orders || 10000),
      label: "সফল অর্ডার",
      suffix: "+",
      icon: "📦",
    },
    {
      value: isAuto ? (autoStats?.reviews || 0) : (config?.reviews || 4800),
      label: "পজিটিভ রিভিউ",
      suffix: "+",
      icon: "⭐",
    },
    {
      value: isAuto ? (autoStats?.products || 0) : (config?.products || 200),
      label: "ইউনিক প্রোডাক্ট",
      suffix: "+",
      icon: "🎨",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
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
                <CountUp target={stat.value} />
                <span className="text-accent">{stat.suffix}</span>
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
