import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Set 404-specific title so GA4 can distinguish it in page-title reports
    document.title = "404 — পেজ পাওয়া যায়নি | রাঙাও";

    // Log for monitoring
    console.error("404:", location.pathname);

    // Push 404 event to GTM dataLayer for GA4 monitoring
    if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer.push({
        event: "page_not_found",
        page_path: location.pathname,
        page_title: "404 — পেজ পাওয়া যায়নি",
      });
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <SEO title="পেজ পাওয়া যায়নি" noIndex={true} />
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md text-center space-y-6">
        {/* 404 numeral */}
        <p className="font-display text-[120px] font-black leading-none text-transparent
                       bg-gradient-to-br from-accent/40 via-primary/20 to-transparent
                       bg-clip-text select-none">
          ৪০৪
        </p>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            পেজ পাওয়া যায়নি
          </h1>
          <p className="font-bengali text-sm text-muted-foreground leading-relaxed">
            আপনি যে পেজটি খুঁজছেন সেটি সরানো হয়েছে, নাম পরিবর্তন করা হয়েছে,
            অথবা কখনো ছিল না।
          </p>
          <p className="font-mono text-xs text-muted-foreground/50 mt-1">
            {location.pathname}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg" className="rounded-2xl font-bold">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              হোমে ফিরুন
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl">
            <Link to="/products">
              <Search className="mr-2 h-4 w-4" />
              প্রোডাক্ট দেখুন
            </Link>
          </Button>
        </div>

        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          আগের পেজে যান
        </button>
      </div>
    </div>
  );
};

export default NotFound;
