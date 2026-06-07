export interface OrganizationSchema {
  "@context": "https://schema.org";
  "@type": "Organization";
  "name": string;
  "alternateName"?: string;
  "url": string;
  "logo": string;
  "contactPoint": {
    "@type": "ContactPoint";
    "contactType": string;
    "telephone"?: string;
    "availableLanguage": string | string[];
  };
  "address": {
    "@type": "PostalAddress";
    "addressCountry": string;
  };
}

export interface ProductSchema {
  "@context": "https://schema.org";
  "@type": "Product";
  "name": string;
  "description": string;
  "image": string[];
  "sku": string;
  "brand": {
    "@type": "Brand";
    "name": string;
  };
  "offers": {
    "@type": "Offer";
    "url": string;
    "priceCurrency": string;
    "price": number;
    "priceValidUntil": string;
    "availability": "https://schema.org/InStock" | "https://schema.org/OutOfStock";
    "seller": {
      "@type": "Organization";
      "name": string;
    };
    "shippingDetails": {
      "@type": "OfferShippingDetails";
      "shippingRate": {
        "@type": "MonetaryAmount";
        "value": number;
        "currency": string;
      };
      "deliveryTime": {
        "@type": "ShippingDeliveryTime";
        "handlingTime": {
          "@type": "QuantitativeValue";
          "minValue": number;
          "maxValue": number;
          "unitCode": "DAY";
        };
        "transitTime": {
          "@type": "QuantitativeValue";
          "minValue": number;
          "maxValue": number;
          "unitCode": "DAY";
        };
      };
      "shippingDestination": {
        "@type": "DefinedRegion";
        "addressCountry": string;
      };
    };
  };
  "aggregateRating"?: {
    "@type": "AggregateRating";
    "ratingValue": number;
    "reviewCount": number;
  };
}

export interface BreadcrumbListSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  "itemListElement": {
    "@type": "ListItem";
    "position": number;
    "name": string;
    "item": string;
  }[];
}

export interface WebSiteSearchSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  "url": string;
  "potentialAction": {
    "@type": "SearchAction";
    "target": {
      "@type": "EntryPoint";
      "urlTemplate": string;
    };
    "query-input": string;
  };
}
