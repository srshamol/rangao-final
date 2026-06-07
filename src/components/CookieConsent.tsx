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
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 z-[1000] w-[90%] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-background/95 p-5 shadow-2xl backdrop-blur-md md:bottom-8 md:w-full"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-2.5 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display text-sm font-bold text-foreground">কুকি পলিসি ও ট্র্যাকিং</h4>
              <p className="font-bengali text-xs leading-relaxed text-muted-foreground">
                আমরা আপনার শপিং অভিজ্ঞতা আরও উন্নত করতে এবং ওয়েবসাইটের পারফরম্যান্স ট্র্যাকিংয়ের জন্য কুকি ব্যবহার করি।
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2.5">
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl font-bengali text-xs font-semibold text-muted-foreground border-border hover:bg-secondary"
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> না, থাক
            </Button>
            <Button
              onClick={handleAccept}
              size="sm"
              className="h-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bengali text-xs font-bold shadow-md shadow-primary/20"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" /> ঠিক আছে
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
