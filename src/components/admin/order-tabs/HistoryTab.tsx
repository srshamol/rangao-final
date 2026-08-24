import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  Plus,
  Loader2,
  FileText,
  User,
  Activity,
  Truck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Shield,
  Search,
  Filter,
  ArrowDownUp,
  Sparkles,
} from "lucide-react";

interface Props {
  orderId: string;
}

const actionMeta: Record<string, { label: string; color: string; icon: any; category: string }> = {
  status_changed: { label: "স্ট্যাটাস পরিবর্তন", color: "bg-blue-100 text-blue-800 border-blue-300", icon: Activity, category: "status" },
  courier_booked: { label: "কুরিয়ার বুকিং", color: "bg-orange-100 text-orange-800 border-orange-300", icon: Truck, category: "courier" },
  bulk_courier_booked: { label: "বাল্ক কুরিয়ার বুকিং", color: "bg-orange-100 text-orange-800 border-orange-300", icon: Truck, category: "courier" },
  tracking_updated: { label: "ট্র্যাকিং আপডেট", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Truck, category: "courier" },
  auto_status_sync: { label: "অটো স্ট্যাটাস সিঙ্ক", color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: Activity, category: "courier" },
  delivery_completed: { label: "ডেলিভারি সম্পন্ন", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2, category: "delivery" },
  delivery_rescheduled: { label: "রি-শিডিউল", color: "bg-amber-100 text-amber-800 border-amber-300", icon: Calendar, category: "delivery" },
  courier_return: { label: "পার্সেল রিটার্ন", color: "bg-red-100 text-red-800 border-red-300", icon: AlertCircle, category: "delivery" },
  customer_info_edited: { label: "কাস্টমার তথ্য এডিট", color: "bg-cyan-100 text-cyan-800 border-cyan-300", icon: User, category: "customer" },
  note_added: { label: "স্টাফ নোট", color: "bg-gray-100 text-gray-800 border-gray-300", icon: FileText, category: "notes" },
  order_created: { label: "অর্ডার তৈরি", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2, category: "status" },
};

function formatExactBanglaTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const formattedDate = d.toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = d.toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return `${formattedDate}, ${formattedTime}`;
}

function getRelativeBanglaTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 45) return "এইমাত্র";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} মিনিট আগে`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "গতকাল";
  if (diffDays < 30) return `${diffDays} দিন আগে`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} মাস আগে`;
  return `${Math.floor(diffMonths / 12)} বছর আগে`;
}

export default function OrderHistoryTab({ orderId }: Props) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState(false);

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rawHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["order-history", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_history" as any)
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["order-notes", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_notes" as any)
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Strict Deduplication & Sorting
  const uniqueHistory = useMemo(() => {
    if (!rawHistory || !rawHistory.length) return [];

    const seenIds = new Set<string>();
    const deduplicated: any[] = [];

    // Sort chronologically first to compare adjacent events
    const sorted = [...rawHistory].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      if (seenIds.has(current.id)) continue;
      seenIds.add(current.id);

      // Check if immediate previous event in deduplicated list is an exact duplicate within 3 seconds
      const prev = deduplicated[deduplicated.length - 1];
      if (prev) {
        const timeDiff = Math.abs(
          new Date(current.created_at).getTime() - new Date(prev.created_at).getTime()
        );
        const isSameActionAndDetails =
          current.action === prev.action &&
          current.details === prev.details &&
          current.staff_name === prev.staff_name;

        // If duplicate within 3 seconds, skip this duplicate
        if (isSameActionAndDetails && timeDiff < 3000) {
          continue;
        }
      }

      deduplicated.push(current);
    }

    // Apply User Direction sort (Default: latest first)
    if (!sortAsc) {
      deduplicated.reverse();
    }

    return deduplicated;
  }, [rawHistory, sortAsc]);

  // Filtered list based on category & search
  const filteredHistory = useMemo(() => {
    return uniqueHistory.filter((item) => {
      const meta = actionMeta[item.action] || {
        label: item.action,
        category: "other",
      };

      if (filterCategory !== "all" && meta.category !== filterCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = (meta.label || "").toLowerCase().includes(q);
        const matchesDetails = (item.details || "").toLowerCase().includes(q);
        const matchesStaff = (item.staff_name || "").toLowerCase().includes(q);
        return matchesAction || matchesDetails || matchesStaff;
      }

      return true;
    });
  }, [uniqueHistory, filterCategory, searchQuery]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await supabase.from("order_notes" as any).insert({
        order_id: orderId,
        note: note.trim(),
        staff_name: "Admin",
      });
      await supabase.from("order_history" as any).insert({
        order_id: orderId,
        action: "note_added",
        details: note.trim(),
        staff_name: "Admin",
      });
      qc.invalidateQueries({ queryKey: ["order-history", orderId] });
      qc.invalidateQueries({ queryKey: ["order-notes", orderId] });
      toast({ title: "✅ স্টাফ নোট যুক্ত হয়েছে" });
      setNote("");
    } catch (e: any) {
      toast({ title: "নোট সেভ ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Add Staff Note Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            নতুন স্টাফ নোট যুক্ত করুন
          </CardTitle>
          <CardDescription className="text-xs">
            এই অর্ডারের জন্য অভ্যন্তরীণ মন্তব্য বা নির্দেশনা রেকর্ড করুন (শুধুমাত্র অ্যাডমিন ও স্টাফদের জন্য)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="অর্ডার সম্পর্কিত নোট লিখুন..."
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={addNote} disabled={!note.trim() || saving} className="gap-1.5 text-xs h-8">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              নোট সেভ করুন
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unified Chronological History Timeline */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                সম্পূর্ণ অ্যাকশন ও হিস্টোরি টাইমলাইন
              </CardTitle>
              <CardDescription className="text-xs">
                অর্ডার তৈরি থেকে ডেলিভারি পর্যন্ত সমস্ত অ্যাকশনের সঠিক সময়যুক্ত অডিট ট্রেইল (কোনো ডুপ্লিকেট নেই)
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-mono">
                {uniqueHistory.length}টি অনন্য অ্যাকশন
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setSortAsc((p) => !p)}
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                {sortAsc ? "পুরনো আগে" : "নতুন আগে"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Controls: Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="হিস্টোরি খুঁজুন (অ্যাকশন, বিস্তারিত বা স্টাফ নাম)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { key: "all", label: "সব" },
                { key: "status", label: "স্ট্যাটাস" },
                { key: "courier", label: "কুরিয়ার" },
                { key: "delivery", label: "ডেলিভারি" },
                { key: "notes", label: "নোট" },
                { key: "customer", label: "কাস্টমার" },
              ].map((c) => (
                <Button
                  key={c.key}
                  variant={filterCategory === c.key ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => setFilterCategory(c.key)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Timeline Feed */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> হিস্টোরি লোড হচ্ছে...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1.5" />
              {searchQuery ? "খোঁজা অনুযায়ী কোনো হিস্টোরি রেকর্ড পাওয়া যায়নি" : "কোনো হিস্টোরি রেকর্ড নেই"}
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/20 ml-3.5 pl-5 space-y-4 py-1">
              {filteredHistory.map((item, idx) => {
                const meta = actionMeta[item.action] || {
                  label: item.action,
                  color: "bg-muted text-muted-foreground border-border",
                  icon: Activity,
                };
                const Icon = meta.icon;
                const exactTime = formatExactBanglaTime(item.created_at);
                const relativeTime = getRelativeBanglaTime(item.created_at);

                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Visual node on timeline line */}
                    <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-background group-hover:scale-110 transition-transform" />

                    <div className="bg-muted/30 hover:bg-muted/50 transition-colors border border-border/60 rounded-lg p-3 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs gap-1 px-2.5 py-0.5 font-medium ${meta.color}`} variant="outline">
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3 text-primary" /> {item.staff_name || "Admin"}
                          </span>
                        </div>

                        {/* Exact Timing & Relative Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                            {relativeTime}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono font-medium">
                            {exactTime}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal pt-0.5">
                        {item.details || "কোনো অতিরিক্ত বিবরণ নেই"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
