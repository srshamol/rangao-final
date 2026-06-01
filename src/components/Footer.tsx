import { Phone, Mail, Facebook, Instagram, MapPin, ArrowUpRight, ArrowUp, Banknote, Truck, ShieldCheck, Youtube, Music, Send, PhoneCall, Globe, Users, Linkedin, Play, Twitter, ChevronDown } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const socialIconMap: Record<string, React.ElementType> = {
  facebook: Facebook,
  facebook_group: Users,
  instagram: Instagram,
  tiktok: Music,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
  telegram: Send,
  messenger: Globe,
  whatsapp: PhoneCall,
  custom: Globe
};

const Footer = () => {
  const { data: settings } = useStoreSettings();
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [catsExpanded, setCatsExpanded] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  
  // Query active categories dynamically from Supabase
  const { data: categories = [] } = useQuery({
    queryKey: ["footer-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    }
  });

  const parentCategories = categories.filter(c => !c.parent_id).slice(0, 5);

  const contact = settings?.contactInfo;
  const store = settings?.storeInfo;
  const phone = store?.phone || contact?.phone || "+8801XXXXXXXXX";
  const secondaryPhone = store?.secondary_phone;
  const email = store?.email || contact?.email || "info@rangao.com.bd";
  
  // Format address beautifully
  const address = store?.address_line1 
    ? `${store.address_line1}, ${store.address_line2 || ""}, ${store.city || ""}, ${store.district || ""} ${store.postal_code || ""}`
    : store?.address || contact?.address || "ঢাকা, বাংলাদেশ";
    
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer id="contact" className="relative overflow-hidden border-t border-primary-foreground/5 bg-primary text-primary-foreground">
      <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-accent/4 blur-[150px]" />
      <div className="absolute left-1/3 bottom-0 h-60 w-60 rounded-full bg-primary-foreground/2 blur-[120px]" />

      <div className="container relative py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              {store?.white_logo_url || store?.logo_url ? (
                <img 
                  src={store.white_logo_url || store.logo_url} 
                  alt={store.name || "Rangao"} 
                  style={{
                    width: `${store.logo_desktop_width || 140}px`,
                    height: `${store.logo_desktop_height || 40}px`
                  }}
                  className={`object-contain ${!store.white_logo_url ? "brightness-0 invert" : ""}`}
                />
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-gold">
                    <span className="font-display text-lg font-extrabold text-accent-foreground">R</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-xl font-extrabold">
                      {store?.name ? store.name.split(" - ")[0] : "Rangao"}<span className="text-accent">.</span>
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/30">
                      প্রিমিয়াম ইসলামিক ও হোম ডেকোর
                    </span>
                  </div>
                </>
              )}
            </div>
            <p className="mt-5 max-w-sm font-bengali text-sm leading-relaxed text-primary-foreground/50">
              রাঙাও — আপনার ঘরকে রাঙিয়ে তুলুন শৈল্পিক ও ইসলামিক নান্দনিকতায়। আমরা শুধুমাত্র অরিজিনাল এবং প্রিমিয়াম কোয়ালিটির ইসলামিক ওয়াল আর্ট, কাঠের ডেকোর ও কাস্টম ফ্রেম সরবরাহ করি।
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {contact?.social_links && contact.social_links.length > 0 ? (
                contact.social_links
                  .filter(l => l.enabled)
                  .map(link => {
                    const Icon = socialIconMap[link.platform] || Globe;
                    return (
                      <a 
                        key={link.id}
                        href={link.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/[0.04] text-primary-foreground/50 transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-gold"
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </a>
                    );
                  })
              ) : (
                <>
                  <a href={contact?.facebook_url || "#"} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/[0.04] text-primary-foreground/50 transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-gold">
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a href={contact?.instagram_url || "#"} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/[0.04] text-primary-foreground/50 transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-gold">
                    <Instagram className="h-4 w-4" />
                  </a>
                </>
              )}
            </div>

            {/* Payment methods */}
            <div className="mt-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/25">পেমেন্ট মেথড</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "ক্যাশ অন ডেলিভারি", icon: Banknote },
                  { label: "বিকাশ", icon: null, text: "bKash" },
                  { label: "নগদ", icon: null, text: "Nagad" },
                ].map((pm) => (
                  <span key={pm.label} className="flex items-center gap-1.5 rounded-lg bg-primary-foreground/[0.05] px-3 py-1.5 text-[10px] font-medium text-primary-foreground/40">
                    {pm.icon ? <pm.icon className="h-3 w-3" /> : <span className="font-bold">{pm.text}</span>}
                    {pm.icon && pm.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="border-b border-primary-foreground/5 pb-4 md:border-b-0 md:pb-0">
            <button 
              onClick={() => setLinksExpanded(!linksExpanded)}
              className="flex w-full items-center justify-between text-left md:pointer-events-none md:block mb-4 md:mb-6"
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">দ্রুত লিংক</h4>
              <ChevronDown className={`h-4 w-4 text-accent transition-transform duration-300 md:hidden ${linksExpanded ? "rotate-180" : ""}`} />
            </button>
            <div className={`space-y-3.5 md:block ${linksExpanded ? "block" : "hidden"}`}>
              {[
                { label: "হোম", href: "/" },
                { label: "সমস্ত প্রোডাক্ট", href: "/products" },
                { label: "ব্লগ/টিপস", href: "/blog" },
                { label: "যোগাযোগ", href: "#contact" },
              ].map((item) => (
                <a key={item.label} href={item.href} className="group flex items-center gap-1.5 text-sm text-primary-foreground/50 transition-all duration-200 hover:text-accent hover:pl-1">
                  {item.label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="border-b border-primary-foreground/5 pb-4 md:border-b-0 md:pb-0">
            <button 
              onClick={() => setCatsExpanded(!catsExpanded)}
              className="flex w-full items-center justify-between text-left md:pointer-events-none md:block mb-4 md:mb-6"
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">ক্যাটাগরি</h4>
              <ChevronDown className={`h-4 w-4 text-accent transition-transform duration-300 md:hidden ${catsExpanded ? "rotate-180" : ""}`} />
            </button>
            <div className={`space-y-3.5 md:block ${catsExpanded ? "block" : "hidden"}`}>
              {parentCategories.map((cat) => (
                <a key={cat.id} href={`/category/${cat.slug}`} className="group flex items-center gap-1.5 text-sm text-primary-foreground/50 transition-all duration-200 hover:text-accent hover:pl-1">
                  {cat.name}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))}
              {parentCategories.length === 0 && (
                <p className="text-xs text-primary-foreground/30">কোনো ক্যাটাগরি নেই</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="pb-4 md:pb-0">
            <button 
              onClick={() => setContactExpanded(!contactExpanded)}
              className="flex w-full items-center justify-between text-left md:pointer-events-none md:block mb-4 md:mb-6"
            >
              <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">যোগাযোগ</h4>
              <ChevronDown className={`h-4 w-4 text-accent transition-transform duration-300 md:hidden ${contactExpanded ? "rotate-180" : ""}`} />
            </button>
            <div className={`space-y-3.5 md:block ${contactExpanded ? "block" : "hidden"}`}>
              <a href={`tel:${phone}`} className="flex items-center gap-2.5 text-sm text-primary-foreground/50 transition-colors hover:text-accent">
                <Phone className="h-4 w-4 shrink-0" /> {phone}
              </a>
              <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-sm text-primary-foreground/50 transition-colors hover:text-accent">
                <Mail className="h-4 w-4 shrink-0" /> {email}
              </a>
              <div className="flex items-start gap-2.5 text-sm text-primary-foreground/50">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" /> {address}
              </div>
            </div>

            {/* Trust badges */}
            <div className={`mt-8 space-y-2 md:block ${contactExpanded ? "block" : "hidden"}`}>
              {[
                { icon: ShieldCheck, text: "১০০% প্রিমিয়াম কোয়ালিটি" },
                { icon: Truck, text: "দ্রুত ও নিরাপদ ডেলিভারি" },
              ].map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 text-[11px] text-primary-foreground/30">
                  <badge.icon className="h-3.5 w-3.5 text-accent/50" />
                  {badge.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/8 pt-8 md:flex-row">
          <p className="text-xs text-primary-foreground/35">
            © {new Date().getFullYear()} Rangao. সর্বস্বত্ব সংরক্ষিত।
          </p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-primary-foreground/25">
              ডিজাইন ও ডেভেলপমেন্ট — রাঙাও ডিজিটাল
            </p>
            {/* Back to Top */}
            <button
              onClick={scrollToTop}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/[0.06] text-primary-foreground/40 transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:shadow-gold hover:scale-105"
              title="উপরে যান"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
