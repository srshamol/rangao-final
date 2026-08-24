import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Phone,
  Star,
  Loader2,
  Calendar,
  AlertTriangle,
  PackageCheck,
  Undo2,
} from "lucide-react";

interface Props {
  order: any;
  onStatusChange: (params: { status: string; note?: string; paymentStatus?: string }) => void;
}

const failureReasons: Record<string, string> = {
  not_home: "গ্রাহক বাড়িতে উপস্থিত ছিলেন না",
  wrong_address: "ভুল বা অসম্পূর্ণ ঠিকানা",
  phone_off: "ফোন বন্ধ বা নট রিচেবল",
  customer_delay: "গ্রাহক পরবর্তীতে ডেলিভারি নিতে চেয়েছেন",
  refused: "গ্রাহক পণ্য নিতে অস্বীকার করেছেন",
  other: "অন্যান্য কারণ",
};

export default function OrderDeliveryTab({ order, onStatusChange }: Props) {
  const [failReason, setFailReason] = useState("not_home");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const { toast } = useToast();
  const qc = useQueryClient();

  const isDelivered = order.order_status === "delivered";
  const shipping = typeof order.shipping_address === "object" ? order.shipping_address : {};

  const handleMarkDelivered = async () => {
    setLoadingAction("deliver");
    try {
      const updatePayload: Record<string, any> = {
        order_status: "delivered",
      };
      if (order.payment_method === "cod") {
        updatePayload.payment_status = "completed";
      }

      const { error } = await supabase.from("orders").update(updatePayload).eq("id", order.id);
      if (error) throw error;

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "delivery_completed",
        details: `ডেলিভারি সম্পন্ন হয়েছে। সংগৃহীত পরিমাণ: ৳${Number(order.total_amount).toLocaleString()}${updatePayload.payment_status ? " (পেমেন্ট সম্পন্ন)" : ""}`,
        staff_name: "Admin",
      });

      toast({ title: "✅ ডেলিভারি সম্পন্ন হয়েছে!", description: "অর্ডার স্ট্যাটাস ও পেমেন্ট আপডেট করা হয়েছে।" });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
    } catch (e: any) {
      toast({ title: "ডেলিভারি মার্ক ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast({ title: "রি-ডেলিভারি তারিখ সিলেক্ট করুন", variant: "destructive" });
      return;
    }

    setLoadingAction("reschedule");
    try {
      const reasonBangla = failureReasons[failReason] || failReason;
      const fullNote = `ডেলিভারি ব্যর্থ: ${reasonBangla}। রি-শিডিউল তারিখ: ${rescheduleDate}${rescheduleNote ? ` | নোট: ${rescheduleNote}` : ""}`;

      await supabase.from("order_notes" as any).insert({
        order_id: order.id,
        note: fullNote,
        staff_name: "Admin",
      });

      await supabase.from("orders").update({ order_status: "hold" as any }).eq("id", order.id);

      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "delivery_rescheduled",
        details: fullNote,
        staff_name: "Admin",
      });

      toast({ title: "📅 ডেলিভারি রি-শিডিউল সম্পন্ন", description: `পরবর্তী তারিখ: ${rescheduleDate}` });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-notes", order.id] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
      setRescheduleNote("");
    } catch (e: any) {
      toast({ title: "রি-শিডিউল ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMarkReturn = async () => {
    setLoadingAction("return");
    try {
      const returnReason = failureReasons[failReason] || failReason;
      const noteText = `পার্সেল রিটার্ন: ${returnReason}${rescheduleNote ? ` | নোট: ${rescheduleNote}` : ""}`;

      await supabase.from("orders").update({ order_status: "courier_cancelled" as any }).eq("id", order.id);
      await supabase.from("order_notes" as any).insert({
        order_id: order.id,
        note: noteText,
        staff_name: "Admin",
      });
      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "courier_return",
        details: noteText,
        staff_name: "Admin",
      });

      toast({ title: "📦 পার্সেল রিটার্ন মার্ক করা হয়েছে", variant: "default" });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
      qc.invalidateQueries({ queryKey: ["order-notes", order.id] });
    } catch (e: any) {
      toast({ title: "রিটার্ন মার্ক ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReopen = async () => {
    setLoadingAction("reopen");
    try {
      await supabase.from("orders").update({ order_status: "shipped" as any }).eq("id", order.id);
      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "status_changed",
        details: "ডেলিভারড স্ট্যাটাস প্রত্যাহার করে 'শিপড' এ ফেরত নেওয়া হয়েছে",
        staff_name: "Admin",
      });
      toast({ title: "অর্ডার পুনরায় ওপেন করা হয়েছে" });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
    } catch (e: any) {
      toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {isDelivered ? (
        <Card className="border-green-300/80 bg-green-50/30 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              ডেলিভারি সফলভাবে সম্পন্ন হয়েছে!
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-muted-foreground hover:text-foreground gap-1"
              onClick={handleReopen}
              disabled={loadingAction === "reopen"}
            >
              {loadingAction === "reopen" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
              পুনরায় ওপেন করুন
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">ডেলিভারি তারিখ ও সময়</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {new Date(order.updated_at).toLocaleString("bn-BD")}
                </p>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">পণ্য রিসিভার</p>
                <p className="font-semibold text-foreground mt-0.5">{order.customer_name} ({order.customer_phone})</p>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">সংগৃহীত পেমেন্ট</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-primary font-mono">৳{Number(order.total_amount).toLocaleString()}</span>
                  <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]" variant="outline">
                    {order.payment_status === "completed" ? "পরিশোধিত" : order.payment_status}
                  </Badge>
                </div>
              </div>
            </div>

            {shipping?.tracking_number && (
              <p className="text-xs text-muted-foreground pt-1">
                কুরিয়ার রেফারেন্স: <strong>{shipping?.courier_company || "Steadfast"}</strong> (ট্র্যাকিং: {shipping.tracking_number})
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mark Complete Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-green-600" />
                ডেলিভারি কনফার্ম করুন
              </CardTitle>
              <CardDescription className="text-xs">
                কাস্টমার পার্সেল রিসিভ করলে এবং COD মূল্য পরিশোধ করলে ডেলিভারি সফল মার্ক করুন
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                className="gap-2 h-10 bg-green-600 hover:bg-green-700 text-white font-medium"
                onClick={handleMarkDelivered}
                disabled={loadingAction === "deliver"}
              >
                {loadingAction === "deliver" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                ✅ ডেলিভারি সম্পন্ন ও পেমেন্ট গ্রহণ
              </Button>
            </CardContent>
          </Card>

          {/* Failed Attempt & Reschedule Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                ডেলিভারি ব্যর্থতা ও রি-শিডিউল / রিটার্ন
              </CardTitle>
              <CardDescription className="text-xs">
                যদি কাস্টমার পার্সেল না নিয়ে থাকেন তবে কারণ নির্বাচন করে পরবর্তী তারিখ নির্ধারণ করুন
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">ব্যর্থতার কারণ</Label>
                  <Select value={failReason} onValueChange={setFailReason}>
                    <SelectTrigger className="h-9 text-sm mt-1">
                      <SelectValue placeholder="কারণ সিলেক্ট করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(failureReasons).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">পরবর্তী রি-ডেলিভারি তারিখ</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm mt-1"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">অতিরিক্ত মন্তব্য / নোট (ঐচ্ছিক)</Label>
                <Textarea
                  placeholder="যেমন: কাস্টমার আগামী শুক্রবারে ডেলিভারি নিতে চেয়েছেন..."
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  rows={2}
                  className="text-sm mt-1"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                <div className="flex gap-2">
                  <a href={`tel:${order.customer_phone}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                      <Phone className="h-3.5 w-3.5 text-blue-600" /> কাস্টমারকে কল করুন
                    </Button>
                  </a>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 text-xs h-9"
                    onClick={handleMarkReturn}
                    disabled={loadingAction === "return"}
                  >
                    {loadingAction === "return" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    পার্সেল রিটার্ন মার্ক করুন
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-9 border-amber-300 text-amber-800 hover:bg-amber-50"
                    onClick={handleReschedule}
                    disabled={loadingAction === "reschedule" || !rescheduleDate}
                  >
                    {loadingAction === "reschedule" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    রি-শিডিউল নিশ্চিত করুন
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
