import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Product, type ProductVariant } from "@/data/products";
import { trackAddToCart } from "@/lib/tracking";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
  variantId?: string;
  variantTitle?: string;
  variantOptions?: Record<string, string>;
}

export function getCartItemKey(item: { product: { id: string }; selectedVariant?: { id: string } | null; variantId?: string }): string {
  const vId = item.selectedVariant?.id || item.variantId;
  return vId ? `${item.product.id}_${vId}` : item.product.id;
}

export function getCartItemUnitPrice(item: CartItem): number {
  if (item.selectedVariant) {
    return item.selectedVariant.sale_price ?? item.selectedVariant.regular_price;
  }
  return item.product.price;
}

export function getCartItemStock(item: CartItem): number {
  if (item.selectedVariant) {
    return item.selectedVariant.stock_quantity;
  }
  return item.product.stock;
}

export function getCartItemImage(item: CartItem): string {
  return item.selectedVariant?.image || item.product.images[0] || "";
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedVariant?: ProductVariant) => void;
  removeFromCart: (keyOrProductId: string) => void;
  updateQuantity: (keyOrProductId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("rangao-cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("rangao-cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity = 1, selectedVariant?: ProductVariant) => {
    const targetKey = selectedVariant ? `${product.id}_${selectedVariant.id}` : product.id;
    const maxStock = selectedVariant ? selectedVariant.stock_quantity : product.stock;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => getCartItemKey(i) === targetKey);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = maxStock === 0
          ? existing.quantity + quantity
          : Math.min(existing.quantity + quantity, maxStock);
        const updated = [...prev];
        updated[existingIndex] = { ...existing, quantity: newQty };
        return updated;
      }
      const newQty = maxStock === 0 ? quantity : Math.min(quantity, maxStock);
      return [
        ...prev,
        {
          product,
          quantity: newQty,
          selectedVariant,
          variantId: selectedVariant?.id,
          variantTitle: selectedVariant?.title,
          variantOptions: selectedVariant?.options,
        },
      ];
    });
    setIsOpen(true);
    
    const price = selectedVariant
      ? (selectedVariant.sale_price ?? selectedVariant.regular_price)
      : product.price;
    const itemName = selectedVariant ? `${product.name} (${selectedVariant.title})` : product.name;

    trackAddToCart(
      {
        id: targetKey,
        name: itemName,
        category: product.category,
        price,
      },
      quantity
    );
  };

  const removeFromCart = (keyOrProductId: string) => {
    setItems((prev) => prev.filter((i) => getCartItemKey(i) !== keyOrProductId && i.product.id !== keyOrProductId));
  };

  const updateQuantity = (keyOrProductId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(keyOrProductId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (getCartItemKey(i) === keyOrProductId || i.product.id === keyOrProductId) {
          const maxStock = getCartItemStock(i);
          return {
            ...i,
            quantity: maxStock === 0 ? quantity : Math.min(quantity, maxStock),
          };
        }
        return i;
      })
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + getCartItemUnitPrice(i) * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, subtotal, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
};

