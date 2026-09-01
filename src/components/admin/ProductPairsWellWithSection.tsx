import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Check,
  Package,
  Layers,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { products as staticProducts, formatPrice } from "@/data/products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  currentProductId?: string;
  pairedProductIds: string[];
  onChange: (ids: string[]) => void;
}

export default function ProductPairsWellWithSection({
  currentProductId,
  pairedProductIds,
  onChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all active products for the picker with reliable fallback
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["all-products-for-paired-selection"],
    queryFn: async () => {
      const fallbackList = staticProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || "",
        regular_price: p.price,
        sale_price: p.originalPrice ? p.price : null,
        images: p.images || [],
        stock_quantity: p.stock ?? 50,
        has_variants: !!(p.has_variants || p.hasVariants),
        variants: p.variants || [],
        category: p.categoryLabel || p.category || "",
        status: "active",
      }));

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, sku, regular_price, sale_price, images, stock_quantity, has_variants, variants, category, status")
          .neq("status", "archived")
          .order("name", { ascending: true });

        if (error || !data || data.length === 0) {
          console.warn("Product catalog query fallback to static items:", error);
          return fallbackList;
        }

        // Map supabase products and merge any missing static items if needed
        const dbItems = data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || "",
          regular_price: p.regular_price || 0,
          sale_price: p.sale_price,
          images: Array.isArray(p.images) ? p.images : [],
          stock_quantity: p.stock_quantity ?? 0,
          has_variants: !!p.has_variants,
          variants: Array.isArray(p.variants) ? p.variants : [],
          category: p.category || "",
          status: p.status || "active",
        }));

        return dbItems;
      } catch (err) {
        console.warn("Product catalog error, falling back to static items:", err);
        return fallbackList;
      }
    },
    staleTime: 60_000,
  });

  // Filter out current product and filter by search
  const availableProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (currentProductId && String(p.id) === String(currentProductId)) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
    });
  }, [allProducts, currentProductId, searchTerm]);

  // Selected products mapped with metadata in order
  const selectedProducts = useMemo(() => {
    return pairedProductIds
      .map((id) => {
        const found = allProducts.find((p) => String(p.id) === String(id));
        if (found) return found;
        const staticFound = staticProducts.find((p) => String(p.id) === String(id));
        if (staticFound) {
          return {
            id: staticFound.id,
            name: staticFound.name,
            sku: staticFound.sku || "",
            regular_price: staticFound.price,
            sale_price: staticFound.originalPrice ? staticFound.price : null,
            images: staticFound.images || [],
            stock_quantity: staticFound.stock ?? 50,
            has_variants: !!(staticFound.has_variants || staticFound.hasVariants),
            variants: staticFound.variants || [],
            category: staticFound.categoryLabel || staticFound.category || "",
            status: "active",
          };
        }
        return null;
      })
      .filter(Boolean) as typeof allProducts;
  }, [pairedProductIds, allProducts]);

  const handleToggleProduct = (id: string) => {
    const stringId = String(id);
    if (pairedProductIds.some((pId) => String(pId) === stringId)) {
      onChange(pairedProductIds.filter((pId) => String(pId) !== stringId));
    } else {
      onChange([...pairedProductIds, stringId]);
    }
  };

  const handleRemove = (id: string) => {
    const stringId = String(id);
    onChange(pairedProductIds.filter((pId) => String(pId) !== stringId));
  };

  const handleReorder = (fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= pairedProductIds.length) return;

    const newIds = [...pairedProductIds];
    const [moved] = newIds.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, moved);
    onChange(newIds);
  };

  return (
    <Card className="border-accent/30 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-accent/5 via-secondary/20 to-transparent pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-accent" /> 🛍 এর সাথে নিতে পারেন (Pairs Well With / Add-ons)
              </CardTitle>
              {pairedProductIds.length > 0 && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {pairedProductIds.length}টি প্রোডাক্ট
                </Badge>
              )}
            </div>
            <CardDescription>
              এই প্রোডাক্টের পেইজে নিচে ক্রস-সেল হিসেবে কোন আইটেমগুলো (যেমন: গিফট র‍্যাপিং, ফ্রেম, কি-হোল্ডার) সাজেস্ট হবে তা নির্ধারণ করুন
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-xs gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> প্রোডাক্ট যুক্ত করুন
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {selectedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed text-center bg-secondary/10">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold text-foreground">এখনও কোনো পেয়ার্ড প্রোডাক্ট যুক্ত করা হয়নি</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              গ্রাহকের গড় অর্ডার ভ্যালু (AOV) বাড়াতে প্রাসঙ্গিক বা উপযোগী অ্যাক্সেসরিজ যুক্ত করুন
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="mt-3 rounded-lg gap-1.5"
            >
              <Plus className="h-4 w-4" /> ক্যাটালগ থেকে প্রোডাক্ট সিলেক্ট করুন
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:border-accent/40 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-lg border overflow-hidden bg-secondary/30 flex items-center justify-center shrink-0">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {formatPrice(p.sale_price ?? p.regular_price)}
                      </span>
                      {p.sku && <span>• SKU: {p.sku}</span>}
                      {p.has_variants && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/40 text-accent font-semibold gap-0.5">
                          <Layers className="h-2.5 w-2.5" /> ভ্যারিয়েশন আছে
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleReorder(idx, -1)}
                      title="উপরে সরান"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  )}
                  {idx < selectedProducts.length - 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleReorder(idx, 1)}
                      title="নিচে সরান"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(p.id)}
                    title="রিমুভ করুন"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Catalog Selector Modal */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] h-[620px] flex flex-col p-0 overflow-hidden rounded-2xl gap-0 border border-border/80 bg-background shadow-2xl">
          {/* Modal Header */}
          <div className="p-5 pb-4 border-b bg-card/80 backdrop-blur-sm shrink-0 pr-12">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                <ShoppingBag className="h-5 w-5 text-accent shrink-0" /> ক্যাটালগ থেকে প্রোডাক্ট যুক্ত করুন
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                যে প্রোডাক্টগুলো ক্রস-সেল হিসেবে সাজেস্ট করতে চান সেগুলো টিক দিয়ে নির্বাচন করুন
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-3.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="প্রোডাক্ট নাম বা SKU দিয়ে খুঁজুন..."
                className="pl-9 h-10 rounded-xl bg-background text-sm border-border focus-visible:ring-accent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs bg-secondary/80 rounded-full h-5 w-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Product List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 min-h-0 bg-background/50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-sm gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
                <span>প্রোডাক্ট লোড হচ্ছে...</span>
              </div>
            ) : availableProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-sm p-6 text-center">
                <Package className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-foreground">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
                {searchTerm ? (
                  <p className="text-xs text-muted-foreground mt-1">"{searchTerm}" দিয়ে কোনো প্রোডাক্ট খুঁজে পাওয়া যায়নি। ফিল্টার পরিবর্তন করে দেখুন।</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">ক্যাটালগে কোনো অতিরিক্ত প্রোডাক্ট পাওয়া যায়নি।</p>
                )}
              </div>
            ) : (
              availableProducts.map((p) => {
                const isSelected = pairedProductIds.some((id) => String(id) === String(p.id));

                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleProduct(p.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                      isSelected
                        ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent/30"
                        : "border-border/70 bg-card hover:bg-secondary/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-lg border overflow-hidden bg-secondary/40 flex items-center justify-center shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {formatPrice(p.sale_price ?? p.regular_price)}
                          </span>
                          {p.sku && <span>• SKU: {p.sku}</span>}
                          {p.has_variants && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/40 text-accent font-semibold gap-0.5">
                              <Layers className="h-2.5 w-2.5" /> ভ্যারিয়েশন
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "bg-accent border-accent text-accent-foreground shadow-xs"
                          : "border-muted-foreground/30 bg-background hover:border-accent/60"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t bg-card/95 backdrop-blur-sm flex items-center justify-between shrink-0 gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                {pairedProductIds.length}টি প্রোডাক্ট নির্বাচিত
              </Badge>
              {pairedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-xs text-muted-foreground hover:text-destructive underline decoration-dotted transition-colors"
                >
                  সব বাতিল করুন
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-6 h-10 rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer active:scale-95"
            >
              সম্পন্ন করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
