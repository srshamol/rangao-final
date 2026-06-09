import { useParams, useNavigate, Link } from "react-router-dom";
import { blogPosts } from "@/data/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useEffect } from "react";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useStoreSettings } from "@/hooks/useStoreSettings";

// Utility to generate slug
function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Resilient resolver: handle both UUID and slug queries
  const { data: post, isLoading: isPostLoading } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: async () => {
      if (!id) return null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUuid) {
        const { data } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        return data;
      } else {
        // Find matching slug by pulling active posts
        const { data: allPosts } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("is_active", true);
        if (allPosts) {
          const match = allPosts.find(p => generateSlug(p.title) === id);
          if (match) return match;
        }
        return null;
      }
    }
  });

  const { data: allActivePosts } = useQuery({
    queryKey: ["blog-posts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_active", true)
        .limit(10);
      return data || [];
    }
  });

  const activePost = post || blogPosts.find((p) => p.id === id || generateSlug(p.title) === id);

  const displayPost = useMemo(() => {
    if (!activePost) return null;
    return {
      id: activePost.id,
      title: activePost.title,
      excerpt: activePost.excerpt || activePost.content?.slice(0, 160).replace(/[#*_`\n\r]/g, " ").trim() + "...",
      content: activePost.content,
      image: (activePost as any).image_url || (activePost as any).image || "",
      category: activePost.category,
      author: activePost.author || "Rangao টিম",
      date: (() => {
        const rawDate = (activePost as any).created_at;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("bn-BD");
          }
        }
        return (activePost as any).date || new Date().toLocaleDateString("bn-BD");
      })(),
      readTime: (activePost as any).read_time || (activePost as any).readTime || "৫ মিনিট",
    };
  }, [activePost]);

  // Load custom SEO overrides from settings table for this specific post
  const { data: seoData } = useQuery({
    queryKey: ["blog-post-seo", displayPost?.id],
    queryFn: async () => {
      if (!displayPost?.id) return null;
      const { data } = await supabase
        .from("store_settings" as any)
        .select("value")
        .eq("key", `blog_seo_${displayPost.id}`)
        .maybeSingle();
      return data?.value || null;
    },
    enabled: !!displayPost?.id
  });

  // Query popular products for internal recommendations
  const { data: recommendedProducts } = useQuery({
    queryKey: ["blog-recommended-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, sale_price, regular_price, images")
        .eq("status", "active")
        .limit(3);
      return data || [];
    }
  });

  const displayOtherPosts = useMemo(() => {
    if (!displayPost) return [];
    if (allActivePosts && allActivePosts.length > 1) {
      return allActivePosts
        .filter((p) => p.id !== displayPost.id)
        .slice(0, 2)
        .map(p => ({
          id: p.id,
          title: p.title,
          image: p.image_url,
          readTime: p.read_time,
        }));
    }
    return blogPosts
      .filter((p) => p.id !== displayPost.id)
      .slice(0, 2)
      .map(p => ({
        id: p.id,
        title: p.title,
        image: p.image,
        readTime: p.readTime,
      }));
  }, [allActivePosts, displayPost]);

  const articleSchema = useMemo(() => {
    if (!displayPost) return null;
    const storeUrl = settings?.storeInfo?.website_url;
    const baseDomain = storeUrl || (typeof window !== "undefined" ? window.location.origin : "https://www.rangao.bd");
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": displayPost.title,
      "description": displayPost.excerpt,
      "image": displayPost.image || undefined,
      "author": {
        "@type": "Person",
        "name": displayPost.author
      },
      "publisher": {
        "@type": "Organization",
        "name": "Rangao",
        "logo": {
          "@type": "ImageObject",
          "url": `${baseDomain}/favicon.ico`
        }
      },
      "datePublished": displayPost.date,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${baseDomain}/blog/${id}`
      }
    };
  }, [displayPost, id]);

  if (isPostLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!displayPost) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <p className="text-xl text-muted-foreground">পোস্ট খুঁজে পাওয়া যায়নি</p>
          <Button onClick={() => navigate("/blog")} variant="outline">ব্লগে ফিরে যান</Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Parse inline [text](url) links
  const parseInlineText = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }
      
      const linkText = match[1];
      const linkUrl = match[2];
      
      if (linkUrl.startsWith("/")) {
        elements.push(
          <Link key={match.index} to={linkUrl} className="text-accent hover:underline font-semibold">
            {linkText}
          </Link>
        );
      } else {
        elements.push(
          <a key={match.index} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">
            {linkText}
          </a>
        );
      }
      
      lastIndex = linkRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }
    
    return elements.length > 0 ? elements : text;
  };

  // Simple markdown-like rendering for ## headings and lists
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={i} className="mb-3 mt-8 font-display text-xl font-bold text-foreground">
            {parseInlineText(trimmed.replace("## ", ""))}
          </h2>
        );
      }
      if (trimmed.startsWith("- **")) {
        const match = trimmed.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
        if (match) {
          return (
            <li key={i} className="ml-4 list-disc font-bengali text-base leading-[1.9] text-foreground/80">
              <strong className="font-semibold text-foreground">{parseInlineText(match[1])}</strong>
              {match[2] ? ": " : ""}
              {match[2] ? parseInlineText(match[2]) : ""}
            </li>
          );
        }
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <li key={i} className="ml-4 list-decimal font-bengali text-base leading-[1.9] text-foreground/80">
            {parseInlineText(trimmed.replace(/^\d+\.\s/, ""))}
          </li>
        );
      }
      return (
        <p key={i} className="font-bengali text-base leading-[1.9] text-foreground/80">
          {parseInlineText(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO
        title={(seoData as any)?.seo_title || displayPost.title}
        description={(seoData as any)?.seo_description || displayPost.excerpt}
        canonical={(seoData as any)?.canonical_url}
        type="article"
        image={displayPost.image}
        schema={articleSchema ? [articleSchema] : undefined}
      />
      <Breadcrumbs
        items={[
          { label: "ব্লগ ও টিপস", path: "/blog" },
          { label: displayPost.title }
        ]}
      />
      
      <main>
        {/* Hero */}
        <div className="relative h-64 overflow-hidden bg-primary md:h-80">
          {displayPost.image ? (
            <img src={displayPost.image} alt={displayPost.title} className="h-full w-full object-cover opacity-30" />
          ) : (
            <div className="h-full w-full bg-accent/5 opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="container pb-8">
              <button onClick={() => navigate("/blog")} className="mb-4 flex items-center gap-1 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <ArrowLeft className="h-4 w-4" /> ব্লগে ফিরে যান
              </button>
              <span className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                {displayPost.category}
              </span>
              <h1 className="font-display text-2xl font-extrabold leading-tight text-primary-foreground md:text-4xl">
                {displayPost.title}
              </h1>
              <div className="mt-3 flex items-center gap-4 text-xs text-primary-foreground/70">
                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {displayPost.author}</span>
                <span>{displayPost.date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {displayPost.readTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="py-10 md:py-14">
          <div className="container max-w-3xl">
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              {renderContent(displayPost.content)}
            </motion.article>

            {/* Recommended Products */}
            {recommendedProducts && recommendedProducts.length > 0 && (
              <div className="mt-12 rounded-2xl border bg-secondary/15 p-6 md:p-8">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">আমাদের জনপ্রিয় প্রোডাক্টসমূহ</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {recommendedProducts.map((prod) => {
                    const price = prod.sale_price ?? prod.regular_price;
                    const originalPrice = prod.sale_price ? prod.regular_price : undefined;
                    const img = prod.images?.[0] || "https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=600&q=80";
                    return (
                      <Link key={prod.id} to={`/product/${prod.id}`} className="group flex flex-col gap-2 rounded-xl bg-card border p-3 hover:shadow-premium transition-all">
                        <img src={img} alt={prod.name} className="aspect-square w-full rounded-lg object-cover bg-muted" />
                        <h4 className="font-display text-xs font-bold text-card-foreground group-hover:text-accent line-clamp-2 transition-colors">{prod.name}</h4>
                        <div className="mt-auto flex items-baseline gap-2">
                          <span className="text-xs font-extrabold text-accent">৳{price}</span>
                          {originalPrice && <span className="text-[10px] text-muted-foreground line-through">৳{originalPrice}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Related Posts */}
        {displayOtherPosts.length > 0 && (
          <section className="border-t bg-secondary/20 py-12">
            <div className="container max-w-3xl">
              <h2 className="mb-6 font-display text-xl font-extrabold text-foreground">আরও পড়ুন</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {displayOtherPosts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/blog/${p.id}`}
                    className="group flex gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-premium"
                  >
                    {p.image ? (
                      <img src={p.image} alt={p.title} className="h-20 w-20 rounded-lg object-cover bg-muted" />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center"><BookOpen className="h-5 w-5 text-muted-foreground/30" /></div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-display text-sm font-bold text-card-foreground transition-colors group-hover:text-accent line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">{p.readTime}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
