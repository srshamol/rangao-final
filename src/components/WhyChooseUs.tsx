import { ShieldCheck, Truck, Headset, RotateCcw, Banknote, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const items = [
  { icon: ShieldCheck, title: "১০০% অরিজিনাল", desc: "সকল প্রোডাক্ট সম্পূর্ণ অরিজিনাল এবং ব্র্যান্ড অথেন্টিক। নকল পণ্যের কোনো সুযোগ নেই।" },
  { icon: Truck, title: "ওয়ারেন্টি সহ ডেলিভারি", desc: "প্রতিটি প্রোডাক্ট ওয়ারেন্টি কার্ড সহ নিরাপদে ও দ্রুত ডেলিভারি করা হয়।" },
  { icon: Headset, title: "২৪/৭ সাপোর্ট", desc: "যেকোনো সমস্যায় আমাদের দক্ষ সাপোর্ট টিম সবসময় আপনার পাশে আছে।" },
  { icon: RotateCcw, title: "ইজি রিটার্ন পলিসি", desc: "প্রোডাক্ট পছন্দ না হলে সহজেই রিটার্ন বা এক্সচেঞ্জ করতে পারবেন।" },
  { icon: Banknote, title: "ক্যাশ অন ডেলিভারি", desc: "পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন। আগে পেমেন্টের কোনো ঝামেলা নেই।" },
  { icon: MapPin, title: "সারা বাংলাদেশে ডেলিভারি", desc: "ঢাকা সহ সারা বাংলাদেশে দ্রুত ও নিরাপদ হোম ডেলিভারি সার্ভিস।" },
];

const WhyChooseUs = () => (
  <section className="relative overflow-hidden bg-primary py-20 md:py-28">
    <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[150px]" />
    <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-primary-foreground/3 blur-[120px]" />

    <div className="container relative">
      <div className="mx-auto mb-16 max-w-xl text-center">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-block rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-accent"
        >
          বিশ্বাসযোগ্যতা
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-5 font-display text-3xl font-extrabold text-primary-foreground md:text-5xl"
        >
          কেন আমাদের কাছ থেকে কিনবেন?
        </motion.h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-2xl border border-primary-foreground/8 bg-primary-foreground/[0.04] p-8 backdrop-blur-sm transition-all duration-500 hover:border-accent/20 hover:bg-primary-foreground/[0.08] md:p-10"
          >
            {/* Numbering overlay */}
            <span className="absolute right-4 top-4 font-display text-5xl font-extrabold text-primary-foreground/[0.04] md:text-6xl">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative">
              {/* Icon with animated ring */}
              <div className="relative mb-7">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 transition-all duration-500 group-hover:bg-accent/20 group-hover:scale-110">
                  <item.icon className="h-7 w-7 text-accent" />
                </div>
                {/* Animated ring on hover */}
                <div className="absolute -inset-1.5 rounded-2xl border-2 border-accent/0 transition-all duration-700 group-hover:border-accent/10 group-hover:scale-110" />
              </div>
              <h3 className="mb-3 font-display text-xl font-bold text-primary-foreground">{item.title}</h3>
              <p className="font-bengali text-sm leading-relaxed text-primary-foreground/55">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA Banner */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-16 flex flex-col items-center justify-between gap-6 rounded-2xl border border-accent/15 bg-accent/[0.06] p-8 backdrop-blur-sm sm:flex-row md:p-10"
      >
        <div>
          <h3 className="font-display text-xl font-bold text-primary-foreground md:text-2xl">আজই অর্ডার করুন!</h3>
          <p className="mt-2 font-bengali text-sm text-primary-foreground/50">সেরা মানের গ্যাজেট সেরা দামে পেতে এখনই ব্রাউজ করুন।</p>
        </div>
        <Button
          className="group shrink-0 rounded-full bg-accent px-8 text-base font-bold text-accent-foreground shadow-gold transition-all duration-300 hover:bg-accent/90 hover:shadow-gold-lg"
          size="lg"
          onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
        >
          শপিং শুরু করুন
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </motion.div>
    </div>
  </section>
);

export default WhyChooseUs;
