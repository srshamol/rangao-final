import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProductUrl } from "@/lib/utils";
import { analytics } from "@/services/analytics";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  categories: any[];
}

const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const parts = query.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return <>{text}</>;
  
  const regex = new RegExp(`(${parts.map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`, 'gi');
  const textParts = text.split(regex);
  
  return (
    <>
      {textParts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-accent/20 text-accent font-bold rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const MobileSearch = ({ isOpen, onClose, products, categories }: Props) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (query.trim().length <= 1) return [];
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const sDesc = (p.short_description || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      const tags = (p.tags || []).map((t: string) => t.toLowerCase());
      return searchTerms.every(term => 
        name.includes(term) || desc.includes(term) || sDesc.includes(term) || cat.includes(term) || tags.some((t: string) => t.includes(term))
      );
    });
  }, [query, products]);

  const categorySuggestions = useMemo(() => {
    if (query.trim().length <= 1) return [];
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return categories.filter((c) => {
      const name = c.name.toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return searchTerms.every(term => 
        name.includes(term) || desc.includes(term)
      );
    });
  }, [query, categories]);

  const handleSelectProduct = (product: any) => {
    setQuery("");
    onClose();
    navigate(getProductUrl(product));
  };

  const handleSelectCategory = (slug: string) => {
    setQuery("");
    onClose();
    navigate(`/category/${slug}`);
  };

  const handleSearchSubmit = () => {
    if (query.trim().length > 0) {
      analytics.search(query.trim());
      onClose();
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "-100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-100%" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[1200] flex flex-col bg-background lg:hidden"
        >
          {/* Top Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit();
            }}
            className="flex h-16 items-center gap-3 border-b border-border/40 px-4 py-2 shadow-sm bg-gradient-to-r from-secondary/30 to-background"
          >
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="প্রোডাক্ট বা কালেকশন সার্চ করুন..."
              className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-0"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="p-1 rounded-full hover:bg-secondary text-muted-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-primary hover:text-white"
            >
              বন্ধ করুন
            </button>
          </form>

          {/* Search Scroll Content */}
          <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-none">
            {/* Initial suggestions if no input */}
            {query.trim().length <= 1 && (
              <div className="space-y-4">
                <div>
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">জনপ্রিয় ক্যাটাগরি</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categories.slice(0, 5).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.slug)}
                        className="rounded-full bg-secondary/80 px-4 py-2 text-xs font-semibold text-foreground/80 hover:bg-accent hover:text-white transition-colors"
                      >
                        🕌 {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fuzzy Query Results */}
            {query.trim().length > 1 && (
              <div className="space-y-6">
                
                {/* Section: Category matches */}
                {categorySuggestions.length > 0 && (
                  <div>
                    <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">মিল থাকা ক্যাটাগরি</p>
                    <div className="grid grid-cols-2 gap-2">
                      {categorySuggestions.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleSelectCategory(cat.slug)}
                          className="flex items-center gap-2.5 rounded-xl border bg-card p-3 text-left hover:border-accent/40"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent font-semibold text-[10px]">🕌</span>
                          <span className="text-xs font-bold text-card-foreground truncate">
                            <Highlight text={cat.name} query={query} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Product matches */}
                {searchResults.length > 0 && (
                  <div>
                    <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">মিল থাকা প্রোডাক্টস</p>
                    <div className="divide-y divide-border/40 rounded-2xl border bg-card">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="flex w-full items-center gap-3.5 p-3 text-left hover:bg-secondary/40"
                        >
                          <img
                            src={p.images?.[0] || ""}
                            alt={p.name}
                            className="h-11 w-11 shrink-0 rounded-lg object-cover bg-secondary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-card-foreground truncate">
                              <Highlight text={p.name} query={query} />
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{p.short_description || p.description}</p>
                          </div>
                          <span className="shrink-0 text-xs font-extrabold text-accent">৳{(p.sale_price ?? p.regular_price).toLocaleString("bn-BD")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results match */}
                {searchResults.length === 0 && categorySuggestions.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-sm font-semibold text-muted-foreground">কোনো প্রোডাক্ট বা ক্যাটাগরি খুঁজে পাওয়া যায়নি।</p>
                  </div>
                )}

              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileSearch;
