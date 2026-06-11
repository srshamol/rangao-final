import { Link } from "react-router-dom";
import { blogPosts } from "@/data/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { motion } from "framer-motion";
import { Clock, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  const displayPosts = posts && posts.length > 0 
    ? posts 
    : blogPosts.map(p => ({
        id: p.id,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        image_url: p.image,
        author: p.author,
        read_time: p.readTime,
        created_at: (() => {
          const clean = p.date.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
          const d = new Date(clean);
          return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        })(),
      }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO title="ব্লগ ও টিপস" description="লাইফস্টাইল ও ইসলামিক হোম ডেকোরেশন সম্পর্কিত বিভিন্ন টিপস, গাইড এবং দরকারি তথ্য ব্লগ আর্টিকেল।" />
      <Breadcrumbs items={[{ label: "ব্লগ ও টিপস" }]} />
      <main className="py-8 md:py-12">
        <div className="container">
          <div className="mb-10 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">ব্লগ ও টিপস</h1>
            <p className="mt-2 font-bengali text-sm text-muted-foreground">গ্যাজেট সম্পর্কে দরকারি তথ্য, গাইড ও টিপস</p>
          </div>

          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/blog/${generateSlug(post.title)}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-premium transition-all hover:shadow-premium-lg"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-8 w-8 text-muted-foreground/40" /></div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-sm">
                        {post.category}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-lg font-bold leading-snug text-card-foreground transition-colors group-hover:text-accent">
                        {post.title}
                      </h2>
                      <p className="mt-2 flex-1 font-bengali text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(post.created_at).toLocaleDateString("bn-BD")}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {post.read_time}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                          পড়ুন <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Blog;
