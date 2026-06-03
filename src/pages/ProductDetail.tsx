import { useState, useEffect, useRef, useMemo } from "react";
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
import CodOrderModal from "@/components/CodOrderModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import OptimizedImage from "@/components/OptimizedImage";


const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();

  // Query product details dynamically from Supabase
  const { data: dbProduct, isLoading } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

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
      rating: dbProduct.rating || 4.9,
      reviewCount: dbProduct.review_count || 48,
      category: dbProduct.category || "",
      categoryLabel: dbProduct.categoryLabel || dbProduct.category || "হোম ডেকোর",
      features: Array.isArray(dbProduct.tags) && dbProduct.tags.length > 0
        ? dbProduct.tags
        : ["১০০% প্রিমিয়াম কোয়ালিটি", "নিখুঁত কাঠের ফিনিশিং", "দীর্ঘস্থায়ী ও আকর্ষণীয় ডিজাইন"],
      specs: finalSpecs
    };
  }, [dbProduct]);

  // Query related products dynamically from Supabase
  const { data: dbRelatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("category", product!.category)
        .neq("id", id)
        .limit(4);
      return data || [];
    },
    enabled: !!product?.category
  });

  const relatedProducts = useMemo(() => {
    return dbRelatedProducts.map((rp) => ({
      id: rp.id,
      name: rp.name,
      price: rp.sale_price ?? rp.regular_price,
      originalPrice: rp.sale_price ? rp.regular_price : undefined,
      images: rp.images?.length ? rp.images : ["https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80"],
      rating: rp.rating || 4.9,
    }));
  }, [dbRelatedProducts]);

  const dynamicWhatsAppLink = useMemo(() => {
    if (!product) return "";
    const number = settings?.contactInfo?.whatsapp || "8801XXXXXXXXX";
    const message = `হ্যালো, আমি ${product.name} সম্পর্কে জানতে চাই।`;
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
  // Query reviews dynamically from Supabase testimonials table
  const { data: dbReviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["product-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

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
        sort_order: 0
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

  useEffect(() => {
    if (product) {
      import("@/lib/tracking").then(({ trackViewContent }) => {
        trackViewContent({
          id: product.id,
          name: product.name,
          category: product.category || "Uncategorized",
          price: product.price
        });
      });
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

      <main>
        {/* Breadcrumb */}
        <div className="border-b bg-gradient-to-r from-secondary/50 to-secondary/30">
          <div className="container py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="transition-colors hover:text-accent">হোম</Link>
              <span className="text-border">/</span>
              <span className="transition-colors hover:text-accent">{product.categoryLabel}</span>
              <span className="text-border">/</span>
              <span className="font-medium text-foreground">{product.name}</span>
            </div>
          </div>
        </div>

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
                      <OptimizedImage
                        src={product.images[selectedImage]}
                        alt={product.name}
                        loading="eager"
                        fetchPriority="high"
                        sizes="(max-width: 768px) 100vw, 50vw"
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
                        <OptimizedImage src={img} alt={`${product.name} - ${i + 1}`} loading="lazy" sizes="100px" className="h-full w-full object-cover" />
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
                        ? "bg-destructive/10 text-destructive"
                        : product.stock <= 5
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-success/10 text-success"
                    }`}>
                      <span className={`h-2 w-2 animate-pulse rounded-full ${
                        product.stock === 0 ? "bg-destructive" : product.stock <= 5 ? "bg-amber-500" : "bg-success"
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
                            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                            className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-secondary"
                            disabled={quantity >= product.stock}
                          >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                        <span className="font-bengali text-xs text-muted-foreground">
                          সর্বোচ্চ {product.stock}টি
                        </span>
                      </div>
                    </div>

                    {/* CTA Buttons - Hidden on mobile since sticky bar handles it */}
                    <div className="hidden space-y-4 pt-2 lg:block">
                      <div className="grid grid-cols-2 gap-3.5">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            size="lg"
                            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent/90 py-6.5 text-sm font-bold text-accent-foreground shadow-[0_4px_15px_-3px_rgba(197,168,92,0.35)] transition-all duration-300 hover:from-accent/95 hover:to-accent/85 hover:shadow-[0_8px_25px_-3px_rgba(197,168,92,0.55)] border border-accent/10"
                            disabled={product.stock === 0}
                            onClick={() => {
                              addToCart(product, quantity);
                              toast.success(`${product.name} কার্টে যোগ হয়েছে!`);
                            }}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                            কার্টে যোগ করুন
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            asChild
                            size="lg"
                            className="group w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 py-6.5 text-sm font-bold text-white shadow-[0_4px_15px_-3px_rgba(16,185,129,0.35)] transition-all duration-300 hover:from-emerald-500 hover:to-green-500 hover:shadow-[0_8px_25px_-3px_rgba(16,185,129,0.55)] cursor-pointer"
                          >
                            <a href={dynamicWhatsAppLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                              <MessageCircle className="mr-2 h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                              WhatsApp এ অর্ডার
                            </a>
                          </Button>
                        </motion.div>
                      </div>

                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          size="lg"
                          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-success to-[#22995e] py-7 text-base font-extrabold text-white shadow-[0_4px_20px_-3px_rgba(43,178,114,0.35)] transition-all duration-300 hover:from-[#2bb272] hover:to-[#1f8c54] hover:shadow-[0_8px_28px_-3px_rgba(43,178,114,0.55)]"
                          disabled={product.stock === 0}
                          onClick={() => setCodModalOpen(true)}
                        >
                          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                          <Banknote className="mr-2.5 h-5.5 w-5.5 shrink-0 transition-transform group-hover:scale-110" />
                          ক্যাশ অন ডেলিভারিতে অর্ডার করুন
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
              <TabsList className="mb-8 grid w-full grid-cols-3 rounded-2xl border border-border/30 bg-secondary/50 p-1.5 backdrop-blur-sm">
                <TabsTrigger value="description" className="rounded-xl font-bengali text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md">
                  বিবরণ
                </TabsTrigger>
                <TabsTrigger value="specs" className="rounded-xl font-bengali text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md">
                  বিশেষত্ব
                </TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-xl font-bengali text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md">
                  রিভিউ
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
                  <p className="font-bengali text-lg leading-[1.9] text-foreground/80">
                    {product.fullDescription}
                  </p>
                </motion.div>

                {product.features.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <h3 className="font-display text-xl font-bold text-foreground">মূল বৈশিষ্ট্যসমূহ</h3>
                    <div className="space-y-3">
                      {product.features.map((feature, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                          className="group flex gap-4 rounded-2xl border border-border/30 bg-card p-5 transition-all hover:border-accent/20 hover:shadow-md"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/5 transition-colors group-hover:from-accent/30 group-hover:to-accent/10">
                            <Check className="h-4 w-4 text-accent" />
                          </div>
                          <p className="font-bengali text-sm leading-relaxed text-muted-foreground">{feature}</p>
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
                        className={`flex justify-between px-6 py-4 text-sm transition-colors hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
                      >
                        <span className="font-bengali font-medium text-muted-foreground">{spec.label}</span>
                        <span className="font-display font-bold text-foreground">{spec.value}</span>
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
                {relatedProducts.map((rp, i) => (
                  <motion.div
                    key={rp.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link
                      to={`/product/${rp.id}`}
                      className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm transition-all hover:border-accent/20 hover:shadow-premium-lg md:w-64"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div className="relative aspect-square overflow-hidden bg-secondary">
                        <OptimizedImage src={rp.images[0]} alt={rp.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" sizes="(max-width: 640px) 150px, 250px" />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="font-display text-sm font-bold text-card-foreground line-clamp-1">{rp.name}</h3>
                        <div className="mt-1 flex items-baseline gap-2">
                          <p className="font-display text-lg font-extrabold text-foreground">{formatPrice(rp.price)}</p>
                          {rp.originalPrice && (
                            <p className="text-xs text-muted-foreground line-through">{formatPrice(rp.originalPrice)}</p>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          <span className="text-xs font-medium text-foreground">{rp.rating}</span>
                        </div>
                        <Button size="sm" className="mt-3 w-full rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                          ডিটেলস দেখুন
                        </Button>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sticky Bottom CTA (Mobile) */}
        {!codModalOpen && (
          <div className="mobile-sticky-cta fixed left-0 right-0 z-[940] border-t border-border/40 bg-background/95 backdrop-blur-md px-4 py-3.5 shadow-[0_-8px_30px_rgba(16,42,32,0.12)] lg:hidden" style={{ bottom: "calc(env(safe-area-inset-bottom) + 70px)" }}>
            <div className="flex gap-2.5">
              <Button
                size="default"
                className="h-11.5 flex-1 rounded-xl bg-gradient-to-r from-accent to-accent/90 text-xs font-bold text-accent-foreground shadow-[0_3px_12px_-3px_rgba(197,168,92,0.3)] border border-accent/10"
                disabled={product.stock === 0}
                onClick={() => {
                  addToCart(product, quantity);
                  toast.success(`${product.name} কার্টে যোগ হয়েছে!`);
                }}
              >
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5 shrink-0" /> কার্টে যোগ করুন
              </Button>
              <Button
                size="default"
                className="h-11.5 flex-[1.2] rounded-xl bg-gradient-to-r from-success to-[#22995e] text-xs font-extrabold text-white shadow-[0_3px_15px_-3px_rgba(43,178,114,0.3)]"
                disabled={product.stock === 0}
                onClick={() => setCodModalOpen(true)}
              >
                <Banknote className="mr-1.5 h-4 w-4 shrink-0" /> অর্ডার করুন
              </Button>
            </div>
          </div>
        )}
      </main>

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
            className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation buttons */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
                  }}
                  className="absolute left-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image display */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative max-h-[75vh] max-w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <OptimizedImage
                src={product.images[lightboxImage]}
                alt={`${product.name} full view`}
                loading="eager"
                sizes="90vw"
                className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </motion.div>

            {/* Thumbnail selector */}
            {product.images.length > 1 && (
              <div className="mt-8 flex gap-3 overflow-x-auto p-2" onClick={(e) => e.stopPropagation()}>
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxImage(i)}
                    className={`relative aspect-square h-14 overflow-hidden rounded-xl border-2 transition-all duration-300 md:h-16 ${
                      lightboxImage === i ? "border-accent ring-2 ring-accent/30 scale-105" : "border-transparent opacity-40 hover:opacity-100"
                    }`}
                  >
                    <OptimizedImage src={img} alt={`thumbnail ${i + 1}`} loading="lazy" sizes="100px" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CodOrderModal open={codModalOpen} onOpenChange={setCodModalOpen} product={product} quantity={quantity} />
    </div>
  );
};

export default ProductDetail;
