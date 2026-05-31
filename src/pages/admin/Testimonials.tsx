import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

interface TestimonialForm {
  customer_name: string;
  customer_location: string;
  customer_image_url: string;
  rating: number;
  review: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: TestimonialForm = {
  customer_name: "",
  customer_location: "",
  customer_image_url: "",
  rating: 5,
  review: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminTestimonials() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialForm>(emptyForm);

  const { data: testimonials } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials" as any)
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("testimonials" as any).update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials" as any).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      setOpen(false);
      reset();
      toast({ title: "সফলভাবে সেভ হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      toast({ title: "ডিলিট হয়েছে" });
    },
  });

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      customer_name: t.customer_name,
      customer_location: t.customer_location || "",
      customer_image_url: t.customer_image_url || "",
      rating: t.rating,
      review: t.review,
      is_active: t.is_active,
      sort_order: t.sort_order || 0,
    });
    setOpen(true);
  };

  const set = (key: keyof TestimonialForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">টেস্টিমোনিয়াল ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-1">হোমপেজের কাস্টমার রিভিউ ম্যানেজ করুন</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> নতুন রিভিউ</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "রিভিউ এডিট" : "নতুন রিভিউ"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">কাস্টমার নাম *</label>
                  <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="রাফি আহমেদ" />
                </div>
                <div>
                  <label className="text-sm font-medium">লোকেশন</label>
                  <Input value={form.customer_location} onChange={(e) => set("customer_location", e.target.value)} placeholder="ঢাকা, বাংলাদেশ" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">প্রোফাইল ফটো URL</label>
                <Input value={form.customer_image_url} onChange={(e) => set("customer_image_url", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">রেটিং</label>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => set("rating", star)}>
                      <Star className={`h-6 w-6 transition-colors ${star <= form.rating ? "fill-accent text-accent" : "text-border"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">রিভিউ *</label>
                <Textarea
                  value={form.review}
                  onChange={(e) => set("review", e.target.value)}
                  placeholder="কাস্টমারের রিভিউ লিখুন..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">সর্ট অর্ডার</label>
                  <Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
                  <label className="text-sm font-medium">সক্রিয়</label>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.customer_name || !form.review}
              >
                {save.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
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
                <TableHead>নাম</TableHead>
                <TableHead>লোকেশন</TableHead>
                <TableHead>রেটিং</TableHead>
                <TableHead>রিভিউ</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(testimonials as any[] || []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.customer_location || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-accent text-accent" : "text-border"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{t.review}</p>
                  </TableCell>
                  <TableCell>{t.is_active ? "✅" : "❌"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!testimonials || (testimonials as any[]).length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">কোনো রিভিউ নেই। নতুন রিভিউ যোগ করুন।</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
