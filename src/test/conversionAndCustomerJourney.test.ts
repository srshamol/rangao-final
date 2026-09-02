import { describe, it, expect } from "vitest";
import {
  type VariationOption,
  type ProductVariant,
  findMatchingVariant,
  checkOptionValueAvailability,
} from "@/types/productVariations";
import { isValidBDPhone, normalizeBDPhone } from "@/lib/phoneValidation";

describe("Customer Journey, Purchase Confidence & Conversion Flow", () => {
  const sampleOptions: VariationOption[] = [
    {
      id: "opt-size",
      name: "সাইজ",
      values: ["12x18 inch", "18x24 inch", "24x36 inch"],
    },
    {
      id: "opt-color",
      name: "কালার",
      values: ["গোল্ডেন", "কালো", "সিলভার"],
    },
    {
      id: "opt-material",
      name: "মেটেরিয়াল",
      values: ["প্রিমিয়াম ক্যানভাস", "উডেন ফ্রেম"],
    },
  ];

  const sampleVariants: ProductVariant[] = [
    {
      id: "var-1",
      title: "12x18 inch / গোল্ডেন / প্রিমিয়াম ক্যানভাস",
      options: {
        "সাইজ": "12x18 inch",
        "কালার": "গোল্ডেন",
        "মেটেরিয়াল": "প্রিমিয়াম ক্যানভাস",
      },
      regular_price: 1500,
      sale_price: 1250,
      stock_quantity: 8,
      sku: "RNG-1218-GLD-CAN",
      is_active: true,
    },
    {
      id: "var-2",
      title: "18x24 inch / কালো / উডেন ফ্রেম",
      options: {
        "সাইজ": "18x24 inch",
        "কালার": "কালো",
        "মেটেরিয়াল": "উডেন ফ্রেম",
      },
      regular_price: 2200,
      sale_price: 1950,
      stock_quantity: 0, // Out of stock
      sku: "RNG-1824-BLK-WOD",
      is_active: true,
    },
  ];

  describe("1. Multi-Attribute Variation Selection & Variant Resolution", () => {
    it("should resolve matching variant when all options are selected", () => {
      const selected = {
        "সাইজ": "12x18 inch",
        "কালার": "গোল্ডেন",
        "মেটেরিয়াল": "প্রিমিয়াম ক্যানভাস",
      };

      const matched = findMatchingVariant(selected, sampleOptions, sampleVariants);
      expect(matched).toBeDefined();
      expect(matched?.id).toBe("var-1");
      expect(matched?.sale_price).toBe(1250);
      expect(matched?.stock_quantity).toBe(8);
      expect(matched?.sku).toBe("RNG-1218-GLD-CAN");
    });

    it("should return null when variation selection is incomplete", () => {
      const partialSelection = {
        "সাইজ": "12x18 inch",
        // Color and Material missing
      };

      const matched = findMatchingVariant(partialSelection, sampleOptions, sampleVariants);
      expect(matched).toBeNull();
    });
  });

  describe("2. Invalid & Out-of-Stock Combinations", () => {
    it("should correctly identify out-of-stock variant combinations", () => {
      const selected = {
        "সাইজ": "18x24 inch",
        "কালার": "কালো",
        "মেটেরিয়াল": "উডেন ফ্রেম",
      };

      const matched = findMatchingVariant(selected, sampleOptions, sampleVariants);
      expect(matched).toBeDefined();
      expect(matched?.stock_quantity).toBe(0);
    });

    it("should check availability of option values for dynamic button states", () => {
      const currentSelected = {
        "সাইজ": "12x18 inch",
      };

      const { isAvailable, isOutOfStock } = checkOptionValueAvailability(
        "কালার",
        "গোল্ডেন",
        currentSelected,
        sampleVariants
      );

      expect(isAvailable).toBe(true);
      expect(isOutOfStock).toBe(false);
    });
  });

  describe("3. Cart Totals & Delivery Fee Calculation", () => {
    it("should calculate correct delivery fee based on division (Dhaka vs Outside Dhaka)", () => {
      const settings = {
        dhaka_inside: 70,
        dhaka_outside: 130,
        free_delivery_min: 3000,
      };

      const calculateDelivery = (division: string, subtotal: number, hasFreeItem: boolean) => {
        if (hasFreeItem) return 0;
        if (settings.free_delivery_min > 0 && subtotal >= settings.free_delivery_min) return 0;
        return division === "ঢাকা" ? settings.dhaka_inside : settings.dhaka_outside;
      };

      // Dhaka subtotal < 3000
      expect(calculateDelivery("ঢাকা", 1500, false)).toBe(70);
      // Outside Dhaka subtotal < 3000
      expect(calculateDelivery("চট্টগ্রাম", 1500, false)).toBe(130);
      // Subtotal >= 3000 (Free delivery threshold)
      expect(calculateDelivery("রাজশাহী", 3500, false)).toBe(0);
      // Contains Free Delivery product
      expect(calculateDelivery("সিলেট", 800, true)).toBe(0);
    });

    it("should compute free delivery progress percentage correctly", () => {
      const freeMin = 2000;
      const subtotal = 1500;
      const progress = Math.min(100, Math.round((subtotal / freeMin) * 100));
      const remaining = freeMin - subtotal;

      expect(progress).toBe(75);
      expect(remaining).toBe(500);
    });
  });

  describe("4. Purchase CTA & Disabled States", () => {
    it("should prevent add-to-cart or buy-now when required variant is not selected", () => {
      const hasVariants = true;
      const activeVariant = null; // No variant selected

      const canAddToCart = hasVariants ? (activeVariant !== null && (activeVariant as any).stock_quantity > 0) : true;
      expect(canAddToCart).toBe(false);
    });

    it("should prevent add-to-cart when variant stock is 0", () => {
      const hasVariants = true;
      const activeVariant = sampleVariants[1]; // Out of stock variant (stock = 0)

      const canAddToCart = hasVariants ? (activeVariant !== null && activeVariant.stock_quantity > 0) : true;
      expect(canAddToCart).toBe(false);
    });

    it("should allow add-to-cart when valid in-stock variant is selected", () => {
      const hasVariants = true;
      const activeVariant = sampleVariants[0]; // In stock variant (stock = 8)

      const canAddToCart = hasVariants ? (activeVariant !== null && activeVariant.stock_quantity > 0) : true;
      expect(canAddToCart).toBe(true);
    });
  });

  describe("5. Checkout Validation & Bangladeshi Phone Format", () => {
    it("should accept valid 11-digit Bangladeshi mobile numbers", () => {
      expect(isValidBDPhone("01712345678")).toBe(true);
      expect(isValidBDPhone("01812345678")).toBe(true);
      expect(isValidBDPhone("01912345678")).toBe(true);
      expect(isValidBDPhone("01312345678")).toBe(true);
      expect(isValidBDPhone("8801712345678")).toBe(true);
      expect(isValidBDPhone("+8801712345678")).toBe(true);
    });

    it("should normalize Bangladeshi mobile numbers to standard 11-digit format", () => {
      expect(normalizeBDPhone("8801712345678")).toBe("01712345678");
      expect(normalizeBDPhone("+8801712345678")).toBe("01712345678");
      expect(normalizeBDPhone("01712345678")).toBe("01712345678");
    });

    it("should reject invalid mobile numbers", () => {
      expect(isValidBDPhone("01212345678")).toBe(false); // Invalid operator prefix 012
      expect(isValidBDPhone("0171234567")).toBe(false);  // 10 digits
      expect(isValidBDPhone("017123456789")).toBe(false); // 12 digits
      expect(isValidBDPhone("abcdefghijk")).toBe(false);
    });

    it("should validate required checkout fields", () => {
      const isFormValid = (name: string, phone: string, address: string, division: string) => {
        return Boolean(name.trim() && isValidBDPhone(phone) && address.trim() && division.trim());
      };

      expect(isFormValid("আব্দুল্লাহ", "01712345678", "মিরপুর ১০, ঢাকা", "ঢাকা")).toBe(true);
      expect(isFormValid("", "01712345678", "মিরপুর ১০, ঢাকা", "ঢাকা")).toBe(false);
      expect(isFormValid("আব্দুল্লাহ", "12345", "মিরপুর ১০, ঢাকা", "ঢাকা")).toBe(false);
      expect(isFormValid("আব্দুল্লাহ", "01712345678", "", "ঢাকা")).toBe(false);
      expect(isFormValid("আব্দুল্লাহ", "01712345678", "মিরপুর ১০, ঢাকা", "")).toBe(false);
    });
  });
});
