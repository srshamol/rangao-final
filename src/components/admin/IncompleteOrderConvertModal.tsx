import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProductInfo {
  name: string;
  id?: string;
  price: number;
  quantity: number;
  image?: string;
}

interface IncompleteOrder {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  product_info: ProductInfo[];
  form_data: Record<string, any>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: IncompleteOrder;
  onConverted: () => void;
}

const shippingOptions = [
  { id: "dhaka", label: "ঢাকা সিটির ভিতরে", price: 70 },
  { id: "outside", label: "ঢাকা সিটির বাহিরে", price: 130 },
];

export default function IncompleteOrderConvertModal({ open, onOpenChange, order, onConverted }: Props) {
  const [name, setName] = useState(order.customer_name || "");
  const [phone, setPhone] = useState(order.customer_phone || "");
  const [address, setAddress] = useState(order.form_data?.address || "");
  const [shipping, setShipping] = useState("dhaka");
  const [submitting, setSubmitting] = useState(false);

  const products = order.product_info || [];
  const subtotal = products.reduce((s, p) => s + p.price * (p.quantity || 1), 0);
  const deliveryCharge = shippingOptions.find((s) => s.id === shipping)!.price;
  const total = subtotal + deliveryCharge;

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("নাম দিন"); return; }
    const bdPhoneRegex = /^(01[3-9]\d{8})$/;
    if (!phone.trim() || !bdPhoneRegex.test(phone.trim())) {
      toast.error("১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)");
      return;
    }
    if (!address.trim()) { toast.error("ঠিকানা দিন"); return; }
    setSubmitting(true);

    try {
      const shippingLabel = shippingOptions.find((s) => s.id === shipping)!.label;

      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_number: "",
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: order.customer_email || null,
          shipping_address: { division: shippingLabel, address: address.trim() },
          payment_method: "ক্যাশ অন ডেলিভারি",
          subtotal,
          delivery_charge: deliveryCharge,
          total_amount: total,
          notes: "ইনকমপ্লিট অর্ডার থেকে কনভার্ট",
        })
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

      // Insert order items
      const items = products.map((p) => ({
        order_id: newOrder.id,
        product_name: p.name,
        unit_price: p.price,
        quantity: p.quantity || 1,
        total_price: p.price * (p.quantity || 1),
        ...(p.id ? { product_id: p.id } : {}),
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      // Mark incomplete as converted
      await supabase
        .from("incomplete_orders" as any)
        .update({ status: "converted", converted_order_id: newOrder.id })
        .eq("id", order.id);

      toast.success(`অর্ডার কনভার্ট হয়েছে! #${newOrder.order_number}`);
      onOpenChange(false);
      onConverted();
    } catch (err: any) {
      console.error("Convert error:", err);
      toast.error("অর্ডার কনভার্ট করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-lg font-extrabold">
            ইনকমপ্লিট অর্ডার কনভার্ট করুন
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Customer info */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">নাম *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">ফোন *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl pl-10" type="tel" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">ঠিকানা *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="বিস্তারিত ঠিকানা"
                />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">শিপিং মেথড</h3>
            <div className="space-y-1.5 rounded-xl border bg-card p-1">
              {shippingOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${shipping === opt.id ? "bg-secondary" : "hover:bg-secondary/50"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${shipping === opt.id ? "border-accent" : "border-muted-foreground/40"}`}>
                      {shipping === opt.id && <div className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    <span>{opt.label}</span>
                  </div>
                  <span className="font-bold">৳{opt.price}</span>
                  <input type="radio" className="sr-only" checked={shipping === opt.id} onChange={() => setShipping(opt.id)} />
                </label>
              ))}
            </div>
          </div>

          {/* Products */}
          {products.length > 0 && (
            <div className="space-y-2 rounded-xl border bg-card p-3">
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  {p.image && <img src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity || 1}x ৳{p.price}</p>
                  </div>
                  <p className="text-sm font-bold">৳{p.price * (p.quantity || 1)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 rounded-xl border bg-secondary/30 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">সাব টোটাল</span>
              <span className="font-bold">৳{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ডেলিভারি</span>
              <span className="font-bold">৳{deliveryCharge}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-bold">সর্বমোট</span>
              <span className="text-lg font-extrabold">৳{total}</span>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} size="lg" className="w-full rounded-xl bg-success py-5 text-base font-bold text-success-foreground hover:bg-success/90">
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {submitting ? "কনভার্ট হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
