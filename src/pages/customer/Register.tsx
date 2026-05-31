import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CustomerRegister() {
  const { signUp } = useCustomer();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("সব ফিল্ড পূরণ করুন"); return; }
    if (password.length < 6) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("অ্যাকাউন্ট তৈরি হয়েছে! লগইন হচ্ছে...");
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
            <CardTitle className="font-display text-2xl font-extrabold">রেজিস্ট্রেশন</CardTitle>
            <CardDescription>নতুন অ্যাকাউন্ট তৈরি করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">আপনার নাম</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="আপনার পূর্ণ নাম" className="rounded-xl pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ইমেইল</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="rounded-xl pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="কমপক্ষে ৬ অক্ষর" className="rounded-xl pl-10" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl py-5 font-bold">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
              <Link to="/login" className="font-semibold text-accent hover:underline">লগইন করুন</Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
