import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Send, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    toast.success("ধন্যবাদ! আপনি সফলভাবে সাবস্ক্রাইব করেছেন।");
    setEmail("");
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section className="relative overflow-hidden bg-primary py-20 md:py-24">
      {/* Decorative */}
      <div className="absolute right-1/4 top-0 h-72 w-72 rounded-full bg-accent/8 blur-[120px]" />
      <div className="absolute left-0 bottom-0 h-48 w-48 rounded-full bg-primary-foreground/3 blur-[100px]" />
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary-foreground)) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-6 flex justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 backdrop-blur-sm">
              <Mail className="h-7 w-7 text-accent" />
              <div className="absolute -inset-1 rounded-2xl border border-accent/10" />
            </div>
          </div>
          <h2 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            সর্বশেষ অফার ও আপডেট পান
          </h2>
          <p className="mt-4 font-bengali text-sm leading-relaxed text-primary-foreground/60">
            আমাদের নিউজলেটারে সাবস্ক্রাইব করুন এবং বিশেষ ছাড়, নতুন প্রোডাক্ট ও টিপস সরাসরি ইমেইলে পান।
          </p>
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md gap-3">
            <div className="relative flex-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="আপনার ইমেইল দিন"
                className="rounded-xl border-primary-foreground/10 bg-primary-foreground/[0.06] pl-4 pr-4 text-primary-foreground placeholder:text-primary-foreground/40 focus-visible:ring-accent"
                required
              />
            </div>
            <Button
              type="submit"
              className="shrink-0 rounded-xl bg-accent px-6 text-accent-foreground shadow-gold transition-all duration-300 hover:bg-accent/90 hover:shadow-gold-lg hover:scale-[1.02]"
              disabled={submitted}
            >
              {submitted ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <CheckCircle className="h-5 w-5" />
                </motion.div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-primary-foreground/30">
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> স্প্যাম নেই</span>
            <span>•</span>
            <span>যেকোনো সময় আনসাবস্ক্রাইব</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
