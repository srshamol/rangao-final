import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown, MessageCircle, ShoppingCart, User, Watch, Headphones, BatteryCharging, Home, Search, Phone, Mail, Facebook, Instagram, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, products, formatPrice } from "@/data/products";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useCustomer } from "@/context/CustomerContext";
import { useNavigate } from "react-router-dom";

const iconMap: Record<string, React.ElementType> = { Watch, Headphones, BatteryCharging, Home };

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { totalItems, setIsOpen } = useCart();
  const { user, profile } = useCustomer();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const contact = settings?.contactInfo;
  const PHONE_NUMBER = contact?.phone || "+8801XXXXXXXXX";
  const whatsappNum = contact?.whatsapp || "8801XXXXXXXXX";
  const contactEmail = contact?.email || "info@gadgetgram.com";
  const getWhatsAppLink = (name?: string) => {
    const msg = name ? `হ্যালো, আমি ${name} সম্পর্কে জানতে চাই।` : "হ্যালো, আমি GadgetGram থেকে একটি প্রোডাক্ট সম্পর্কে জানতে চাই।";
    return `https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`;
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const getCatCount = (catId: string) => products.filter(p => p.category === catId).length;

  const searchResults = searchQuery.length > 1
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.shortDescription.includes(searchQuery))
    : [];

  const handleSearchSelect = (productId: string) => {
    navigate(`/product/${productId}`);
    setSearchQuery("");
    setSearchOpen(false);
  };

  // Featured products per category for mega menu
  const getFeaturedForCat = (catId: string) => products.filter(p => p.category === catId && p.featured).slice(0, 2);

  return (
    <>
      {/* Top Bar */}
      <div className="relative z-50 hidden border-b border-primary-foreground/5 bg-primary text-primary-foreground md:block">
        <div className="container flex h-9 items-center justify-between text-[11px]">
          <div className="flex items-center gap-5">
            <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-1.5 text-primary-foreground/50 transition-colors hover:text-accent">
              <Phone className="h-3 w-3" /> {PHONE_NUMBER}
            </a>
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 text-primary-foreground/50 transition-colors hover:text-accent">
              <Mail className="h-3 w-3" /> {contactEmail}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-primary-foreground/30">সারা বাংলাদেশে ফ্রি ডেলিভারি</span>
            <span className="text-primary-foreground/15">|</span>
            <div className="flex items-center gap-2">
              <a href="#" className="text-primary-foreground/40 transition-colors hover:text-accent"><Facebook className="h-3 w-3" /></a>
              <a href="#" className="text-primary-foreground/40 transition-colors hover:text-accent"><Instagram className="h-3 w-3" /></a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-40 w-full transition-all duration-500 ${
        scrolled
          ? "bg-primary/95 shadow-[0_4px_30px_-4px_hsl(var(--primary)/0.3)] backdrop-blur-2xl backdrop-saturate-150"
          : "bg-primary"
      }`}>
        <div className="container flex items-center justify-between py-0">
          {/* Logo */}
          <a href="/" className="group flex shrink-0 items-center gap-2.5 py-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-gold transition-all duration-300 group-hover:scale-105 group-hover:shadow-gold-lg">
              <span className="font-display text-lg font-extrabold text-accent-foreground">G</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-extrabold tracking-tight text-primary-foreground md:text-2xl">
                Gadget<span className="text-accent">Gram</span>
              </span>
              <span className="hidden text-[8px] font-semibold uppercase tracking-[0.25em] text-primary-foreground/35 lg:block">
                প্রিমিয়াম গ্যাজেট স্টোর
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {[
              { label: "হোম", href: "/" },
              { label: "সমস্ত প্রোডাক্ট", href: "/products" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group relative rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground/60 transition-all duration-200 hover:text-primary-foreground"
              >
                {item.label}
                <span className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-accent transition-all duration-300 group-hover:w-6" />
              </a>
            ))}

            {/* Mega Menu Category Dropdown */}
            <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <button className="group relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground/60 transition-colors hover:text-primary-foreground">
                ক্যাটাগরি <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${catOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {catOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -left-20 top-full mt-3 w-[600px] overflow-hidden rounded-2xl border border-border/30 bg-card p-0 shadow-premium-xl backdrop-blur-xl"
                  >
                    <div className="grid grid-cols-2 gap-0">
                      {/* Categories list */}
                      <div className="border-r border-border/20 p-4">
                        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">সমস্ত ক্যাটাগরি</p>
                        {categories.map((c) => {
                          const Icon = iconMap[c.icon];
                          const count = getCatCount(c.id);
                          return (
                            <a key={c.id} href="#products" className="group/item flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-card-foreground transition-all duration-200 hover:bg-accent/8 hover:pl-4">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-all duration-200 group-hover/item:bg-accent/15 group-hover/item:text-accent">
                                {Icon && <Icon className="h-4 w-4" />}
                              </span>
                              <div className="flex-1">
                                <span className="font-semibold">{c.name}</span>
                                <p className="text-[10px] text-muted-foreground/60">{count}টি প্রোডাক্ট</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>

                      {/* Featured products */}
                      <div className="p-4">
                        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">জনপ্রিয় প্রোডাক্ট</p>
                        <div className="space-y-2">
                          {products.filter(p => p.featured).slice(0, 3).map((p) => (
                            <a
                              key={p.id}
                              href={`/product/${p.id}`}
                              className="flex items-center gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-secondary"
                            >
                              <img src={p.images[0]} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-card-foreground truncate">{p.name}</p>
                                <p className="text-xs font-bold text-accent">{formatPrice(p.price)}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                        <a href="/products" className="mt-3 flex items-center justify-center rounded-xl bg-accent/5 py-2.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10">
                          সব প্রোডাক্ট দেখুন →
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <a href="/blog" className="group relative rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground/60 transition-colors hover:text-primary-foreground">
              ব্লগ/টিপস
              <span className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-accent transition-all duration-300 group-hover:w-6" />
            </a>
            <a href="#contact" className="group relative rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground/60 transition-colors hover:text-primary-foreground">
              যোগাযোগ
              <span className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-accent transition-all duration-300 group-hover:w-6" />
            </a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground/60 transition-all duration-200 hover:bg-primary-foreground/5 hover:text-primary-foreground"
            >
              <Search className="h-5 w-5" />
            </button>

            <a
              href={user ? "/account" : "/login"}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground/60 transition-all duration-200 hover:bg-primary-foreground/5 hover:text-primary-foreground"
              title={user ? (profile?.full_name || "অ্যাকাউন্ট") : "লগইন"}
            >
              <User className={`h-5 w-5 ${user ? "text-accent" : ""}`} />
            </a>

            <button
              onClick={() => setIsOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground/60 transition-all duration-200 hover:bg-primary-foreground/5 hover:text-primary-foreground"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground shadow-gold"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground/60 transition-colors hover:bg-primary-foreground/5 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search Bar - Expandable */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-primary-foreground/5"
            >
              <div className="container py-3">
                <div className="relative mx-auto max-w-2xl">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/30" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="প্রোডাক্ট সার্চ করুন..."
                    className="w-full rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 py-3 pl-11 pr-4 text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-foreground/30 hover:text-primary-foreground/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-border/30 bg-card p-2 shadow-premium-xl">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSearchSelect(p.id)}
                          className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-secondary"
                        >
                          <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-card-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.shortDescription}</p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-accent">{formatPrice(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length > 1 && searchResults.length === 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border/30 bg-card p-6 text-center shadow-premium-xl">
                      <p className="text-sm text-muted-foreground">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-primary-foreground/8 bg-primary lg:hidden"
            >
              <nav className="container flex flex-col gap-1 py-4">
                {/* Mobile search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/30" />
                  <input
                    type="text"
                    placeholder="সার্চ করুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 py-2.5 pl-10 pr-4 text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-1">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { handleSearchSelect(p.id); setMobileOpen(false); }}
                          className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-primary-foreground hover:bg-primary-foreground/5"
                        >
                          <img src={p.images[0]} alt={p.name} className="h-8 w-8 rounded-lg object-cover" />
                          <span className="flex-1 text-xs font-medium truncate">{p.name}</span>
                          <span className="text-xs font-bold text-accent">{formatPrice(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <a href="/" className="rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/5">হোম</a>
                <a href="/products" className="rounded-xl px-4 py-3 text-sm font-medium text-primary-foreground/60 hover:bg-primary-foreground/5 hover:text-primary-foreground">সমস্ত প্রোডাক্ট</a>
                <div className="pl-2">
                  <p className="px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground/25">ক্যাটাগরি</p>
                  {categories.map((c) => {
                    const Icon = iconMap[c.icon];
                    return (
                      <a key={c.id} href="#products" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-primary-foreground/60 hover:bg-primary-foreground/5 hover:text-primary-foreground">
                        {Icon && <Icon className="h-4 w-4" />}
                        <span className="flex-1">{c.name}</span>
                        <span className="text-[10px] font-bold text-primary-foreground/25">{getCatCount(c.id)}</span>
                      </a>
                    );
                  })}
                </div>
                <a href="/blog" className="rounded-xl px-4 py-3 text-sm font-medium text-primary-foreground/60 hover:bg-primary-foreground/5 hover:text-primary-foreground">ব্লগ/টিপস</a>
                <a href={user ? "/account" : "/login"} className="rounded-xl px-4 py-3 text-sm font-medium text-primary-foreground/60 hover:bg-primary-foreground/5 hover:text-primary-foreground">
                  {user ? "👤 আমার অ্যাকাউন্ট" : "🔐 লগইন / রেজিস্ট্রেশন"}
                </a>
                <a href="#contact" className="rounded-xl px-4 py-3 text-sm font-medium text-primary-foreground/60 hover:bg-primary-foreground/5 hover:text-primary-foreground">যোগাযোগ</a>
                <div className="mt-3 border-t border-primary-foreground/8 pt-4">
                  <Button asChild className="w-full rounded-full bg-success font-semibold text-success-foreground hover:bg-success/90">
                    <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp এ যোগাযোগ করুন
                    </a>
                  </Button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Header;
