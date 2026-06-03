import { useParams, useNavigate, Link } from "react-router-dom";
import { blogPosts } from "@/data/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading: isPostLoading } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: async () => {
      if (!id) return null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) return null; // Let fallback handle static ids

      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return data;
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

  const activePost = post || blogPosts.find((p) => p.id === id);

  const displayPost = useMemo(() => {
    if (!activePost) return null;
    return {
      id: activePost.id,
      title: activePost.title,
      excerpt: activePost.excerpt,
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

  // Simple markdown-like rendering for ## headings and lists
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={i} className="mb-3 mt-8 font-display text-xl font-bold text-foreground">
            {trimmed.replace("## ", "")}
          </h2>
        );
      }
      if (trimmed.startsWith("- **")) {
        const match = trimmed.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
        if (match) {
          return (
            <li key={i} className="ml-4 list-disc font-bengali text-base leading-[1.9] text-foreground/80">
              <strong className="font-semibold text-foreground">{match[1]}</strong>
              {match[2] ? `: ${match[2]}` : ""}
            </li>
          );
        }
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <li key={i} className="ml-4 list-decimal font-bengali text-base leading-[1.9] text-foreground/80">
            {trimmed.replace(/^\d+\.\s/, "")}
          </li>
        );
      }
      return (
        <p key={i} className="font-bengali text-base leading-[1.9] text-foreground/80">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
