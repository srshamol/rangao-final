import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Mail, Lock, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CustomerLogin() {
  const { signIn } = useCustomer();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: settings } = useStoreSettings();

  const businessName = settings?.storeInfo?.name ? settings.storeInfo.name.split(" - ")[0] : "Rangao";
  const faviconUrl = settings?.storeInfo?.favicon_url;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) { toast.error("সব ফিল্ড পূরণ করুন"); return; }
    setLoading(true);

    let loginEmail = identifier.trim();
    let cleanedPhone = loginEmail.replace(/[\s\-\(\)\+]/g, ""); // strip spaces, dashes, parens, plus

    // Normalize Bangladeshi country code prefix
    if (cleanedPhone.startsWith("880")) {
      cleanedPhone = "0" + cleanedPhone.slice(3);
    }

    let customerPhone: string | null = null;
    let isPhone = false;

    // If it matches Bangladeshi mobile number format
    if (/^01[3-9]\d{8}$/.test(cleanedPhone)) {
      isPhone = true;
      customerPhone = cleanedPhone;
      // Find the email linked to this phone number
      const { data } = await supabase
        .from("customer_profiles" as any)
        .select("email")
        .eq("phone", cleanedPhone)
        .maybeSingle();

      if (data?.email) {
        loginEmail = data.email;
      } else {
        setLoading(false);
        toast.error("এই ফোন নম্বর দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি");
        return;
      }
    } else {
      // Find the phone linked to this email to check if blocked
      const { data } = await supabase
        .from("customer_profiles" as any)
        .select("phone")
        .eq("email", loginEmail)
        .maybeSingle();
      if (data?.phone) {
        customerPhone = data.phone;
      }
    }

    // Check if the customer phone number is blocked
    if (customerPhone) {
      const { data: isBlocked } = await supabase
        .from("blocked_entities")
        .select("id")
        .eq("type", "phone")
        .eq("value", customerPhone)
        .maybeSingle();

      if (isBlocked) {
        setLoading(false);
        toast.error("আপনার অ্যাকাউন্টটি স্থগিত করা হয়েছে। অনুগ্রহ করে কর্তৃপক্ষের সাথে যোগাযোগ করুন।");
        return;
      }
    }

    const { error } = await signIn(loginEmail, password);
    if (error) {
      setLoading(false);
      toast.error(error.message === "Invalid login credentials" ? "ইমেইল/ফোন বা পাসওয়ার্ড ভুল" : error.message);
    } else {
      // Check if profile exists after login to prevent deleted users from accessing dashboard
      const { data: profileExists } = await supabase
        .from("customer_profiles" as any)
        .select("id")
        .eq("email", loginEmail)
        .maybeSingle();

      if (!profileExists) {
        // Retrieve current session user to check if they are admin or manager
        const sessionUser = (await supabase.auth.getUser()).data.user;
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sessionUser?.id || "")
          .maybeSingle();

        const isAdmin = roleData?.role === "admin" || roleData?.role === "manager";

        if (isAdmin && sessionUser) {
          // Auto-create customer profile for admin/manager so they can test/shop
          await supabase
            .from("customer_profiles" as any)
            .insert({
              user_id: sessionUser.id,
              email: sessionUser.email || loginEmail,
              full_name: sessionUser.user_metadata?.full_name || "Admin User",
              phone: sessionUser.user_metadata?.phone || ""
            });
        } else {
          await supabase.auth.signOut();
          setLoading(false);
          toast.error("এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে বা মুছে ফেলা হয়েছে।");
          return;
        }
      }

      setLoading(false);
      toast.success("সফলভাবে লগইন হয়েছে!");
      navigate("/account");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container flex items-center justify-center py-12 md:py-20">
        <Card className="w-full max-w-md rounded-2xl border-border/50 shadow-premium">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-gold overflow-hidden">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Logo" className="h-full w-full object-contain p-2 bg-white" />
              ) : (
                <span className="font-display text-xl font-extrabold text-accent">{businessName[0] || "R"}</span>
              )}
            </div>
            <CardTitle className="font-display text-2xl font-extrabold">লগইন করুন</CardTitle>
            <CardDescription>আপনার অ্যাকাউন্টে প্রবেশ করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ইমেইল বা ফোন নম্বর</label>
                <div className="relative">
                  {/^\+?\d+$/.test(identifier) ? (
                    <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  )}
                  <Input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="ইমেইল অথবা মোবাইল নম্বর" className="rounded-xl pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">পাসওয়ার্ড</label>
                  <Link to="/forgot-password" className="text-xs text-accent hover:underline">পাসওয়ার্ড ভুলে গেছেন?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="rounded-xl pl-10" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl py-5 font-bold">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              অ্যাকাউন্ট নেই?{" "}
              <Link to="/register" className="font-semibold text-accent hover:underline">রেজিস্ট্রেশন করুন</Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
