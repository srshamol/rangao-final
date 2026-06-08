import { motion } from "framer-motion";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { 
  ShieldCheck, Sparkles, Heart, Truck, Award, Clock, Globe, BookOpen 
} from "lucide-react";

const iconMap: Record<string, any> = {
  ShieldCheck,
  Sparkles,
  Heart,
  Truck,
  Award,
  Clock,
  Globe
};

export default function About() {
  const { data: settings, isLoading } = useStoreSettings();
  const about = settings?.aboutUsSettings;
  const store = settings?.storeInfo;

  if (isLoading || !about) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={about.title} 
        description={about.subtitle || about.story_text.slice(0, 150)} 
        image={about.banner_image_url || about.story_image_url}
      />
      <Header />
      <Breadcrumbs items={[{ label: about.title }]} />

      <main className="pb-16 overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden bg-primary">
          <div className="absolute inset-0">
            <img 
              src={about.banner_image_url} 
              alt={about.title} 
              className="h-full w-full object-cover opacity-40 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
          </div>

          <div className="container relative z-10 text-center px-4 max-w-4xl">
            <motion.span 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block text-xs font-bold tracking-widest text-accent uppercase bg-accent/10 px-3.5 py-1.5 rounded-full mb-4"
            >
              ✦ {store?.name || "Rangao"} ✦
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight"
            >
              {about.title}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-bengali text-sm md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            >
              {about.subtitle}
            </motion.p>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 md:py-24 container max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Story Image */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 relative group"
            >
              <div className="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl group-hover:bg-accent/10 transition-colors duration-500" />
              <div className="relative overflow-hidden rounded-2xl border bg-card aspect-[4/3] shadow-premium-lg">
                <img 
                  src={about.story_image_url} 
                  alt={about.story_title} 
                  className="h-full w-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </motion.div>

            {/* Story Text */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 mb-2">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                {about.story_title}
              </h2>
              <p className="font-bengali text-sm md:text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {about.story_text}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-16 bg-secondary/10 border-y border-border/40">
          <div className="container max-w-5xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Mission */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="p-8 rounded-2xl border bg-card/60 backdrop-blur-md shadow-premium hover:shadow-premium-lg transition-all duration-300 group"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 border border-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 mb-6">
                  <Sparkles className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-4">{about.mission_title}</h3>
                <p className="font-bengali text-sm leading-relaxed text-muted-foreground">{about.mission_text}</p>
              </motion.div>

              {/* Vision */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="p-8 rounded-2xl border bg-card/60 backdrop-blur-md shadow-premium hover:shadow-premium-lg transition-all duration-300 group"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/5 border border-accent/10 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-500 mb-6">
                  <Globe className="h-6 w-6 text-accent group-hover:text-accent-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-4">{about.vision_title}</h3>
                <p className="font-bengali text-sm leading-relaxed text-muted-foreground">{about.vision_text}</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-16 md:py-24 container max-w-6xl px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl font-extrabold text-foreground mb-4">আমাদের মূল মূল্যবোধ</h2>
            <p className="font-bengali text-sm md:text-base text-muted-foreground leading-relaxed">আমরা যে সকল নীতি ও বিশ্বাস লালন করি এবং যার মাধ্যমে আমাদের গুণগত মান নিশ্চিত করি</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {about.core_values?.map((val, idx) => {
              const IconComp = iconMap[val.icon] || Award;
              return (
                <motion.div 
                  key={val.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="p-6 rounded-2xl border bg-card hover:bg-secondary/15 transition-all duration-300 hover:border-accent/30 flex flex-col items-center text-center group"
                >
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <IconComp className="h-5 w-5 text-accent" />
                  </div>
                  <h4 className="font-display text-base font-bold text-foreground mb-2">{val.title}</h4>
                  <p className="font-bengali text-xs leading-relaxed text-muted-foreground">{val.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
