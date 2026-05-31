import { motion } from "framer-motion";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Globe, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  subtitle?: string;
}

export default function DecorGallery({
  title = "আমাদের ডেকর ইন্সপিরেশন",
  subtitle = "রাঙাও গ্রাহকদের সুন্দরভাবে সাজানো ঘরের কিছু চমৎকার মুহূর্ত",
}: Props) {
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const gallery = settings?.homepageGallery || [];

  if (!gallery || gallery.length === 0) return null;

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-muted/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.02)_0%,transparent_40%)]" />
      
      <div className="container relative">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            গ্রাহকের ঘর
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
              className="mt-4 text-base text-muted-foreground"
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {/* Gallery Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              onClick={() => navigate(item.link || "/products")}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[0_2px_20px_-4px_hsl(var(--foreground)/0.08)] transition-all duration-500 hover:shadow-[0_12px_45px_-8px_hsl(var(--foreground)/0.25)] hover:border-accent/30"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-secondary to-secondary/30">
                <img 
                  src={item.image_url} 
                  alt={item.title} 
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Floating Overlay with hover effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                  <div className="text-left space-y-1 transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
                      <Globe className="h-3 w-3" /> ইন্সপিরেশন
                    </span>
                    <h3 className="font-display font-bold text-primary-foreground text-base">
                      {item.title}
                    </h3>
                    <p className="text-xs text-primary-foreground/70 flex items-center gap-1 font-medium">
                      সংগ্রহ দেখুন <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
