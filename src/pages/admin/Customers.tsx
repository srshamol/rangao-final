import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, Phone, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface Customer {
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
}

export default function Customers() {
  const [search, setSearch] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["all-orders-for-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("customer_name, customer_phone, customer_email, total_amount, created_at");
      return data || [];
    },
  });

  const customers = useMemo<Customer[]>(() => {
    if (!orders) return [];
    const map: Record<string, Customer> = {};
    orders.forEach((o: any) => {
      const key = o.customer_phone;
      if (!map[key]) {
        map[key] = { name: o.customer_name, phone: o.customer_phone, email: o.customer_email, totalOrders: 0, totalSpent: 0, lastOrder: o.created_at };
      }
      map[key].totalOrders++;
      map[key].totalSpent += Number(o.total_amount);
      if (new Date(o.created_at) > new Date(map[key].lastOrder)) {
        map[key].lastOrder = o.created_at;
        map[key].name = o.customer_name;
      }
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> কাস্টমার ({customers.length})</h1>
      </div>

      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম বা ফোন দিয়ে সার্চ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>কাস্টমার</TableHead>
                  <TableHead>ফোন</TableHead>
                  <TableHead>মোট অর্ডার</TableHead>
                  <TableHead>মোট খরচ</TableHead>
                  <TableHead>শেষ অর্ডার</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.phone}>
                    <TableCell>
                      <p className="font-medium">{c.name}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                    <TableCell className="text-center font-semibold">{c.totalOrders}</TableCell>
                    <TableCell className="font-semibold">৳{c.totalSpent.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(c.lastOrder), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <a href={`tel:${c.phone}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"><Phone className="h-3.5 w-3.5" /></Button>
                        </a>
                        <a href={`https://wa.me/88${c.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500"><MessageCircle className="h-3.5 w-3.5" /></Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো কাস্টমার নেই</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
