import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CustomerLogin() {
  const { signIn } = useCustomer();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("সব ফিল্ড পূরণ করুন"); return; }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "ইমেইল বা পাসওয়ার্ড ভুল" : error.message);
    } else {
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-gold">
              <span className="font-display text-xl font-extrabold text-accent">G</span>
            </div>
            <CardTitle className="font-display text-2xl font-extrabold">লগইন করুন</CardTitle>
            <CardDescription>আপনার অ্যাকাউন্টে প্রবেশ করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ইমেইল</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="rounded-xl pl-10" />
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
