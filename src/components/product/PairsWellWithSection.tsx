import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as staticProducts, formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tag,
  ChevronDown,
  Plus,
  Check,
  Loader2,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type VariationOption,
  type ProductVariant,
  findMatchingVariant,
  checkOptionValueAvailability,
} from "@/types/productVariations";
import { toast } from "sonner";

interface Props {
  mainProductId: string;
  pairedProductIds?: string[];
}

export default function PairsWellWithSection({
  mainProductId,
  pairedProductIds = [],
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const { items: cartItems, addToCart } = useCart();
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Modal variation picker for add-on products with variations
  const [variantModalProduct, setVariantModalProduct] = useState<any | null>(null);
  const [modalSelectedOptions, setModalSelectedOptions] = useState<Record<string, string>>({});

  // Selected variant for the active modal
  const modalActiveVariant = useMemo(() => {
    if (!variantModalProduct) return null;
    const options = (variantModalProduct.variation_options || []) as VariationOption[];
    const variants = (variantModalProduct.variants || []) as ProductVariant[];
    return findMatchingVariant(modalSelectedOptions, options, variants);
  }, [variantModalProduct, modalSelectedOptions]);

  // Query paired products dynamically from Supabase with robust fallback
  const { data: pairedProducts = [], isLoading } = useQuery({
    queryKey: ["paired-products-detail", mainProductId, pairedProductIds],
    queryFn: async () => {
      if (!pairedProductIds || pairedProductIds.length === 0) return [];

      let dbItems: any[] = [];
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .in("id", pairedProductIds)
          .neq("status", "archived");

        if (!error && Array.isArray(data)) {
          dbItems = data;
        }
      } catch (err) {
        console.warn("Error loading paired products from DB:", err);
      }

      // Preserve the admin's exact custom sorting order and resolve fallback
      const resolved = pairedProductIds
        .map((id) => {
          const stringId = String(id);
          const dbFound = dbItems.find((p) => String(p.id) === stringId);
          if (dbFound) {
            return {
              ...dbFound,
              regular_price: dbFound.regular_price || 0,
              sale_price: dbFound.sale_price,
              stock_quantity: dbFound.stock_quantity ?? 10,
              has_variants: !!dbFound.has_variants,
              variation_options: Array.isArray(dbFound.variation_options) ? dbFound.variation_options : [],
              variants: Array.isArray(dbFound.variants) ? dbFound.variants : [],
              images: Array.isArray(dbFound.images) ? dbFound.images : [],
            };
          }

          const staticFound = staticProducts.find((p) => String(p.id) === stringId);
          if (staticFound) {
            return {
              id: staticFound.id,
              name: staticFound.name,
              regular_price: staticFound.price,
              sale_price: staticFound.originalPrice ? staticFound.price : null,
              images: staticFound.images || [],
              stock_quantity: staticFound.stock ?? 50,
              has_variants: !!(staticFound.has_variants || staticFound.hasVariants),
              variation_options: staticFound.variation_options || staticFound.variationOptions || [],
              variants: staticFound.variants || [],
              category: staticFound.categoryLabel || staticFound.category || "",
              short_description: staticFound.shortDescription || "",
              description: staticFound.fullDescription || "",
              tags: staticFound.features || [],
              specifications: staticFound.specs || [],
              featured: staticFound.featured || false,
              rating: staticFound.rating || 0,
              review_count: staticFound.reviewCount || 0,
            };
          }

          return null;
        })
        .filter(Boolean);

      return resolved;
    },
    enabled: pairedProductIds && pairedProductIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  if (!pairedProductIds || pairedProductIds.length === 0) {
    return null;
  }

  // Strictly render only if products are finished loading and at least 1 valid paired product is available
  if (isLoading || pairedProducts.length === 0) {
    return null;
  }

  const handleAddSimpleProduct = async (product: any) => {
    setLoadingProductId(product.id);
    try {
      // Small artificial delay for premium micro-interaction feedback
      await new Promise((r) => setTimeout(r, 250));
      addToCart(
        {
          id: product.id,
          name: product.name,
          price: product.sale_price ?? product.regular_price,
          images: product.images?.length ? product.images : [],
          category: (product.categoryLabel || product.category || "হোম ডেকোর") as any,
          categoryLabel: product.categoryLabel || product.category || "হোম ডেকোর",
          stock: product.stock_quantity ?? product.stock ?? 10,
          shortDescription: product.short_description || product.shortDescription || "",
          fullDescription: product.description || product.fullDescription || "",
          features: product.tags || product.features || [],
          specs: product.specifications || product.specs || [],
          featured: product.featured || false,
          rating: product.rating || 0,
          reviewCount: product.review_count || product.reviewCount || 0,
        },
        1
      );
      setRecentlyAddedId(product.id);
      toast.success(`${product.name} কার্টে যোগ হয়েছে!`);
      setTimeout(() => setRecentlyAddedId(null), 3000);
    } catch (e: any) {
      toast.error("কার্টে যোগ করতে সমস্যা হয়েছে: " + e.message);
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleOpenVariantModal = (product: any) => {
    setVariantModalProduct(product);
    const options = (product.variation_options || []) as VariationOption[];
    const variants = (product.variants || []) as ProductVariant[];

    // Pre-select first in-stock variant if available
    const firstInStock = variants.find((v) => v.is_active && v.stock_quantity > 0) || variants[0];
    if (firstInStock?.options) {
      setModalSelectedOptions(firstInStock.options);
    } else {
      const initial: Record<string, string> = {};
      options.forEach((opt) => {
        if (opt.values[0]) initial[opt.name.trim()] = opt.values[0];
      });
      setModalSelectedOptions(initial);
    }
  };

  const handleConfirmVariantAdd = () => {
    if (!variantModalProduct) return;
    const options = (variantModalProduct.variation_options || []) as VariationOption[];
    const variants = (variantModalProduct.variants || []) as ProductVariant[];
    const matchingVariant = findMatchingVariant(modalSelectedOptions, options, variants);

    if (!matchingVariant) {
      toast.error("অনুগ্রহ করে সব অপশন নির্বাচন করুন");
      return;
    }

    if (matchingVariant.stock_quantity <= 0) {
      toast.error("নির্বাচিত ভ্যারিয়েন্টটি স্টকে নেই");
      return;
    }

    addToCart(
      {
        id: variantModalProduct.id,
        name: variantModalProduct.name,
        price: matchingVariant.sale_price ?? matchingVariant.regular_price,
        images: variantModalProduct.images?.length ? variantModalProduct.images : [],
        category: (variantModalProduct.categoryLabel || variantModalProduct.category || "হোম ডেকোর") as any,
        categoryLabel: variantModalProduct.categoryLabel || variantModalProduct.category || "হোম ডেকোর",
        stock: matchingVariant.stock_quantity,
        shortDescription: variantModalProduct.short_description || variantModalProduct.shortDescription || "",
        fullDescription: variantModalProduct.description || variantModalProduct.fullDescription || "",
        features: variantModalProduct.tags || variantModalProduct.features || [],
        specs: variantModalProduct.specifications || variantModalProduct.specs || [],
        featured: variantModalProduct.featured || false,
        rating: variantModalProduct.rating || 0,
        reviewCount: variantModalProduct.review_count || variantModalProduct.reviewCount || 0,
        has_variants: true,
        variation_options: options,
        variants: variants,
      },
      1,
      matchingVariant
    );

    setRecentlyAddedId(variantModalProduct.id);
    toast.success(`${variantModalProduct.name} (${matchingVariant.title}) কার্টে যোগ হয়েছে!`);
    setVariantModalProduct(null);
    setTimeout(() => setRecentlyAddedId(null), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/30 via-background to-secondary/10 overflow-hidden shadow-xs"
    >
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors hover:bg-secondary/30 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bengali font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
              🏷 সাথে নিলে ভালো যাবে (Pairs well with)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              এই প্রোডাক্টের সাথে চমৎকার মানাবে এমন উপযোগী আইটেমসমূহ
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground p-1 rounded-lg hover:bg-secondary"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="p-4 sm:p-5 pt-0 space-y-3">
              <div className="h-px bg-border/40 mb-3" />

              {isLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span>লোড হচ্ছে...</span>
                </div>
              ) : (
                pairedProducts.map((p: any) => {
                  const isOutOfStock =
                    (p.stock_quantity ?? p.stock ?? 0) <= 0 &&
                    (!p.has_variants ||
                      (p.variants && p.variants.every((v: any) => (v.stock_quantity || 0) <= 0)));

                  const isInCart = cartItems.some((i) => String(i.product.id) === String(p.id));
                  const isRecentlyAdded = recentlyAddedId === p.id;
                  const isLoadingThis = loadingProductId === p.id;
                  const hasVariants = Boolean(
                    p.has_variants || (Array.isArray(p.variants) && p.variants.length > 0)
                  );

                  return (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:border-accent/40 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-14 w-14 rounded-xl border overflow-hidden bg-secondary/30 flex items-center justify-center shrink-0">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform hover:scale-105"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h5 className="font-bold text-sm text-foreground line-clamp-1">
                            {p.name}
                          </h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-display font-extrabold text-sm text-foreground">
                              {formatPrice(p.sale_price ?? p.regular_price)}
                            </span>
                            {p.sale_price && p.regular_price > p.sale_price && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(p.regular_price)}
                              </span>
                            )}
                            {hasVariants && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 border-accent/40 text-accent font-semibold gap-0.5"
                              >
                                <Layers className="h-2.5 w-2.5" /> অপশন আছে
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end shrink-0">
                        {isOutOfStock ? (
                          <Button
                            disabled
                            size="sm"
                            variant="secondary"
                            className="h-9 px-3 text-xs font-semibold rounded-xl text-muted-foreground opacity-60"
                          >
                            স্টক শেষ
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isLoadingThis}
                            onClick={() => {
                              if (hasVariants) {
                                handleOpenVariantModal(p);
                              } else {
                                handleAddSimpleProduct(p);
                              }
                            }}
                            className={`h-9 px-3.5 text-xs font-bold rounded-xl transition-all gap-1.5 ${
                              isRecentlyAdded
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                : isInCart
                                ? "bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30"
                                : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-xs hover:shadow-md"
                            }`}
                          >
                            {isLoadingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isRecentlyAdded ? (
                              <>
                                <Check className="h-3.5 w-3.5 stroke-[3]" /> যোগ করা হয়েছে ✓
                              </>
                            ) : isInCart ? (
                              <>
                                <Check className="h-3.5 w-3.5" /> কার্টে আছে
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5 stroke-[3]" /> কার্টে যোগ করুন
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal for selecting variant of an add-on product */}
      <Dialog
        open={!!variantModalProduct}
        onOpenChange={(open) => !open && setVariantModalProduct(null)}
      >
        <DialogContent className="max-w-md p-6 rounded-2xl">
          {variantModalProduct && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" /> অপশন নির্বাচন করুন
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {variantModalProduct.name} এর ভ্যারিয়েশন নির্বাচন করুন
                </DialogDescription>
              </DialogHeader>

              {/* Product Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-secondary/30">
                <div className="h-14 w-14 rounded-lg border overflow-hidden bg-background shrink-0">
                  <img
                    src={modalActiveVariant?.image || variantModalProduct.images?.[0]}
                    alt={variantModalProduct.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground line-clamp-1">
                    {variantModalProduct.name}
                  </p>
                  <p className="font-display font-extrabold text-sm text-accent">
                    {modalActiveVariant
                      ? formatPrice(modalActiveVariant.sale_price ?? modalActiveVariant.regular_price)
                      : formatPrice(variantModalProduct.sale_price ?? variantModalProduct.regular_price)}
                  </p>
                </div>
              </div>

              {/* Options Selectors */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {((variantModalProduct.variation_options || []) as VariationOption[]).map((opt) => {
                  const optName = opt.name.trim();
                  const selectedVal = modalSelectedOptions[optName];

                  return (
                    <div key={opt.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{optName}:</span>
                        <span className="font-bold text-accent">{selectedVal}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {opt.values.map((val) => {
                          const isSelected = selectedVal === val;
                          const { isAvailable, isOutOfStock } = checkOptionValueAvailability(
                            optName,
                            val,
                            modalSelectedOptions,
                            variantModalProduct.variants || []
                          );

                          return (
                            <button
                              key={val}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() =>
                                setModalSelectedOptions((prev) => ({ ...prev, [optName]: val }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected
                                  ? "bg-accent text-accent-foreground border-accent shadow-xs"
                                  : isOutOfStock
                                  ? "bg-secondary/40 text-muted-foreground border-dashed line-through opacity-70"
                                  : "bg-secondary/60 text-foreground border-border hover:border-accent"
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Confirmation Button */}
              <div className="pt-3 border-t flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariantModalProduct(null)}
                  className="rounded-xl"
                >
                  বাতিল
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!modalActiveVariant || modalActiveVariant.stock_quantity <= 0}
                  onClick={handleConfirmVariantAdd}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl gap-1.5"
                >
                  <Plus className="h-4 w-4" /> কার্টে যোগ করুন
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
