import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories, useProductCountByCategory } from "@/hooks/useHomepageData";
import { useRef } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  mode?: "auto" | "manual";
  categoryIds?: string[];
  sortBy?: "custom" | "newest" | "oldest" | "products" | "alphabetical";
  count?: number;
  desktopCols?: number;
  tabletCols?: number;
  mobileCols?: number;
  showImage?: boolean;
  showCount?: boolean;
  showDescription?: boolean;
  showCTA?: boolean;
  showIcon?: boolean;
  onSelect?: (slug: string | null) => void;
  selected?: string | null;
}

const CategorySection = ({
  title = "আমাদের কাস্টম ক্যাটাগরি কালেকশন",
  subtitle = "আপনার ঘরের দেয়াল রাঙিয়ে তুলুন শৈল্পিক ও ইসলামিক নান্দনিকতায়",
  mode = "auto",
  categoryIds,
  sortBy = "custom",
  count = 8,
  desktopCols = 4,
  tabletCols = 3,
  mobileCols = 2,
  showImage = true,
  showCount = true,
  showDescription = false,
  showCTA = false,
  showIcon = false,
  onSelect,
  selected,
}: Props) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const { data: categories, isLoading } = useCategories({
    ids: mode === "manual" && categoryIds?.length ? categoryIds : undefined,
    limit: count,
    sortBy,
  });
  const { data: productCounts = {} } = useProductCountByCategory();

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-alternate-section/40 border-y border-border/30 relative overflow-hidden">
      {/* Soft background decor */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-accent/[0.015] rounded-full blur-3xl pointer-events-none" />
      <div className="container relative z-10">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            ক্যাটাগরি
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
            {title}
          </motion.h2>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="mt-4 text-base text-foreground/80 font-medium"
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        <div className="relative group/scroll px-2 md:px-4 py-2">
          {/* Left indicator button */}
          <button
            onClick={() => handleScroll("left")}
            className="absolute -left-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-premium-lg backdrop-blur-md transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 md:flex opacity-0 group-hover/scroll:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div 
            ref={scrollRef}
            className="flex flex-row overflow-x-auto gap-6 md:gap-10 pb-8 pt-4 px-2 scrollbar-none snap-x scroll-smooth w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((cat, i) => {
              const isActive = selected === cat.slug;
              const count = productCounts[cat.slug] || 0;
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (onSelect) {
                      onSelect(isActive ? null : cat.slug);
                    } else {
                      navigate(`/category/${cat.slug}`);
                    }
                  }}
                  className={`group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border-2 p-5 text-center transition-all duration-400 md:p-6 min-w-[170px] sm:min-w-[220px] shrink-0 snap-start ${
                    isActive
                      ? "border-accent bg-accent/5 shadow-[0_0_25px_-4px_hsl(var(--accent)/0.3)]"
                      : "border-border/60 bg-card shadow-premium-soft hover:shadow-[0_12px_35px_-8px_rgba(16,42,32,0.1)]"
                  }`}
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br transition-opacity duration-500 ${
                    isActive ? "from-accent/10 to-transparent opacity-100" : "from-accent/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100"
                  }`} />

                  {!isActive && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-accent/0 transition-all duration-500 group-hover:border-accent/20" />
                  )}

                  {/* Show Icon OR Image based on preferences */}
                  {showIcon ? (
                    <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all duration-400 ${
                      isActive ? "bg-accent text-accent-foreground shadow-[0_0_15px_-2px_hsl(var(--accent)/0.5)]" : "bg-secondary group-hover:bg-accent/10 group-hover:scale-110"
                    }`}>
                      🕌
                    </div>
                  ) : showImage && cat.image_url ? (
                    <div className={`relative h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-2xl border border-border/40 shadow-sm transition-all duration-400 ${
                      isActive ? "shadow-[0_0_15px_-2px_hsl(var(--accent)/0.5)] border-accent/30" : "group-hover:scale-110"
                    }`}>
                      <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                    </div>
                  ) : null}

                  <span className="relative font-bengali text-sm font-bold text-card-foreground md:text-base">
                    {cat.name}
                  </span>

                  {/* Optional Category Description */}
                  {showDescription && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 relative z-10">
                      আমাদের এক্সক্লুসিভ {cat.name} কালেকশন দেখতে ব্রাউজ করুন।
                    </p>
                  )}

                  {showCount && (
                    <span className={`relative rounded-full px-3 py-0.5 text-[10px] font-bold transition-all duration-300 ${
                      isActive ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground/70 group-hover:bg-accent/10 group-hover:text-accent"
                    }`}>
                      {count}টি প্রোডাক্ট
                    </span>
                  )}

                  {/* Optional CTA Button */}
                  {showCTA && (
                    <div className={`mt-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-300 relative z-10 ${
                      isActive ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}>
                      কালেকশন দেখুন
                    </div>
                  )}

                  {!showCTA && (
                    <span className={`relative flex items-center gap-1 text-xs font-medium transition-all duration-300 ${
                      isActive ? "text-accent" : "text-muted-foreground group-hover:text-accent group-hover:gap-2"
                    }`}>
                      {isActive ? "সব দেখুন" : "ব্রাউজ করুন"}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Right indicator button */}
          <button
            onClick={() => handleScroll("right")}
            className="absolute -right-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-premium-lg backdrop-blur-md transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 md:flex opacity-0 group-hover/scroll:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
