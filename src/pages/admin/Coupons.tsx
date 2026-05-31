import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function AdminCoupons() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "", discount_type: "percentage" as string, discount_value: 0,
    min_order: 0, max_discount: null as number | null,
    valid_from: "", valid_to: "", usage_limit: null as number | null, is_active: true,
  });

  const { data: coupons } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        valid_from: form.valid_from || new Date().toISOString(),
        valid_to: form.valid_to || null,
      };
      if (editId) {
        const { error } = await supabase.from("coupons").update(payload as any).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      setOpen(false);
      resetForm();
      toast({ title: "সফল" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "কুপন ডিলিট হয়েছে" });
    },
  });

  const resetForm = () => {
    setForm({ code: "", discount_type: "percentage", discount_value: 0, min_order: 0, max_discount: null, valid_from: "", valid_to: "", usage_limit: null, is_active: true });
    setEditId(null);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      code: c.code, discount_type: c.discount_type, discount_value: Number(c.discount_value),
      min_order: Number(c.min_order), max_discount: c.max_discount ? Number(c.max_discount) : null,
      valid_from: c.valid_from?.split("T")[0] || "", valid_to: c.valid_to?.split("T")[0] || "",
      usage_limit: c.usage_limit, is_active: c.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">কুপন ম্যানেজমেন্ট</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> নতুন কুপন</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editId ? "কুপন এডিট" : "নতুন কুপন"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">কুপন কোড</label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER25" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">ডিসকাউন্ট টাইপ</label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">পার্সেন্টেজ (%)</SelectItem>
                      <SelectItem value="flat">ফ্ল্যাট (৳)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">মান</label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">মিনিমাম অর্ডার</label>
                  <Input type="number" value={form.min_order} onChange={(e) => setForm((f) => ({ ...f, min_order: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">সর্বোচ্চ ডিসকাউন্ট</label>
                  <Input type="number" value={form.max_discount ?? ""} onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">শুরু তারিখ</label>
                  <Input type="date" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">শেষ তারিখ</label>
                  <Input type="date" value={form.valid_to} onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">ইউজেজ লিমিট</label>
                <Input type="number" value={form.usage_limit ?? ""} onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null }))} placeholder="আনলিমিটেড" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">সক্রিয়</label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.code}>
                {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>কোড</TableHead>
                <TableHead>ডিসকাউন্ট</TableHead>
                <TableHead>মিনিমাম</TableHead>
                <TableHead>ব্যবহৃত</TableHead>
                <TableHead>ভ্যালিডিটি</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell>
                    {c.discount_type === "percentage" ? `${Number(c.discount_value)}%` : `৳${Number(c.discount_value).toLocaleString()}`}
                  </TableCell>
                  <TableCell>৳{Number(c.min_order).toLocaleString()}</TableCell>
                  <TableCell>{c.used_count}/{c.usage_limit ?? "∞"}</TableCell>
                  <TableCell className="text-xs">
                    {c.valid_to ? new Date(c.valid_to).toLocaleDateString("bn-BD") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!coupons || coupons.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো কুপন নেই</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
