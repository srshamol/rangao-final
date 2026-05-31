import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useProducts } from "@/hooks/useHomepageData";
import ProductCard, { dbToCard } from "./ProductCard";

interface Props {
  title?: string;
  subtitle?: string;
  count?: number;
  desktopCols?: number;
}

const NewArrivals = ({
  title = "নতুন আগমন (New Arrivals)",
  subtitle = "আমাদের সর্বশেষ উডেন ডেকোর ও ক্যালিগ্রাফির কালেকশন",
  count = 4,
  desktopCols = 4,
}: Props) => {
  const { data: products, isLoading } = useProducts({ filter: "newest", limit: count });

  if (isLoading) return (
    <section className="py-20 bg-secondary/20">
      <div className="container flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </section>
  );
  if (!products || products.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-secondary/20">
      <div className="container">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            নতুন কালেকশন
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
        <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-${Math.min(desktopCols, 4)}`}>
          {products.map((product, i) => (
            <ProductCard key={product.id} product={dbToCard(product)} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
