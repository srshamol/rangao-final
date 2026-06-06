import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, ArrowDown, MessageCircle } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import heroBgFallback from "@/assets/hero-banner.jpg";
import heroVideoFallback from "@/assets/hero-video.mp4";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useAutoStatistics } from "@/hooks/useHomepageData";
import OptimizedImage from "@/components/OptimizedImage";
import { cn } from "@/lib/utils";

const toBanglaDigits = (num: number | string) => {
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (w) => digits[parseInt(w)]);
};

/* ── Animated counter ── */
const AnimatedCounter = ({ target }: {target: string;}) => {
  const [display, setDisplay] = useState("০");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let active = true;
    let interval: any;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const steps = 14;
        let step = 0;
        const digits = "০১২৩৪৫৬৭৮৯";
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          if (!active) return;
          step++;
          if (step >= steps) {
            setDisplay(target);
            clearInterval(interval);
          } else {
            setDisplay(target.split("").map((c) => digits.includes(c) ? digits[Math.floor(Math.random() * 10)] : c).join(""));
          }
        }, 45);
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => {
      active = false;
      if (interval) clearInterval(interval);
      observer.disconnect();
    };
  }, [target]);

  return <span ref={ref}>{display}</span>;
};

/* ── Particle field (canvas) ── */
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0,h = 0;

    const particles: {x: number;y: number;vx: number;vy: number;r: number;a: number;pulse: number;}[] = [];

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create particles
    const count = Math.min(60, Math.floor(w * h / 18000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        a: Math.random() * 0.3 + 0.05,
        pulse: Math.random() * Math.PI * 2
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.015;

        // Wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`; // gold-ish
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />;
};

/* ── Hero Banner ── */
const HeroBanner = () => {
  const { data: settings } = useStoreSettings();
  const { data: autoStats } = useAutoStatistics();
  const statsConfig = settings?.statistics;

  const stats = useMemo(() => {
    const isAuto = statsConfig?.mode === "auto";
    const customers = isAuto ? (autoStats?.customers || 5000) : (statsConfig?.customers || 5000);
    const orders = isAuto ? (autoStats?.orders || 10000) : (statsConfig?.orders || 10000);
    const reviews = isAuto ? (autoStats?.reviews || 4800) : (statsConfig?.reviews || 4800);
    const products = isAuto ? (autoStats?.products || 200) : (statsConfig?.products || 200);

    return [
      { value: `${toBanglaDigits(customers)}+`, label: "সন্তুষ্ট গ্রাহক" },
      { value: `${toBanglaDigits(orders)}+`, label: "ডেলিভারি সম্পন্ন" },
      { value: `${toBanglaDigits(reviews)}+`, label: "গ্রাহক রিভিউ" },
      { value: `${toBanglaDigits(products)}+`, label: "প্রিমিয়াম পণ্য" }
    ];
  }, [autoStats, statsConfig]);

  const hero = settings?.heroBanner;
  
  const slides = useMemo(() => {
    return hero?.slides?.filter((s) => s.enabled) || [];
  }, [hero?.slides]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const activeSlide = useMemo(() => {
    if (slides.length > 0 && slides[currentSlideIndex]) {
      return slides[currentSlideIndex];
    }
    return {
      title: hero?.title || "টেকনোলজির নতুন সংজ্ঞা",
      subtitle: hero?.subtitle || "আধুনিক গ্যাজেট যা আপনার লাইফস্টাইলকে...",
      badge_text: hero?.badge_text || "প্রিমিয়াম কালেকশন ২০২৬",
      cta_primary_text: hero?.cta_text || "এক্সপ্লোর করুন",
      cta_primary_url: hero?.cta_link || "#products",
      cta_secondary_text: "যোগাযোগ করুন",
      cta_secondary_url: "#contact",
      banner_image_url: hero?.banner_image_url || heroBgFallback,
      banner_video_url: hero?.banner_video_url || "",
      overlay_opacity: 0.85,
      text_align: "left" as const,
    };
  }, [slides, currentSlideIndex, hero]);

  const heroBg = activeSlide.banner_image_url || heroBgFallback;
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    setMediaReady(false);
  }, [currentSlideIndex]);

  useEffect(() => {
    if (heroBg) {
      const img = new Image();
      img.src = heroBg;
      img.onload = () => setMediaReady(true);
    }
  }, [heroBg]);

  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });

  // Parallax transforms
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);

  return (
    <section ref={sectionRef} className="relative flex min-h-[92vh] items-center overflow-hidden bg-background" style={{ position: "relative" }}>
      {/* Background Media with parallax */}
      <motion.div style={{ y: videoY }} className="absolute inset-0 h-[125%] w-full -top-[5%]">
        {activeSlide.banner_video_url ? (
          <video 
            key={activeSlide.banner_video_url}
            autoPlay 
            loop 
            muted 
            playsInline 
            poster={heroBg} 
            onLoadedData={() => setMediaReady(true)}
            className={`h-full w-full object-cover transition-opacity duration-1000 ${mediaReady ? 'opacity-100' : 'opacity-0'}`}
          >
            <source src={activeSlide.banner_video_url} type="video/mp4" />
          </video>
        ) : (
          <OptimizedImage 
            key={heroBg}
            src={heroBg} 
            onLoad={() => setMediaReady(true)}
            alt="Rangao premium Islamic home decor" 
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            className="h-full w-full object-cover animate-fade-in duration-700" 
          />
        )}
      </motion.div>

      {/* Premium Skeleton/Placeholder */}
      {!mediaReady && (
        <div className="absolute inset-0 bg-[#07130f] animate-pulse z-0 flex items-center justify-center">
          <div className="h-full w-full bg-gradient-to-tr from-[#07130f] via-[#112a20] to-[#07130f]" />
        </div>
      )}

      {/* Multi-layer gradient overlay */}
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/75 to-primary/30 transition-all duration-700" 
          style={{ opacity: activeSlide.overlay_opacity ?? 0.85 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-transparent to-primary/30" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--primary)/0.5)_100%)]" />
      </motion.div>

      {/* Particle canvas */}
      <ParticleCanvas />

      {/* Floating decorative shapes with parallax */}
      <motion.div
        animate={{ y: [0, -25, 0], rotate: [0, 8, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[12%] top-[15%] h-36 w-36 rounded-3xl border border-accent/15 bg-gradient-to-br from-accent/8 to-accent/2 hidden md:block" />

      <motion.div
        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute right-[30%] bottom-[20%] h-24 w-24 rounded-full border border-primary-foreground/8 bg-primary-foreground/3 hidden md:block" />

      {/* Glow orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-10 top-1/4 h-96 w-96 rounded-full bg-accent/8 blur-[140px] hidden md:block" />

      {/* Content with parallax */}
      <motion.div style={{ y: contentY }} className="container relative z-10 pt-24 pb-36 md:py-20">
        <motion.div
          key={currentSlideIndex}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "max-w-2xl flex flex-col w-full",
            activeSlide.text_align === "center" && "mx-auto text-center items-center justify-center",
            activeSlide.text_align === "right" && "ml-auto text-right items-end justify-end",
            (activeSlide.text_align === "left" || !activeSlide.text_align) && "items-start text-left"
          )}>

          {/* Badge with glow + pulse ring */}
          {activeSlide.badge_text && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
              className="relative mb-6 inline-flex items-center gap-2 overflow-hidden rounded-full border border-accent/25 bg-accent/10 px-5 py-2 text-sm font-semibold text-accent shadow-[0_0_25px_-4px_hsl(var(--accent)/0.35)] backdrop-blur-md">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/15 to-transparent animate-shimmer bg-[length:200%_100%]" />
              <div className="absolute -inset-1 rounded-full border border-accent/15 animate-[pulse_3s_ease-in-out_infinite]" />
              <motion.div
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="relative z-10 h-3.5 w-3.5" />
              </motion.div>
              <span className="relative z-10">{activeSlide.badge_text}</span>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className={cn(
              "font-display text-4xl font-extrabold pb-3 text-primary-foreground sm:text-5xl md:text-6xl lg:text-7xl flex flex-col gap-1 md:gap-2",
              activeSlide.text_align === "center" && "items-center",
              activeSlide.text_align === "right" && "items-end",
              (activeSlide.text_align === "left" || !activeSlide.text_align) && "items-start"
            )}>
            {activeSlide.title.split("\n").map((line, i) => (
              <span
                key={i}
                className={cn(
                  "block leading-[1.3] pb-1",
                  i > 0 && "bg-gradient-to-r from-accent via-amber-300 to-accent bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x"
                )}
              >
                {line}
              </span>
            ))}
          </motion.h1>

          {/* Decorative line under heading */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={cn(
              "mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-accent to-accent/20",
              activeSlide.text_align === "center" && "mx-auto",
              activeSlide.text_align === "right" && "ml-auto"
            )}
          />

          {activeSlide.subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6 max-w-lg text-base font-light leading-relaxed text-primary-foreground/85 md:text-lg">
              {activeSlide.subtitle}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={cn(
              "mt-8 flex flex-col gap-4 sm:flex-row w-full sm:w-auto",
              activeSlide.text_align === "center" && "justify-center",
              activeSlide.text_align === "right" && "justify-end"
            )}>

            <Button
              size="lg"
              className="group relative overflow-hidden rounded-full bg-accent px-8 text-base font-bold text-accent-foreground shadow-gold transition-all duration-300 hover:shadow-gold-lg hover:scale-[1.02] w-full sm:w-auto"
              onClick={() => {
                const url = activeSlide.cta_primary_url || "#products";
                if (url.startsWith("#")) {
                  document.getElementById(url.substring(1))?.scrollIntoView({ behavior: "smooth" });
                } else {
                  window.location.href = url;
                }
              }}>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative">{activeSlide.cta_primary_text || "এক্সপ্লোর করুন"}</span>
              <ArrowRight className="relative ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="group rounded-full border-primary-foreground/15 bg-primary-foreground/5 px-8 text-base font-medium text-primary-foreground backdrop-blur-md transition-all duration-300 hover:bg-primary-foreground/10 hover:border-primary-foreground/25 w-full sm:w-auto"
              onClick={() => {
                const url = activeSlide.cta_secondary_url || "#contact";
                if (url.startsWith("#")) {
                  document.getElementById(url.substring(1))?.scrollIntoView({ behavior: "smooth" });
                } else {
                  window.location.href = url;
                }
              }}>
              {activeSlide.cta_secondary_text || "যোগাযোগ করুন"}
              <ArrowDown className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </Button>
          </motion.div>

          {/* Stats with animated counter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10 md:mt-16 grid grid-cols-4 items-center justify-between gap-x-2 border-t border-primary-foreground/10 pt-8 md:gap-x-0 w-full">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="group text-center"
                whileHover={{ scale: 1.08 }}
              >
                <p className="font-display text-lg sm:text-2xl font-extrabold text-accent md:text-3xl lg:text-4xl">
                  <AnimatedCounter target={stat.value} />
                </p>
                <p className="mt-1.5 text-[9px] sm:text-[11px] font-semibold tracking-normal sm:tracking-wider uppercase text-primary-foreground/40 transition-colors duration-300 group-hover:text-primary-foreground/70 leading-tight">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                currentSlideIndex === idx ? "w-6 bg-accent" : "w-2 bg-primary-foreground/30 hover:bg-primary-foreground/50"
              )}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroBanner;