import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  if (!text) return "";
  
  const textStr = text.toString().toLowerCase().trim();
  
  // Transliteration map for Bengali category slugs/names to English
  const transliteMap: Record<string, string> = {
    "উডেন-ডেকোর-আইটেম": "wooden-decor",
    "উডেন ডেকোর আইটেম": "wooden-decor",
    "উডেন-ডেকোর": "wooden-decor",
    "এক্রেলিক-ডেকোর-আইটেম": "acrylic-decor",
    "এক্রেলিক ডেকোর আইটেম": "acrylic-decor",
    "এক্রেলিক-ডেকোর": "acrylic-decor",
    "3d-বর্ডার-ওয়াল-ক্যানভাস": "3d-border-wall-canvas",
    "3d বর্ডার ওয়াল ক্যানভাস": "3d-border-wall-canvas",
    "দোয়া-স্টিকার": "dua-stickers",
    "দোয়া স্টিকার": "dua-stickers",
    "ডেকোরেটিভ-লাইটস": "decorative-lights",
    "ডেকোরেটিভ লাইটস": "decorative-lights",
    "ইসলামিক-এক্সাসরিজ": "islamic-accessories",
    "ইসলামিক এক্সাসরিজ": "islamic-accessories",
    "গ্লাস-ফ্রেম": "glass-frames",
    "গ্লাস ফ্রেম": "glass-frames",
  };

  const key = textStr.replace(/\s+/g, "-");
  if (transliteMap[key]) {
    return transliteMap[key];
  }

  return textStr
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^a-z0-9-]/g, "") // Keep only English alphanumeric and hyphens
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Trim hyphens from start
    .replace(/-+$/, ""); // Trim hyphens from end
}

export function getProductUrl(product: { id: string; name: string; category?: string }) {
  const categorySlug = product.category ? slugify(product.category) : "";
  const nameSlug = slugify(product.name);
  if (categorySlug && nameSlug) {
    return `/${categorySlug}/${nameSlug}`;
  }
  return `/product/${product.id}`;
}
