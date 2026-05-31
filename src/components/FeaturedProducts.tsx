import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useHomepageData";
import ProductCard, { dbToCard } from "./ProductCard";

interface Props {
  title?: string;
  subtitle?: string;
  filter?: "featured" | "newest" | "best_seller" | "manual" | "category";
  productIds?: string[];
  categorySlug?: string;
  count?: number;
  desktopCols?: number;
  mobileCols?: number;
  selectedCategory?: string | null;
}

const FeaturedProducts = ({
  title,
  subtitle = "প্রতিটি প্রোডাক্ট যত্নসহকারে বাছাই করা হয়েছে",
  filter = "featured",
  productIds,
  categorySlug,
  count = 8,
  desktopCols = 4,
  selectedCategory,
}: Props) => {
  const navigate = useNavigate();

  // If a category is selected from the category section, override filter
  const activeFilter = selectedCategory ? "category" : filter;
  const activeSlug = selectedCategory || categorySlug;

  const { data: products, isLoading } = useProducts({
    filter: activeFilter,
    limit: count,
    ids: productIds,
    categorySlug: activeSlug,
  });

  const sectionTitle = title || (selectedCategory ? "আপনার পছন্দের ক্যাটাগরি" : "আমাদের সেরা কালেকশন");

  return (
    <section id="products" className="relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--accent)/0.03)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary)/0.02)_0%,transparent_50%)]" />

      <div className="container relative">
        <div className="mx-auto mb-16 flex flex-col items-center text-center">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            {selectedCategory ? "ফিল্টার করা প্রোডাক্ট" : "ফিচার্ড"}
          </motion.span>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-accent/40" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent/30" />
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-5 max-w-xl font-display text-3xl font-extrabold text-foreground md:text-5xl"
          >
            {sectionTitle}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <Button
              variant="outline"
              className="group rounded-full border-accent/20 px-6 text-sm font-semibold text-accent transition-all duration-300 hover:border-accent/40 hover:bg-accent/5"
              onClick={() => navigate("/products")}
            >
              সব প্রোডাক্ট দেখুন
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-${Math.min(desktopCols, 4)}`}>
              {(products || []).map((product, i) => (
                <ProductCard key={product.id} product={dbToCard(product)} index={i} />
              ))}
            </div>
            {(!products || products.length === 0) && (
              <p className="py-20 text-center text-lg text-muted-foreground">এই ক্যাটাগরিতে কোনো প্রোডাক্ট নেই।</p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
