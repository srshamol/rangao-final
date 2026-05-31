import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, Grid3X3, List, Star, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useParams, useSearchParams } from "react-router-dom";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "name";
type ViewMode = "grid" | "list";

const Products = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const activeCategory = slug || categoryParam;

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (activeCategory) {
      setSelectedCategories([activeCategory]);
    } else {
      setSelectedCategories([]);
    }
  }, [activeCategory]);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Load Categories dynamically from Supabase
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    }
  });

  // Load Products dynamically from Supabase
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("status", "active");
      return data || [];
    }
  });

  const maxPrice = useMemo(() => {
    if (!products.length) return 5000;
    return Math.max(...products.map((p) => p.sale_price ?? p.regular_price));
  }, [products]);

  // Set the max price as initial price range once loaded
  useMemo(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  };

  // Build category hierarchy dynamically
  const categoryTree = useMemo(() => {
    const parentCats = categories.filter((c) => !c.parent_id);
    return parentCats.map((parent) => {
      const children = categories.filter((c) => c.parent_id === parent.id);
      return {
        ...parent,
        children,
      };
    });
  }, [categories]);

  // Dynamic Product Counts per category (including sub-categories)
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products].filter((p) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
      const price = p.sale_price ?? p.regular_price;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if ((p.rating || 0) < minRating) return false;
      return true;
    });
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => (a.sale_price ?? a.regular_price) - (b.sale_price ?? b.regular_price));
        break;
      case "price-desc":
        result.sort((a, b) => (b.sale_price ?? b.regular_price) - (a.sale_price ?? a.regular_price));
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return result;
  }, [products, selectedCategories, priceRange, minRating, sortBy]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setMinRating(0);
    setSortBy("default");
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories Multi-level Hierarchy */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground">ক্যাটাগরি</h3>
        <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
          {categoryTree.map((parent) => {
            const parentCount = productCounts[parent.slug] || 0;
            return (
              <div key={parent.id} className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                  <Checkbox
                    checked={selectedCategories.includes(parent.slug)}
                    onCheckedChange={() => toggleCategory(parent.slug)}
                  />
                  <span>{parent.name}</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">
                    {parentCount}
                  </span>
                </label>

                {parent.children.length > 0 && (
                  <div className="pl-4 border-l border-border/60 ml-2 space-y-1.5">
                    {parent.children.map((child) => {
                      const childCount = productCounts[child.slug] || 0;
                      return (
                        <label key={child.id} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          <Checkbox
                            checked={selectedCategories.includes(child.slug)}
                            onCheckedChange={() => toggleCategory(child.slug)}
                            className="scale-90"
                          />
                          <span>{child.name}</span>
                          <span className="text-[9px] bg-secondary/60 text-muted-foreground/80 px-1 py-0.2 rounded-full ml-auto">
                            {childCount}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground">কোনো ক্যাটাগরি নেই</p>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground">মূল্য পরিসীমা</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={maxPrice}
          step={50}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>৳{priceRange[0]}</span>
          <span>৳{priceRange[1]}</span>
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground">রেটিং</h3>
        {[4, 3, 2, 1].map((r) => (
          <button
            key={r}
            onClick={() => setMinRating(minRating === r ? 0 : r)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors w-full ${
              minRating === r ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < r ? "fill-accent text-accent" : "text-border"}`} />
            ))}
            <span className="ml-1">ও তার বেশি</span>
          </button>
        ))}
      </div>

      <Button variant="outline" onClick={clearFilters} className="w-full rounded-xl text-sm">
        <X className="mr-1.5 h-4 w-4" /> ফিল্টার রিসেট
      </Button>
    </div>
  );

  const activeCategoryData = useMemo(() => {
    if (!activeCategory) return null;
    return categories.find(c => c.slug === activeCategory);
  }, [activeCategory, categories]);

  const pageTitle = activeCategoryData ? activeCategoryData.name : "সমস্ত প্রোডাক্ট";

  const isPageLoading = categoriesLoading || productsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8 md:py-12">
        <div className="container">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">{pageTitle}</h1>
            <p className="mt-2 font-bengali text-sm text-muted-foreground">
              {isPageLoading ? "লোড হচ্ছে..." : `${filteredProducts.length}টি প্রোডাক্ট পাওয়া গেছে`}
            </p>
          </div>

          {isPageLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">প্রোডাক্ট ও ফিল্টার লোড হচ্ছে...</p>
            </div>
          ) : (
            <div className="flex gap-8">
              {/* Desktop Filter Sidebar */}
              <aside className="hidden w-64 shrink-0 lg:block">
                <div className="sticky top-24 rounded-2xl border bg-card p-5">
                  <h2 className="mb-4 font-display text-base font-bold text-card-foreground">ফিল্টার</h2>
                  <FilterContent />
                </div>
              </aside>

              {/* Main Content */}
              <div className="flex-1">
                {/* Toolbar */}
                <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* Mobile filter trigger */}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-lg lg:hidden">
                          <SlidersHorizontal className="mr-1.5 h-4 w-4" /> ফিল্টার
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80">
                        <SheetHeader>
                          <SheetTitle className="font-display font-bold">ফিল্টার</SheetTitle>
                        </SheetHeader>
                        <div className="mt-6">
                          <FilterContent />
                        </div>
                      </SheetContent>
                    </Sheet>

                    {/* Sort */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="default">ডিফল্ট</option>
                      <option value="price-asc">দাম: কম → বেশি</option>
                      <option value="price-desc">দাম: বেশি → কম</option>
                      <option value="rating">জনপ্রিয়তা</option>
                      <option value="name">নাম</option>
                    </select>
                  </div>

                  <div className="hidden items-center gap-1 sm:flex">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`rounded-lg p-2 ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="font-bengali text-lg text-muted-foreground">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
                    <Button variant="outline" onClick={clearFilters} className="mt-4 rounded-xl">ফিল্টার রিসেট করুন</Button>
                  </div>
                ) : (
                  <div className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                      : "space-y-4"
                  }>
                    {filteredProducts.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Products;
