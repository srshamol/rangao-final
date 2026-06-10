import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Key, Shield, User as UserIcon, Mail, Phone } from "lucide-react";

export default function AdminProfile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Profile info state
  const [role, setRole] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  
  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAdminData = async () => {
      setProfileLoading(true);
      try {
        // Fetch role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (roleData) {
          setRole(roleData.role);
        }

        // Fetch or create profile info
        const { data: profileData, error: profileError } = await supabase
          .from("customer_profiles" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileData) {
          setFullName(profileData.full_name || "");
          setPhone(profileData.phone || "");
          setUsername(profileData.username || "");
        } else {
          // If no profile exists yet, prefill with user metadata if available
          setFullName(user.user_metadata?.full_name || "");
          setPhone(user.user_metadata?.phone || "");
          setUsername(user.user_metadata?.username || "");
        }
      } catch (err: any) {
        console.error("Error fetching admin profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchAdminData();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (username.trim()) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(username.trim())) {
        toast({
          title: "❌ ভুল ইনপুট",
          description: "ইউজারনেম ৩ থেকে ২০ অক্ষরের হতে হবে এবং শুধুমাত্র ইংরেজি বর্ণ, সংখ্যা, আন্ডারস্কোর (_) বা হাইফেন (-) থাকতে পারবে।",
          variant: "destructive",
        });
        return;
      }
    }

    if (phone.trim()) {
      const bdPhoneRegex = /^(01[3-9]\d{8})$/;
      if (!bdPhoneRegex.test(phone.trim())) {
        toast({
          title: "❌ ভুল ইনপুট",
          description: "১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)",
          variant: "destructive",
        });
        return;
      }
    }

    setSavingProfile(true);
    try {
      // Check if profile row exists
      const { data: existingProfile } = await supabase
        .from("customer_profiles" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const profilePayload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        username: username.trim() ? username.trim().toLowerCase() : null,
        email: user.email,
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        const { error } = await supabase
          .from("customer_profiles" as any)
          .update(profilePayload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_profiles" as any)
          .insert({
            ...profilePayload,
            user_id: user.id,
            created_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      toast({
        title: "✅ সফল",
        description: "আপনার প্রোফাইল তথ্য সফলভাবে আপডেট করা হয়েছে।",
      });
    } catch (err: any) {
      toast({
        title: "❌ আপডেট ব্যর্থ",
        description: err.message || "প্রোফাইল আপডেট করতে সমস্যা হয়েছে। ইউজারনেমটি অন্য কেউ ব্যবহার করে থাকতে পারে।",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      toast({ title: "❌ ভুল ইনপুট", description: "বর্তমান পাসওয়ার্ড দিতে হবে।", variant: "destructive" });
      return;
    }
    if (!newPassword.trim()) {
      toast({ title: "❌ ভুল ইনপুট", description: "নতুন পাসওয়ার্ড খালি হতে পারবে না।", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "❌ ভুল ইনপুট", description: "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "❌ ভুল ইনপুট", description: "নতুন পাসওয়ার্ড দুটি মেলেনি।", variant: "destructive" });
      return;
    }

    setUpdatingPassword(true);
    try {
      // Verify current password by signing in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: oldPassword.trim()
      });

      if (verifyError) {
        throw new Error("আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়।");
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });
      
      if (error) throw error;
      
      toast({ title: "✅ সফল", description: "আপনার পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "❌ আপডেট ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div className="flex flex-col gap-1.5 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">👤 অ্যাডমিন প্রোফাইল সেটিংস</h1>
        <p className="text-sm text-muted-foreground">আপনার ব্যক্তিগত প্রোফাইল তথ্য এবং পাসওয়ার্ড আপডেট করুন।</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <UserIcon className="h-5 w-5 text-accent" /> প্রোফাইল তথ্য
            </CardTitle>
            <CardDescription>
              আপনার নাম ও যোগাযোগের তথ্য পরিবর্তন করুন।
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold">ইমেইল (অপরিবর্তনযোগ্য)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="pl-9 rounded-xl bg-secondary/50 text-muted-foreground cursor-not-allowed border-border/70"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-semibold">পদবি / রোল</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="role"
                    type="text"
                    value={role ? role.toUpperCase() : "অ্যাডমিন"}
                    disabled
                    className="pl-9 rounded-xl bg-secondary/50 text-muted-foreground cursor-not-allowed border-border/70"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-semibold">ইউজারনেম (লগইন করার জন্য)</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ইউজারনেম লিখুন (যেমন: test_admin)"
                    className="pl-9 rounded-xl border-border/70"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-semibold">পূর্ণ নাম</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="আপনার নাম লিখুন"
                  className="rounded-xl border-border/70"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold">ফোন নম্বর</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="pl-9 rounded-xl border-border/70"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                সংরক্ষণ করুন
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Key className="h-5 w-5 text-accent" /> পাসওয়ার্ড পরিবর্তন
            </CardTitle>
            <CardDescription>
              অ্যাকাউন্টের নিরাপত্তা জোরদার করতে পাসওয়ার্ড পরিবর্তন করুন।
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPass" className="text-xs font-semibold">বর্তমান পাসওয়ার্ড</Label>
                <Input
                  id="oldPass"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border-border/70"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPass" className="text-xs font-semibold">নতুন পাসওয়ার্ড</Label>
                <Input
                  id="newPass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border-border/70"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPass" className="text-xs font-semibold">নতুন পাসওয়ার্ড নিশ্চিত করুন</Label>
                <Input
                  id="confirmPass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border-border/70"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={updatingPassword}
                className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                পাসওয়ার্ড পরিবর্তন করুন
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
