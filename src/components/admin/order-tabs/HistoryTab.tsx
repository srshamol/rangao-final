import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus } from "lucide-react";

interface Props { orderId: string; }

export default function OrderHistoryTab({ orderId }: Props) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ["order-history", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_history" as any)
        .select("*").eq("order_id", orderId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["order-notes", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_notes" as any)
        .select("*").eq("order_id", orderId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addNote = async () => {
    if (!note.trim()) return;
    await supabase.from("order_notes" as any).insert({ order_id: orderId, note, staff_name: "Admin" });
    await supabase.from("order_history" as any).insert({
      order_id: orderId, action: "note_added", details: note, staff_name: "Admin"
    });
    qc.invalidateQueries({ queryKey: ["order-history", orderId] });
    qc.invalidateQueries({ queryKey: ["order-notes", orderId] });
    toast({ title: "নোট যোগ হয়েছে" });
    setNote("");
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Add Note */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> নোট যোগ করুন</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="নতুন নোট লিখুন..." rows={2} />
          <Button size="sm" onClick={addNote} disabled={!note.trim()}>সেভ নোট</Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      {(notes as any[])?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">নোটসমূহ</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(notes as any[]).map((n: any) => (
                <div key={n.id} className="bg-muted/50 rounded p-3 text-sm">
                  <p>{n.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.staff_name} — {new Date(n.created_at).toLocaleString("bn-BD")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> অর্ডার হিস্টোরি
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(history as any[])?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">কোনো হিস্টোরি নেই</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ ও সময়</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                  <TableHead>স্টাফ</TableHead>
                  <TableHead>বিস্তারিত</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history as any[])?.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("bn-BD")}</TableCell>
                    <TableCell className="text-xs font-medium">{h.action}</TableCell>
                    <TableCell className="text-xs">{h.staff_name}</TableCell>
                    <TableCell className="text-xs">{h.details || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
