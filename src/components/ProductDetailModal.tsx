import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, ShieldCheck, Truck } from "lucide-react";
import { type Product, formatPrice, getStockLabel, getWhatsAppLink, PHONE_NUMBER } from "@/data/products";

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const ProductDetailModal = ({ product, open, onClose }: Props) => {
  if (!product) return null;
  const stock = getStockLabel(product.stock);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 p-0 shadow-premium-lg sm:max-w-2xl">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-secondary to-secondary/50">
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          <div className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold shadow-md backdrop-blur-md ${
            product.stock === 0
              ? "bg-purple-600 text-white"
              : product.stock <= 5
                ? "bg-amber-500/90 text-white"
                : "bg-success/90 text-success-foreground"
          }`}>
            {stock.text}
          </div>
        </div>

        <div className="space-y-5 p-6 md:p-8">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-2xl font-extrabold md:text-3xl">{product.name}</DialogTitle>
            <DialogDescription className="font-bengali text-sm">{product.shortDescription}</DialogDescription>
          </DialogHeader>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-foreground md:text-4xl">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-base text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
            )}
            {product.originalPrice && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
                {Math.round((1 - product.price / product.originalPrice) * 100)}% ছাড়
              </span>
            )}
          </div>

          {/* Description */}
          <p className="font-bengali text-sm leading-relaxed text-muted-foreground">{product.fullDescription}</p>

          {/* Specs */}
          <div className="overflow-hidden rounded-xl border bg-secondary/30">
            <div className="border-b bg-secondary/50 px-5 py-3">
              <h4 className="font-display text-sm font-bold text-foreground">স্পেসিফিকেশন</h4>
            </div>
            <div className="divide-y divide-border/50">
              {product.specs.map((s) => (
                <div key={s.label} className="flex justify-between px-5 py-3 text-sm">
                  <span className="font-bengali text-muted-foreground">{s.label}</span>
                  <span className="font-display font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" /> ১০০% অরিজিনাল
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-4 w-4 text-success" /> দ্রুত ডেলিভারি
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              asChild
              className={`flex-1 rounded-xl text-base font-semibold text-white shadow-md transition-all hover:shadow-lg ${
                product.stock === 0
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-success hover:bg-success/90"
              }`}
              size="lg"
            >
              <a href={getWhatsAppLink(product.name, product.stock === 0)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" /> {product.stock === 0 ? "WhatsApp এ প্রি-অর্ডার করুন" : "WhatsApp এ অর্ডার করুন"}
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 rounded-xl border-2 border-primary text-base font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
              size="lg"
            >
              <a href={`tel:${PHONE_NUMBER}`}>
                <Phone className="mr-2 h-5 w-5" /> কল করুন
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
