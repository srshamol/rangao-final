import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Eye, Star, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useState } from "react";
import CodOrderModal from "@/components/CodOrderModal";
import type { DBProduct } from "@/hooks/useHomepageData";
import BrokenImageGuard from "@/components/BrokenImageGuard";


// Unified product shape accepted by the card
export interface CardProduct {
  id: string;
  name: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  images: string[];
  stock: number;
  featured: boolean;
  rating: number;
  reviewCount: number;
  category: string;
}

/** Convert Supabase DBProduct → CardProduct */
export function dbToCard(p: DBProduct): CardProduct {
  return {
    id: p.id,
    name: p.name,
    shortDescription: p.description?.slice(0, 120) || "",
    price: p.sale_price ?? p.regular_price,
    originalPrice: p.sale_price ? p.regular_price : undefined,
    images: p.images?.length ? p.images : ["https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80"],
    stock: p.stock_quantity,
    featured: p.featured,
    rating: p.rating || 0,
    reviewCount: p.review_count || 0,
    category: p.category,
  };
}

function getStockLabel(stock: number) {
  if (stock === 0) return { text: "স্টক শেষ" };
  if (stock <= 5) return { text: `মাত্র ${stock}টি বাকি` };
  return { text: "স্টকে আছে" };
}

function formatPrice(price: number | undefined | null) {
  if (price === undefined || price === null) return "৳০";
  return `৳${price.toLocaleString("bn-BD")}`;
}

interface Props {
  product: CardProduct;
  onDetails?: (product: CardProduct) => void;
  index: number;
}

const ProductCard = ({ product, index, onDetails }: Props) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [isCodOpen, setIsCodOpen] = useState(false);
  const stock = getStockLabel(product.stock);

  const handleClick = () => navigate(`/product/${product.id}`);

  const handleOrderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCodOpen(true);
  };

  const handleOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product as any);
    toast.success(`${product.name} কার্টে যোগ হয়েছে`);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -8 }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 dark:border-border/30 bg-card shadow-premium-soft transition-all duration-500 hover:border-accent/40 hover:shadow-[0_20px_50px_-12px_rgba(16,42,32,0.15)]"
        onClick={handleClick}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

        {/* Image */}
        <div className="relative aspect-[4/3.5] overflow-hidden bg-gradient-to-br from-secondary to-secondary/30">
          <BrokenImageGuard
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            sizes="(max-width: 640px) 150px, (max-width: 1024px) 250px, 350px"
          />

          <div className="absolute inset-0 flex items-center justify-center bg-primary/0 transition-all duration-500 group-hover:bg-primary/20">
            <motion.div
              initial={false}
              className="rounded-full bg-background/95 px-6 py-2.5 text-sm font-semibold text-foreground opacity-0 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:opacity-100 scale-90 group-hover:scale-100"
            >
              <Eye className="mr-2 inline-block h-4 w-4" /> ডিটেলস দেখুন
            </motion.div>
          </div>

          {product.originalPrice && product.price && (
            <span className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1 text-[11px] font-bold text-destructive-foreground shadow-md">
              {Math.round((1 - product.price / product.originalPrice) * 100)}% ছাড়
            </span>
          )}
          <div className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md ${
            product.stock === 0
              ? "bg-destructive/95 text-white"
              : product.stock <= 5
              ? "bg-amber-500 text-white"
              : "bg-emerald-600 text-white"
          }`}>
            {stock.text}
          </div>
        </div>

        {/* Content */}
        <div className="relative p-4 md:p-5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 md:h-3.5 md:w-3.5 ${i < Math.round(product.rating) ? "fill-accent text-accent" : "text-border"}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-foreground/60">({product.reviewCount})</span>
          </div>

          <h3 className="font-display text-sm md:text-base font-bold leading-snug text-foreground dark:text-foreground/90 line-clamp-2 min-h-[2.5rem] md:min-h-[2.75rem]">{product.name}</h3>
          <p className="mt-1 text-xs md:text-sm leading-relaxed text-foreground/70 dark:text-foreground/60 line-clamp-1 md:line-clamp-2">{product.shortDescription}</p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-lg md:text-xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-[10px] md:text-xs text-muted-foreground/70 line-through">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          <div className="mt-4 flex gap-1.5">
            <Button
              onClick={handleOrderClick}
              className="flex-1 rounded-xl bg-primary text-xs font-semibold text-primary-foreground transition-all duration-300 hover:bg-primary/90 h-11"
              size="sm"
              disabled={product.stock === 0}
            >
              অর্ডার করুন
            </Button>
            <Button
              onClick={handleOrder}
              className="rounded-xl bg-accent px-3.5 text-accent-foreground shadow-[0_0_20px_-4px_hsl(var(--accent)/0.5)] transition-all duration-300 hover:bg-accent/90 h-11"
              size="sm"
              disabled={product.stock === 0}
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <CodOrderModal
        open={isCodOpen}
        onOpenChange={setIsCodOpen}
        product={product as any}
        quantity={1}
      />
    </>
  );
};

export default ProductCard;
