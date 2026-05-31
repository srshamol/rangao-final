import { useState } from "react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategorySection from "@/components/CategorySection";
import FeaturedProducts from "@/components/FeaturedProducts";
import FlashSaleSection from "@/components/FlashSaleSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import NewsletterSection from "@/components/NewsletterSection";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { products, type Category } from "@/data/products";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { data: settings } = useStoreSettings();
  const sections = settings?.homepageSections;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroBanner />
        {(!sections || sections.show_categories) && (
          <CategorySection onSelect={setSelectedCategory} selected={selectedCategory} />
        )}
        {(!sections || sections.show_featured) && (
          <FeaturedProducts
            products={products}
            selectedCategory={selectedCategory}
            onDetails={() => {}}
          />
        )}
        {(!sections || sections.show_flash_sale) && <FlashSaleSection />}
        {(!sections || sections.show_why_choose) && <WhyChooseUs />}
        {(!sections || sections.show_testimonials) && <Testimonials />}
        {(!sections || sections.show_newsletter) && <NewsletterSection />}
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;
