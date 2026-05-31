import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Save, Store, Truck, CreditCard, Settings2, BarChart3, CheckCircle2, XCircle, RefreshCw, Send } from "lucide-react";

interface StoreInfo {
  name: string; phone: string; email: string; address: string; logo_url: string;
}
interface DeliveryCharges {
  dhaka_inside: number; dhaka_outside: number; free_delivery_min: number;
}
interface PaymentMethods {
  cod: boolean; bkash: boolean; nagad: boolean; bkash_number: string; nagad_number: string;
}
interface CourierSettings {
  default_courier: string; auto_sync_hours: number;
}
interface FacebookPixel {
  pixel_id: string; access_token: string; test_event_code: string; enabled: boolean;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ name: "", phone: "", email: "", address: "", logo_url: "" });
  const [delivery, setDelivery] = useState<DeliveryCharges>({ dhaka_inside: 70, dhaka_outside: 130, free_delivery_min: 0 });
  const [payment, setPayment] = useState<PaymentMethods>({ cod: true, bkash: false, nagad: false, bkash_number: "", nagad_number: "" });
  const [courier, setCourier] = useState<CourierSettings>({ default_courier: "steadfast", auto_sync_hours: 6 });
  const [fbPixel, setFbPixel] = useState<FacebookPixel>({ pixel_id: "", access_token: "", test_event_code: "", enabled: false });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("store_settings" as any).select("key, value");
      if (data) {
        data.forEach((row: any) => {
          if (row.key === "store_info") setStoreInfo(row.value);
          if (row.key === "delivery_charges") setDelivery(row.value);
          if (row.key === "payment_methods") setPayment(row.value);
          if (row.key === "courier_settings") setCourier(row.value);
          if (row.key === "facebook_pixel") setFbPixel(row.value);
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    setSaving(key);
    try {
      const { error } = await supabase.from("store_settings" as any)
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
      toast({ title: "✅ সেটিংস সেভ হয়েছে" });
    } catch (e: any) {
      toast({ title: "সেভ ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">⚙️ সেটিংস</h1>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> অ্যাকাউন্ট তথ্য</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>ইমেইল:</strong> {user?.email}</p>
          <p><strong>ইউজার আইডি:</strong> {user?.id}</p>
          <p><strong>লগইন তারিখ:</strong> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("bn-BD") : "—"}</p>
        </CardContent>
      </Card>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> স্টোর ইনফরমেশন</CardTitle>
          <CardDescription>আপনার স্টোরের নাম, ফোন, ইমেইল ও ঠিকানা সেট করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>স্টোরের নাম</Label>
              <Input value={storeInfo.name} onChange={e => setStoreInfo(p => ({ ...p, name: e.target.value }))} placeholder="GadgetGram" />
            </div>
            <div className="space-y-2">
              <Label>ফোন নম্বর</Label>
              <Input value={storeInfo.phone} onChange={e => setStoreInfo(p => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>ইমেইল</Label>
              <Input value={storeInfo.email} onChange={e => setStoreInfo(p => ({ ...p, email: e.target.value }))} placeholder="info@gadgetgram.com" />
            </div>
            <div className="space-y-2">
              <Label>ঠিকানা</Label>
              <Input value={storeInfo.address} onChange={e => setStoreInfo(p => ({ ...p, address: e.target.value }))} placeholder="ঢাকা, বাংলাদেশ" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>লোগো URL</Label>
            <Input value={storeInfo.logo_url} onChange={e => setStoreInfo(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => saveSetting("store_info", storeInfo)} disabled={saving === "store_info"}>
            {saving === "store_info" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} সেভ করুন
          </Button>
        </CardContent>
      </Card>

      {/* Delivery Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> ডেলিভারি চার্জ</CardTitle>
          <CardDescription>এলাকা অনুযায়ী ডেলিভারি চার্জ সেট করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ঢাকা সিটির ভিতরে (৳)</Label>
              <Input type="number" value={delivery.dhaka_inside} onChange={e => setDelivery(p => ({ ...p, dhaka_inside: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>ঢাকা সিটির বাইরে (৳)</Label>
              <Input type="number" value={delivery.dhaka_outside} onChange={e => setDelivery(p => ({ ...p, dhaka_outside: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>ফ্রি ডেলিভারি মিনিমাম (৳)</Label>
              <Input type="number" value={delivery.free_delivery_min} onChange={e => setDelivery(p => ({ ...p, free_delivery_min: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground">০ = ফ্রি ডেলিভারি অফ</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => saveSetting("delivery_charges", delivery)} disabled={saving === "delivery_charges"}>
            {saving === "delivery_charges" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} সেভ করুন
          </Button>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> পেমেন্ট মেথড</CardTitle>
          <CardDescription>কোন কোন পেমেন্ট মেথড অন/অফ করতে চান সেট করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">ক্যাশ অন ডেলিভারি (COD)</p>
              <p className="text-xs text-muted-foreground">পণ্য হাতে পেয়ে টাকা দিবেন</p>
            </div>
            <Switch checked={payment.cod} onCheckedChange={v => setPayment(p => ({ ...p, cod: v }))} />
          </div>

          <Separator />

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">বিকাশ (bKash)</p>
              <p className="text-xs text-muted-foreground">মোবাইল ব্যাংকিং পেমেন্ট</p>
            </div>
            <Switch checked={payment.bkash} onCheckedChange={v => setPayment(p => ({ ...p, bkash: v }))} />
          </div>
          {payment.bkash && (
            <div className="space-y-2 pl-3">
              <Label>বিকাশ নম্বর</Label>
              <Input value={payment.bkash_number} onChange={e => setPayment(p => ({ ...p, bkash_number: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">নগদ (Nagad)</p>
              <p className="text-xs text-muted-foreground">মোবাইল ব্যাংকিং পেমেন্ট</p>
            </div>
            <Switch checked={payment.nagad} onCheckedChange={v => setPayment(p => ({ ...p, nagad: v }))} />
          </div>
          {payment.nagad && (
            <div className="space-y-2 pl-3">
              <Label>নগদ নম্বর</Label>
              <Input value={payment.nagad_number} onChange={e => setPayment(p => ({ ...p, nagad_number: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
          )}

          <Button size="sm" className="gap-1.5" onClick={() => saveSetting("payment_methods", payment)} disabled={saving === "payment_methods"}>
            {saving === "payment_methods" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} সেভ করুন
          </Button>
        </CardContent>
      </Card>

      {/* Courier Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> কুরিয়ার সেটিংস</CardTitle>
          <CardDescription>ডিফল্ট কুরিয়ার ও অটো সিঙ্ক সময় সেট করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ডিফল্ট কুরিয়ার</Label>
              <Select value={courier.default_courier} onValueChange={v => setCourier(p => ({ ...p, default_courier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="steadfast">Steadfast</SelectItem>
                  <SelectItem value="redx">RedX</SelectItem>
                  <SelectItem value="paperfly">Paperfly</SelectItem>
                  <SelectItem value="pathao">Pathao</SelectItem>
                  <SelectItem value="sundarban">Sundarban</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>অটো সিঙ্ক (ঘণ্টা)</Label>
              <Input type="number" value={courier.auto_sync_hours} onChange={e => setCourier(p => ({ ...p, auto_sync_hours: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground">প্রতি কত ঘণ্টায় কুরিয়ার স্ট্যাটাস অটো সিঙ্ক হবে</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => saveSetting("courier_settings", courier)} disabled={saving === "courier_settings"}>
            {saving === "courier_settings" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} সেভ করুন
          </Button>
        </CardContent>
      </Card>

      {/* Facebook Pixel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Facebook Pixel / Conversions API</CardTitle>
          <CardDescription>Facebook পিক্সেল ও Conversions API সেটআপ করুন — PageView, AddToCart, Purchase ইভেন্ট অটোমেটিক ট্র্যাক হবে</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">পিক্সেল ট্র্যাকিং</p>
              <p className="text-xs text-muted-foreground">অন করলে সব পেজে পিক্সেল লোড হবে</p>
            </div>
            <Switch checked={fbPixel.enabled} onCheckedChange={v => setFbPixel(p => ({ ...p, enabled: v }))} />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Dataset ID / Pixel ID</Label>
            <Input value={fbPixel.pixel_id} onChange={e => setFbPixel(p => ({ ...p, pixel_id: e.target.value }))} placeholder="123456789012345" />
            <p className="text-xs text-muted-foreground">Facebook Business Manager → Events Manager → Settings → Dataset ID কপি করুন</p>
          </div>

          <div className="space-y-2">
            <Label>Access Token (Conversions API)</Label>
            <Input type="password" value={fbPixel.access_token} onChange={e => setFbPixel(p => ({ ...p, access_token: e.target.value }))} placeholder="EAA..." />
            <p className="text-xs text-muted-foreground">Events Manager → Settings → Generate Access Token। ⚠️ এই টোকেন Facebook আর দেখাবে না, তাই সেভ করে রাখুন</p>
          </div>

          <div className="space-y-2">
            <Label>Test Event Code</Label>
            <Input value={fbPixel.test_event_code} onChange={e => setFbPixel(p => ({ ...p, test_event_code: e.target.value }))} placeholder="TEST12345" />
            <p className="text-xs text-muted-foreground">Events Manager → Test Events ট্যাব থেকে কোড নিন। টেস্টিং শেষ হলে এটি খালি রাখুন</p>
          </div>

          <Button size="sm" className="gap-1.5" onClick={() => saveSetting("facebook_pixel", fbPixel)} disabled={saving === "facebook_pixel"}>
            {saving === "facebook_pixel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} সেভ করুন
          </Button>
        </CardContent>
      </Card>

      {/* Facebook CAPI Status */}
      <FacebookCAPIStatus />
    </div>
  );
}

function FacebookCAPIStatus() {
  const { data: capiLogs = [], isLoading } = useQuery({
    queryKey: ["fb-capi-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_history")
        .select("*")
        .eq("action", "fb_capi_sent")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const successCount = capiLogs.filter((l: any) => l.details?.includes("সফলভাবে")).length;
  const failCount = capiLogs.filter((l: any) => l.details?.includes("ব্যর্থ")).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" /> Facebook Conversions API স্ট্যাটাস
        </CardTitle>
        <CardDescription>সার্ভার-সাইডে পাঠানো Purchase ইভেন্টগুলোর লগ</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-extrabold">{capiLogs.length}</p>
            <p className="text-xs text-muted-foreground">মোট পাঠানো</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-extrabold text-green-600">{successCount}</p>
            <p className="text-xs text-muted-foreground">সফল</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-extrabold text-destructive">{failCount}</p>
            <p className="text-xs text-muted-foreground">ব্যর্থ</p>
          </div>
        </div>

        {/* Recent logs */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
        ) : capiLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">এখনো কোনো CAPI ইভেন্ট পাঠানো হয়নি</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {capiLogs.map((log: any) => {
              const isSuccess = log.details?.includes("সফলভাবে");
              return (
                <div key={log.id} className="flex items-start gap-2 rounded-lg border p-2.5 text-xs">
                  {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{log.details}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {new Date(log.created_at).toLocaleString("bn-BD")}
                    </p>
                  </div>
                  <Badge variant={isSuccess ? "default" : "destructive"} className="text-[10px] shrink-0">
                    {isSuccess ? "সফল" : "ব্যর্থ"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
