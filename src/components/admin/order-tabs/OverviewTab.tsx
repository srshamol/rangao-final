import { useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, MessageCircle, Mail, Pencil, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props { order: any; items: any[]; }

export default function OrderOverviewTab({ order, items }: Props) {
  const address = typeof order.shipping_address === "object" ? order.shipping_address : {};
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || "",
    address: (address as any)?.address || "",
  });
  const [saving, setSaving] = useState(false);

  const saveCustomerInfo = async () => {
    setSaving(true);
    try {
      const updatedAddress = { ...(address as any), address: form.address };
      const { error } = await supabase.from("orders").update({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        shipping_address: updatedAddress,
      }).eq("id", order.id);
      if (error) throw error;
      await supabase.from("order_history").insert({
        order_id: order.id, action: "customer_info_edited",
        details: "কাস্টমার তথ্য এডিট করা হয়েছে", staff_name: "Admin"
      });
      toast({ title: "✅ কাস্টমার তথ্য আপডেট হয়েছে" });
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
      setEditing(false);
    } catch (e: any) {
      toast({ title: "আপডেট ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Order Header */}
      <Card>
        <CardHeader><CardTitle className="text-base">অর্ডার তথ্য</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">তারিখ</p>
            <p className="font-medium">{new Date(order.created_at).toLocaleString("bn-BD")}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">পেমেন্ট মেথড</p>
            <p className="font-medium">{order.payment_method}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">পেমেন্ট স্ট্যাটাস</p>
            <Badge variant="outline">{order.payment_status}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">টোটাল</p>
            <p className="font-bold text-lg">৳{Number(order.total_amount).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Customer Info - Editable */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">কাস্টমার ইনফরমেশন</CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> এডিট
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" className="gap-1" onClick={saveCustomerInfo} disabled={saving}>
                <Save className="h-3.5 w-3.5" /> সেভ
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">নাম</p>
              {editing ? (
                <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} />
              ) : (
                <p className="font-medium">{order.customer_name}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">ফোন</p>
              {editing ? (
                <Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} />
              ) : (
                <p className="font-medium">{order.customer_phone}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">ইমেইল</p>
              {editing ? (
                <Input value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} />
              ) : (
                <p className="font-medium">{order.customer_email || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">ঠিকানা</p>
              {editing ? (
                <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              ) : (
                <p className="font-medium">{(address as any)?.address || (address as any)?.city || "—"}</p>
              )}
            </div>
          </div>
          {!editing && (
            <div className="flex gap-2 pt-2">
              <a href={`tel:${order.customer_phone}`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> কল
                </Button>
              </a>
              <a href={`https://wa.me/88${order.customer_phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-green-600">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
              </a>
              {order.customer_email && (
                <a href={`mailto:${order.customer_email}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> ইমেইল
                  </Button>
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">প্রোডাক্ট ইনফরমেশন</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>প্রোডাক্ট</TableHead>
                <TableHead>ইউনিট প্রাইস</TableHead>
                <TableHead>পরিমাণ</TableHead>
                <TableHead className="text-right">টোটাল</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>৳{Number(item.unit_price).toLocaleString()}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">৳{Number(item.total_price).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 space-y-1 text-sm text-right">
            <p>সাবটোটাল: ৳{Number(order.subtotal).toLocaleString()}</p>
            <p>ডেলিভারি: ৳{Number(order.delivery_charge).toLocaleString()}</p>
            <p className="font-bold text-base">টোটাল: ৳{Number(order.total_amount).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
