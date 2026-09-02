import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveMetadata,
  injectMetadataIntoHtml,
  slugify,
  getCanonicalProductPath,
  type PageMetadata,
} from "../../api/server-meta";

// Mock Supabase client for api/server-meta
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => ({
      from: (table: string) => {
        if (table === "products") {
          return {
            select: () => ({
              eq: (field: string, val: any) => {
                if (field === "id" && val === "prod-uuid-1234-5678-90ab") {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: "prod-uuid-1234-5678-90ab",
                        name: "আয়াতুল কুরসী গোল্ডেন ফ্রেম",
                        sku: "ayatul-kursi-gold",
                        category: "উডেন ডেকোর",
                        price: 1850,
                        stock_quantity: 15,
                        status: "active",
                        images: ["https://www.rangao.bd/images/ayatul-kursi.jpg"],
                        short_description: "প্রিমিয়াম কোয়ালিটি আয়াতুল কুরসী ফ্রেম।",
                      },
                      error: null,
                    }),
                  };
                }
                if (field === "status" && val === "active") {
                  return {
                    data: [
                      {
                        id: "prod-uuid-1234-5678-90ab",
                        name: "আয়াতুল কুরসী গোল্ডেন ফ্রেম",
                        sku: "ayatul-kursi-gold",
                        category: "উডেন ডেকোর",
                        price: 1850,
                        stock_quantity: 15,
                        status: "active",
                        images: ["https://www.rangao.bd/images/ayatul-kursi.jpg"],
                        short_description: "প্রিমিয়াম কোয়ালিটি আয়াতুল কুরসী ফ্রেম।",
                      },
                      {
                        id: "prod-uuid-no-reviews",
                        name: "আল্লাহর নাম ক্যানভাস",
                        sku: "allah-canvas",
                        category: "3d বর্ডার ওয়াল ক্যানভাস",
                        price: 1200,
                        stock_quantity: 0, // out of stock
                        status: "active",
                        images: ["https://www.rangao.bd/images/allah-canvas.jpg"],
                        short_description: "সুন্দর ৩ডি ক্যানভাস।",
                      },
                    ],
                    error: null,
                  };
                }
                return { maybeSingle: async () => ({ data: null, error: null }), data: [] };
              },
            }),
          };
        }

        if (table === "categories") {
          return {
            select: () => ({
              eq: (field: string, val: any) => ({
                eq: (f2: string, v2: any) => {
                  if (val === "wooden-decor") {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          id: "cat-1",
                          name: "উডেন ডেকোর",
                          slug: "wooden-decor",
                          is_active: true,
                        },
                        error: null,
                      }),
                    };
                  }
                  return { maybeSingle: async () => ({ data: null, error: null }) };
                },
              }),
            }),
          };
        }

        if (table === "blog_posts") {
          return {
            select: () => ({
              eq: (field: string, val: any) => {
                if (field === "is_active") {
                  return {
                    data: [
                      {
                        id: "blog-1",
                        title: "ইসলামিক ক্যালিগ্রাফির তাৎপর্য ও সৌন্দর্য",
                        excerpt: "ইসলামিক ক্যালিগ্রাফি শিল্পের ইতিহাস ও আধুনিক গৃহসজ্জায় এর ভূমিকা।",
                        content: "বিস্তারিত কন্টেন্ট...",
                        image_url: "https://www.rangao.bd/images/blog1.jpg",
                        author: "Rangao Editorial",
                        created_at: "2026-08-15T10:00:00Z",
                        is_active: true,
                      },
                    ],
                    error: null,
                  };
                }
                return { maybeSingle: async () => ({ data: null, error: null }) };
              },
            }),
          };
        }

        if (table === "testimonials") {
          return {
            select: () => ({
              eq: (field: string, val: any) => ({
                eq: (f2: string, v2: any) => ({
                  eq: (f3: string, v3: any) => {
                    if (val === "prod-uuid-1234-5678-90ab") {
                      return {
                        data: [
                          { rating: 5, status: "approved", is_active: true },
                          { rating: 4, status: "approved", is_active: true },
                        ],
                      };
                    }
                    // For prod-uuid-no-reviews, return empty array
                    return { data: [] };
                  },
                }),
              }),
            }),
          };
        }

        if (table === "store_settings") {
          return {
            select: () => ({
              eq: (field: string, key: string) => {
                if (key === "store_info") {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        value: {
                          name: "Rangao",
                          website_url: "https://www.rangao.bd",
                          phone: "01700000000",
                          logo_url: "https://www.rangao.bd/brand/rangao-logo.png",
                        },
                      },
                    }),
                  };
                }
                if (key === "seo_settings") {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        value: {
                          site_title: "Rangao — প্রিমিয়াম ইসলামিক ও হোম ডেকোর",
                          site_description: "বাংলাদেশের সেরা প্রিমিয়াম ইসলামিক ওয়াল আর্ট ও কাঠের ডেকোর শপ।",
                          og_image: "https://www.rangao.bd/brand/rangao-og-default.png",
                        },
                      },
                    }),
                  };
                }
                if (key === "product_seo_prod-uuid-1234-5678-90ab") {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        value: {
                          seo_title: "কাস্টম গোল্ডেন আয়াতুল কুরসী ফ্রেম | Rangao",
                          seo_description: "প্রিমিয়াম উডেন ফ্রেমে আয়াতুল কুরসী।",
                          faqs: [
                            { question: "ফ্রেমের সাইজ কত?", answer: "১২x১৮ এবং ১৬x২৪ ইঞ্চি।" },
                          ],
                        },
                      },
                    }),
                  };
                }
                return { maybeSingle: async () => ({ data: null }) };
              },
            }),
          };
        }

        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null }), data: [] }),
          }),
        };
      },
    }),
  };
});

describe("Server-Rendered HTML Metadata & SEO Engine", () => {
  const mockBaseHtml = `<!doctype html>
<html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <title>Default Title</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

  // 1. Product metadata in the initial server response
  describe("1. Product metadata in the initial server response", () => {
    it("should resolve correct title, description, canonical URL, image, and pricing metadata for active product", async () => {
      const meta = await resolveMetadata("/wooden-decor/ayatul-kursi-gold");

      expect(meta.statusCode).toBe(200);
      expect(meta.title).toBe("কাস্টম গোল্ডেন আয়াতুল কুরসী ফ্রেম | Rangao");
      expect(meta.description).toBe("প্রিমিয়াম উডেন ফ্রেমে আয়াতুল কুরসী।");
      expect(meta.canonicalUrl).toBe("https://www.rangao.bd/wooden-decor/ayatul-kursi-gold");
      expect(meta.ogType).toBe("product");
      expect(meta.ogImage).toBe("https://www.rangao.bd/images/ayatul-kursi.jpg");
      expect(meta.price).toBe(1850);
      expect(meta.availability).toBe("in stock");
    });

    it("should inject metadata tags cleanly into the HTML head before client JavaScript runs", async () => {
      const meta = await resolveMetadata("/wooden-decor/ayatul-kursi-gold");
      const renderedHtml = injectMetadataIntoHtml(mockBaseHtml, meta);

      expect(renderedHtml).toContain("<title>কাস্টম গোল্ডেন আয়াতুল কুরসী ফ্রেম | Rangao</title>");
      expect(renderedHtml).toContain('<link rel="canonical" href="https://www.rangao.bd/wooden-decor/ayatul-kursi-gold" />');
      expect(renderedHtml).toContain('<meta property="product:price:amount" content="1850" />');
      expect(renderedHtml).toContain('<meta property="product:price:currency" content="BDT" />');
      expect(renderedHtml).toContain('<meta property="product:availability" content="in stock" />');
      expect(renderedHtml).toContain('<meta name="robots" content="index, follow" />');
    });
  });

  // 2. Open Graph metadata for social crawlers
  describe("2. Open Graph metadata for social crawlers", () => {
    it("should render full Open Graph and Twitter Card tags required by Facebook, WhatsApp, and Twitter crawlers", async () => {
      const meta = await resolveMetadata("/wooden-decor/ayatul-kursi-gold");
      const renderedHtml = injectMetadataIntoHtml(mockBaseHtml, meta);

      expect(renderedHtml).toContain('<meta property="og:title" content="কাস্টম গোল্ডেন আয়াতুল কুরসী ফ্রেম | Rangao" />');
      expect(renderedHtml).toContain('<meta property="og:description" content="প্রিমিয়াম উডেন ফ্রেমে আয়াতুল কুরসী।" />');
      expect(renderedHtml).toContain('<meta property="og:image" content="https://www.rangao.bd/images/ayatul-kursi.jpg" />');
      expect(renderedHtml).toContain('<meta property="og:type" content="product" />');
      expect(renderedHtml).toContain('<meta property="og:url" content="https://www.rangao.bd/wooden-decor/ayatul-kursi-gold" />');
      expect(renderedHtml).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(renderedHtml).toContain('<meta name="twitter:title" content="কাস্টম গোল্ডেন আয়াতুল কুরসী ফ্রেম | Rangao" />');
      expect(renderedHtml).toContain('<meta name="twitter:image" content="https://www.rangao.bd/images/ayatul-kursi.jpg" />');
    });
  });

  // 3. Canonical redirects or canonical tags for legacy product URLs
  describe("3. Canonical redirects or canonical tags for legacy product URLs", () => {
    it("should return a 301 Permanent Redirect pointing from legacy UUID product URL to canonical /category/product-slug", async () => {
      const meta = await resolveMetadata("/product/prod-uuid-1234-5678-90ab");

      expect(meta.statusCode).toBe(301);
      expect(meta.redirectUrl).toBe("https://www.rangao.bd/wooden-decor/ayatul-kursi-gold");
      expect(meta.canonicalUrl).toBe("https://www.rangao.bd/wooden-decor/ayatul-kursi-gold");
    });
  });

  // 4. Duplicate sitemap URL prevention & indexability rules
  describe("4. Duplicate sitemap URL prevention & indexability rules", () => {
    it("should correctly compute canonical paths and deduplicate URLs via Map/Set", () => {
      const prod1 = {
        id: "prod-1",
        name: "আয়াতুল কুরসী গোল্ডেন ফ্রেম",
        sku: "ayatul-kursi-gold",
        category: "উডেন ডেকোর",
      };
      const prod2 = {
        id: "prod-1", // duplicate product id
        name: "আয়াতুল কুরসী গোল্ডেন ফ্রেম",
        sku: "ayatul-kursi-gold",
        category: "উডেন ডেকোর",
      };

      const path1 = getCanonicalProductPath(prod1);
      const path2 = getCanonicalProductPath(prod2);

      expect(path1).toBe("/wooden-decor/ayatul-kursi-gold");
      expect(path2).toBe("/wooden-decor/ayatul-kursi-gold");

      const urlMap = new Map<string, string>();
      urlMap.set(path1, "entry1");
      urlMap.set(path2, "entry2");

      expect(urlMap.size).toBe(1);
    });

    it("should mark private routes as noindex, nofollow", async () => {
      const adminMeta = await resolveMetadata("/admin/products");
      expect(adminMeta.noIndex).toBe(true);
      expect(injectMetadataIntoHtml(mockBaseHtml, adminMeta)).toContain('<meta name="robots" content="noindex, nofollow" />');

      const checkoutMeta = await resolveMetadata("/checkout");
      expect(checkoutMeta.noIndex).toBe(true);

      const accountMeta = await resolveMetadata("/account/orders");
      expect(accountMeta.noIndex).toBe(true);
    });
  });

  // 5. Invalid routes returning proper 404 behavior
  describe("5. Invalid routes returning proper 404 behavior", () => {
    it("should return HTTP 404 status and noindex for non-existent product", async () => {
      const meta = await resolveMetadata("/wooden-decor/non-existent-product-12345");

      expect(meta.statusCode).toBe(404);
      expect(meta.noIndex).toBe(true);
      expect(meta.title).toContain("404");

      const html = injectMetadataIntoHtml(mockBaseHtml, meta);
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    });

    it("should return HTTP 404 status and noindex for non-existent category", async () => {
      const meta = await resolveMetadata("/category/invalid-category-xyz");

      expect(meta.statusCode).toBe(404);
      expect(meta.noIndex).toBe(true);
    });

    it("should return HTTP 404 status and noindex for non-existent blog post", async () => {
      const meta = await resolveMetadata("/blog/invalid-blog-post-slug");

      expect(meta.statusCode).toBe(404);
      expect(meta.noIndex).toBe(true);
    });
  });

  // 6. Structured data omitted when review/FAQ data is absent
  describe("6. Structured data omitted when review/FAQ data is absent", () => {
    it("should include AggregateRating and FAQPage schemas only when valid reviews and FAQs exist", async () => {
      const meta = await resolveMetadata("/wooden-decor/ayatul-kursi-gold");

      expect(meta.schemas).toBeDefined();
      expect(meta.schemas!.length).toBe(2);

      const productSchema = meta.schemas!.find((s) => s["@type"] === "Product");
      expect(productSchema).toBeDefined();
      expect(productSchema.aggregateRating).toBeDefined();
      expect(productSchema.aggregateRating.ratingValue).toBe(4.5);
      expect(productSchema.aggregateRating.reviewCount).toBe(2);

      const faqSchema = meta.schemas!.find((s) => s["@type"] === "FAQPage");
      expect(faqSchema).toBeDefined();
      expect(faqSchema.mainEntity.length).toBe(1);
      expect(faqSchema.mainEntity[0].name).toBe("ফ্রেমের সাইজ কত?");
    });

    it("should strictly OMIT AggregateRating and FAQPage when 0 reviews and no FAQs exist", async () => {
      const meta = await resolveMetadata("/3d-border-wall-canvas/allah-canvas");

      expect(meta.schemas).toBeDefined();
      expect(meta.schemas!.length).toBe(1);

      const productSchema = meta.schemas![0];
      expect(productSchema["@type"]).toBe("Product");
      expect(productSchema.aggregateRating).toBeUndefined(); // MUST NOT exist

      const faqSchema = meta.schemas!.find((s) => s["@type"] === "FAQPage");
      expect(faqSchema).toBeUndefined(); // MUST NOT exist

      const html = injectMetadataIntoHtml(mockBaseHtml, meta);
      expect(html).not.toContain("AggregateRating");
      expect(html).not.toContain("FAQPage");
      expect(html).toContain('"availability":"https://schema.org/OutOfStock"');
    });
  });
});
