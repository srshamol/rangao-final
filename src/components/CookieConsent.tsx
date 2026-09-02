import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initializeTracking } from "@/services/analytics";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show if user has not yet made a consent choice
    const saved = localStorage.getItem("rangao_cookie_consent");
    if (!saved) {
      // Defer showing banner slightly so it does not interfere with initial paint
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("rangao_cookie_consent", "accepted");
    setShowBanner(false);
    initializeTracking();
  };

  const handleDeclineNonEssential = () => {
    localStorage.setItem("rangao_cookie_consent", "declined");
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          role="region"
          aria-label="কুকি ব্যবহারের সম্মতি"
          className="fixed bottom-0 left-0 right-0 z-[1000] p-3 sm:p-4 bg-background/95 backdrop-blur-md border-t border-border/60 shadow-2xl pb-[calc(env(safe-area-inset-bottom)+75px)] lg:pb-4"
        >
          <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent shrink-0 mt-0.5">
                <Cookie className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-foreground font-bengali flex items-center gap-1.5">
                  <span>আপনার তথ্যের সুরক্ষা ও কুকি ব্যবহারের নীতিমালা</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-bengali leading-relaxed">
                  আমরা আপনার ব্রাউজিং অভিজ্ঞতা উন্নত করতে ও নিরাপদ সেবা দিতে কুকি ব্যবহার করি। বিস্তারিত জানতে আমাদের{" "}
                  <Link
                    to="/cookie-policy"
                    className="text-accent underline font-semibold hover:text-accent/80"
                  >
                    কুকি পলিসি
                  </Link>{" "}
                  দেখুন।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeclineNonEssential}
                className="h-9 px-3 text-xs font-semibold rounded-xl font-bengali"
                aria-label="শুধুমাত্র প্রয়োজনীয় কুকি গ্রহণ করুন"
              >
                প্রয়োজনীয় কুকি মাত্র
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="h-9 px-4 text-xs font-bold rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-bengali shadow-xs"
                aria-label="সকল কুকি ও ট্র্যাকিং সম্মতি গ্রহণ করুন"
              >
                <Check className="mr-1 h-3.5 w-3.5 stroke-[3]" /> সবগুলো গ্রহণ করুন
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
