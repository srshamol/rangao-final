import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Pause } from "lucide-react";

interface Props {
  order: any;
  onStatusChange: (status: string) => void;
  loading?: boolean;
}

export default function OrderConfirmationTab({ order, onStatusChange, loading }: Props) {
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const saveNote = async () => {
    if (!note.trim()) return;
    await supabase.from("order_notes").insert({
      order_id: order.id, note, staff_name: "Admin"
    });
    toast({ title: "নোট সেভ হয়েছে" });
    setNote("");
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap">
            <Button className="gap-1.5" onClick={() => onStatusChange("confirmed")} disabled={loading}>
              <CheckCircle className="h-4 w-4" /> অর্ডার কনফার্ম করুন
            </Button>
            <Button variant="destructive" className="gap-1.5" onClick={() => onStatusChange("cancelled")} disabled={loading}>
              <XCircle className="h-4 w-4" /> ক্যান্সেল করুন
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={saveNote} disabled={loading}>
              <Pause className="h-4 w-4" /> অন হোল্ড
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ⚡ কনফার্ম করলে পরবর্তী ধাপে যাবে: কুরিয়ার বুকিং
          </p>
        </CardContent>
      </Card>

      {/* Note */}
      <Card>
        <CardHeader><CardTitle className="text-base">নোট যোগ করুন</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="কনফার্মেশন বা ক্যান্সেলেশন নোট..." value={note}
            onChange={(e) => setNote(e.target.value)} rows={3} />
          <Button variant="outline" size="sm" onClick={saveNote} disabled={!note.trim()}>সেভ নোট</Button>
        </CardContent>
      </Card>
    </div>
  );
}
