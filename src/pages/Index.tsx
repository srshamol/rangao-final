import { useState } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategorySection from "@/components/CategorySection";
import FeaturedProducts from "@/components/FeaturedProducts";
import IslamicCollection from "@/components/IslamicCollection";
import NewArrivals from "@/components/NewArrivals";
import BestSellers from "@/components/BestSellers";
import FlashSaleSection from "@/components/FlashSaleSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import NewsletterSection from "@/components/NewsletterSection";
import OfferBanner from "@/components/OfferBanner";
import BrandsSection from "@/components/BrandsSection";
import StatisticsSection from "@/components/StatisticsSection";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import FooterPromo from "@/components/FooterPromo";
import DecorGallery from "@/components/DecorGallery";
import { useEffect } from "react";
import AppLoader from "@/components/AppLoader";
import SEO from "@/components/SEO";
import { useStoreSettings, DEFAULT_SECTION_ORDER } from "@/hooks/useStoreSettings";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { data: settings, isLoading } = useStoreSettings();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use admin-configured section order, fallback to default
  const sectionOrder = settings?.sectionOrder || DEFAULT_SECTION_ORDER;
  const offerBanner = settings?.offerBanner;
  const newsletter = settings?.newsletter;

  const renderSection = (sectionId: string, config: any) => {
    // Check visibility
    if (!config.enabled) return null;
    if (isMobile && config.mobile === false) return null;
    if (!isMobile && config.desktop === false) return null;

    let sectionContent = null;
    switch (sectionId) {
      case "hero":
        sectionContent = <HeroBanner />;
        break;

      case "categories":
        sectionContent = (
          <CategorySection
            title={config.title}
            subtitle={config.subtitle}
            mode={config.category_mode || "auto"}
            categoryIds={config.category_ids}
            sortBy={config.sort_by || "custom"}
            count={config.count || 8}
            desktopCols={config.desktop_cols || 4}
            tabletCols={config.tablet_cols || 3}
            mobileCols={config.mobile_cols || 2}
            showImage={config.show_image !== false}
            showCount={config.show_count !== false}
            showDescription={config.show_description === true}
            showCTA={config.show_cta === true}
            showIcon={config.show_icon === true}
            onSelect={setSelectedCategory}
            selected={selectedCategory}
          />
        );
        break;

      case "featured":
        sectionContent = (
          <FeaturedProducts
            title={config.title}
            subtitle={config.subtitle}
            filter={config.filter || "featured"}
            productIds={config.product_ids}
            categorySlug={config.category_slug}
            count={config.count || 8}
            desktopCols={config.desktop_cols || 4}
            selectedCategory={selectedCategory}
          />
        );
        break;

      case "flash_sale":
        sectionContent = <FlashSaleSection />;
        break;

      case "islamic_collection":
        sectionContent = (
          <IslamicCollection
            title={config.title}
            subtitle={config.subtitle}
            categorySlug={config.category_slug || "wall_canvas"}
            productIds={config.product_ids}
            count={config.count || 3}
            filter={config.filter as any || "category"}
          />
        );
        break;

      case "new_arrivals":
        sectionContent = (
          <NewArrivals
            title={config.title}
            subtitle={config.subtitle}
            count={config.count || 4}
            desktopCols={config.desktop_cols || 4}
          />
        );
        break;

      case "best_sellers":
        sectionContent = (
          <BestSellers
            title={config.title}
            subtitle={config.subtitle}
            count={config.count || 4}
            desktopCols={config.desktop_cols || 4}
            productIds={config.product_ids}
            filter={config.filter as any || "best_seller"}
          />
        );
        break;

      case "offer_banner":
        if (!offerBanner?.enabled) return null;
        sectionContent = <OfferBanner config={offerBanner} />;
        break;

      case "why_choose":
        sectionContent = <WhyChooseUs />;
        break;

      case "statistics":
        sectionContent = <StatisticsSection />;
        break;

      case "testimonials":
        sectionContent = <Testimonials />;
        break;

      case "brands":
        sectionContent = <BrandsSection />;
        break;

      case "newsletter":
        sectionContent = (
          <NewsletterSection
            title={newsletter?.title}
            subtitle={newsletter?.subtitle}
            placeholder={newsletter?.placeholder}
            buttonText={newsletter?.button_text}
          />
        );
        break;

      case "footer_promo":
        sectionContent = (
          <FooterPromo
            title={config.title}
            ctaText={config.cta_text}
            ctaUrl={config.cta_url}
            bgImage={config.bg_image}
          />
        );
        break;

      case "gallery":
        sectionContent = (
          <DecorGallery
            title={config.title}
            subtitle={config.subtitle}
          />
        );
        break;

      default:
        return null;
    }

    if (!sectionContent) return null;

    // Apply custom styling configurations dynamically
    const paddingClass = config.padding || "";
    const marginClass = config.margin || "";
    const bgStyle: React.CSSProperties = {};
    if (config.bg_color) bgStyle.backgroundColor = config.bg_color;
    if (config.bg_image && sectionId !== "footer_promo") bgStyle.backgroundImage = `url(${config.bg_image})`;

    let animationProps = {};
    const anim = config.animation || "fade-up";
    if (anim !== "none") {
      switch (anim) {
        case "fade":
          animationProps = { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
          break;
        case "fade-up":
          animationProps = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
          break;
        case "slide":
          animationProps = { initial: { opacity: 0, x: -50 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
          break;
        case "zoom":
          animationProps = { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
          break;
      }
    }

    return (
      <div
        key={sectionId}
        className={`${paddingClass} ${marginClass} transition-all duration-300`}
        style={bgStyle}
      >
        {anim !== "none" ? (
          <motion.div {...animationProps}>
            {sectionContent}
          </motion.div>
        ) : (
          sectionContent
        )}
      </div>
    );
  };

  if (!mounted || isLoading) {
    return <AppLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO 
        title={settings?.homepageSEO?.meta_title} 
        description={settings?.homepageSEO?.meta_description}
        keywords={settings?.homepageSEO?.meta_keywords}
        image={settings?.homepageSEO?.og_image}
      />
      <main>
        {sectionOrder.map((section) =>
          renderSection(section.id, section.config)
        )}
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;
