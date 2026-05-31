import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const FloatingWhatsApp = () => {
  const [hovered, setHovered] = useState(false);
  const { data: settings } = useStoreSettings();
  const whatsapp = settings?.contactInfo?.whatsapp || "8801XXXXXXXXX";

  const link = `https://wa.me/${whatsapp}?text=${encodeURIComponent("হ্যালো, আমি GadgetGram থেকে একটি প্রোডাক্ট সম্পর্কে জানতে চাই।")}`;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.span
        initial={{ opacity: 0, x: 10 }}
        animate={hovered ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl bg-card px-4 py-2 text-sm font-semibold text-card-foreground shadow-premium-lg"
      >
        আমাদের সাথে চ্যাট করুন
      </motion.span>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg animate-pulse-glow transition-transform hover:scale-110 active:scale-95"
        aria-label="WhatsApp এ যোগাযোগ করুন"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </motion.div>
  );
};

export default FloatingWhatsApp;
