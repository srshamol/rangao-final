import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ShoppingBag, Gift, Star, Award, Layers, ClipboardList, Heart, MapPin, User, Mail, HelpCircle, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  getCatCount: (slug: string) => number;
}

const MobileDrawer = ({ isOpen, onClose, categories, getCatCount }: Props) => {
  const navigate = useNavigate();
  const { user } = useCustomer();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const { data: settings } = useStoreSettings();

  const contact = settings?.contactInfo;
  const rawPhone = contact?.phone || "01812-345678";

  const toBengaliNumber = (numStr: string) => {
    const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return numStr.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
  };

  const formatDisplayPhone = (phone: string) => {
    let formatted = phone;
    if (phone.startsWith("0")) {
      formatted = `+880 ${phone.substring(1)}`;
    }
    return toBengaliNumber(formatted);
  };

  const cleanPhone = rawPhone.replace(/[^\d+]/g, "");
  const telLink = cleanPhone.startsWith("+") ? `tel:${cleanPhone}` : `tel:+88${cleanPhone}`;

  // Scroll lock and Escape key listener when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, onClose]);

  const handleLinkClick = (href: string) => {
    onClose();
    navigate(href);
  };

  const parentCats = categories.filter((c) => !c.parent_id);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
            aria-label="মেনু নেভিগেশন"
            className="fixed bottom-0 left-0 top-0 z-[1100] flex h-full w-[80vw] max-w-[360px] flex-col bg-background shadow-2xl lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4 bg-gradient-to-r from-secondary/50 to-background">
              <span className="font-display text-base font-extrabold text-foreground">মেনু নেভিগেশন</span>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="মেনু বন্ধ করুন"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-none">
              <div className="space-y-6">
                
                {/* Section: Shop */}
                <div className="space-y-2">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">শপ কালেকশন</p>
                  
                  {/* Collapsible Categories */}
                  <div className="rounded-xl border border-border/40 bg-secondary/20 p-2">
                    <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">ক্যাটাগরি সমূহ</p>
                    <div className="space-y-1">
                      {parentCats.map((parent) => {
                        const isExpanded = expandedCat === parent.id;
                        const subCats = categories.filter((c) => c.parent_id === parent.id);
                        return (
                          <div key={parent.id} className="space-y-1">
                            <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-foreground hover:bg-secondary">
                              <button
                                onClick={() => handleLinkClick(`/category/${parent.slug}`)}
                                className="flex-1 text-left font-bold text-foreground/90 hover:text-accent truncate focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                              >
                                {parent.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedCat(isExpanded ? null : parent.id)}
                                aria-expanded={isExpanded}
                                aria-label={`${parent.name} সাব-ক্যাটাগরি ${isExpanded ? 'বন্ধ করুন' : 'দেখুন'}`}
                                className="flex items-center gap-1.5 pl-4 py-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                              >
                                <span className="text-[9px] bg-primary/10 dark:bg-primary-foreground/10 text-primary dark:text-foreground/80 px-1.5 py-0.5 rounded-full">
                                  {getCatCount(parent.slug)}
                                </span>
                                {subCats.length > 0 && (
                                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                )}
                              </button>
                            </div>

                            {/* Subcategories */}
                            {isExpanded && subCats.length > 0 && (
                              <div className="pl-5 space-y-1 border-l border-border/40 ml-4 mb-2">
                                {subCats.map((child) => (
                                  <button
                                    key={child.id}
                                    onClick={() => handleLinkClick(`/category/${child.slug}`)}
                                    className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-accent py-1.5 px-2 rounded-lg"
                                  >
                                    <span>{child.name}</span>
                                    <span className="text-[9px] bg-secondary px-1.5 py-0.2 rounded-full">{getCatCount(child.slug)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Standard shop links */}
                  <div className="space-y-1 pt-1">
                    {[
                      { label: "সমস্ত প্রোডাক্টস", icon: ShoppingBag, href: "/products" },
                      { label: "বিশেষ অফারসমূহ", icon: Gift, href: "/products?filter=featured" },
                      { label: "নতুন কালেকশন", icon: Star, href: "/products?filter=newest" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleLinkClick(item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-secondary hover:text-accent transition-colors"
                      >
                        <item.icon className="h-4.5 w-4.5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Account */}
                <div className="space-y-2">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">আমার অ্যাকাউন্ট</p>
                  <div className="space-y-1">
                    {[
                      { label: "অর্ডার হিস্টোরি", icon: ClipboardList, href: user ? "/account/orders" : "/login" },
                      { label: "পছন্দ তালিকা", icon: Heart, href: user ? "/account/wishlist" : "/login" },
                      { label: "ঠিকানা সমূহ", icon: MapPin, href: user ? "/account/profile" : "/login" },
                      { label: user ? "ড্যাশবোর্ড" : "লগইন / রেজিস্টার", icon: User, href: user ? "/account" : "/login" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleLinkClick(item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-secondary hover:text-accent transition-colors"
                      >
                        <item.icon className="h-4.5 w-4.5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Support */}
                <div className="space-y-2">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">সহযোগিতা ও তথ্য</p>
                  <div className="space-y-1">
                    {[
                      { label: "আমাদের সম্পর্কে", icon: HelpCircle, href: "/about" },
                      { label: "ব্লগ ও টিপস", icon: BookOpen, href: "/blog" },
                      { label: "যোগাযোগ করুন", icon: Mail, href: "#contact" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.href.startsWith("#")) {
                            onClose();
                            document.getElementById(item.href.substring(1))?.scrollIntoView({ behavior: "smooth" });
                          } else {
                            handleLinkClick(item.href);
                          }
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-secondary hover:text-accent transition-colors"
                      >
                        <item.icon className="h-4.5 w-4.5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer contact info */}
            <div className="border-t border-border/40 p-5 bg-secondary/10 text-center">
              <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase tracking-widest">
                {settings?.storeInfo?.name ? `${settings.storeInfo.name.split(" - ")[0]} কাস্টমার কেয়ার` : "রাঙাও কাস্টমার কেয়ার"}
              </span>
              <a href={telLink} className="text-sm font-extrabold text-primary hover:text-accent transition-colors block mt-1">
                {formatDisplayPhone(rawPhone)}
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
