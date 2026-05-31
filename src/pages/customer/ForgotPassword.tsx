import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("ইমেইল দিন"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container flex items-center justify-center py-12 md:py-20">
        <Card className="w-full max-w-md rounded-2xl border-border/50 shadow-premium">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="font-display text-2xl font-extrabold">পাসওয়ার্ড রিসেট</CardTitle>
            <CardDescription>
              {sent ? "আপনার ইমেইলে রিসেট লিংক পাঠানো হয়েছে" : "আপনার ইমেইল দিন, রিসেট লিংক পাঠানো হবে"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">আপনার ইমেইল চেক করুন এবং রিসেট লিংকে ক্লিক করুন।</p>
                <Link to="/login">
                  <Button variant="outline" className="rounded-xl">
                    <ArrowLeft className="mr-2 h-4 w-4" /> লগইনে ফিরে যান
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">ইমেইল</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="rounded-xl pl-10" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl py-5 font-bold">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  রিসেট লিংক পাঠান
                </Button>
                <p className="text-center">
                  <Link to="/login" className="text-sm text-accent hover:underline">লগইনে ফিরে যান</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
