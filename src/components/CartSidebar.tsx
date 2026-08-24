import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const CartSidebar = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeFromCart, totalItems, subtotal } = useCart();
  const [deleteTargetProductId, setDeleteTargetProductId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 font-display text-xl font-extrabold">
              <ShoppingBag className="h-5 w-5 text-accent" />
              কার্ট
              {totalItems > 0 && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                  {totalItems}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="font-bengali text-sm text-muted-foreground">আপনার কার্ট খালি</p>
              <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                শপিং চালিয়ে যান
              </Button>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-3 rounded-xl border bg-card p-3"
                    >
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h4 className="font-display text-sm font-bold text-card-foreground line-clamp-1">
                            {item.product.name}
                          </h4>
                          <p className="font-display text-sm font-extrabold text-foreground">
                            {formatPrice(item.product.price)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center overflow-hidden rounded-lg border">
                            <button
                              onClick={() => {
                                if (item.quantity <= 1) {
                                  setDeleteTargetProductId(item.product.id);
                                } else {
                                  updateQuantity(item.product.id, item.quantity - 1);
                                }
                              }}
                              className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-secondary"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="flex h-8 w-8 items-center justify-center border-x text-xs font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-secondary"
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => setDeleteTargetProductId(item.product.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bengali text-sm font-semibold text-muted-foreground">সাবটোটাল</span>
                  <span className="font-display text-xl font-extrabold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  size="lg"
                  className="w-full rounded-xl bg-accent py-6 text-base font-bold text-accent-foreground shadow-gold transition-all hover:bg-accent/90"
                >
                  চেকআউট <ArrowRight className="ml-2 h-4 w-4" />
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
