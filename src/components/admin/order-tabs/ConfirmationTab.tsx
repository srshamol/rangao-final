import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Pause,
  FileSearch,
  RotateCcw,
  ShieldCheck,
  Loader2,
  PhoneCall,
  Sparkles,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { checkCourier } from "@/lib/integrations/bdcourier";
import CourierResultCards from "@/components/admin/CourierResultCards";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface Props {
  order: any;
  onStatusChange: (params: { status: string; note?: string; paymentStatus?: string }) => void;
  loading?: boolean;
}

const statusLabels: Record<string, string> = {
  pending: "পেন্ডিং",
  confirmed: "কনফার্মড",
  hold: "হোল্ড",
  in_review: "ইন-রিভিউ",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভারড",
  cancelled: "ক্যান্সেলড",
  courier_cancelled: "কুরিয়ার ক্যান্সেলড",
};

const quickNotes = [
  "কাস্টমারের সাথে কথা বলে নিশ্চিত করা হয়েছে।",
  "ঠিকানা ও প্রোডাক্ট ভেরিয়েন্ট কনফার্ম করা হয়েছে।",
  "ফোন রিসিভ করেননি, পরবর্তীতে আবার চেষ্টা করা হবে।",
  "গ্রাহক কিছুদিন পরে ডেলিভারি নিতে চেয়েছেন।",
  "কাস্টমার অর্ডারটি বাতিল করতে চেয়েছেন।",
  "ভুল বা অসম্পূর্ণ ঠিকানা, যাচাই করা হচ্ছে।",
];

export default function OrderConfirmationTab({ order, onStatusChange, loading }: Props) {
  const [note, setNote] = useState("");
  const [courierData, setCourierData] = useState<any>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [expandedCourier, setExpandedCourier] = useState(false); // Minimized by default
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { toast } = useToast();
  const qc = useQueryClient();

  const fetchCourierInsight = async (phone: string) => {
    setCourierLoading(true);
    try {
      const data = await checkCourier(phone);
      setCourierData(data);
    } catch (e: any) {
      console.warn("Courier check error:", e);
    } finally {
      setCourierLoading(false);
    }
  };

  const toggleCourierHistory = () => {
    const nextState = !expandedCourier;
    setExpandedCourier(nextState);
    if (nextState && !courierData && order?.customer_phone) {
      fetchCourierInsight(order.customer_phone);
    }
  };

  const handleStatusUpdate = (status: string) => {
    onStatusChange({ status, note: note.trim() || undefined });
    setNote("");
  };

  const saveOnlyNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await supabase.from("order_notes" as any).insert({
        order_id: order.id,
        note: note.trim(),
        staff_name: "Admin",
      });
      await supabase.from("order_history" as any).insert({
        order_id: order.id,
        action: "note_added",
        details: `কনফার্মেশন নোট: ${note.trim()}`,
        staff_name: "Admin",
      });

      qc.invalidateQueries({ queryKey: ["order-notes", order.id] });
      qc.invalidateQueries({ queryKey: ["order-history", order.id] });
      toast({ title: "✅ নোট সেভ হয়েছে" });
      setNote("");
    } catch (e: any) {
      toast({ title: "নোট সেভ ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  const currentStatus = order?.order_status || "pending";

  return (
    <div className="space-y-4 mt-4">
      {/* Current Status Banner */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-muted-foreground">বর্তমান অর্ডার অবস্থা</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                {statusLabels[currentStatus] || currentStatus}
              </Badge>
              <span className="text-xs text-muted-foreground">
                (আপডেট: {new Date(order.updated_at || order.created_at).toLocaleString("bn-BD")})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`tel:${order.customer_phone}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
                কাস্টমারকে কল করুন
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Customer Reliability & Courier History Check (Minimized by default) */}
      <Card className="border-border/60 shadow-sm transition-all">
        <CardHeader
          className={`cursor-pointer select-none transition-colors ${
            expandedCourier ? "pb-3" : "py-3 hover:bg-muted/30"
          }`}
          onClick={toggleCourierHistory}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold">
                  কাস্টমার পার্সেল ও ডেলিভারি হিস্টোরি (BDCourier)
                </CardTitle>
                <CardDescription className="text-xs">
                  {expandedCourier
                    ? "অর্ডার কনফার্ম করার পূর্বে গ্রাহকের বিগত ডেলিভারি সাকসেস রেট যাচাই করুন"
                    : "বিগত পার্সেল রেকর্ড ও ডেলিভারি সাকসেস রেট দেখতে ক্লিক করুন"}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {expandedCourier ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => fetchCourierInsight(order.customer_phone)}
                    disabled={courierLoading}
                  >
                    {courierLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    পুনরায় যাচাই
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={toggleCourierHistory}
                  >
                    <ChevronUp className="h-3.5 w-3.5" /> মিনিমাইজ
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={toggleCourierHistory}
                >
                  <ChevronDown className="h-3.5 w-3.5" /> হিস্টোরি দেখুন
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {expandedCourier && (
          <CardContent className="pt-0 border-t border-border/40 mt-1">
            <div className="pt-3">
              {courierLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  কুরিয়ার হিস্টোরি চেক করা হচ্ছে...
                </div>
              ) : courierData ? (
                <CourierResultCards data={courierData} />
              ) : (
                <div className="text-xs text-muted-foreground py-3 text-center border rounded-md border-dashed">
                  কুরিয়ার ডেটা লোড হয়নি। পুনরায় যাচাই বাটনে ক্লিক করুন।
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions Grid */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            অর্ডার কনফার্মেশন ও স্ট্যাটাস একশন
          </CardTitle>
          <CardDescription className="text-xs">
            গ্রাহকের সাথে কথা বলে কনফার্মেশন স্ট্যাটাস সিলেক্ট করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Button
              className="gap-1.5 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={() => handleStatusUpdate("confirmed")}
              disabled={loading || currentStatus === "confirmed"}
            >
              <CheckCircle className="h-4 w-4" /> কনফার্ম করুন
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 h-10 border-orange-300 text-orange-700 hover:bg-orange-50 font-medium"
              onClick={() => handleStatusUpdate("hold")}
              disabled={loading || currentStatus === "hold"}
            >
              <Pause className="h-4 w-4" /> অন হোল্ড
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 h-10 border-amber-300 text-amber-700 hover:bg-amber-50 font-medium"
              onClick={() => handleStatusUpdate("in_review")}
              disabled={loading || currentStatus === "in_review"}
            >
              <FileSearch className="h-4 w-4" /> ইন-রিভিউ
            </Button>
            <Button
              variant="destructive"
              className="gap-1.5 h-10 font-medium"
              onClick={() => setShowCancelDialog(true)}
              disabled={loading || currentStatus === "cancelled"}
            >
              <XCircle className="h-4 w-4" /> ক্যান্সেল করুন
            </Button>
          </div>

          {/* Preset Quick Note Badges */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">কুইক নোট টেমপ্লেট (ক্লিক করে যুক্ত করুন):</p>
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map((qn, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNote((prev) => (prev ? `${prev} ${qn}` : qn))}
                  className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2.5 py-1 rounded-full border border-border/60 transition-colors text-left"
                >
                  + {qn}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">কনফার্মেশন / ক্যান্সেলেশন নোট লিখুন</label>
              {currentStatus !== "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => handleStatusUpdate("pending")}
                  disabled={loading}
                >
                  <RotateCcw className="h-3 w-3" /> পেন্ডিং এ ফেরত
                </Button>
              )}
            </div>
            <Textarea
              placeholder="অর্ডার সম্পর্কিত কোনো বিশেষ নির্দেশনা বা মন্তব্য..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={saveOnlyNote}
                disabled={!note.trim() || savingNote}
              >
                {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                শুধু নোট সেভ করুন
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">অর্ডার বাতিল নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই অর্ডারটি বাতিল (Cancel) করতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">ফিরে যান</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => {
                setShowCancelDialog(false);
                handleStatusUpdate("cancelled");
              }}
            >
              হ্যাঁ, বাতিল করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
