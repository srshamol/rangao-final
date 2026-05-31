import { useCompare } from "@/context/CompareContext";
import { Button } from "@/components/ui/button";
import { X, GitCompareArrows } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const CompareBar = () => {
  const { items, removeFromCompare, clearCompare } = useCompare();
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 shadow-premium-lg backdrop-blur-xl"
      >
        <div className="container flex items-center gap-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <GitCompareArrows className="h-5 w-5 text-accent" />
            <span className="hidden font-bengali sm:inline">তুলনা করুন ({items.length}/৩)</span>
          </div>

          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {items.map((product) => (
              <div key={product.id} className="relative flex shrink-0 items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
                <img src={product.images[0]} alt={product.name} className="h-8 w-8 rounded object-cover" />
                <span className="max-w-[120px] text-xs font-medium text-card-foreground line-clamp-1">{product.name}</span>
                <button
                  onClick={() => removeFromCompare(product.id)}
                  className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompare}
              className="rounded-lg text-xs"
            >
              ক্লিয়ার
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/compare")}
              disabled={items.length < 2}
              className="rounded-lg bg-accent text-xs font-bold text-accent-foreground hover:bg-accent/90"
            >
              <GitCompareArrows className="mr-1.5 h-4 w-4" />
              তুলনা দেখুন
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompareBar;
