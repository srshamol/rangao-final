import { createContext, useContext, useState, type ReactNode } from "react";
import { type Product } from "@/data/products";

interface CompareContextType {
  items: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Product[]>([]);

  const addToCompare = (product: Product) => {
    setItems((prev) => {
      if (prev.length >= 3) return prev;
      if (prev.find((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const removeFromCompare = (productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearCompare = () => setItems([]);

  const isInCompare = (productId: string) => items.some((p) => p.id === productId);

  return (
    <CompareContext.Provider value={{ items, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  );
};
