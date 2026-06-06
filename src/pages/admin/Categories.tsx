import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { mediaService } from "@/lib/mediaService";

interface CategoryForm {
  name: string;
  slug: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
}

export default function AdminCategories() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>({
    name: "",
    slug: "",
    image_url: "",
    sort_order: 0,
    is_active: true,
    parent_id: null,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const mediaItem = await mediaService.upload(file, "images");
      if (mediaItem?.url) {
        setForm(f => ({ ...f, image_url: mediaItem.url }));
        toast({ title: "ইমেজ আপলোড সফল হয়েছে" });
      }
    } catch (err: any) {
      toast({ title: "ইমেজ আপলোড ব্যর্থ হয়েছে", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Ensure we convert empty strings to null for parent_id
      const payload = {
        ...form,
        parent_id: form.parent_id || null,
      };

      if (editId) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setOpen(false);
      resetForm();
      toast({ title: "সফল" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "ক্যাটাগরি ডিলিট হয়েছে" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", slug: "", image_url: "", sort_order: 0, is_active: true, parent_id: null });
    setEditId(null);
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      image_url: cat.image_url || "",
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active !== false,
      parent_id: cat.parent_id || null,
    });
    setOpen(true);
  };

  // Filter out the category itself to avoid self-parenting loop
  const parentCandidates = categories?.filter((c) => c.id !== editId && !c.parent_id) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ক্যাটাগরি ম্যানেজমেন্ট</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> নতুন ক্যাটাগরি</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "ক্যাটাগরি এডিট" : "নতুন ক্যাটাগরি"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">নাম</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
              </div>
              <div>
                <label className="text-sm font-medium">স্লাগ</label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">প্যারেন্ট ক্যাটাগরি (ঐচ্ছিক)</label>
                <Select
                  value={form.parent_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === "none" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="কোনো প্যারেন্ট নেই" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">কোনো প্যারেন্ট নেই (Main Category)</SelectItem>
                    {parentCandidates.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">ক্যাটাগরি ইমেজ (URL অথবা আপলোড করুন)</label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={form.image_url} 
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} 
                    placeholder="https://example.com/image.jpg"
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
                {form.image_url && (
                  <div className="mt-2 relative h-16 w-16 overflow-hidden rounded-lg border">
                    <img src={form.image_url} alt="Category preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">সর্ট অর্ডার</label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">সক্রিয়</label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>
                {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>স্লাগ</TableHead>
                  <TableHead>প্যারেন্ট</TableHead>
                  <TableHead>অর্ডার</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((cat: any) => {
                  const parent = categories.find((c) => c.id === cat.parent_id);
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">
                        {cat.parent_id && <span className="text-muted-foreground mr-1.5">—</span>}
                        {cat.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{cat.slug}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{parent ? parent.name : "Main"}</TableCell>
                      <TableCell>{cat.sort_order}</TableCell>
                      <TableCell>{cat.is_active ? "✅" : "❌"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!categories || categories.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো ক্যাটাগরি নেই</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">ক্যাটাগরি ডিলিট নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই ক্যাটাগরিটি ডিলিট করতে চান? ডিলিট করার পর এটি আর পুনরুদ্ধার করা সম্ভব হবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={() => {
              if (deleteId) {
                deleteMutation.mutate(deleteId);
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
