import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { mediaService } from "@/lib/mediaService";

interface TestimonialForm {
  customer_name: string;
  customer_location: string;
  customer_image_url: string;
  rating: number;
  review: string;
  is_active: boolean;
  sort_order: number;
  product_id: string | null;
}

const emptyForm: TestimonialForm = {
  customer_name: "",
  customer_location: "",
  customer_image_url: "",
  rating: 5,
  review: "",
  is_active: true,
  sort_order: 0,
  product_id: null,
};

export default function AdminTestimonials() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-minimal"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name");
      return data || [];
    }
  });

  const getProductName = (productId?: string) => {
    if (!productId) return "Homepage (সাধারণ)";
    const prod = products.find((p: any) => p.id === productId);
    return prod ? prod.name : "প্রোডাক্ট লোড হচ্ছে...";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const mediaItem = await mediaService.upload(file, "images");
      if (mediaItem?.url) {
        setForm(f => ({ ...f, customer_image_url: mediaItem.url }));
        toast({ title: "ইমেজ আপলোড সফল হয়েছে" });
      }
    } catch (err: any) {
      toast({ title: "ইমেজ আপলোড ব্যর্থ হয়েছে", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const approve = useMutation({
    mutationFn: async (testimonialId: string) => {
      const { data, error } = await supabase
        .from("testimonials" as any)
        .update({ is_active: true })
        .eq("id", testimonialId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("রিভিউ অনুমোদন করার অনুমতি নেই (RLS Policy restriction)");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-statistics-auto"] });
      toast({ title: "রিভিউটি অনুমোদিত হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { data, error } = await supabase
          .from("testimonials" as any)
          .update(form)
          .eq("id", editId)
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("রিভিউ এডিট করার অনুমতি নেই (RLS Policy restriction)");
        }
      } else {
        const { data, error } = await supabase
          .from("testimonials" as any)
          .insert(form)
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("রিভিউ তৈরি করার অনুমতি নেই (RLS Policy restriction)");
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-statistics-auto"] });
      setOpen(false);
      reset();
      toast({ title: "সফলভাবে সেভ হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("testimonials" as any)
        .delete()
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("রিভিউ ডিলিট করার অনুমতি নেই (RLS Policy restriction)");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      qc.invalidateQueries({ queryKey: ["homepage-statistics-auto"] });
      toast({ title: "ডিলিট হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
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
      product_id: t.product_id || null,
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
                <label className="text-sm font-medium">প্রোডাক্ট লিঙ্ক (ঐচ্ছিক)</label>
                <Select
                  value={form.product_id || "none"}
                  onValueChange={(v) => set("product_id", v === "none" ? null : v)}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Homepage (সাধারণ)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Homepage (সাধারণ - কোনো নির্দিষ্ট প্রোডাক্ট নয়)</SelectItem>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">প্রোফাইল ফটো (URL অথবা আপলোড করুন)</label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={form.customer_image_url} 
                    onChange={(e) => set("customer_image_url", e.target.value)} 
                    placeholder="https://..." 
                    className="flex-1"
                  />
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" 
                      disabled={uploading}
                    />
                    <Button variant="secondary" type="button" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "আপলোড"}
                    </Button>
                  </div>
                </div>
                {form.customer_image_url && (
                  <div className="mt-2 relative h-12 w-12 overflow-hidden rounded-full border">
                    <img src={form.customer_image_url} alt="Avatar preview" className="h-full w-full object-cover" />
                  </div>
                )}
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
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>লোকেশন</TableHead>
                  <TableHead>প্রোডাক্ট</TableHead>
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
                    <TableCell className="max-w-[150px] truncate text-sm">{getProductName(t.product_id)}</TableCell>
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
                    <TableCell>
                      <span className={t.is_active ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                        {t.is_active ? "সক্রিয়" : "পেন্ডিং"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center">
                        {!t.is_active && (
                          <Button variant="outline" size="sm" className="h-7 text-[10px] px-1.5 border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => approve.mutate(t.id)}>
                            অনুমোদন করুন
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!testimonials || (testimonials as any[]).length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">কোনো রিভিউ নেই। নতুন রিভিউ যোগ করুন।</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">রিভিউ ডিলিট নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই রিভিউটি ডিলিট করতে চান? ডিলিট করার পর এটি আর পুনরুদ্ধার করা সম্ভব হবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={() => {
              if (deleteId) {
                del.mutate(deleteId);
                setDeleteId(null);
              }
            }}>
              ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
