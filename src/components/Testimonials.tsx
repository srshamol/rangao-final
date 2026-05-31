import { Star, Quote, BadgeCheck, UserCircle } from "lucide-react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useCallback, useState } from "react";
import { useTestimonials } from "@/hooks/useHomepageData";

const Testimonials = () => {
  const { data: testimonials, isLoading } = useTestimonials(12);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);

    const autoplay = setInterval(() => {
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, 4000);

    return () => {
      clearInterval(autoplay);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (isLoading || !testimonials || testimonials.length === 0) return null;

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
            রিভিউ
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
            className="mt-5 font-display text-3xl font-extrabold text-foreground md:text-5xl"
          >
            আমাদের কাস্টমাররা যা বলেন
          </motion.h2>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {testimonials.map((r, i) => (
              <div key={r.id} className="min-w-0 shrink-0 basis-full md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card p-7 shadow-[0_2px_20px_-4px_hsl(var(--foreground)/0.08)] transition-all duration-500 hover:shadow-[0_12px_40px_-8px_hsl(var(--foreground)/0.15)] hover:border-border/60 md:p-8"
                >
                  <Quote className="mb-5 h-8 w-8 opacity-20" style={{ color: "hsl(var(--accent))" }} />

                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star key={si} className={`h-4 w-4 ${si < r.rating ? "fill-accent text-accent" : "text-border"}`} />
                    ))}
                  </div>

                  <p className="mb-6 text-sm leading-relaxed text-muted-foreground">"{r.review}"</p>

                  <div className="flex items-center gap-3 border-t border-border/30 pt-5">
                    {r.customer_image_url ? (
                      <img
                        src={r.customer_image_url}
                        alt={r.customer_name}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/5 font-display text-sm font-bold text-accent">
                        {r.customer_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-display text-sm font-bold text-card-foreground">{r.customer_name}</p>
                        <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <p className="text-xs text-muted-foreground/70">{r.customer_location || "বাংলাদেশ"}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      ভেরিফাইড
                    </span>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                selectedIndex === i ? "w-8 bg-accent" : "w-2 bg-border hover:bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
