import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Timer, Copy, Check, ArrowRight } from "lucide-react";
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
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        backgroundImage: config.bg_image ? `url(${config.bg_image})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-primary/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-transparent" />
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-accent/8 blur-[160px]" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent/5 blur-[120px]" />

      <div className="container relative z-10">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
          >
            বিশেষ অফার
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-6 font-display text-4xl font-extrabold text-primary-foreground md:text-5xl"
          >
            {config.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-4 text-lg text-primary-foreground/70"
          >
            {config.subtitle}
          </motion.p>

          {/* Coupon code */}
          {config.coupon_code && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-8 inline-flex items-center gap-3 rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 px-6 py-4 backdrop-blur-sm"
            >
              <span className="font-display text-2xl font-extrabold tracking-widest text-accent">{config.coupon_code}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-all hover:scale-105"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "কপি হয়েছে" : "কপি করুন"}
              </button>
            </motion.div>
          )}

          {/* Countdown */}
          {config.show_countdown && config.end_date && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="mt-8 flex items-center gap-2"
            >
              <Timer className="h-4 w-4 text-accent" />
              <span className="text-sm text-primary-foreground/60 mr-2">অফার শেষ হতে বাকি:</span>
              {[
                { v: timeLeft.days, l: "দিন" },
                { v: timeLeft.hours, l: "ঘণ্টা" },
                { v: timeLeft.minutes, l: "মিনিট" },
                { v: timeLeft.seconds, l: "সেকেন্ড" },
              ].map(({ v, l }) => (
                <div key={l} className="flex flex-col items-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10 font-display text-xl font-extrabold text-primary-foreground backdrop-blur-sm border border-primary-foreground/10">
                    {String(v).padStart(2, "0")}
                  </span>
                  <span className="mt-1 text-[9px] text-primary-foreground/40 uppercase tracking-wide">{l}</span>
                </div>
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Button
              size="lg"
              className="group rounded-full bg-accent px-8 font-bold text-accent-foreground shadow-[0_0_30px_-8px_hsl(var(--accent)/0.6)] hover:scale-105"
              onClick={() => navigate(config.button_url || "/products")}
            >
              {config.button_text || "অফার দেখুন"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OfferBanner;
