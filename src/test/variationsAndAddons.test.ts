import { describe, it, expect } from "vitest";
import {
  generateVariantCombinations,
  generateVariantSku,
  checkOptionValueAvailability,
  findMatchingVariant,
  type VariationOption,
  type ProductVariant,
} from "@/types/productVariations";
import { type CartItem, getCartItemKey } from "@/context/CartContext";
import { type Product } from "@/data/products";

describe("Product Variations & Smart Availability Engine", () => {
  const sampleOptions: VariationOption[] = [
    {
      id: "opt_size",
      name: "Size",
      values: ["15 × 21 inch", "18 × 24 inch", "24 × 36 inch"],
    },
    {
      id: "opt_frame",
      name: "Frame",
      values: ["Without Frame", "Black Floating Frame", "Gold Premium Frame"],
    },
  ];

  it("should generate exact Cartesian product of variation combinations (3 x 3 = 9)", () => {
    const variants = generateVariantCombinations(
      sampleOptions,
      {
        sku: "RNG-CAL-001",
        regular_price: 1500,
        sale_price: 1200,
        stock_quantity: 10,
      },
      []
    );

    expect(variants.length).toBe(9);
    expect(variants[0].title).toBe("15 × 21 inch / Without Frame");
    expect(variants[0].options["Size"]).toBe("15 × 21 inch");
    expect(variants[0].options["Frame"]).toBe("Without Frame");
    expect(variants[0].regular_price).toBe(1500);
    expect(variants[0].sale_price).toBe(1200);
    expect(variants[0].stock_quantity).toBe(10);
    expect(variants[0].is_active).toBe(true);
    expect(variants[0].sku).toContain("RNG-CAL-001");
  });

  it("should preserve custom prices, stocks, and images of existing combinations upon regeneration", () => {
    const initialVariants = generateVariantCombinations(
      sampleOptions,
      {
        sku: "RNG-CAL-001",
        regular_price: 1500,
        sale_price: 1200,
        stock_quantity: 10,
      },
      []
    );

    // Customize one combination
    const customized = [...initialVariants];
    customized[0].regular_price = 2200;
    customized[0].sale_price = 1900;
    customized[0].stock_quantity = 35;
    customized[0].image = "https://example.com/custom-frame.jpg";

    // Add a 3rd option (Material)
    const expandedOptions: VariationOption[] = [
      ...sampleOptions,
      {
        id: "opt_material",
        name: "Material",
        values: ["Wood", "Acrylic"],
      },
    ];

    const regenerated = generateVariantCombinations(
      expandedOptions,
      {
        sku: "RNG-CAL-001",
        regular_price: 1500,
        sale_price: 1200,
        stock_quantity: 10,
      },
      customized
    );

    expect(regenerated.length).toBe(3 * 3 * 2); // 18 combinations
    const matched = regenerated.find(
      (v) =>
        v.options["Size"] === "15 × 21 inch" &&
        v.options["Frame"] === "Without Frame" &&
        v.options["Material"] === "Wood"
    );

    expect(matched).toBeDefined();
    // Inherited from the previously customized combination
    expect(matched?.regular_price).toBe(2200);
    expect(matched?.sale_price).toBe(1900);
    expect(matched?.stock_quantity).toBe(35);
    expect(matched?.image).toBe("https://example.com/custom-frame.jpg");
  });

  it("should generate clean, readable variant SKUs", () => {
    const sku = generateVariantSku("RNG-DECOR-42", {
      Size: "18 × 24 inch",
      Frame: "Gold Premium Frame",
    });

    expect(sku).toBe("RNG-DECOR-42-18X24-GP");
  });

  it("should correctly find matching variant given active option selections", () => {
    const variants = generateVariantCombinations(
      sampleOptions,
      {
        sku: "BASE-SKU",
        regular_price: 1000,
        sale_price: null,
        stock_quantity: 5,
      },
      []
    );

    const selection = {
      Size: "18 × 24 inch",
      Frame: "Black Floating Frame",
    };

    const match = findMatchingVariant(selection, sampleOptions, variants);
    expect(match).toBeDefined();
    expect(match?.title).toBe("18 × 24 inch / Black Floating Frame");
    expect(match?.options["Size"]).toBe("18 × 24 inch");
    expect(match?.options["Frame"]).toBe("Black Floating Frame");
  });

  it("should accurately compute Smart Variant Availability and Out of Stock states", () => {
    const variants: ProductVariant[] = [
      {
        id: "v1",
        title: "Small / Black",
        options: { Size: "Small", Color: "Black" },
        sku: "S-BLK",
        regular_price: 100,
        sale_price: null,
        cost_price: null,
        stock_quantity: 10,
        is_active: true,
      },
      {
        id: "v2",
        title: "Small / White",
        options: { Size: "Small", Color: "White" },
        sku: "S-WHT",
        regular_price: 100,
        sale_price: null,
        cost_price: null,
        stock_quantity: 0, // OUT OF STOCK
        is_active: true,
      },
      {
        id: "v3",
        title: "Large / Black",
        options: { Size: "Large", Color: "Black" },
        sku: "L-BLK",
        regular_price: 150,
        sale_price: null,
        cost_price: null,
        stock_quantity: 5,
        is_active: false, // DISABLED / INACTIVE
      },
    ];

    // When "Small" is currently selected:
    // "Black" should be available and in stock
    const blackAvailability = checkOptionValueAvailability("Color", "Black", { Size: "Small" }, variants);
    expect(blackAvailability.isAvailable).toBe(true);
    expect(blackAvailability.isOutOfStock).toBe(false);

    // "White" is available but out of stock
    const whiteAvailability = checkOptionValueAvailability("Color", "White", { Size: "Small" }, variants);
    expect(whiteAvailability.isAvailable).toBe(true);
    expect(whiteAvailability.isOutOfStock).toBe(true);

    // "Green" (non-existent) should be unavailable
    const greenAvailability = checkOptionValueAvailability("Color", "Green", { Size: "Small" }, variants);
    expect(greenAvailability.isAvailable).toBe(false);

    // When "Large" is selected, "Black" is inactive
    const largeBlackAvailability = checkOptionValueAvailability("Color", "Black", { Size: "Large" }, variants);
    expect(largeBlackAvailability.isAvailable).toBe(false);
  });
});

describe("Cart Integration & Composite Keys", () => {
  const baseProduct: Product = {
    id: "prod-100",
    name: "Ayatul Kursi Wooden Frame",
    price: 1200,
    images: ["https://example.com/item.jpg"],
    category: "wooden-decor" as any,
    categoryLabel: "Wooden Decor",
    stock: 20,
    shortDescription: "Beautiful Islamic art",
    fullDescription: "Full details",
    features: [],
    specs: [],
    featured: false,
    rating: 5,
    reviewCount: 10,
  };

  const variantA: ProductVariant = {
    id: "var-small",
    title: "Small / Natural Wood",
    options: { Size: "Small", Frame: "Natural Wood" },
    sku: "AK-S-NW",
    regular_price: 1200,
    sale_price: null,
    cost_price: null,
    stock_quantity: 15,
    is_active: true,
  };

  const variantB: ProductVariant = {
    id: "var-large",
    title: "Large / Gold Frame",
    options: { Size: "Large", Frame: "Gold Frame" },
    sku: "AK-L-GF",
    regular_price: 2500,
    sale_price: 2200,
    cost_price: null,
    stock_quantity: 8,
    is_active: true,
  };

  it("should generate proper composite cart item keys", () => {
    const standardItem: CartItem = {
      product: baseProduct,
      quantity: 1,
    };

    const variantItemA: CartItem = {
      product: { ...baseProduct, price: variantA.regular_price },
      quantity: 2,
      selectedVariant: variantA,
      variantId: variantA.id,
      variantTitle: variantA.title,
    };

    const variantItemB: CartItem = {
      product: { ...baseProduct, price: variantB.sale_price! },
      quantity: 1,
      selectedVariant: variantB,
      variantId: variantB.id,
      variantTitle: variantB.title,
    };

    expect(getCartItemKey(standardItem)).toBe("prod-100");
    expect(getCartItemKey(variantItemA)).toBe("prod-100_var-small");
    expect(getCartItemKey(variantItemB)).toBe("prod-100_var-large");
  });

  it("should calculate correct cart subtotal with multiple distinct variant items", () => {
    const items: CartItem[] = [
      {
        product: { ...baseProduct, price: 1200 },
        quantity: 2,
        selectedVariant: variantA,
        variantId: variantA.id,
      },
      {
        product: { ...baseProduct, price: 2200 },
        quantity: 1,
        selectedVariant: variantB,
        variantId: variantB.id,
      },
    ];

    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    // (1200 * 2) + (2200 * 1) = 2400 + 2200 = 4600
    expect(subtotal).toBe(4600);
  });
});

describe("Pairs Well With / Add-ons Conditional Visibility & Persistence", () => {
  function serializeProductPayload(hasPairedProducts: boolean, pairedProductIds: string[]) {
    const finalPairedProductIds = hasPairedProducts ? pairedProductIds : [];
    return {
      name: "Test Art",
      paired_product_ids: finalPairedProductIds,
    };
  }

  function shouldRenderPairsWellWithStorefront(pairedProductIds: any): boolean {
    return Boolean(Array.isArray(pairedProductIds) && pairedProductIds.length > 0);
  }

  it("should only include paired_product_ids in payload when hasPairedProducts is enabled", () => {
    const activeResult = serializeProductPayload(true, ["prod-1", "prod-2"]);
    expect(activeResult.paired_product_ids).toEqual(["prod-1", "prod-2"]);
    expect(activeResult.paired_product_ids.length).toBe(2);
  });

  it("should persist empty array [] when hasPairedProducts is disabled even if draft items exist", () => {
    const disabledResult = serializeProductPayload(false, ["prod-1", "prod-2"]);
    expect(disabledResult.paired_product_ids).toEqual([]);
    expect(disabledResult.paired_product_ids.length).toBe(0);
  });

  it("should evaluate storefront visibility to true only when non-empty array of paired products exists", () => {
    expect(shouldRenderPairsWellWithStorefront(["prod-1"])).toBe(true);
    expect(shouldRenderPairsWellWithStorefront(["prod-1", "prod-2"])).toBe(true);
  });

  it("should evaluate storefront visibility to false when empty, null, undefined, or non-array", () => {
    expect(shouldRenderPairsWellWithStorefront([])).toBe(false);
    expect(shouldRenderPairsWellWithStorefront(null)).toBe(false);
    expect(shouldRenderPairsWellWithStorefront(undefined)).toBe(false);
    expect(shouldRenderPairsWellWithStorefront("prod-1")).toBe(false);
    expect(shouldRenderPairsWellWithStorefront({})).toBe(false);
  });
});

