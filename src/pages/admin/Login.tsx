import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Mail, Lock, Eye, EyeOff, Check, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useStoreSettings();

  const businessName = settings?.storeInfo?.name ? settings.storeInfo.name.split(" - ")[0] : "Rangao";
  const faviconUrl = settings?.storeInfo?.favicon_url;

  // Load prefilled email if Remember Me was checked previously
  useEffect(() => {
    const savedEmail = localStorage.getItem("rangao_admin_remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "লগইন ব্যর্থ হয়েছে",
        description: error.message || "আপনার ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } else {
      if (rememberMe) {
        localStorage.setItem("rangao_admin_remember_email", email);
      } else {
        localStorage.removeItem("rangao_admin_remember_email");
      }
      toast({
        title: "লগইন সফল হয়েছে",
        description: `স্বাগতম, ${businessName} অ্যাডমিন প্যানেল।`,
      });
      navigate("/admin");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061f17] via-[#0d2a1d] to-[#04120d] p-4 sm:p-6 md:p-10 font-sans selection:bg-[#C9A24D]/25 selection:text-white">
      {/* Background patterns */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,77,0.06),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(15,61,46,0.2),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl grid overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_24px_80px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl md:grid-cols-2"
      >
        {/* Left Branding Panel */}
        <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F3D2E] via-[#0b2b21] to-[#051510] p-10 lg:p-12 text-white">
          {/* Subtle Geometric Overlay */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-repeat bg-[size:32px_32px]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M16 0l16 16-16 16L0 16z' fill='%23fff'/%3E%3C/svg%3E")` }} />

          {/* Mosque Silhouette / Dome vector effect in corner */}
          <div className="absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-[#C9A24D]/5 blur-3xl pointer-events-none" />

          {/* Top Logo Section */}
          <div className="relative flex items-center gap-3 z-10">
            {faviconUrl ? (
              <img src={faviconUrl} alt="Logo" className="h-9 w-9 rounded-xl object-contain bg-white/10 p-1" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9A24D] text-[#0F3D2E]">
                <Sparkles className="h-4.5 w-4.5 fill-current" />
              </div>
            )}
            <span className="font-display text-lg font-bold uppercase tracking-widest text-[#C9A24D]">{businessName}</span>
          </div>

          {/* Center Text Section */}
          <div className="relative my-auto py-12 z-10 space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A24D]/20 bg-[#C9A24D]/10 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9A24D]"
            >
              ✦ Premium Auth ✦
            </motion.div>
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold leading-tight text-white">
              {businessName} Admin
            </h2>
            <p className="text-white/70 text-sm lg:text-base font-light leading-relaxed max-w-sm">
              আপনার অ্যাডমিন প্যানেলে স্বাগতম। নিরাপদে লগইন করে স্টোরের প্রোডাক্ট, অর্ডার এবং ডেকোরেশন সেটিংস পরিচালনা করুন।
            </p>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 flex items-center gap-2 text-xs text-white/40 border-t border-white/5 pt-6">
            <ShieldAlert className="h-4 w-4 text-[#C9A24D]/60" />
            <span>নিরাপদ এসএসএল ও এনক্রিপ্টেড সংযোগ</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12 bg-white">
          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* Header Title (Mobile Visible Logo as well) */}
            <div className="space-y-2 text-center md:text-left">
              <div className="flex justify-center md:justify-start mb-4 md:hidden">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Logo" className="h-12 w-12 rounded-2xl object-contain bg-secondary p-1.5 shadow-sm border border-border/40" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F3D2E] text-[#C9A24D] shadow-sm">
                    <Sparkles className="h-6 w-6 fill-current" />
                  </div>
                )}
              </div>
              <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl leading-tight">
                {businessName} Admin
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                অ্যাডমিন প্যানেলে লগইন করুন
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">ইমেইল ঠিকানা</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/60 transition-colors" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@rangao.bd"
                    className="h-11 pl-11 pr-4 rounded-xl bg-background border-border/70 text-foreground placeholder:text-muted-foreground/45 focus:border-[#0F3D2E]/40 focus:ring-1 focus:ring-[#0F3D2E]/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/60 transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pl-11 pr-11 rounded-xl bg-background border-border/70 text-foreground placeholder:text-muted-foreground/45 focus:border-[#0F3D2E]/40 focus:ring-1 focus:ring-[#0F3D2E]/20 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-[#0F3D2E] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center pt-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-[#0F3D2E] transition-colors cursor-pointer select-none"
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                    rememberMe ? "border-[#0F3D2E] bg-[#0F3D2E] text-[#C9A24D]" : "border-border bg-background"
                  }`}>
                    {rememberMe && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <span>আমাকে মনে রাখুন</span>
                </button>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full h-12 mt-6 rounded-xl bg-[#0F3D2E] text-[#C9A24D] hover:bg-[#165c46] hover:text-white font-bold transition-all duration-300 shadow-[0_4px_25px_rgba(15,61,46,0.15)] hover:scale-[1.01] active:scale-95 disabled:scale-100 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin animate-duration-1000" /> লগইন হচ্ছে...
                  </span>
                ) : (
                  "লগইন"
                )}
              </Button>
            </form>

          </div>
        </div>

      </motion.div>
    </div>
  );
}
