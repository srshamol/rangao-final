import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { formatPrice, getStockLabel, PHONE_NUMBER } from "@/data/products";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  MessageCircle, Phone, Star, ChevronLeft, ChevronRight, X, ShieldCheck, Truck, Headset,
  ArrowRight, Check, Minus, Plus, ShoppingCart, Banknote, Heart, Share2,
  ZoomIn, Package, Award, Clock, Loader2
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import CodOrderModal from "@/components/CodOrderModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import OptimizedImage from "@/components/OptimizedImage";
import RangaoImage from "@/components/ui/RangaoImage";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import QueryErrorBoundary from "@/components/QueryErrorBoundary";
import { analytics } from "@/services/analytics";
import { slugify, getProductUrl } from "@/lib/utils";
import ProductCard, { dbToCard } from "@/components/ProductCard";
const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card transition-all hover:border-accent/20 hover:shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left font-bengali text-sm font-bold text-foreground"
      >
        <span>❓ {question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground shrink-0 ml-2"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="border-t border-border/20 p-5 pt-3 font-bengali text-xs leading-relaxed text-muted-foreground">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const parseInlineStyles = (lineText: string): React.ReactNode[] => {
  const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|==[^=]+==|\{color:[^}]+\}\([^)]+\))/g;
  const parts = lineText.split(regex);
  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return part;
    }
    
    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    
    // Highlight: ==text==
    if (part.startsWith("==") && part.endsWith("==")) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground px-1 py-0.5 rounded font-medium">
          {part.slice(2, -2)}
        </mark>
      );
    }
    
    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      );
    }
    
    // Color: {color:red}(text)
    const colorMatch = part.match(/^\{color:([^}]+)\}\(([^)]+)\)$/);
    if (colorMatch) {
      const colorVal = colorMatch[1];
      const textVal = colorMatch[2];
      return (
        <span key={index} style={{ color: colorVal }}>
          {textVal}
        </span>
      );
    }
    
    return part;
  });
};

const renderFormattedDescription = (text: string) => {
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const formattedElements: React.ReactNode[] = [];
  
  let currentUnorderedItems: React.ReactNode[] = [];
  let currentOrderedItems: React.ReactNode[] = [];
  
  const flushLists = (key: string | number) => {
    if (currentUnorderedItems.length > 0) {
      formattedElements.push(
        <ul key={`ul-${key}`} className="my-3 list-disc pl-5 space-y-1.5">
          {currentUnorderedItems}
        </ul>
      );
      currentUnorderedItems = [];
    }
    if (currentOrderedItems.length > 0) {
      formattedElements.push(
        <ol key={`ol-${key}`} className="my-3 list-decimal pl-5 space-y-1.5">
          {currentOrderedItems}
        </ol>
      );
      currentOrderedItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (ulMatch) {
      flushLists(`pre-ul-${index}`);
      currentUnorderedItems.push(
        <li key={`li-ul-${index}`} className="mb-1.5 font-bengali text-sm md:text-base leading-relaxed text-foreground/80">
          {parseInlineStyles(ulMatch[1])}
        </li>
      );
    } else if (olMatch) {
      flushLists(`pre-ol-${index}`);
      currentOrderedItems.push(
        <li key={`li-ol-${index}`} className="mb-1.5 font-bengali text-sm md:text-base leading-relaxed text-foreground/80">
          {parseInlineStyles(olMatch[2])}
        </li>
      );
    } else {
      flushLists(index);
      
      if (trimmed === "") {
        formattedElements.push(<div key={`br-${index}`} className="h-3.5" />);
      } else {
        formattedElements.push(
          <p key={`p-${index}`} className="font-bengali text-sm md:text-base leading-[1.8] text-foreground/80 mb-3">
            {parseInlineStyles(trimmed)}
          </p>
        );
      }
    }
  });

  flushLists("end");

  return <div className="space-y-1">{formattedElements}</div>;
};


const ProductDetail = () => {
  const { id: routeId, categorySlug, productSlug } = useParams<{ id?: string; categorySlug?: string; productSlug?: string }>();
  const id = routeId || productSlug;
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const queryClient = useQueryClient();

  const isUuid = useMemo(() => {
    return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }, [id]);

  // Query categories to map slug to name
  const { data: categories = [] } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true);
      return data || [];
    }
  });

  // Query product details dynamically from Supabase (including testimonials/reviews)
  const { data: dbProduct, isLoading, refetch: refetchProduct } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      if (!id) return null;
      if (isUuid) {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            testimonials:testimonials (*)
          `)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const { data: allProducts, error } = await supabase
          .from("products")
          .select(`
            *,
            testimonials:testimonials (*)
          `)
          .eq("status", "active");
        if (error) throw error;
        
        const found = allProducts?.find((p) => slugify(p.sku || "") === id || slugify(p.name) === id);
        return found || null;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    initialData: () => {
      if (!id) return undefined;
      // Find the product in the homepage products cache or shop-products cache
      const cachedQueries = queryClient.getQueriesData<any[]>({
        queryKey: ["homepage-products"]
      });
      for (const [_, data] of cachedQueries) {
        if (Array.isArray(data)) {
          const found = data.find((p: any) => p.id === id || slugify(p.sku || "") === id || slugify(p.name) === id);
          if (found) return found;
        }
      }
      const shopProducts = queryClient.getQueryData<any>(["shop-products"]);
      if (shopProducts?.pages) {
        for (const page of shopProducts.pages) {
          if (page?.data) {
            const found = page.data.find((p: any) => p.id === id || slugify(p.sku || "") === id || slugify(p.name) === id);
            if (found) return found;
          }
        }
      } else if (Array.isArray(shopProducts)) {
        const found = shopProducts.find((p: any) => p.id === id || slugify(p.sku || "") === id || slugify(p.name) === id);
        if (found) return found;
      }
      return undefined;
    }
  });

  // Extract active reviews from the merged product query
  const dbReviews = useMemo(() => {
    if (!dbProduct || !Array.isArray((dbProduct as any).testimonials)) return [];
    return (dbProduct as any).testimonials
      .filter((t: any) => t.is_active)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [dbProduct]);

  const refetchReviews = useCallback(() => {
    refetchProduct();
  }, [refetchProduct]);

  const product = useMemo(() => {
    if (!dbProduct) return null;

    const baseSpecs = Array.isArray(dbProduct.specifications)
      ? (dbProduct.specifications as unknown as { label: string; value: string }[])
      : [];

    const specs = [...baseSpecs];
    if (dbProduct.brand && !specs.some(s => s.label.toLowerCase() === "ব্র্যান্ড" || s.label.toLowerCase() === "brand")) {
      specs.unshift({ label: "ব্র্যান্ড", value: dbProduct.brand });
    }
    if (dbProduct.sku && !specs.some(s => s.label.toLowerCase() === "sku")) {
      specs.push({ label: "SKU", value: dbProduct.sku });
    }

    const finalSpecs = specs.length > 0 ? specs : [
      { label: "উপাদান", value: "প্রিমিয়াম উড / অ্যাক্রিলিক" },
      { label: "অরিজিন", value: "বাংলাদেশ" },
      { label: "ফিনিশিং", value: "ম্যাট লেজার কাট" }
    ];

    // Compute dynamic rating and reviewCount from approved database reviews
    const hasReviews = dbReviews && dbReviews.length > 0;
    const computedRating = hasReviews 
      ? Number((dbReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / dbReviews.length).toFixed(1))
      : dbProduct.rating || 4.9;
    const computedReviewCount = hasReviews ? dbReviews.length : dbProduct.review_count || 48;

    return {
      id: dbProduct.id,
      name: dbProduct.name,
      brand: dbProduct.brand || "",
      sku: dbProduct.sku || "",
      shortDescription: dbProduct.short_description || dbProduct.description?.slice(0, 120) || "প্রিমিয়াম কোয়ালিটির ইসলামিক ও হোম ডেকোর প্রোডাক্ট।",
      fullDescription: dbProduct.description || "",
      price: dbProduct.sale_price ?? dbProduct.regular_price,
      originalPrice: dbProduct.sale_price ? dbProduct.regular_price : undefined,
      images: dbProduct.images?.length ? dbProduct.images : ["https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80"],
      stock: dbProduct.stock_quantity ?? 10,
      rating: computedRating,
      reviewCount: computedReviewCount,
      category: dbProduct.category || "",
      categoryLabel: categories.find(c => c.slug === dbProduct.category)?.name || dbProduct.category || "হোম ডেকোর",
      features: Array.isArray(dbProduct.tags) && dbProduct.tags.length > 0
        ? dbProduct.tags
        : ["১০০% প্রিমিয়াম কোয়ালিটি", "নিখুঁত কাঠের ফিনিশিং", "দীর্ঘস্থায়ী ও আকর্ষণীয় ডিজাইন"],
      specs: finalSpecs
    };
  }, [dbProduct, dbReviews, categories]);

  // Query related products dynamically from Supabase
  const { data: dbRelatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category, dbProduct?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("category", product!.category)
        .neq("id", dbProduct!.id)
        .limit(4);
      return data || [];
    },
    enabled: !!product?.category && !!dbProduct?.id
  });

  const relatedProducts = useMemo(() => {
    return dbRelatedProducts.map((rp) => ({
      id: rp.id,
      name: rp.name,
      category: rp.category,
      price: rp.sale_price ?? rp.regular_price,
      originalPrice: rp.sale_price ? rp.regular_price : undefined,
      images: rp.images?.length ? rp.images : ["https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80"],
      rating: rp.rating || 4.9,
    }));
  }, [dbRelatedProducts]);

  const dynamicWhatsAppLink = useMemo(() => {
    if (!product) return "";
    const number = settings?.contactInfo?.whatsapp || "8801XXXXXXXXX";
    const message = `হ্যালো, আমি ${product.name} ${product.stock === 0 ? "প্রি-অর্ডার" : "অর্ডার"} করতে চাই।`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }, [settings, product]);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [codModalOpen, setCodModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [liked, setLiked] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(0);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  
  const touchStartRef = useRef<number>(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;
    
    // Swipe left (next image)
    if (diff > 50) {
      setLightboxImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    }
    // Swipe right (prev image)
    else if (diff < -50) {
      setLightboxImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
    }
  };

  useEffect(() => {
    setLightboxZoomed(false);
  }, [lightboxImage, lightboxOpen]);

  const [newReviewName, setNewReviewName] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewText.trim()) {
      toast.error("অনুগ্রহ করে আপনার নাম ও রিভিউ লিখুন।");
      return;
    }
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("testimonials" as any).insert({
        customer_name: newReviewName,
        review: newReviewText,
        rating: newReviewRating,
        is_active: false,
        customer_location: "Verified Buyer",
        sort_order: 0,
        product_id: id
      });
      if (error) throw error;
      toast.success("আপনার রিভিউটি সফলভাবে সাবমিট হয়েছে। এডমিন অনুমোদনের পর এটি ওয়েবসাইটে প্রকাশ করা হবে।");
      setNewReviewName("");
      setNewReviewText("");
      setNewReviewRating(5);
      refetchReviews();
    } catch (err: any) {
      toast.error("রিভিউ সাবমিট করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const { addToCart } = useCart();
  const imageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const productId = dbProduct?.id;
  const { data: seoData } = useQuery({
    queryKey: ["product-seo-details", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data } = await supabase.from("store_settings" as any).select("value").eq("key", `product_seo_${productId}`).maybeSingle();
      return data?.value || null;
    },
    enabled: !!productId
  });

  const productKeywords = useMemo(() => {
    if (!product) return "";
    const tags = Array.isArray(dbProduct?.tags) ? dbProduct.tags : [];
    return [
      product.name,
      product.categoryLabel,
      product.brand,
      ...tags,
      "রাঙাও",
      "Rangao"
    ].filter(Boolean).join(", ");
  }, [product, dbProduct]);

  const productSchema = useMemo(() => {
    if (!product) return null;
    const storeUrl = settings?.storeInfo?.website_url;
    const baseDomain = storeUrl || (typeof window !== "undefined" ? window.location.origin : "https://www.rangao.bd");
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "image": product.images,
      "description": product.shortDescription,
      "sku": product.sku || product.id,
      "keywords": productKeywords,
      "category": product.categoryLabel,
      "brand": {
        "@type": "Brand",
        "name": product.brand || "Rangao"
      },
      "offers": {
        "@type": "Offer",
        "url": `${baseDomain}${getProductUrl(product)}`,
        "priceCurrency": "BDT",
        "price": product.price,
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "priceValidUntil": "2027-12-31"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "reviewCount": product.reviewCount || 1
      }
    };
  }, [product, productKeywords, settings?.storeInfo?.website_url]);

  const faqSchema = useMemo(() => {
    const faqs = (seoData as any)?.faqs;
    if (!faqs || faqs.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map((f: any) => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.answer
        }
      }))
    };
  }, [seoData]);

  const combinedSchemas = useMemo(() => {
    return [productSchema, faqSchema].filter(Boolean) as any[];
  }, [productSchema, faqSchema]);

  const lastTrackedId = useRef<string | null>(null);

  useEffect(() => {
    if (product && lastTrackedId.current !== product.id) {
      analytics.viewItem(product as any);
      lastTrackedId.current = product.id;
    }
  }, [product]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") {
        setLightboxImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
      }
      if (e.key === "ArrowRight") {
        setLightboxImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, product?.images?.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">প্রোডাক্ট লোড হচ্ছে...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <p className="text-xl text-muted-foreground">প্রোডাক্ট খুঁজে পাওয়া যায়নি</p>
          <Button onClick={() => navigate("/")} variant="outline">হোমে ফিরে যান</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const stock = getStockLabel(product.stock);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO 
        title={(seoData as any)?.seo_title || product.name} 
        description={(seoData as any)?.seo_description || product.shortDescription}
        canonical={(seoData as any)?.canonical_url || getProductUrl(product)}
        keywords={productKeywords}
        image={product.images[0]}
        type="product"
        schema={combinedSchemas}
        price={String(product.price)}
        availability={product.stock > 0 ? "in_stock" : "out_of_stock"}
      />

      <QueryErrorBoundary>
        <main>
          <Breadcrumbs
            items={[
              { label: product.categoryLabel, url: `/category/${product.category}` },
              { label: product.name },
            ]}
          />

          {/* Part 1: Gallery + Info */}
          <section ref={sectionRef} className="relative overflow-hidden py-8 md:py-12" style={{ position: "relative" }}>
            {/* Subtle background decoration */}
            <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-accent/[0.03] blur-[100px]" />
            <div className="pointer-events-none absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />

            <div className="container relative">
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
                {/* Left Column: Image Gallery */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Main Image with Zoom */}
                    <div
                      ref={imageRef}
                      className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-secondary to-secondary/30 shadow-premium-lg md:aspect-square md:cursor-zoom-in lg:rounded-3xl"
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setIsZoomed(true)}
                      onMouseLeave={() => setIsZoomed(false)}
                      onClick={() => {
                        setLightboxImage(selectedImage);
                        setLightboxOpen(true);
                      }}
                    >
                      <motion.div style={{ y: parallaxY }} className="h-full w-full">
                        <RangaoImage
                          src={product.images[selectedImage]}
                          alt={product.name}
                          width={600}
                          height={600}
                          priority={true}
                          className="h-full w-full object-contain transition-transform duration-700 md:object-cover"
                          style={
                            isZoomed && window.innerWidth >= 768
                              ? {
                                  transform: "scale(2)",
                                  transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                                }
                              : {}
                          }
                        />
                      </motion.div>

                      {/* Zoom indicator */}
                      <div className="absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full bg-foreground/60 px-3 py-1.5 text-xs font-medium text-background opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 md:flex">
                        <ZoomIn className="h-3.5 w-3.5" /> জুম করুন
                      </div>

                      {/* Discount badge */}
                      {discount > 0 && (
                        <motion.div
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: -12 }}
                          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                          className="absolute left-4 top-4 rounded-2xl bg-destructive px-4 py-2 shadow-lg"
                        >
                          <span className="font-display text-lg font-extrabold text-destructive-foreground">{discount}%</span>
                          <span className="ml-1 text-xs font-bold text-destructive-foreground/80">ছাড়</span>
                        </motion.div>
                      )}

                      {/* Floating action buttons */}
                      <div className="absolute right-4 top-4 flex flex-col gap-2">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLiked(!liked);
                            toast.success(liked ? "পছন্দ তালিকা থেকে সরানো হয়েছে" : "পছন্দ তালিকায় যোগ হয়েছে");
                          }}
                          className={`flex h-10 w-10 items-center justify-center rounded-full border border-border/30 shadow-md backdrop-blur-xl transition-colors ${
                            liked ? "bg-destructive/90 text-destructive-foreground" : "bg-background/80 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(window.location.href);
                            toast.success("লিংক কপি হয়েছে!");
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/30 bg-background/80 text-muted-foreground shadow-md backdrop-blur-xl transition-colors hover:text-foreground"
                        >
                          <Share2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Thumbnail Strip */}
                    <div className="mt-3 flex gap-2 md:mt-4 md:gap-3">
                      {product.images.map((img, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedImage(i)}
                          className={`relative aspect-square w-14 overflow-hidden rounded-lg border-2 transition-all duration-300 md:w-18 lg:w-20 md:rounded-xl ${
                            selectedImage === i
                              ? "border-accent ring-2 ring-accent/30 shadow-gold"
                              : "border-border/30 opacity-50 hover:opacity-100"
                          }`}
                        >
                          <RangaoImage src={img} alt={`${product.name} - ${i + 1}`} width={80} height={80} className="h-full w-full object-cover" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Right Column: Product Info */}
                <div>
                  <div className="lg:sticky lg:top-24">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-5"
                    >
                      {/* Category + Rating row */}
                      <div className="flex items-center gap-3">
                        <span className="inline-block rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                          {product.categoryLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                          <span className="font-display text-sm font-bold text-foreground">{product.rating}</span>
                          <span className="text-xs text-muted-foreground">({product.reviewCount.toLocaleString()}+)</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h1 className="font-display text-2xl font-extrabold leading-tight text-foreground md:text-3xl lg:text-4xl">
                        {product.name}
                      </h1>

                      {/* Brand & SKU */}
                      {(product.brand || product.sku) && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {product.brand && (
                            <span>ব্র্যান্ড: <strong className="text-foreground">{product.brand}</strong></span>
                          )}
                          {product.brand && product.sku && <span className="text-border">|</span>}
                          {product.sku && (
                            <span>SKU: <strong className="text-foreground font-mono">{product.sku}</strong></span>
                          )}
                        </div>
                      )}

                      {/* Short Description + Full summary */}
                      <div className="space-y-2">
                        <p className="font-bengali text-sm font-medium leading-relaxed text-foreground/70 md:text-base">
                          {product.shortDescription}
                        </p>
                        <p className="font-bengali text-xs leading-relaxed text-muted-foreground line-clamp-3 md:text-sm">
                          {product.fullDescription}
                        </p>
                      </div>

                      {/* Price Block */}
                      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-secondary/50 to-transparent p-4 md:p-5">
                        <div className="flex items-baseline gap-3">
                          <span className="font-display text-3xl font-extrabold text-foreground md:text-4xl">{formatPrice(product.price)}</span>
                          {product.originalPrice && (
                            <>
                              <span className="text-base text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                              <span className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                                {discount}% ছাড়
                              </span>
                            </>
                          )}
                        </div>
                        {discount > 0 && (
                          <p className="mt-2 font-bengali text-xs text-success">
                            আপনি সাশ্রয় করছেন {formatPrice(product.originalPrice! - product.price)}
                          </p>
                        )}
                      </div>

                      {/* Stock */}
                      <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                        product.stock === 0
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : product.stock <= 5
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-success/10 text-success"
                      }`}>
                        <span className={`h-2 w-2 animate-pulse rounded-full ${
                          product.stock === 0 ? "bg-purple-500" : product.stock <= 5 ? "bg-amber-500" : "bg-success"
                        }`} />
                        {stock.text}
                      </div>

                      {/* Quantity Selector */}
                      <div className="space-y-2">
                        <label className="font-bengali text-sm font-semibold text-foreground">পরিমাণ</label>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center overflow-hidden rounded-xl border-2 border-border/50 bg-secondary/30">
                            <button
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-secondary"
                              disabled={quantity <= 1}
                            >
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <span className="flex h-11 w-14 items-center justify-center border-x-2 border-border/50 font-display text-base font-bold text-foreground">
                              {quantity}
                            </span>
                            <button
                              onClick={() => setQuantity(product.stock === 0 ? quantity + 1 : Math.min(product.stock, quantity + 1))}
                              className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-secondary"
                              disabled={product.stock > 0 && quantity >= product.stock}
                            >
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                          <span className="font-bengali text-xs text-muted-foreground">
                            {product.stock === 0 ? "প্রি-অর্ডার" : `সর্বোচ্চ ${product.stock}টি`}
                          </span>
                        </div>
                      </div>

                      {/* CTA Buttons - Hidden on mobile since sticky bar handles it */}
                      <div className="hidden space-y-4 pt-2 lg:block">
                        <div className="grid grid-cols-2 gap-3.5">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              size="lg"
                              className={`group relative w-full overflow-hidden rounded-2xl py-6.5 text-sm font-bold shadow-[0_4px_15px_-3px_rgba(197,168,92,0.35)] transition-all duration-300 border ${
                                product.stock === 0
                                  ? "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-[0_8px_25px_-3px_rgba(147,51,234,0.45)] border-purple-500/20"
                                  : "bg-accent text-accent-foreground hover:from-accent/95 hover:to-accent/85 hover:shadow-[0_8px_25px_-3px_rgba(197,168,92,0.55)] border-accent/10 bg-gradient-to-r from-accent to-accent/90"
                              }`}
                              onClick={() => {
                                addToCart(product, quantity);
                                analytics.addToCart(product as any, quantity);
                                toast.success(`${product.name} ${product.stock === 0 ? "প্রি-অর্ডার কার্টে" : "কার্টে"} যোগ হয়েছে!`);
                              }}
                            >
                              <ShoppingCart className="mr-2 h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                              {product.stock === 0 ? "কার্টে যোগ করুন (প্রি-অর্ডার)" : "কার্টে যোগ করুন"}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              asChild
                              size="lg"
                              className="group w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 py-6.5 text-sm font-bold text-white shadow-[0_4px_15px_-3px_rgba(16,185,129,0.35)] transition-all duration-300 hover:from-emerald-500 hover:to-green-500 hover:shadow-[0_8px_25px_-3px_rgba(16,185,129,0.55)] cursor-pointer"
                            >
                              <a href={dynamicWhatsAppLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                                <WhatsAppIcon className="mr-2 h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                                {product.stock === 0 ? "WhatsApp এ প্রি-অর্ডার" : "WhatsApp এ অর্ডার"}
                              </a>
                            </Button>
                          </motion.div>
                        </div>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            size="lg"
                            className={`group relative w-full overflow-hidden rounded-2xl py-7 text-base font-extrabold text-white transition-all duration-300 ${
                              product.stock === 0
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_4px_20px_-3px_rgba(147,51,234,0.35)] hover:shadow-[0_8px_28px_-3px_rgba(147,51,234,0.55)]"
                                : "bg-gradient-to-r from-success to-[#22995e] hover:from-[#2bb272] hover:to-[#1f8c54] shadow-[0_4px_20px_-3px_rgba(43,178,114,0.35)] hover:shadow-[0_8px_28px_-3px_rgba(43,178,114,0.55)]"
                            }`}
                            onClick={() => setCodModalOpen(true)}
                          >
                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                            <Banknote className="mr-2.5 h-5.5 w-5.5 shrink-0 transition-transform group-hover:scale-110" />
                            {product.stock === 0 ? "প্রি-অর্ডার করুন (ক্যাশ অন ডেলিভারি)" : "ক্যাশ অন ডেলিভারিতে অর্ডার করুন"}
                          </Button>
                        </motion.div>
                      </div>

                      {/* Trust Badges - Premium Glass Cards */}
                      <div className="grid grid-cols-3 gap-2.5 pt-3">
                        {[
                          { icon: ShieldCheck, label: "অরিজিনাল", sub: "১০০% গ্যারান্টি" },
                          { icon: Truck, label: "দ্রুত ডেলিভারি", sub: "সারাদেশে" },
                          { icon: Headset, label: "সাপোর্ট", sub: "২৪/৭ সার্ভিস" },
                        ].map(({ icon: Icon, label, sub }, i) => (
                          <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-gradient-to-br from-secondary/50 to-transparent p-3 text-center transition-all hover:border-accent/30 hover:shadow-md"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 transition-colors group-hover:bg-accent/20">
                              <Icon className="h-4 w-4 text-accent" />
                            </div>
                            <span className="text-[11px] font-bold text-foreground">{label}</span>
                            <span className="text-[9px] text-muted-foreground">{sub}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Part 2: Tabs - Description / Specs / Reviews */}
          <section className="border-t bg-gradient-to-b from-secondary/30 to-background py-12 md:py-16">
            <div className="container max-w-4xl">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-4 rounded-2xl border border-border/30 bg-secondary/50 p-1.5 backdrop-blur-sm">
                  <TabsTrigger value="description" className="rounded-xl font-bengali text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md">
                    বিবরণ
                  </TabsTrigger>
                  <TabsTrigger value="specs" className="rounded-xl font-bengali text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md">
                    বিশেষত্ব
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="rounded-xl font-bengali text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md">
                    রিভিউ
                  </TabsTrigger>
                  <TabsTrigger value="faq" className="rounded-xl font-bengali text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md">
                    প্রশ্নোত্তর
                  </TabsTrigger>
                </TabsList>

                {/* Description Tab */}
                <TabsContent value="description" className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="prose-editorial"
                  >
                    {renderFormattedDescription(product.fullDescription)}
                  </motion.div>
                  {product.features.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <h3 className="font-display text-base font-bold text-foreground">ট্যাগ</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.features.map((feature, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <Link
                              to={`/products?search=${encodeURIComponent(feature)}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-accent/30 hover:bg-secondary hover:text-foreground cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5 text-accent" />
                              {feature}
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Specs Tab */}
                <TabsContent value="specs">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm"
                  >
                    <div className="border-b bg-gradient-to-r from-primary/5 to-transparent px-6 py-4">
                      <h3 className="font-display text-base font-bold text-foreground">পণ্যের বিশেষত্ব</h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {product.specs.map((spec, i) => (
                        <motion.div
                          key={spec.label}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 px-4 py-3 sm:px-6 sm:py-4 text-sm transition-colors hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
                        >
                          <span className="font-bengali font-medium text-muted-foreground">{spec.label}</span>
                          <span className="font-display font-bold text-foreground text-left sm:text-right">{spec.value}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="space-y-8"
                  >
                    {/* Summary Card */}
                    <div className="flex flex-col md:flex-row items-center gap-6 rounded-2xl border border-border/30 bg-card p-6 shadow-sm">
                      <div className="text-center w-full md:w-1/3">
                        <p className="font-display text-5xl font-extrabold text-foreground">{product.rating}</p>
                        <div className="mt-2 flex justify-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-accent text-accent" : "text-border"}`} />
                          ))}
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {(dbReviews.length > 0 ? dbReviews.length : product.reviewCount).toLocaleString()} রিভিউ
                        </p>
                      </div>
                      <div className="hidden md:block h-20 w-px bg-border/50" />
                      <div className="flex-1 w-full space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                          let pct = star === 5 ? 72 : star === 4 ? 20 : star === 3 ? 5 : star === 2 ? 2 : 1;
                          if (dbReviews.length > 0) {
                            const count = dbReviews.filter((r: any) => Math.round(r.rating) === star).length;
                            pct = Math.round((count / dbReviews.length) * 100) || 0;
                          }
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="w-3 text-xs font-medium text-muted-foreground">{star}</span>
                              <Star className="h-3 w-3 fill-accent text-accent" />
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                                <motion.div
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${pct}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 0.8, delay: 0.2 }}
                                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70"
                                />
                              </div>
                              <span className="w-8 text-right text-xs font-medium text-muted-foreground">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-4">
                      <h3 className="font-display text-lg font-bold text-foreground">গ্রাহকদের মতামত</h3>
                      <div className="space-y-4 divide-y divide-border/30">
                        {(dbReviews.length > 0 ? dbReviews : [
                          {
                            id: "d1",
                            customer_name: "রাফি আহমেদ",
                            customer_location: "Verified Buyer",
                            rating: 5,
                            review: "খুব সুন্দর প্রোডাক্ট! ফিনিশিং অত্যন্ত নিখুঁত এবং কাঠের কোয়ালিটি চমৎকার। ঘরে লাগানোর পর চমৎকার দেখাচ্ছে।",
                            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                          },
                          {
                            id: "d2",
                            customer_name: "তাসনিম সুলতানা",
                            customer_location: "Verified Buyer",
                            rating: 5,
                            review: "ডেলিভারি খুব দ্রুত পেয়েছি, বাবল র‍্যাপ দিয়ে খুব সুন্দর করে প্যাকিং করা ছিল। ক্যালিগ্রাফিটি দেওয়ালে অনেক সুন্দর মানিয়েছে। ধন্যবাদ!",
                            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                          },
                          {
                            id: "d3",
                            customer_name: "ইমরান খান",
                            customer_location: "Verified Buyer",
                            rating: 4,
                            review: "কাঠের মান ভালো, ডিজাইনটাও নিখুঁত। কোয়ালিটি নিয়ে কোনো সন্দেহ নেই। রিকমেন্ডেড!",
                            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
                          }
                        ]).map((r: any) => (
                          <div key={r.id} className="pt-4 first:pt-0 space-y-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-foreground text-sm">{r.customer_name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {r.customer_location || "Verified Buyer"} • {new Date(r.created_at || r.date).toLocaleDateString("bn-BD")}
                                </p>
                              </div>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-border"}`} />
                                ))}
                              </div>
                            </div>
                            <p className="font-bengali text-sm text-foreground/80 leading-relaxed">
                              {r.review}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Review Form */}
                    <div className="border border-border/30 rounded-2xl p-6 bg-card space-y-4 shadow-sm">
                      <h3 className="font-display text-lg font-bold text-foreground">একটি রিভিউ লিখুন</h3>
                      <form onSubmit={handleSubmitReview} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">আপনার নাম *</label>
                            <Input
                              placeholder="যেমন: রাফসান করিম"
                              value={newReviewName}
                              onChange={(e) => setNewReviewName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">রেটিং *</label>
                            <div className="flex items-center gap-1.5 h-10">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setNewReviewRating(star)}
                                  className="focus:outline-none transition-transform active:scale-90"
                                >
                                  <Star className={`h-6 w-6 ${star <= newReviewRating ? "fill-accent text-accent" : "text-muted-foreground/30 hover:text-accent/60"}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">রিভিউ বক্তব্য *</label>
                          <Textarea
                            placeholder="প্রোডাক্টটি কেমন লেগেছে? আপনার অভিজ্ঞতা লিখুন..."
                            value={newReviewText}
                            onChange={(e) => setNewReviewText(e.target.value)}
                            rows={4}
                            required
                          />
                        </div>
                        <Button type="submit" disabled={submittingReview} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
                          {submittingReview ? "রিভিউ জমা হচ্ছে..." : "রিভিউ জমা দিন"}
                        </Button>
                      </form>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* FAQ Tab */}
                <TabsContent value="faq">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="space-y-6"
                  >
                    <div className="border-b pb-4">
                      <h3 className="font-display text-xl font-bold text-foreground">সচরাচর জিজ্ঞাসিত প্রশ্ন ও উত্তর</h3>
                      <p className="font-bengali text-sm text-muted-foreground mt-1">পণ্য অর্ডার, ডেলিভারি এবং অন্যান্য সাধারণ তথ্যাবলী</p>
                    </div>
                    <div className="grid gap-3.5">
                      {(() => {
                        const customFaqs = (seoData as any)?.faqs || [];
                        const generalFaqs = [
                          {
                            question: "অর্ডার করার কতদিনের মধ্যে ডেলিভারি পাবো?",
                            answer: "ঢাকা সিটির ভেতরে সাধারণত ২৪ থেকে ৪৮ ঘণ্টার মধ্যে এবং ঢাকা সিটির বাইরে ৩ থেকে ৫ কার্যদিবসের মধ্যে ডেলিভারি করা হয়।"
                          },
                          {
                            question: "ডেলিভারি চার্জ কত?",
                            answer: "ঢাকা সিটির ভেতরে ডেলিভারি চার্জ ৬০ টাকা এবং ঢাকা সিটির বাইরে ১২০ টাকা।"
                          },
                          {
                            question: "আমি কি ক্যাশ অন ডেলিভারি (Cash on Delivery) পাবো?",
                            answer: "হ্যাঁ, আমরা সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা প্রদান করি। প্রোডাক্ট হাতে পেয়ে চেক করে পেমেন্ট করতে পারবেন।"
                          },
                          {
                            question: "প্রোডাক্টে কোনো সমস্যা থাকলে রিটার্ন পলিসি কি?",
                            answer: "ডেলিভারি নেওয়ার সময় কোনো সমস্যা বা ডিফেক্ট থাকলে সাথে সাথে ডেলিভারি ম্যানের সামনে আমাদের জানান। আমরা রিটার্ন বা এক্সচেঞ্জ করে দেব।"
                          }
                        ];
                        
                        const allFaqs = [...customFaqs, ...generalFaqs];
                        return allFaqs.map((faq: any, i: number) => (
                          <FaqItem key={i} question={faq.question} answer={faq.answer} />
                        ));
                      })()}
                    </div>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Part 3: Related Products */}
          {relatedProducts.length > 0 && (
            <section className="py-12 md:py-16">
              <div className="container">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">সম্পর্কিত প্রোডাক্ট</h2>
                    <p className="mt-1 font-bengali text-sm text-muted-foreground">আপনি আরও পছন্দ করতে পারেন</p>
                  </div>
                  <Link to="/" className="flex items-center gap-1.5 rounded-full border border-border/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-accent hover:text-accent">
                    সবগুলো দেখুন <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
                  {dbRelatedProducts.map((rp, i) => (
                    <div
                      key={rp.id}
                      className="w-56 shrink-0 md:w-64"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <ProductCard product={dbToCard(rp as any)} index={i} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Sticky Bottom CTA (Mobile) */}
          {!codModalOpen && (
            <div className="mobile-sticky-cta fixed left-0 right-0 z-[940] border-t border-border/40 bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-8px_30px_rgba(16,42,32,0.12)] lg:hidden" style={{ bottom: "calc(env(safe-area-inset-bottom) + 70px)" }}>
              <div className="flex items-center gap-2.5">
                {/* Add to Cart Icon Button */}
                <Button
                  size="icon"
                  className={`h-12 w-12 rounded-xl border shrink-0 [&_svg]:!size-[22px] ${
                    product.stock === 0
                      ? "bg-purple-600/10 text-purple-600 border-purple-500/20 hover:bg-purple-600/20"
                      : "bg-accent/15 text-accent border-accent/20 hover:bg-accent/25"
                  }`}
                  onClick={() => {
                    addToCart(product, quantity);
                    analytics.addToCart(product as any, quantity);
                    toast.success(`${product.name} ${product.stock === 0 ? "প্রি-অর্ডার কার্টে" : "কার্টে"} যোগ হয়েছে!`);
                  }}
                  title="কার্টে যোগ করুন"
                >
                  <ShoppingCart className="h-[22px] w-[22px]" />
                </Button>

                {/* Order Now (Highlighted) */}
                <Button
                  size="default"
                  className={`h-12 flex-1 rounded-xl text-sm sm:text-base font-extrabold text-white shadow-[0_3px_15px_-3px_rgba(43,178,114,0.3)] [&_svg]:!size-[20px] ${
                    product.stock === 0
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                      : "bg-gradient-to-r from-success to-[#22995e] hover:from-[#2bb272] hover:to-[#1f8c54]"
                  }`}
                  onClick={() => setCodModalOpen(true)}
                >
                  <Banknote className="mr-2 h-[20px] w-[20px] shrink-0" /> {product.stock === 0 ? "প্রি-অর্ডার করুন" : "অর্ডার করুন"}
                </Button>

                {/* Order on WhatsApp Icon Button */}
                <Button
                  asChild
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_3px_15px_-3px_rgba(16,185,129,0.3)] shrink-0 cursor-pointer [&_svg]:!size-[22px]"
                  title="WhatsApp এ অর্ডার করুন"
                >
                  <a href={dynamicWhatsAppLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                    <WhatsAppIcon className="h-[22px] w-[22px]" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </main>
      </QueryErrorBoundary>
      <div className="pb-20 lg:pb-0">
        <Footer />
      </div>
      <div className="hidden lg:block">
        <FloatingWhatsApp />
      </div>
      
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex flex-col items-center justify-between bg-black/95 py-6 px-4 backdrop-blur-md select-none"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top Bar */}
            <div 
              className="w-full flex items-center justify-between max-w-5xl px-4 z-50 shrink-0" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col text-left">
                <span className="text-white font-bold text-sm md:text-base line-clamp-1">{product.name}</span>
                <span className="text-white/50 text-xs font-medium mt-0.5">
                  {lightboxImage + 1} / {product.images.length}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Zoom Button */}
                <button
                  onClick={() => setLightboxZoomed(!lightboxZoomed)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:scale-105 active:scale-95 ${
                    lightboxZoomed ? "bg-accent text-accent-foreground" : "bg-white/10 hover:bg-white/20"
                  }`}
                  title={lightboxZoomed ? "জুম আউট" : "জুম ইন"}
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                {/* Close Button */}
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                  title="বন্ধ করুন"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Navigation buttons */}
            {product.images.length > 1 && !lightboxZoomed && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
                  }}
                  className="absolute left-6 top-1/2 z-50 hidden md:flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-6 top-1/2 z-50 hidden md:flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image Container with Drag support when Zoomed */}
            <div className="flex-1 w-full max-w-4xl flex items-center justify-center relative my-4 overflow-hidden">
              <motion.div
                key={lightboxImage}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ 
                  scale: lightboxZoomed ? 2 : 1, 
                  opacity: 1,
                  x: 0,
                  y: 0
                }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                drag={lightboxZoomed}
                dragConstraints={{ left: -400, right: 400, top: -300, bottom: 300 }}
                dragElastic={0.15}
                className="relative max-h-[65vh] max-w-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                onClick={(e) => {
                  e.stopPropagation();
                  // Double click to toggle zoom
                  if (e.detail === 2) {
                    setLightboxZoomed(!lightboxZoomed);
                  }
                }}
              >
                <OptimizedImage
                  src={product.images[lightboxImage]}
                  alt={`${product.name} full view`}
                  loading="eager"
                  sizes="90vw"
                  className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-2xl pointer-events-none"
                />
              </motion.div>
            </div>

            {/* Thumbnail selector */}
            {product.images.length > 1 && !lightboxZoomed ? (
              <div 
                className="w-full max-w-xl flex gap-2.5 overflow-x-auto justify-center p-2 shrink-0 scrollbar-hide" 
                onClick={(e) => e.stopPropagation()}
              >
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxImage(i)}
                    className={`relative aspect-square h-12 md:h-14 overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      lightboxImage === i ? "border-accent ring-2 ring-accent/30 scale-105" : "border-transparent opacity-40 hover:opacity-100"
                    }`}
                  >
                    <OptimizedImage src={img} alt={`thumbnail ${i + 1}`} loading="lazy" sizes="80px" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              // Spacer to maintain flex layout height when thumbnails are hidden
              <div className="h-14 shrink-0" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CodOrderModal open={codModalOpen} onOpenChange={setCodModalOpen} product={product} quantity={quantity} />
    </div>
  );
};

export default ProductDetail;
