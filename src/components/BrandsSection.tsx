import { useRef } from "react";
import { motion } from "framer-motion";
import { useBrands } from "@/hooks/useHomepageData";

const BrandsSection = () => {
  const { data: brands } = useBrands();

  if (!brands || brands.length === 0) return null;

  // Duplicate brands for infinite scroll effect
  const doubled = [...brands, ...brands];

  return (
    <section className="overflow-hidden border-y border-border/30 py-12 bg-secondary/20">
      <div className="container">
        <div className="mb-10 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-xl font-bold text-muted-foreground/60 uppercase tracking-[0.3em]"
          >
            আমাদের ব্র্যান্ড পার্টনার
          </motion.h2>
        </div>

        {/* Infinite scroll ticker */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <div
            className="flex gap-10 animate-marquee"
            style={{ width: `${doubled.length * 160}px` }}
          >
            {doubled.map((brand, i) => (
              <a
                key={`${brand.id}-${i}`}
                href={brand.website_url || "#"}
                target={brand.website_url ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="flex shrink-0 items-center justify-center rounded-2xl border border-border/30 bg-card px-8 py-4 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.2)] hover:-translate-y-1"
                style={{ width: "140px", height: "64px" }}
                title={brand.name}
              >
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="max-h-8 max-w-full object-contain grayscale transition-all duration-300 hover:grayscale-0"
                  />
                ) : (
                  <span className="font-display text-sm font-bold text-muted-foreground">{brand.name}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default BrandsSection;
