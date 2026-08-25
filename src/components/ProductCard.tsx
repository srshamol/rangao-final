import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Eye, Star, ShoppingBag } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import CodOrderModal from "@/components/CodOrderModal";
import type { DBProduct } from "@/hooks/useHomepageData";
import { useProductReviewStats } from "@/hooks/useHomepageData";
import RangaoImage from "@/components/ui/RangaoImage";
import { getProductUrl } from "@/lib/utils";


// Unified product shape accepted by the card
export interface CardProduct {
  id: string;
  name: string;
  sku?: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  images: string[];
  stock: number;
  featured: boolean;
  isFreeDelivery?: boolean;
  is_free_delivery?: boolean;
  rating: number;
  reviewCount: number;
  category: string;
}

/** Convert Supabase DBProduct → CardProduct */
export function dbToCard(p: DBProduct): CardProduct {
  const isFreeDel = Boolean(
    (p as any).is_free_delivery || 
    (p as any).isFreeDelivery || 
    (p as any).tags?.includes("ফ্রি ডেলিভারি") ||
    (p as any).tags?.includes("free_delivery")
  );

  const rawDesc = (p as any).short_description || p.description || "";
  // Strip markdown formatting symbols for a clean card snippet
  const cleanDesc = rawDesc.replace(/\*\*|==|\[|\]|\([^)]*\)|\{color:[^}]+\}/g, "").trim().slice(0, 120);

  const rating = Number(p.rating) > 0 ? Number(p.rating) : 4.9;
  const reviewCount = Number(p.review_count) > 0 ? Number(p.review_count) : 48;

  return {
    id: p.id,
    name: p.name,
    sku: p.sku || "",
    shortDescription: cleanDesc,
    price: p.sale_price ?? p.regular_price,
    originalPrice: p.sale_price ? p.regular_price : undefined,
    images: p.images?.length ? p.images : ["https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80"],
    stock: p.stock_quantity,
    featured: p.featured,
    isFreeDelivery: isFreeDel,
    is_free_delivery: isFreeDel,
    rating,
    reviewCount,
    category: p.category,
  };
}

function getStockLabel(stock: number) {
  if (stock === 0) return { text: "প্রি-অর্ডার" };
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
  const queryClient = useQueryClient();
  const { data: reviewStats } = useProductReviewStats();
  const [isCodOpen, setIsCodOpen] = useState(false);
  const stock = getStockLabel(product.stock);

  // If real reviews are found in testimonials, use them; otherwise use product.rating if set, or fallback to demo (4.9 / 48)
  const realStat = reviewStats?.[product.id];
  const displayRating = realStat?.count
    ? realStat.avgRating
    : (product.rating && product.rating > 0 ? product.rating : 4.9);

  const displayReviewCount = realStat?.count
    ? realStat.count
    : (product.reviewCount && product.reviewCount > 0 ? product.reviewCount : 48);

  const handleClick = () => navigate(getProductUrl(product));

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ["product-detail", product.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", product.id)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

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
        onMouseEnter={handleMouseEnter}
        className="group relative overflow-hidden rounded-2xl border border-border/60 dark:border-border/30 bg-card shadow-premium-soft transition-all duration-500 hover:border-accent/40 hover:shadow-[0_20px_50px_-12px_rgba(16,42,32,0.15)]"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

        {/* Link wrapper for crawlers */}
        <Link to={getProductUrl(product)} className="block text-inherit no-underline">
          {/* Image */}
          <div className="relative aspect-[4/3.5] overflow-hidden bg-gradient-to-br from-secondary to-secondary/30">
            <RangaoImage
              src={product.images[0]}
              alt={product.name}
              width={400}
              height={350}
              className="transition-transform duration-700 ease-out group-hover:scale-105"
            />

            <div className="absolute inset-0 flex items-center justify-center bg-primary/0 transition-all duration-500 group-hover:bg-primary/20">
              <motion.div
                initial={false}
                className="rounded-full bg-background/95 px-6 py-2.5 text-sm font-semibold text-foreground opacity-0 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:opacity-100 scale-90 group-hover:scale-100"
              >
                <Eye className="mr-2 inline-block h-4 w-4" /> ডিটেলস দেখুন
              </motion.div>
            </div>

            {/* Top Left Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-10">
              {product.isFreeDelivery && (
                <span className="rounded-full bg-emerald-600/95 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1 font-bengali">
                  🚚 ফ্রি ডেলিভারি
                </span>
              )}
            </div>

            <div className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md ${
              product.stock === 0
                ? "bg-purple-600 text-white"
                : product.stock <= 5
                ? "bg-amber-500 text-white"
                : "bg-emerald-600 text-white"
            }`}>
              {stock.text}
            </div>
          </div>

          {/* Content */}
          <div className="relative p-4 md:p-5 pb-1 md:pb-1">
            <div className="mb-2 flex items-center gap-1.5 leading-none">
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 shrink-0 ${
                      i < Math.floor(displayRating)
                        ? "fill-accent text-accent"
                        : i < displayRating
                        ? "fill-accent/60 text-accent"
                        : "text-border"
                    }`}
                  />
                ))}
              </div>
              <div className="inline-flex items-center gap-1 leading-none">
                <span className="font-display text-xs font-bold text-foreground/90 leading-none">
                  {Number(displayRating).toFixed(1)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground leading-none">
                  ({displayReviewCount})
                </span>
              </div>
            </div>

            <h3 className="font-display text-sm md:text-base font-bold leading-snug text-foreground dark:text-foreground/90 line-clamp-2 min-h-[2.5rem] md:min-h-[2.75rem]">{product.name}</h3>
            <p className="mt-1 text-xs md:text-sm leading-relaxed text-foreground/70 dark:text-foreground/60 line-clamp-1 md:line-clamp-2">{product.shortDescription}</p>

            <div className="mt-3 flex items-center gap-2">
              <span className="font-display text-lg md:text-xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-[10px] md:text-xs text-muted-foreground/70 line-through">{formatPrice(product.originalPrice)}</span>
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% ছাড়
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Buttons remain outside link to allow direct events */}
        <div className="p-4 md:p-5 pt-1 md:pt-1 flex gap-1.5">
          <Button
            onClick={handleOrderClick}
            className={`flex-1 rounded-xl text-xs font-semibold transition-all duration-300 h-11 ${
              product.stock === 0
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            size="sm"
          >
            {product.stock === 0 ? "প্রি-অর্ডার করুন" : "অর্ডার করুন"}
          </Button>
          <Button
            onClick={handleOrder}
            className={`rounded-xl px-3.5 transition-all duration-300 h-11 ${
              product.stock === 0
                ? "bg-purple-600/10 text-purple-600 border border-purple-500/20 hover:bg-purple-600/20"
                : "bg-accent text-accent-foreground shadow-[0_0_20px_-4px_hsl(var(--accent)/0.5)] hover:bg-accent/90"
            }`}
            size="sm"
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
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
