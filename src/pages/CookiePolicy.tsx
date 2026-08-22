import { useState, useEffect } from "react";
import SEO from "@/components/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Cookie, ShieldCheck, BarChart3, Target, Settings2, CheckCircle2, XCircle, Info, ArrowLeft, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initializeTracking } from "@/services/analytics";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function CookiePolicy() {
  const { data: settings } = useStoreSettings();
  const [consentState, setConsentState] = useState<string>("default");

  const store = settings?.storeInfo;
  const contact = settings?.contactInfo;
  const phone = store?.phone || contact?.phone || "01812-345678";
  const email = store?.email || contact?.email || "hello@rangao.bd";

  useEffect(() => {
    const saved = localStorage.getItem("rangao_cookie_consent");
    if (saved) {
      setConsentState(saved);
    } else {
      setConsentState("default");
    }
  }, []);

  const handleUpdateConsent = (newStatus: "accepted" | "declined") => {
    localStorage.setItem("rangao_cookie_consent", newStatus);
    setConsentState(newStatus);
    if (newStatus === "accepted") {
      initializeTracking();
      toast.success("অ্যানালিটিক্স ও পারফরম্যান্স কুকি সক্রিয় করা হয়েছে।");
    } else {
      toast.info("অ্যানালিটিক্স ও মার্কেটিং ট্র্যাকিং বন্ধ করা হয়েছে।");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title="কুকি পলিসি (Cookie Policy)"
        description="রাঙাও-এর কুকি পলিসি: আমরা কীভাবে আপনার ব্রাউজিং অভিজ্ঞতা উন্নত করতে এবং প্রয়োজনীয় সেবা দিতে কুকি ব্যবহার করি।"
        canonical="/cookie-policy"
      />

      <Header />

      <main className="flex-1 container max-w-4xl py-10 md:py-16 px-4">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> হোমে ফিরে যান
          </Link>
        </div>

        {/* Page Title & Intro */}
        <div className="space-y-3 border-b border-border pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-bengali">
            <Cookie className="h-3.5 w-3.5" /> কুকি ব্যবহারের নীতিমালা
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-foreground">
            কুকি পলিসি (Cookie Policy)
          </h1>
          <p className="text-sm text-muted-foreground font-bengali leading-relaxed">
            সর্বশেষ আপডেট: ২২ আগস্ট, ২০২৬। রাঙাও (Rangao) আপনার তথ্যের গোপনীয়তা ও সুরক্ষাকে সর্বোচ্চ অগ্রাধিকার দেয়। এই নীতিমালায় বর্ণিত হয়েছে আমরা কোন ধরণের কুকি ব্যবহার করি এবং আপনি কীভাবে তা নিয়ন্ত্রণ করতে পারেন।
          </p>
        </div>

        {/* Interactive Preferences Card */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground font-bengali">
                  আপনার বর্তমান ট্র্যাকিং প্রিফারেন্স
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-bengali">
                বর্তমান স্ট্যাটাস:{" "}
                <span className="font-semibold text-foreground">
                  {consentState === "accepted"
                    ? "অনুমোদিত (অ্যানালিটিক্স ও মার্কেটিং ট্র্যাকিং চালু)"
                    : consentState === "declined"
                    ? "সীমাবদ্ধ (অ্যানালিটিক্স ও মার্কেটিং ট্র্যাকিং বন্ধ)"
                    : "স্ট্যান্ডার্ড মোড (ওয়েবসাইট ব্রাউজিং ও প্রয়োজনীয় কুকি সক্রিয়)"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={consentState === "declined" ? "default" : "outline"}
                size="sm"
                onClick={() => handleUpdateConsent("declined")}
                className="font-bengali text-xs h-9"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                ট্র্যাকিং বন্ধ রাখুন (Opt-Out)
              </Button>
              <Button
                variant={consentState === "accepted" ? "default" : "secondary"}
                size="sm"
                onClick={() => handleUpdateConsent("accepted")}
                className="font-bengali text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                পূর্ণ অনুমোদন দিন
              </Button>
            </div>
          </div>
        </div>

        {/* Cookie Categories Details */}
        <div className="space-y-8 font-bengali">
          {/* Section 1: Strictly Necessary */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ১. অত্যন্ত প্রয়োজনীয় কুকি (Strictly Necessary Cookies)
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              এই কুকি ও লোকাল স্টোরেজ উপাদানগুলো ওয়েবসাইটের মূল কার্যকারিতা চালানোর জন্য অপরিহার্য। এগুলো ছাড়া আপনি পণ্য কার্টে যোগ করতে পারবেন না, অর্ডার প্লেস করতে পারবেন না কিংবা অ্যাকাউন্টে লগইন করতে পারবেন না।
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs border border-border rounded-lg">
                <thead className="bg-muted/50 text-foreground font-semibold">
                  <tr>
                    <th className="p-2.5 border-b border-border">কুকি / স্টোরেজ কী</th>
                    <th className="p-2.5 border-b border-border">উদ্দেশ্য</th>
                    <th className="p-2.5 border-b border-border">স্থায়িত্ব</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="p-2.5 font-mono text-foreground font-semibold">rangao_cart</td>
                    <td className="p-2.5">কার্টে যুক্ত পণ্যসমূহ সংরক্ষণ করা যেন পেজ রিফ্রেশ বা ব্রাউজিংয়ে কার্ট হারিয়ে না যায়।</td>
                    <td className="p-2.5">পারসিস্টেন্ট (লোকাল স্টোরেজ)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-foreground font-semibold">sb-admin-auth-token / sb-*</td>
                    <td className="p-2.5">গ্রাহক ও অ্যাডমিন লগইন সেশন নিরাপদ রাখা।</td>
                    <td className="p-2.5">সেশন / ১ বছর</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-foreground font-semibold">sidebar:state</td>
                    <td className="p-2.5">ইউজার ইন্টারফেস ও সাইডবার ভিউ পছন্দ সংরক্ষণ।</td>
                    <td className="p-2.5">৭ দিন</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-foreground font-semibold">CSRF / Security Tokens</td>
                    <td className="p-2.5">অনাকাঙ্ক্ষিত সাইবার আক্রমণ ও ফর্ম স্প্যাম রোধ করা।</td>
                    <td className="p-2.5">সেশন চলাকালীন</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Analytics & Performance */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <BarChart3 className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ২. পারফরম্যান্স ও অ্যানালিটিক্স কুকি (Analytics Cookies)
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              এই কুকিগুলো আমাদের বুঝতে সাহায্য করে দর্শকরা ওয়েবসাইটের কোন পাতাগুলোতে বেশি আসছেন, সাইটের স্পিড কেমন এবং কোথাও কোনো ত্রুটি হচ্ছে কি না। সংগৃহীত তথ্য সামগ্রিক পরিসংখ্যান হিসেবে ব্যবহৃত হয়।
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs md:text-sm text-muted-foreground pl-2">
              <li><strong className="text-foreground">Google Analytics 4 (GA4):</strong> ভিজিটরের পেজ ভিউ ও লোডিং সময় বিশ্লেষণ করে সাইটের গতি বৃদ্ধি করতে সাহায্য করে।</li>
              <li><strong className="text-foreground">Core Web Vitals:</strong> ওয়েবসাইটের রেসপন্স টাইম ও লেআউট স্ট্যাবিলিটি পর্যবেক্ষণ করতে সাহায্য করে।</li>
            </ul>
          </section>

          {/* Section 3: Marketing & Conversions */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <Target className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ৩. মার্কেটিং ও কনভার্সন ট্র্যাকিং (Marketing & Conversion Tracking)
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              আমরা মেটা পিক্সেল (Meta Pixel) ও কনভার্সন এপিআই (Conversions API - CAPI) ব্যবহার করি যেন আপনার পছন্দের ইসলামিক আর্ট ও ডেকোর সামগ্রী সম্পর্কিত প্রাসঙ্গিক বিজ্ঞাপন প্রদর্শন করা সম্ভব হয়।
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs border border-border rounded-lg">
                <thead className="bg-muted/50 text-foreground font-semibold">
                  <tr>
                    <th className="p-2.5 border-b border-border">ট্র্যাকার / কুকি</th>
                    <th className="p-2.5 border-b border-border">উদ্দেশ্য</th>
                    <th className="p-2.5 border-b border-border">প্রদানকারী</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="p-2.5 font-mono text-foreground font-semibold">_fbp, _fbc</td>
                    <td className="p-2.5">ফেসবুক বিজ্ঞাপনে ক্লিক করে আসা ভিজিটরদের কনভার্সন ও পণ্যের আগ্রহ যাচাই করা।</td>
                    <td className="p-2.5">Meta Platforms, Inc.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-foreground font-semibold">Meta CAPI</td>
                    <td className="p-2.5">অর্ডার সম্পন্ন হওয়ার পর সুরক্ষিতভাবে সার্ভার থেকে কনভার্সন যাচাই করা।</td>
                    <td className="p-2.5">Meta Platforms, Inc.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: User Control & Browser Settings */}
          <section className="space-y-3 rounded-xl border border-border p-6 bg-card">
            <div className="flex items-center gap-2.5 text-primary">
              <Info className="h-5 w-5" />
              <h2 className="text-lg font-bold text-foreground">
                ৪. ব্রাউজারে কুকি নিয়ন্ত্রণ করার নিয়ম
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              আপনি যেকোনো সময় আপনার ব্রাউজারের (যেমন Google Chrome, Safari, Firefox, Edge) সেটিংস থেকে কুকি মুছে ফেলতে বা ব্লক করতে পারেন। তবে মনে রাখবেন, সমস্ত কুকি ব্লক করলে ওয়েবসাইটের শপিং কার্ট ও চেকআউট প্রক্রিয়ায় বিঘ্ন ঘটতে পারে।
            </p>
          </section>

          {/* Section 5: Contact */}
          <section className="space-y-2 pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-foreground">যোগাযোগ</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              কুকি পলিসি সংক্রান্ত কোনো প্রশ্ন থাকলে সরাসরি আমাদের সাথে যোগাযোগ করতে পারেন: <br />
              ইমেইল: <a href={`mailto:${email}`} className="text-primary underline font-semibold">{email}</a> | ফোন: <a href={`tel:${phone}`} className="text-primary underline font-semibold">{phone}</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
