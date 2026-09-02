import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const CartSidebar = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeFromCart, totalItems, subtotal } = useCart();
  const [deleteTargetProductId, setDeleteTargetProductId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data: storeSettings } = useStoreSettings();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  const freeMin = Number(storeSettings?.deliveryCharges?.free_delivery_min) || 0;
  const freeProgress = freeMin > 0 ? Math.min(100, Math.round((subtotal / freeMin) * 100)) : 0;
  const remainingForFree = freeMin > subtotal ? freeMin - subtotal : 0;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="pb-1">
            <SheetTitle className="flex items-center gap-2 font-display text-xl font-extrabold">
              <ShoppingBag className="h-5 w-5 text-accent" />
              কার্ট
              {totalItems > 0 && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                  {totalItems}টি আইটেম
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Free Delivery Progress Bar */}
          {freeMin > 0 && items.length > 0 && (
            <div className="bg-secondary/60 rounded-xl p-3 border border-border/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bengali font-semibold text-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>
                    {remainingForFree > 0
                      ? `আর ${formatPrice(remainingForFree)} টাকার শপিং করলেই ফ্রি ডেলিভারি!`
                      : "🎉 অভিনন্দন! আপনি ফ্রি ডেলিভারি সুবিধা পাচ্ছেন!"}
                  </span>
                </span>
                <span className="font-mono text-[11px] font-bold text-accent">{freeProgress}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${freeProgress}%` }}
                />
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="font-bengali text-sm text-muted-foreground">আপনার কার্ট বর্তমানে খালি</p>
              <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                শপিং শুরু করুন
              </Button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="flex-1 space-y-3 overflow-y-auto py-2 pr-1">
                <AnimatePresence>
                  {items.map((item) => {
                    const itemKey = item.selectedVariant ? `${item.product.id}_${item.selectedVariant.id}` : item.product.id;
                    const itemImg = item.selectedVariant?.image || item.product.images[0];
                    const itemMaxStock = item.selectedVariant ? item.selectedVariant.stock_quantity : item.product.stock;
                    const itemUnitPrice = item.selectedVariant ? (item.selectedVariant.sale_price ?? item.selectedVariant.regular_price) : item.product.price;
                    const itemTotalPrice = itemUnitPrice * item.quantity;

                    return (
                      <motion.div
                        key={itemKey}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex gap-3 rounded-xl border border-border/50 bg-card p-3 shadow-xs"
                      >
                        <img
                          src={itemImg}
                          alt={item.product.name}
                          className="h-20 w-20 rounded-lg object-cover border border-border/40 shrink-0"
                        />
                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-display text-sm font-bold text-card-foreground line-clamp-1">
                              {item.product.name}
                            </h4>
                            {item.selectedVariant && (
                              <p className="text-[11px] font-semibold text-accent truncate mt-0.5">
                                {item.selectedVariant.title}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-display text-sm font-extrabold text-foreground">
                                {formatPrice(itemTotalPrice)}
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-[11px] text-muted-foreground">
                                  ({formatPrice(itemUnitPrice)} × {item.quantity})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center overflow-hidden rounded-lg border border-border/60 bg-secondary/30">
                              <button
                                onClick={() => {
                                  if (item.quantity <= 1) {
                                    setDeleteTargetProductId(itemKey);
                                  } else {
                                    updateQuantity(itemKey, item.quantity - 1);
                                  }
                                }}
                                aria-label={`${item.product.name} পরিমাণ ১ কমান`}
                                className="flex h-7 w-7 items-center justify-center transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                <Minus className="h-3 w-3" aria-hidden="true" />
                              </button>
                              <span className="flex h-7 w-8 items-center justify-center border-x border-border/60 text-xs font-bold" aria-live="polite">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                                aria-label={`${item.product.name} পরিমাণ ১ বাড়ান`}
                                className="flex h-7 w-7 items-center justify-center transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-accent"
                                disabled={item.quantity >= itemMaxStock}
                              >
                                <Plus className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </div>
                            <button
                              onClick={() => setDeleteTargetProductId(itemKey)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive"
                              aria-label={`${item.product.name} কার্ট থেকে মুছে ফেলুন`}
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="space-y-3 border-t border-border/50 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bengali text-sm font-semibold text-muted-foreground">সাবটোটাল</span>
                  <span className="font-display text-xl font-extrabold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  size="lg"
                  className="w-full rounded-xl bg-accent py-6 text-base font-bold text-accent-foreground shadow-gold transition-all hover:bg-accent/90"
                >
                  চেকআউট করুন <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-xl"
                >
                  শপিং চালিয়ে যান
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Cart Item Confirmation */}
      <AlertDialog open={!!deleteTargetProductId} onOpenChange={(open) => !open && setDeleteTargetProductId(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">কার্ট থেকে অপসারণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই পণ্যটি আপনার কার্ট থেকে মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => {
                if (deleteTargetProductId) {
                  removeFromCart(deleteTargetProductId);
                  setDeleteTargetProductId(null);
                }
              }}
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CartSidebar;
