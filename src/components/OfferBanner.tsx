import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Timer, Copy, Check, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { OfferBanner as OfferBannerConfig } from "@/hooks/useStoreSettings";
import { toast } from "sonner";

interface Props {
  config: OfferBannerConfig;
}

const OfferBanner = ({ config }: Props) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [bgImage, setBgImage] = useState(config.bg_image);

  // Responsive background image handler
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && config.mobile_image) {
        setBgImage(config.mobile_image);
      } else {
        setBgImage(config.bg_image || config.mobile_image);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [config.bg_image, config.mobile_image]);

  // Countdown timer logic
  useEffect(() => {
    if (!config.show_countdown || !config.end_date) return;
    const update = () => {
      const end = new Date(config.end_date).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [config.end_date, config.show_countdown]);

  const handleCopy = () => {
    if (config.coupon_code) {
      navigator.clipboard.writeText(config.coupon_code);
      setCopied(true);
      toast.success("কুপন কোড কপি হয়েছে!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      className="relative overflow-hidden py-16 md:py-24 border-b border-accent/20"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Background Overlays */}
      <div className="absolute inset-0 bg-[#05140e]/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05140e] via-[#05140e]/80 to-transparent" />
      
      {/* Ambient Radial Lights */}
      <div className="absolute -right-24 -top-24 h-[400px] w-[400px] rounded-full bg-accent/[0.08] blur-[120px] pointer-events-none" />
      <div className="absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-accent/[0.05] blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--accent)) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />

      <div className="container relative z-10 px-4">
        <div className="max-w-2xl">
          
          {/* Main Content Card with Glassmorphic visual style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl border border-accent/15 bg-primary-foreground/[0.01] p-6 md:p-10 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden"
          >
            {/* Corner Ornamental SVGs */}
            <svg className="absolute top-3 left-3 h-6 w-6 text-accent/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M1 8V1h7" />
            </svg>
            <svg className="absolute top-3 right-3 h-6 w-6 text-accent/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M23 8V1h-7" />
            </svg>
            <svg className="absolute bottom-3 left-3 h-6 w-6 text-accent/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M1 16v7h7" />
            </svg>
            <svg className="absolute bottom-3 right-3 h-6 w-6 text-accent/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M23 16v7h-7" />
            </svg>

            {/* Promo Tag */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              <Sparkles className="h-3 w-3 animate-pulse" />
              বিশেষ অফার
            </span>

            {/* Title */}
            <h2 className="mt-5 font-display text-3xl font-extrabold text-primary-foreground md:text-4xl lg:text-5xl leading-tight">
              {config.title}
            </h2>
            
            {/* Subtitle */}
            <p className="mt-3 text-base md:text-lg text-primary-foreground/75 leading-relaxed">
              {config.subtitle}
            </p>

            {/* Coupon Code Section */}
            {config.coupon_code && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative inline-flex items-center gap-4 rounded-xl border border-dashed border-accent/35 bg-accent/[0.03] px-5 py-3 backdrop-blur-sm group overflow-hidden">
                  <div className="absolute -inset-1 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span className="text-[11px] uppercase tracking-wider text-primary-foreground/50 font-semibold">কুপন কোড:</span>
                  <span className="font-mono text-xl font-black tracking-widest text-accent">{config.coupon_code}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex h-11 items-center gap-1.5 rounded-xl bg-accent hover:bg-accent/90 px-4 text-xs font-bold text-accent-foreground shadow-[0_5px_15px_-5px_hsl(var(--accent)/0.4)] transition-all hover:scale-105"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "কপি হয়েছে" : "কপি করুন"}
                </button>
              </div>
            )}

            {/* Divider */}
            {(config.coupon_code || (config.show_countdown && config.end_date)) && (
              <div className="my-6 w-full h-[1px] bg-gradient-to-r from-accent/20 via-accent/5 to-transparent" />
            )}

            {/* Countdown Clock */}
            {config.show_countdown && config.end_date && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-accent/80 uppercase tracking-wide">
                  <Timer className="h-4 w-4 animate-pulse" />
                  <span>অফারের সময়সীমা শেষ হতে বাকি:</span>
                </div>
                
                <div className="flex gap-2">
                  {[
                    { v: timeLeft.days, l: "দিন" },
                    { v: timeLeft.hours, l: "ঘণ্টা" },
                    { v: timeLeft.minutes, l: "মিনিট" },
                    { v: timeLeft.seconds, l: "সেকেন্ড" },
                  ].map(({ v, l }) => (
                    <div key={l} className="flex flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/5 font-mono text-lg font-extrabold text-accent border border-accent/15 shadow-[inset_0_1px_4px_rgba(255,255,255,0.05)]">
                        {String(v).padStart(2, "0")}
                      </span>
                      <span className="mt-1 text-[9px] text-primary-foreground/40 font-bold uppercase tracking-wide">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-7">
              <Button
                size="lg"
                className="group rounded-full bg-accent px-8 font-bold text-accent-foreground shadow-[0_5px_25px_-5px_hsl(var(--accent)/0.5)] hover:shadow-[0_8px_30px_-5px_hsl(var(--accent)/0.7)] transition-all hover:scale-105 duration-300"
                onClick={() => navigate(config.button_url || "/products")}
              >
                {config.button_text || "অফার দেখুন"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </Button>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OfferBanner;
