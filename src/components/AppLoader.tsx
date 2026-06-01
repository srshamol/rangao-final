import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#07130f] text-white">
      {/* Decorative background glow elements */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#d97706]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[#0d9488]/15 blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center text-center px-4 max-w-sm">
        {/* Animated outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="relative flex items-center justify-center h-20 w-20 rounded-full border border-[#d97706]/20 border-t-[#d97706]"
        >
          {/* Inner pulse */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center h-14 w-14 rounded-full bg-[#d97706]/10 border border-[#d97706]/35"
          >
            <Sparkles className="h-6 w-6 text-[#d97706] animate-pulse" />
          </motion.div>
        </motion.div>

        {/* Brand Name */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 font-display text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400"
        >
          Rangao — রাঙাও
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-2 text-xs font-semibold tracking-widest uppercase text-emerald-100/70"
        >
          PREMIUM ISLAMIC HOME DECOR
        </motion.p>

        {/* Elegant loading bar */}
        <div className="mt-8 h-[2px] w-32 bg-[#0d9488]/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-full w-1/2 bg-gradient-to-r from-transparent via-[#d97706] to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
