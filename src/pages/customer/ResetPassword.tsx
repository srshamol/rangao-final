import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValid(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"); return; }
    if (password !== confirm) { toast.error("পাসওয়ার্ড মিলছে না"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!");
      navigate("/account");
    }
  };

  if (!valid) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex items-center justify-center py-20">
          <p className="text-muted-foreground">অবৈধ রিসেট লিংক। অনুগ্রহ করে আবার চেষ্টা করুন।</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container flex items-center justify-center py-12 md:py-20">
        <Card className="w-full max-w-md rounded-2xl border-border/50 shadow-premium">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="font-display text-2xl font-extrabold">নতুন পাসওয়ার্ড</CardTitle>
            <CardDescription>আপনার নতুন পাসওয়ার্ড সেট করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">নতুন পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="কমপক্ষে ৬ অক্ষর" className="rounded-xl pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="আবার পাসওয়ার্ড দিন" className="rounded-xl pl-10" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl py-5 font-bold">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                পাসওয়ার্ড পরিবর্তন করুন
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
