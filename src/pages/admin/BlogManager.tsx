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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, BookOpen, Loader2 } from "lucide-react";
import { mediaService } from "@/lib/mediaService";

interface BlogForm {
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  author: string;
  read_time: string;
  is_active: boolean;
}

const emptyForm: BlogForm = {
  title: "",
  excerpt: "",
  content: "",
  image_url: "",
  category: "গাইড",
  author: "Rangao টিম",
  read_time: "৫ মিনিট",
  is_active: true,
};

export default function BlogManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: blogPosts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("blog_posts").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts-all"] });
      setOpen(false);
      reset();
      toast({ title: "সফলভাবে সেভ হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts-all"] });
      toast({ title: "ডিলিট হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const mediaItem = await mediaService.upload(file, "images");
      if (mediaItem?.url) {
        set("image_url", mediaItem.url);
        toast({ title: "ইমেজ আপলোড সফল হয়েছে" });
      }
    } catch (err: any) {
      toast({ title: "ইমেজ আপলোড ব্যর্থ হয়েছে", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      image_url: p.image_url || "",
      category: p.category,
      author: p.author || "Rangao টিম",
      read_time: p.read_time || "৫ মিনিট",
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const set = (key: keyof BlogForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ব্লগ ও টিপস ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-1">পাবলিক ব্লগ পেইজের আর্টিকেলগুলো যোগ ও সম্পাদনা করুন</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> নতুন ব্লগ পোস্ট</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "ব্লগ পোস্ট এডিট" : "নতুন ব্লগ পোস্ট"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">শিরোনাম *</label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="যেমন: ক্যালিগ্রাফি দিয়ে সাজানোর উপায়" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">ক্যাটাগরি *</label>
                  <select 
                    value={form.category} 
                    onChange={(e) => set("category", e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="গাইড">গাইড</option>
                    <option value="টিপস">টিপস</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">লেখক</label>
                  <Input value={form.author} onChange={(e) => set("author", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">পড়ার সময়</label>
                  <Input value={form.read_time} onChange={(e) => set("read_time", e.target.value)} placeholder="যেমন: ৫ মিনিট" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">ফিচার ইমেজ URL</label>
                <div className="flex gap-2 mt-1">
                  <Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." className="flex-1" />
                  <div className="relative">
                    <Button type="button" variant="outline" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ইমেজ আপলোড"}
                    </Button>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>
                {form.image_url && <img src={form.image_url} alt="Preview" className="mt-2 h-20 w-32 object-cover rounded-md" />}
              </div>
              <div>
                <label className="text-sm font-medium">সংক্ষিপ্ত বিবরণ (Excerpt) *</label>
                <Textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="সোশ্যাল মিডিয়া বা কার্ডে দেখানোর জন্য সংক্ষিপ্ত বাক্য..." rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">মূল বিষয়বস্তু (Markdown সমর্থিত) *</label>
                <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="আপনার মূল আর্টিকেল বিস্তারিত লিখুন..." rows={8} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
                <label className="text-sm font-medium">সক্রিয় (Active)</label>
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => save.mutate()}
                disabled={save.isPending || !form.title || !form.content || !form.excerpt}
              >
                {save.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ইমেজ</TableHead>
                  <TableHead className="w-[30%]">শিরোনাম</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead>
                  <TableHead>লেখক</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>অবস্থা</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(blogPosts as any[] || []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-10 w-16 object-cover rounded-md" />
                      ) : (
                        <div className="h-10 w-16 bg-muted rounded-md flex items-center justify-center"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[250px] truncate">{p.title}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="text-sm">{p.author}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    <TableCell>{p.is_active ? "✅ সক্রিয়" : "❌ নিষ্ক্রিয়"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!blogPosts || (blogPosts as any[]).length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">কোনো ব্লগ পোস্ট নেই।</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">ব্লগ পোস্ট ডিলিট নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই ব্লগ পোস্টটি ডিলিট করতে চান? ডিলিট করার পর এটি আর পুনরুদ্ধার করা সম্ভব হবে না।
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
