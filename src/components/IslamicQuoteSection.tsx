import { useState } from "react";
import { BookOpen, Sparkles, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuoteItem {
  id?: string;
  arabic: string;
  bengali: string;
  source: string;
}

interface Props {
  quoteArabic?: string;
  quoteBengali?: string;
  source?: string;
  quotesList?: QuoteItem[];
  showOnlyCustom?: boolean;
  themeStyle?: "dark" | "classic" | "gold";
}

const IslamicQuoteSection = ({
  quoteArabic,
  quoteBengali,
  source,
  quotesList = [],
  showOnlyCustom = false,
  themeStyle = "dark",
}: Props) => {
  const [copied, setCopied] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Curated fallback/additional default quotes list
  const defaultQuotes: QuoteItem[] = [
    {
      arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
      bengali: "নিশ্চয়ই কষ্টের সাথেই স্বস্তি রয়েছে।",
      source: "সূরা আশ-শারহ্ (৯৪:৬)"
    },
    {
      arabic: "لاَ يُكَلِّفُ اللَّهُ نَفْسًا إِلاَّ وُسْعَهَا",
      bengali: "আল্লাহ কারও ওপর এমন কষ্ট চাপিয়ে দেন না যা তার সাধ্যের অতীত।",
      source: "সূরা আল-বাকারাহ্ (২:২৮৬)"
    },
    {
      arabic: "وَاصْبِرْ لِحُكْمِ رَبِّكَ فَإِنَّكَ بِأَعْيُنِنَا",
      bengali: "অতএব, আপনি আপনার পালনকর্তার নির্দেশের জন্য ধৈর্য ধারণ করুন, নিশ্চয়ই আপনি আমার চোখের সামনে রয়েছেন।",
      source: "সূরা আত-তূর (৫২:৪৮)"
    },
    {
      arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
      bengali: "সুতরাং তোমরা আমাকে স্মরণ কর, আমিও তোমাদের স্মরণ করব। আর আমার কৃতজ্ঞতা প্রকাশ কর, আমার অকৃতজ্ঞ হয়ো না।",
      source: "সূরা আল-বাকারাহ্ (২:১৫২)"
    }
  ];

  // Compile final quotes array
  const quotes: QuoteItem[] = [];

  // 1. Gather all custom quotes from quotesList
  if (Array.isArray(quotesList) && quotesList.length > 0) {
    quotesList.forEach(q => {
      if (q.arabic || q.bengali) {
        quotes.push({
          arabic: q.arabic,
          bengali: q.bengali,
          source: q.source || "উদ্ধৃতি"
        });
      }
    });
  }

  // 2. Gather legacy single custom quote fallback
  if (quotes.length === 0 && (quoteArabic || quoteBengali)) {
    quotes.push({
      arabic: quoteArabic || "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
      bengali: quoteBengali || "নিশ্চয়ই কষ্টের সাথেই স্বস্তি রয়েছে।",
      source: source || "উদ্ধৃতি"
    });
  }

  const hasCustom = quotes.length > 0;

  // 3. Append defaults if showOnlyCustom is false, or if there are no custom quotes at all
  if (!showOnlyCustom || !hasCustom) {
    defaultQuotes.forEach(dq => {
      // Avoid duplicate keys/values
      if (!quotes.some(q => q.arabic === dq.arabic || q.bengali === dq.bengali)) {
        quotes.push(dq);
      }
    });
  }

  const activeQuote = quotes[currentIdx] || defaultQuotes[0];

  // Sparkles configuration for background ambiance
  const sparkles = [
    { left: "8%", top: "18%", delay: 0.1, duration: 4.5 },
    { right: "10%", top: "12%", delay: 0.7, duration: 5.5 },
    { left: "12%", bottom: "22%", delay: 0.3, duration: 3.8 },
    { right: "15%", bottom: "16%", delay: 1.1, duration: 4.8 },
  ];

  const handleCopy = async () => {
    const textToCopy = `${activeQuote.arabic}\n\n"${activeQuote.bengali}"\n— ${activeQuote.source}\n\nউদ্ধৃত: Rangao (রাঙাও)`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy quote: ", err);
    }
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % quotes.length);
  };

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev - 1 + quotes.length) % quotes.length);
  };

  // Theme configuration mappings
  const theme = themeStyle || "dark";
  const styles = {
    dark: {
      bg: "bg-[#05140e] border-accent/25",
      glow1: "bg-accent/[0.04]",
      glow2: "bg-accent/[0.03]",
      card: "bg-[#091a13]/85 border-accent/20 hover:border-accent/40",
      accentText: "text-accent",
      borderGlow: "from-accent/5 via-accent/30 to-accent/5",
      badgeBg: "bg-accent/5 border-accent/20 text-accent",
      badgeIconBg: "bg-accent/10 border-accent/25 text-accent",
      navBtn: "text-accent hover:text-accent-foreground hover:bg-accent/15",
      indicatorActive: "bg-accent",
      indicatorInactive: "bg-accent/25"
    },
    classic: {
      bg: "bg-[#062419] border-emerald-500/25",
      glow1: "bg-emerald-500/[0.05]",
      glow2: "bg-emerald-500/[0.03]",
      card: "bg-[#082b1f]/90 border-emerald-500/20 hover:border-emerald-500/40",
      accentText: "text-emerald-400",
      borderGlow: "from-emerald-500/5 via-emerald-500/30 to-emerald-500/5",
      badgeBg: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
      badgeIconBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
      navBtn: "text-emerald-400 hover:text-emerald-950 hover:bg-emerald-500/15",
      indicatorActive: "bg-emerald-500",
      indicatorInactive: "bg-emerald-500/25"
    },
    gold: {
      bg: "bg-[#16120a] border-yellow-600/25",
      glow1: "bg-yellow-600/[0.06]",
      glow2: "bg-yellow-600/[0.03]",
      card: "bg-[#1e170d]/90 border-yellow-600/20 hover:border-yellow-600/40",
      accentText: "text-yellow-500",
      borderGlow: "from-yellow-600/5 via-yellow-600/30 to-yellow-600/5",
      badgeBg: "bg-yellow-600/5 border-yellow-600/20 text-yellow-500",
      badgeIconBg: "bg-yellow-600/10 border-yellow-600/25 text-yellow-500",
      navBtn: "text-yellow-500 hover:text-yellow-950 hover:bg-yellow-600/15",
      indicatorActive: "bg-yellow-600",
      indicatorInactive: "bg-yellow-600/25"
    }
  }[theme] || styles.dark;

  return (
    <section className={`relative overflow-hidden py-12 md:py-16 text-center text-primary-foreground border-b ${styles.bg}`}>
      {/* Dynamic Background Effects */}
      <div className={`absolute right-1/4 top-0 h-[400px] w-[400px] rounded-full blur-[150px] pointer-events-none ${styles.glow1}`} />
      <div className={`absolute left-1/4 bottom-0 h-64 w-64 rounded-full blur-[120px] pointer-events-none ${styles.glow2}`} />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--accent)) 1.5px, transparent 1.5px)",
        backgroundSize: "28px 28px"
      }} />

      {/* Floating Sparkles */}
      {sparkles.map((sp, idx) => (
        <motion.div
          key={idx}
          style={{ position: "absolute", ...sp }}
          animate={{
            scale: [0.7, 1.2, 0.7],
            opacity: [0.15, 0.5, 0.15],
            y: [0, -20, 0],
          }}
          transition={{
            duration: sp.duration,
            repeat: Infinity,
            delay: sp.delay,
            ease: "easeInOut",
          }}
          className={`hidden sm:block pointer-events-none ${styles.accentText}`}
        >
          <Sparkles className="h-4 w-4" />
        </motion.div>
      ))}

      {/* Islamic Dome Ornament Overlay in the Background */}
      <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center opacity-[0.025] pointer-events-none select-none">
        <svg className={`w-[80%] max-w-[500px] aspect-square ${styles.accentText}`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
          <circle cx="50" cy="50" r="45" />
          <circle cx="50" cy="50" r="35" />
          <path d="M50 5 L50 95 M5 50 L95 50 M18.2 18.2 L81.8 81.8 M18.2 81.8 L81.8 18.2" />
          <polygon points="50,15 75,50 50,85 25,50" />
          <polygon points="50,25 68,50 50,75 32,50" />
        </svg>
      </div>

      <div className="container relative z-10 px-4">
        {/* Quote Block Card wrapper */}
        <div className="relative mx-auto max-w-3xl">
          
          {/* Animated Glow Border Beam */}
          <div className={`absolute -inset-[1px] rounded-3xl bg-gradient-to-r ${styles.borderGlow} opacity-50 blur-[2px] transition-all duration-700 group-hover:opacity-100 pointer-events-none`} />
          
          <div className={`relative rounded-3xl border p-6 md:p-10 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,0.4)] transition-all duration-500 group overflow-hidden ${styles.card}`}>
            
            {/* Elegant SVG corner borders */}
            <svg className={`absolute top-4 left-4 h-9 w-9 opacity-40 transition-all duration-500 group-hover:opacity-80 group-hover:scale-105 ${styles.accentText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 12V1h11M1 1h4M1 1v4" />
            </svg>
            <svg className={`absolute top-4 right-4 h-9 w-9 opacity-40 transition-all duration-500 group-hover:opacity-80 group-hover:scale-105 ${styles.accentText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M23 12V1H12M23 1h-4M23 1v4" />
            </svg>
            <svg className={`absolute bottom-4 left-4 h-9 w-9 opacity-40 transition-all duration-500 group-hover:opacity-80 group-hover:scale-105 ${styles.accentText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 12v11h11M1 23h4M1 23v-4" />
            </svg>
            <svg className={`absolute bottom-4 right-4 h-9 w-9 opacity-40 transition-all duration-500 group-hover:opacity-80 group-hover:scale-105 ${styles.accentText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M23 12v11H12M23 23h-4M23 23v-4" />
            </svg>

            {/* Header Badge Row */}
            <div className="flex items-center justify-between mb-5 px-2">
              {/* Left Action: Copy Button */}
              <button
                onClick={handleCopy}
                title="উদ্ধৃতিটি কপি করুন"
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 ${styles.accentText}`}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="h-5 w-5 text-emerald-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Floating tooltip */}
                {copied && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-[#0b2118] border border-accent/30 px-2 py-1 text-[10px] text-accent font-semibold whitespace-nowrap shadow-md">
                    কপি হয়েছে!
                  </span>
                )}
              </button>

              {/* Center Icon: Book Badge */}
              <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-transform duration-500 ${styles.badgeIconBg}`}>
                <BookOpen className="h-5 w-5" />
                <div className="absolute -inset-1 rounded-2xl border border-white/10 animate-[pulse_3s_ease-in-out_infinite]" />
              </div>

              {/* Spacing alignment */}
              <div className="w-10 h-10" />
            </div>

            {/* Main Interactive Slide Content */}
            <div className="min-h-[160px] flex flex-col justify-center px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-4"
                >
                  {/* Arabic Script */}
                  {activeQuote.arabic && (
                    <h2 
                      className={`font-arabic text-2xl sm:text-3xl md:text-4xl font-medium tracking-wide leading-relaxed py-1 select-all ${styles.accentText}`}
                      style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
                    >
                      {activeQuote.arabic}
                    </h2>
                  )}

                  {/* Accent Divider Line */}
                  <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />

                  {/* Bengali Meaning */}
                  {activeQuote.bengali && (
                    <p className="font-bengali text-base sm:text-lg md:text-xl font-semibold leading-relaxed text-primary-foreground/95 max-w-xl mx-auto italic select-text">
                      "{activeQuote.bengali}"
                    </p>
                  )}

                  {/* Source Reference Badge */}
                  {activeQuote.source && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${styles.badgeBg}`}>
                      <Sparkles className="h-3 w-3 animate-[spin_4s_linear_infinite]" />
                      <span>{activeQuote.source}</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slide Navigation Selectors */}
            {quotes.length > 1 && (
              <div className="flex items-center justify-between mt-6 pt-3 border-t border-white/10">
                <button
                  onClick={handlePrev}
                  className={`flex items-center gap-1 text-xs font-semibold rounded-lg transition-all duration-300 px-2.5 py-1 ${styles.navBtn}`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  পূর্ববর্তী
                </button>
                <div className="flex gap-1.5">
                  {quotes.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentIdx ? `w-5 ${styles.indicatorActive}` : `w-1.5 ${styles.indicatorInactive}`
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNext}
                  className={`flex items-center gap-1 text-xs font-semibold rounded-lg transition-all duration-300 px-2.5 py-1 ${styles.navBtn}`}
                >
                  পরবর্তী
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
};

export default IslamicQuoteSection;
