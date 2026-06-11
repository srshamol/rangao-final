import { useMemo } from "react";
import type { ProductSchema } from "@/types/schema";
import { getProductUrl } from "@/lib/utils";

export interface SchemaProductInput {
  id: string;
  name: string;
  description: string;
  images: string[];
  sku: string;
  price: number;
  stock: number;
  rating: number;
  reviewCount: number;
  category: string;
}

export function useProductSchema(product: SchemaProductInput | null): ProductSchema | null {
  return useMemo(() => {
    if (!product) return null;

    const nextYear = new Date().getFullYear() + 1;
    const priceValidUntil = `${nextYear}-12-31`;

    const productUrl = `${window.location.origin}${getProductUrl(product)}`;

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description || "রাঙাও প্রিমিয়াম ইসলামিক ও হোম ডেকোর প্রোডাক্ট।",
      "image": product.images || [],
      "sku": product.sku || product.id,
      "brand": {
        "@type": "Brand",
        "name": "Rangao"
      },
      "offers": {
        "@type": "Offer",
        "url": productUrl,
        "priceCurrency": "BDT",
        "price": product.price,
        "priceValidUntil": priceValidUntil,
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Rangao"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": 80,
            "currency": "BDT"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 2,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 2,
              "maxValue": 5,
              "unitCode": "DAY"
            }
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "BD"
          }
        }
      },
      ...(product.reviewCount > 0 ? {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": product.rating,
          "reviewCount": product.reviewCount
        }
      } : {})
    };
  }, [product]);
}
