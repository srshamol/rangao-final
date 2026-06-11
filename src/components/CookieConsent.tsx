import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Check, X } from "lucide-react";
import { initializeTracking } from "@/services/analytics";
import { registerVitals } from "@/utils/vitals";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("rangao_cookie_consent");
    if (!consent) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("rangao_cookie_consent", "accepted");
    setShowBanner(false);
    initializeTracking();
    registerVitals();
  };

  const handleDecline = () => {
    localStorage.setItem("rangao_cookie_consent", "declined");
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          // On mobile: sits ABOVE the 70px bottom nav bar (+16px gap = 86px)
          // On lg+ (desktop): no bottom nav, standard 32px from bottom
          className="cookie-banner-mobile fixed bottom-[86px] left-0 right-0 z-[1000] mx-auto w-[calc(100%-24px)] max-w-sm overflow-hidden rounded-2xl border border-border bg-background/97 shadow-2xl backdrop-blur-md lg:bottom-8 lg:max-w-md"
        >
          {/* Dismiss X — absolute top-right corner */}
          <button
            onClick={handleAccept}
            aria-label="বন্ধ করুন"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2.5 pr-6">
              <div className="shrink-0 rounded-full bg-primary/10 p-2 text-primary">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h4 className="font-display text-sm font-bold text-foreground leading-tight">
                কুকি পলিসি ও ট্র্যাকিং
              </h4>
            </div>

            {/* Description */}
            <p className="font-bengali text-[11.5px] leading-relaxed text-muted-foreground mb-4">
              আমরা আপনার শপিং অভিজ্ঞতা উন্নত করতে এবং ওয়েবসাইটের পারফরম্যান্স ট্র্যাকিংয়ের জন্য কুকি ব্যবহার করি।
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAccept}
                variant="outline"
                size="sm"
                className="h-9 flex-1 rounded-xl font-bengali text-xs font-semibold text-muted-foreground border-border hover:bg-secondary"
              >
                না, থাক
              </Button>
              <Button
                onClick={handleAccept}
                size="sm"
                className="h-9 flex-[2] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bengali text-xs font-bold shadow-md shadow-primary/20"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" /> ঠিক আছে, সম্মত
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

