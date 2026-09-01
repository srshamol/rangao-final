export interface VariationOption {
  id: string;          // Unique ID for the option (e.g., "opt-1")
  name: string;        // e.g., "Size", "Frame", "Color"
  values: string[];    // e.g., ["15 × 21 inch", "18 × 24 inch", "24 × 36 inch"]
}

export interface ProductVariant {
  id: string;          // Unique variant ID (e.g., "var-1")
  title: string;       // e.g., "15 × 21 inch / Wooden Frame"
  options: Record<string, string>; // e.g., { "Size": "15 × 21 inch", "Frame": "Wooden Frame" }
  sku: string;         // Unique variant SKU (e.g. "RNG-1521-W")
  regular_price: number;
  sale_price: number | null;
  cost_price?: number | null;
  stock_quantity: number;
  is_active: boolean;
  image?: string | null;
  barcode?: string | null;
  weight?: string | null;
}

/**
 * Generate a short code from a string (e.g., "15 × 21 inch" -> "15X21", "Wooden Frame" -> "WOOD")
 */
export function getShortCode(str: string): string {
  if (!str) return "";
  const cleaned = str
    .replace(/[×xX]/g, "X")
    .replace(/inch|ইঞ্চি|Frame|ফ্রেম/gi, "")
    .trim();

  // If numbers with X (like 15X21)
  const numXMatch = cleaned.match(/\d+\s*X\s*\d+/i);
  if (numXMatch) {
    return numXMatch[0].replace(/\s+/g, "");
  }

  // Letters only: take first 3-4 chars uppercase
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words.map((w) => w[0]).join("").toUpperCase();
}

/**
 * Automatically generate a unique SKU for a variant based on base SKU and option values
 */
export function generateVariantSku(baseSku: string, options: Record<string, string>, index?: number): string {
  const prefix = baseSku?.trim() ? baseSku.trim().toUpperCase() : "RNG";
  const suffixParts = Object.values(options).map((val) => getShortCode(val)).filter(Boolean);
  const suffix = suffixParts.join("-");
  if (!suffix) {
    return `${prefix}-V${(index ?? 0) + 1}`;
  }
  return `${prefix}-${suffix}`;
}

/**
 * Generate Cartesian product of all variation options
 */
export function generateVariantCombinations(
  options: VariationOption[],
  baseProduct: {
    sku?: string;
    regular_price?: number;
    sale_price?: number | null;
    cost_price?: number | null;
    stock_quantity?: number;
    images?: string[];
  },
  existingVariants: ProductVariant[] = []
): ProductVariant[] {
  const activeOptions = options.filter((opt) => opt.name.trim() && opt.values.length > 0);
  if (activeOptions.length === 0) return [];

  // Helper to cartesian product
  const cartesian = (arrays: string[][]): string[][] => {
    return arrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]]
    );
  };

  const optionNames = activeOptions.map((opt) => opt.name.trim());
  const optionValues = activeOptions.map((opt) => opt.values.filter((v) => v.trim()));

  const combinations = cartesian(optionValues);

  return combinations.map((combo, idx) => {
    const record: Record<string, string> = {};
    optionNames.forEach((name, i) => {
      record[name] = combo[i];
    });

    const title = combo.join(" / ");

    // 1. Check exact combination match
    const exactMatch = existingVariants.find((v) => {
      const vKeys = Object.keys(v.options || {});
      const rKeys = Object.keys(record);
      return (
        vKeys.length === rKeys.length &&
        rKeys.every((k) => v.options?.[k] === record[k])
      );
    });

    if (exactMatch) {
      return {
        ...exactMatch,
        title,
        options: record,
      };
    }

    // 2. Check subset match (inherited customizations if options were expanded)
    const subsetMatch = existingVariants.find((v) => {
      const vKeys = Object.keys(v.options || {});
      return (
        vKeys.length > 0 &&
        vKeys.every((k) => v.options?.[k] === record[k])
      );
    });

    if (subsetMatch) {
      const newId = `var-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      const sku = generateVariantSku(baseProduct.sku || "RNG", record, idx);
      return {
        ...subsetMatch,
        id: newId,
        title,
        options: record,
        sku,
      };
    }

    const newId = `var-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
    const sku = generateVariantSku(baseProduct.sku || "RNG", record, idx);

    return {
      id: newId,
      title,
      options: record,
      sku,
      regular_price: baseProduct.regular_price || 0,
      sale_price: baseProduct.sale_price ?? null,
      cost_price: baseProduct.cost_price ?? null,
      stock_quantity: baseProduct.stock_quantity || 0,
      is_active: true,
      image: baseProduct.images?.[0] || null,
      barcode: null,
      weight: null,
    };
  });
}

/**
 * Smart Variant Availability Checker
 * Determines whether an option value is valid / in stock given other currently selected options.
 */
export function checkOptionValueAvailability(
  optionName: string,
  optionValue: string,
  currentSelections: Record<string, string>,
  allVariants: ProductVariant[]
): { isAvailable: boolean; isOutOfStock: boolean; matchingVariant?: ProductVariant } {
  // If no variants defined
  if (!allVariants || allVariants.length === 0) {
    return { isAvailable: true, isOutOfStock: false };
  }

  // Hypothesis: Current selections + this option value
  const testSelections = { ...currentSelections, [optionName]: optionValue };

  // Find all variants that match this value and all other already-selected values
  const matchingVariants = allVariants.filter((variant) => {
    if (!variant.is_active) return false;
    for (const [key, val] of Object.entries(testSelections)) {
      if (val && variant.options[key] !== val) {
        return false;
      }
    }
    return true;
  });

  if (matchingVariants.length === 0) {
    // No variant combination exists for this combination
    return { isAvailable: false, isOutOfStock: true };
  }

  // Check if any matching variant has stock > 0
  const hasInStock = matchingVariants.some((v) => v.stock_quantity > 0);

  // Exact single match if all options are covered
  const exactMatch = matchingVariants.length === 1 ? matchingVariants[0] : undefined;

  return {
    isAvailable: true,
    isOutOfStock: !hasInStock,
    matchingVariant: exactMatch,
  };
}

/**
 * Helper to find the specific variant matching all selected options
 */
export function findMatchingVariant(
  selectedOptions: Record<string, string>,
  options: VariationOption[],
  variants: ProductVariant[]
): ProductVariant | null {
  if (!variants || variants.length === 0) return null;
  const activeOptions = options.filter((opt) => opt.name.trim() && opt.values.length > 0);

  // Ensure all active options have been selected
  const allSelected = activeOptions.every((opt) => Boolean(selectedOptions[opt.name.trim()]));
  if (!allSelected) return null;

  return (
    variants.find((v) => {
      return Object.entries(v.options).every(([key, val]) => selectedOptions[key] === val);
    }) || null
  );
}
