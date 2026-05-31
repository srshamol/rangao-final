import { Button } from "@/components/ui/button";
import { type Product, formatPrice, getStockLabel } from "@/data/products";
import { motion } from "framer-motion";
import { Eye, GitCompareArrows, Check, Star, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompare } from "@/context/CompareContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";


interface Props {
  product: Product;
  onDetails?: (product: Product) => void;
  index: number;
}

const ProductCard = ({ product, onDetails, index }: Props) => {
  const stock = getStockLabel(product.stock);
  const navigate = useNavigate();
  const { addToCompare, isInCompare, removeFromCompare } = useCompare();
  const { addToCart } = useCart();
  const inCompare = isInCompare(product.id);

  const handleClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(product.id);
      toast.info(`${product.name} তুলনা থেকে সরানো হয়েছে`);
    } else {
      addToCompare(product);
      toast.success(`${product.name} তুলনায় যোগ হয়েছে`);
    }
  };

  const handleOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} কার্টে যোগ হয়েছে`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card shadow-premium-xl transition-all duration-500 hover:border-accent/25 hover:shadow-card-hover"
      onClick={handleClick}
    >
      {/* Gradient border glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/10 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

      {/* Image */}
      <div className="relative aspect-[4/3.5] overflow-hidden bg-gradient-to-br from-secondary to-secondary/30">
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-primary/0 transition-all duration-500 group-hover:bg-primary/25">
          <motion.div
            initial={false}
            className="rounded-full bg-background/95 px-6 py-2.5 text-sm font-semibold text-foreground opacity-0 shadow-premium-lg backdrop-blur-md transition-all duration-300 group-hover:opacity-100 scale-90 group-hover:scale-100"
          >
            <Eye className="mr-2 inline-block h-4 w-4" /> ডিটেলস দেখুন
          </motion.div>
        </div>

        {/* Badges */}
        {product.originalPrice && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1 text-[11px] font-bold text-destructive-foreground shadow-md">
            {Math.round((1 - product.price / product.originalPrice) * 100)}% ছাড়
          </span>
        )}
        <div className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md ${
          product.stock === 0
            ? "bg-destructive/90 text-destructive-foreground"
            : product.stock <= 5
            ? "bg-amber-500/90 text-primary-foreground"
            : "bg-success/90 text-success-foreground"
        }`}>
          {stock.text}
        </div>

        {/* Compare button */}
        <button
          onClick={handleCompareToggle}
          className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-all duration-300 ${
            inCompare
              ? "bg-accent text-accent-foreground scale-110"
              : "bg-background/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-110"
          }`}
          title={inCompare ? "তুলনা থেকে সরান" : "তুলনায় যোগ করুন"}
        >
          {inCompare ? <Check className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
        </button>
      </div>

      {/* Content */}
      <div className="relative p-5 md:p-6">
        {/* Rating */}
        <div className="mb-2 flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < Math.round(product.rating) ? "fill-accent text-accent" : "text-border"}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">({product.reviewCount})</span>
        </div>

        <h3 className="font-display text-base font-bold leading-snug text-card-foreground md:text-lg">{product.name}</h3>
        <p className="mt-2 font-bengali text-sm leading-relaxed text-muted-foreground line-clamp-2">{product.shortDescription}</p>

        <div className="mt-4 flex items-baseline gap-2.5">
          <span className="font-display text-2xl font-extrabold text-foreground">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground/70 line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>

        <div className="mt-5 flex gap-2.5">
          <Button
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            className="flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-premium"
            size="lg"
            disabled={product.stock === 0}
          >
            ডিটেলস দেখুন
          </Button>
          <Button
            onClick={handleOrder}
            className="rounded-xl bg-accent px-4 text-accent-foreground shadow-gold transition-all duration-300 hover:bg-accent/90 hover:shadow-gold-lg"
            size="lg"
            disabled={product.stock === 0}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
