import SEO from "@/components/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Lock, Eye, Truck, UserCheck, HelpCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function PrivacyPolicy() {
  const { data: settings } = useStoreSettings();
  const store = settings?.storeInfo;
  const contact = settings?.contactInfo;
  const phone = store?.phone || contact?.phone || "01812-345678";
  const email = store?.email || contact?.email || "hello@rangao.bd";
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title="প্রাইভেসি পলিসি (Privacy Policy)"
        description="রাঙাও-এর প্রাইভেসি পলিসি: আপনার ব্যক্তিগত তথ্যের নিরাপত্তা ও সুরক্ষার অঙ্গীকার।"
        canonical="/privacy-policy"
      />

      <Header />

      <main className="flex-1 container max-w-4xl py-10 md:py-16 px-4">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> হোমে ফিরে যান
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-3 border-b border-border pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-bengali">
            <Shield className="h-3.5 w-3.5" /> গোপনীয়তা ও সুরক্ষা নীতিমালা
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-foreground">
            প্রাইভেসি পলিসি (Privacy Policy)
          </h1>
          <p className="text-sm text-muted-foreground font-bengali leading-relaxed">
            সর্বশেষ পরিমার্জন: ২২ আগস্ট, ২০২৬। রাঙাও (Rangao) আপনার ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষা করতে প্রতিশ্রুতিবদ্ধ। এই ডকুমেন্টে বিস্তারিত তুলে ধরা হয়েছে কীভাবে আপনার তথ্য সংগৃহীত, ব্যবহৃত ও সুরক্ষিত থাকে।
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 font-bengali">
          {/* 1. Information We Collect */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <Eye className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ১. আমরা যেসকল তথ্য সংগ্রহ করি
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              আপনি যখন আমাদের ওয়েবসাইটে ব্রাউজ করেন, অ্যাকাউন্ট তৈরি করেন বা কোনো পণ্যের অর্ডার দেন, তখন আমরা নিম্নলিখিত তথ্যসমূহ গ্রহণ করি:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs md:text-sm text-muted-foreground pl-2">
              <li><strong className="text-foreground">যোগাযোগ ও ডেলিভারি তথ্য:</strong> আপনার নাম, মোবাইল নাম্বার, সম্পূর্ণ ডেলিভারি ঠিকানা, জেলা এবং ইমেইল।</li>
              <li><strong className="text-foreground">অর্ডার সংক্রান্ত তথ্য:</strong> নির্বাচিত পণ্য, সাইজ/ফ্রেম ভেরিয়েন্ট, অর্ডারের মোট মূল্য এবং পেমেন্ট মেথড (ক্যাশ অন ডেলিভারি / বিকাশ / নগদ)।</li>
              <li><strong className="text-foreground">অ্যাকাউন্ট তথ্য:</strong> আপনি গ্রাহক অ্যাকাউন্ট খুললে আপনার পাসওয়ার্ড সুরক্ষিত এনক্রিপশনের মাধ্যমে সংরক্ষিত হয়।</li>
            </ul>
          </section>

          {/* 2. How We Use Information */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <Truck className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ২. তথ্যের ব্যবহারের উদ্দেশ্য
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              সংগৃহীত তথ্য কেবলমাত্র নিম্নলিখিত সেবা প্রদানের জন্য ব্যবহৃত হয়:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs md:text-sm text-muted-foreground pl-2">
              <li>আপনার অর্ডার প্রস্তুত করা, কুরিয়ার সার্ভিসের মাধ্যমে হোম ডেলিভারি নিশ্চিত করা।</li>
              <li>অর্ডার নিশ্চিতকরণ, ডেলিভারি ট্র্যাকিং ও আপডেট সম্পর্কিত এসএমএস বা কল প্রদান।</li>
              <li>কাস্টমার সাপোর্ট ও পণ্যের কোনো পরিবর্তন বা রিটার্ন সংক্রান্ত সহায়তা প্রদান।</li>
              <li>গ্রাহকের অনুমোদন সাপেক্ষে নতুন কালেকশন বা বিশেষ অফারের নোটিফিকেশন প্রদান।</li>
            </ul>
          </section>

          {/* 3. Data Protection & Security */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <Lock className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ৩. তথ্য নিরাপত্তা ও সুরক্ষা
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              আপনার সমস্ত তথ্যের আদান-প্রদান ইন্ডাস্ট্রি-স্ট্যান্ডার্ড <strong>SSL (Secure Sockets Layer) 256-bit এনক্রিপশন</strong> দ্বারা সুরক্ষিত। আপনার আর্থিক বা সংবেদনশীল কোনো তথ্য অননুমোদিত তৃতীয় পক্ষের কাছে বিক্রয় বা অপব্যবহার করা হয় না।
            </p>
          </section>

          {/* 4. Third-Party Sharing */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <UserCheck className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ৪. তৃতীয় পক্ষের সাথে তথ্য শেয়ারিং
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              অর্ডার সঠিকভাবে ডেলিভারি নিশ্চিত করার স্বার্থে আমরা কেবলমাত্র বিশ্বস্ত লজিস্টিক পার্টনার (যেমন: Steadfast Courier, RedX, Paperfly ইত্যাদি) এবং পেমেন্ট গেটওয়ের সাথে প্রয়োজনীয় তথ্য আদান-প্রদান করি। এছাড়াও ওয়েবসাইটের অপ্টিমাইজেশনের জন্য মেটা ও গুগলের অফিসিয়াল এনালাইটিক্স সিস্টেম ব্যবহৃত হয়।
            </p>
          </section>

          {/* 5. Customer Rights */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <HelpCircle className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ৫. আপনার অধিকার ও ডেটা নিয়ন্ত্রন
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              আপনার সংরক্ষিত যেকোনো ব্যক্তিগত তথ্য পরিবর্তন, হালনাগাদ বা ডাটাবেজ থেকে মুছে ফেলার জন্য অনুরোধ করার পূর্ণ অধিকার আপনার রয়েছে। এছাড়া আপনি <Link to="/cookie-policy" className="text-primary underline font-semibold">কুকি পলিসি পেজ</Link> থেকে যেকোনো সময় আপনার ট্র্যাকিং পছন্দ আপডেট করতে পারেন।
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-2 pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-foreground">প্রাইভেসি হেল্পডেস্ক</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              আমাদের গোপনীয়তা নীতি বা আপনার তথ্য সম্পর্কিত যেকোনো জিজ্ঞাসায় আমাদের জানান: <br />
              ইমেইল: <a href={`mailto:${email}`} className="text-primary underline font-semibold">{email}</a> | ফোন: <a href={`tel:${phone}`} className="text-primary underline font-semibold">{phone}</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
