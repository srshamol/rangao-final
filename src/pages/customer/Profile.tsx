import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CustomerProfile() {
  const { profile, updateProfile } = useCustomer();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    division: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        address: (profile.default_address as any)?.address || "",
        division: (profile.default_address as any)?.division || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (form.phone.trim()) {
      const bdPhoneRegex = /^(01[3-9]\d{8})$/;
      if (!bdPhoneRegex.test(form.phone.trim())) {
        toast.error("১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)");
        return;
      }
    }
    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        default_address: { address: form.address, division: form.division },
      } as any);
      toast.success("প্রোফাইল আপডেট হয়েছে!");
    } catch {
      toast.error("আপডেট ব্যর্থ হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 md:py-12">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/account"><Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="font-display text-2xl font-extrabold">⚙️ প্রোফাইল সেটিংস</h1>
        </div>

        <Card className="max-w-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">ব্যক্তিগত তথ্য</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">নাম</label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ফোন নম্বর</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-xl" placeholder="01XXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ইমেইল</label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">বিভাগ</label>
              <Input value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} className="rounded-xl" placeholder="ঢাকা" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ডিফল্ট ঠিকানা</label>
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="বাড়ি, রোড, এলাকা..."
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              সেভ করুন
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
