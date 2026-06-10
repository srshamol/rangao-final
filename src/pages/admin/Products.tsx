import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Search, Edit, Eye, Image as ImageIcon, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const pageSize = 20;
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories-list-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug");
      return data || [];
    },
    staleTime: 300_000, // categories rarely change
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search, statusFilter, page],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);

      const { data, count } = await q;
      return { products: data || [], total: count || 0 };
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  // Separate query for accurate full-DB stats (not page-scoped)
  const { data: statsData } = useQuery({
    queryKey: ["admin-products-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("status, stock_quantity");
      const all = data || [];
      return {
        activeCount: all.filter((p) => p.status === "active").length,
        outOfStock: all.filter((p) => p.stock_quantity <= 0).length,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setSelected([]);
      toast({ title: "সফল", description: "প্রোডাক্ট ডিলিট হয়েছে" });
    },
  });

  const toggleAll = () => {
    if (selected.length === (data?.products.length || 0)) setSelected([]);
    else setSelected(data?.products.map((p: any) => p.id) || []);
  };

  const toggleOne = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  // Full-DB stats from dedicated query
  const activeCount = statsData?.activeCount ?? 0;
  const outOfStock = statsData?.outOfStock ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">📦 প্রোডাক্ট ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground">মোট {data?.total || 0}টি প্রোডাক্ট</p>
        </div>
        <Button className="self-start sm:self-auto" onClick={() => navigate("/admin/products/new")}>
          <Plus className="mr-2 h-4 w-4" /> নতুন প্রোডাক্ট
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">মোট</p>
              <p className="text-lg font-bold">{data?.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">সক্রিয়</p>
              <p className="text-lg font-bold">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">স্টক আউট</p>
              <p className="text-lg font-bold">{outOfStock}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">নির্বাচিত</p>
              <p className="text-lg font-bold">{selected.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="নাম বা SKU দিয়ে সার্চ করুন..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="স্ট্যাটাস" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                <SelectItem value="active">🟢 সক্রিয়</SelectItem>
                <SelectItem value="inactive">🔴 নিষ্ক্রিয়</SelectItem>
                <SelectItem value="draft">📝 ড্রাফট</SelectItem>
              </SelectContent>
            </Select>
            {selected.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteIds(selected)}>
                <Trash2 className="mr-1 h-4 w-4" /> {selected.length}টি ডিলিট
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</p>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={selected.length === (data?.products.length || 0) && selected.length > 0} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead className="w-14">ছবি</TableHead>
                    <TableHead>প্রোডাক্ট নাম</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>ক্যাটাগরি</TableHead>
                    <TableHead>প্রাইস</TableHead>
                    <TableHead>স্টক</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="w-24">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.products.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleOne(p.id)} />
                      </TableCell>
                      <TableCell>
                        {p.images && p.images.length > 0 ? (
                          <img src={p.images[0]} className="w-10 h-10 rounded object-cover border" alt={p.name} />
                        ) : (
                          <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {categories?.find((c: any) => c.slug === p.category)?.name || p.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {p.sale_price ? (
                            <>
                              <span className="font-semibold">৳{Number(p.sale_price).toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground line-through ml-1">৳{Number(p.regular_price).toLocaleString()}</span>
                            </>
                          ) : (
                            <span className="font-semibold">৳{Number(p.regular_price).toLocaleString()}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.stock_quantity <= 0 ? "destructive" : p.stock_quantity <= (p.low_stock_alert || 5) ? "secondary" : "outline"}>
                          {p.stock_quantity <= 0 ? "স্টক আউট" : `${p.stock_quantity} পিস`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "outline"}>
                          {p.status === "active" ? "🟢 সক্রিয়" : p.status === "draft" ? "📝 ড্রাফট" : "🔴 নিষ্ক্রিয়"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/products/${p.id}`)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteIds([p.id])}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        কোনো প্রোডাক্ট নেই
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    মোট {data?.total}টি প্রোডাক্ট
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      আগের
                    </Button>
                    <span className="text-sm py-1 px-2">{page + 1}/{totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                      পরের
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteIds} onOpenChange={(v) => !v && setDeleteIds(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">প্রোডাক্ট ডিলিট নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই প্রোডাক্ট({deleteIds?.length}টি) ডিলিট করতে চান? ডিলিট করার পর এটি আর পুনরুদ্ধার করা সম্ভব হবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={() => {
              if (deleteIds) {
                deleteMutation.mutate(deleteIds);
                setDeleteIds(null);
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
