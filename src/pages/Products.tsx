import { useState, useMemo } from "react";
import { products, categories, formatPrice, type Category } from "@/data/products";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, Grid3X3, List, Star, X } from "lucide-react";
import { motion } from "framer-motion";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "name";
type ViewMode = "grid" | "list";

const maxPrice = Math.max(...products.map((p) => p.price));

const Products = () => {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [priceRange, setPriceRange] = useState([0, maxPrice]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (p.rating < minRating) return false;
      return true;
    });
    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => b.rating - a.rating); break;
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return result;
  }, [selectedCategories, priceRange, minRating, sortBy]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setMinRating(0);
    setSortBy("default");
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground">ক্যাটাগরি</h3>
        {categories.map((cat) => (
          <label key={cat.id} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={selectedCategories.includes(cat.id)}
              onCheckedChange={() => toggleCategory(cat.id)}
            />
            {cat.name}
          </label>
        ))}
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground">মূল্য পরিসীমা</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={maxPrice}
          step={500}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatPrice(priceRange[0])}</span>
          <span>{formatPrice(priceRange[1])}</span>
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground">রেটিং</h3>
        {[4, 3, 2, 1].map((r) => (
          <button
            key={r}
            onClick={() => setMinRating(minRating === r ? 0 : r)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors ${
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8 md:py-12">
        <div className="container">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">সমস্ত প্রোডাক্ট</h1>
            <p className="mt-2 font-bengali text-sm text-muted-foreground">{filteredProducts.length}টি প্রোডাক্ট পাওয়া গেছে</p>
          </div>

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
                    ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                    : "space-y-4"
                }>
                  {filteredProducts.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Products;
