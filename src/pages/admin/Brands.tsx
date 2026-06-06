import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

interface BrandForm {
  name: string;
  logo_url: string;
  website_url: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: BrandForm = {
  name: "",
  logo_url: "",
  website_url: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminBrands() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm);

  const { data: brands } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brands" as any)
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("brands" as any).update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brands" as any).insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      qc.invalidateQueries({ queryKey: ["homepage-brands"] });
      setOpen(false);
      reset();
      toast({ title: "সফলভাবে সেভ হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      qc.invalidateQueries({ queryKey: ["homepage-brands"] });
      toast({ title: "ব্র্যান্ড ডিলিট হয়েছে" });
    },
  });

  const reset = () => { setForm(emptyForm); setEditId(null); };

  const openEdit = (b: any) => {
    setEditId(b.id);
    setForm({ name: b.name, logo_url: b.logo_url || "", website_url: b.website_url || "", is_active: b.is_active, sort_order: b.sort_order || 0 });
    setOpen(true);
  };

  const set = (key: keyof BrandForm, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ব্র্যান্ড ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-1">হোমপেজের ব্র্যান্ড লোগো সেকশন ম্যানেজ করুন</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> নতুন ব্র্যান্ড</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? "ব্র্যান্ড এডিট" : "নতুন ব্র্যান্ড"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">ব্র্যান্ড নাম *</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="ব্র্যান্ড নাম" />
              </div>
              <div>
                <label className="text-sm font-medium">লোগো URL *</label>
                <Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
                {form.logo_url && (
                  <div className="mt-2 rounded-lg border p-3 bg-secondary/30">
                    <img src={form.logo_url} alt="Preview" className="max-h-12 object-contain grayscale" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">ওয়েবসাইট URL</label>
                <Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://brand.com" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
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
                disabled={save.isPending || !form.name || !form.logo_url}
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
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>লোগো</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ওয়েবসাইট</TableHead>
                  <TableHead>অর্ডার</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(brands as any[] || []).map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="h-8 max-w-[80px] object-contain grayscale" />
                      ) : (
                        <div className="h-8 w-20 rounded bg-secondary" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>
                      {b.website_url ? (
                        <a href={b.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent text-sm hover:underline">
                          <ExternalLink className="h-3 w-3" /> লিঙ্ক
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{b.sort_order}</TableCell>
                    <TableCell>{b.is_active ? "✅" : "❌"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!brands || (brands as any[]).length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">কোনো ব্র্যান্ড নেই। নতুন ব্র্যান্ড যোগ করুন।</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">ব্র্যান্ড ডিলিট নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই ব্র্যান্ডটি ডিলিট করতে চান? ডিলিট করার পর এটি আর পুনরুদ্ধার করা সম্ভব হবে না।
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
