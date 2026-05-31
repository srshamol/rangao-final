import { Phone, Mail, Facebook, Instagram, MapPin, ArrowUpRight, ArrowUp, Banknote, Truck, ShieldCheck } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Footer = () => {
  const { data: settings } = useStoreSettings();
  const contact = settings?.contactInfo;
  const phone = contact?.phone || "+8801XXXXXXXXX";
  const email = contact?.email || "info@gadgetgram.com";
  const address = contact?.address || "ঢাকা, বাংলাদেশ";
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer id="contact" className="relative overflow-hidden border-t border-primary-foreground/5 bg-primary text-primary-foreground">
      <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-accent/4 blur-[150px]" />
      <div className="absolute left-1/3 bottom-0 h-60 w-60 rounded-full bg-primary-foreground/2 blur-[120px]" />

      <div className="container relative py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-gold">
                <span className="font-display text-lg font-extrabold text-accent-foreground">G</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-extrabold">
                  Gadget<span className="text-accent">Gram</span>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/30">
                  প্রিমিয়াম গ্যাজেট স্টোর
                </span>
              </div>
            </div>
            <p className="mt-5 max-w-sm font-bengali text-sm leading-relaxed text-primary-foreground/50">
              প্রিমিয়াম গ্যাজেটের বিশ্বস্ত ঠিকানা। আমরা শুধুমাত্র অরিজিনাল এবং সেরা মানের প্রোডাক্ট সরবরাহ করি, ওয়ারেন্টি ও সম্পূর্ণ আফটার-সেলস সাপোর্ট সহ।
            </p>
            <div className="mt-6 flex gap-2.5">
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/[0.04] text-primary-foreground/50 transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-gold">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/[0.04] text-primary-foreground/50 transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-gold">
                <Instagram className="h-4 w-4" />
              </a>
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
          <div>
            <h4 className="mb-6 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">দ্রুত লিংক</h4>
            <div className="space-y-3.5">
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

          {/* Contact */}
          <div>
            <h4 className="mb-6 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">যোগাযোগ</h4>
            <div className="space-y-3.5">
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
            <div className="mt-8 space-y-2">
              {[
                { icon: ShieldCheck, text: "১০০% অরিজিনাল গ্যারান্টি" },
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
            © {new Date().getFullYear()} GadgetGram. সর্বস্বত্ব সংরক্ষিত।
          </p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-primary-foreground/25">
              ডিজাইন ও ডেভেলপমেন্ট — ডিজিটাল আর্কিটেক্ট
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
