import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Props {
  title?: string;
  ctaText?: string;
  ctaUrl?: string;
  bgImage?: string;
}

export default function FooterPromo({
  title = "রাঙাও দিয়ে আপনার ঘর সাজান",
  ctaText = "সব কালেকশন দেখুন",
  ctaUrl = "/products",
  bgImage = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
}: Props) {
  const navigate = useNavigate();

  // If the user's DB configuration returns the old exterior house image, let's auto-fallback/upgrade to the gorgeous cozy interior
  const resolvedBgImage = bgImage.includes("photo-1600585154340-be6161a56a0c")
    ? "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80"
    : bgImage;

  return (
    <section className="relative overflow-hidden rounded-3xl mx-4 my-10 md:mx-10 md:my-16 shadow-2xl border border-primary/10">
      {/* Background Image with Dark Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105"
        style={{ backgroundImage: `url(${resolvedBgImage})` }}
      />
      {/* Double layer gradient: One for brand primary emerald overlay, one for rich readability dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/90 to-primary/45 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r md:from-black/40 md:via-transparent" />

      {/* Content */}
      <div className="relative container py-20 px-8 md:py-28 md:px-16 flex flex-col justify-center items-start text-left max-w-2xl z-10">
        <span className="inline-block rounded-full bg-accent/20 border border-accent/30 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
          সীমিত অফার
        </span>
        <h2 className="mt-6 font-display text-3xl font-extrabold text-primary-foreground md:text-5xl leading-tight drop-shadow-sm">
          {title}
        </h2>
        <p className="mt-4 text-primary-foreground/90 text-sm md:text-base max-w-md font-light leading-relaxed drop-shadow-sm">
          আপনার ঘরের দেয়ালে ইসলামিক ক্যালিগ্রাফি এবং শৈল্পিক ওয়াল আর্টের প্রিমিয়াম স্পর্শ দিতে আজই অর্ডার করুন।
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button
            size="lg"
            className="group rounded-full bg-accent text-accent-foreground font-bold shadow-[0_0_30px_-8px_hsl(var(--accent)/0.6)] hover:scale-105 transition-all duration-300 border border-accent/20"
            onClick={() => navigate(ctaUrl)}
          >
            {ctaText}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>
      </div>

      {/* Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-accent/50 to-transparent" />
    </section>
  );
}
