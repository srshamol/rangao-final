import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Product, formatPrice } from "@/data/products";
import { User, Phone, MapPin, Loader2, Banknote, Smartphone, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIncompleteOrder } from "@/hooks/useIncompleteOrder";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  quantity: number;
}

type ShippingZone = "dhaka" | "chittagong" | "outside";

const shippingOptions: { id: ShippingZone; label: string; price: number }[] = [
  { id: "dhaka", label: "ঢাকা সিটির ভিতরে", price: 70 },
  { id: "outside", label: "ঢাকা সিটির বাহিরে", price: 130 },
];

const CodOrderModal = ({ open, onOpenChange, product, quantity }: Props) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [shipping, setShipping] = useState<ShippingZone>("dhaka");
  const [payment, setPayment] = useState<"cod" | "bkash" | "nagad">("cod");
  const [activePayments, setActivePayments] = useState<{ cod: boolean; bkash: boolean; nagad: boolean }>({ cod: true, bkash: false, nagad: false });
  const [coupon, setCoupon] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const { data } = await supabase
          .from("store_settings" as any)
          .select("value")
          .eq("key", "payment_methods")
          .single();
        if (data && data.value) {
          const val = data.value;
          setActivePayments({
            cod: val.cod ?? true,
            bkash: val.bkash ?? false,
            nagad: val.nagad ?? false
          });
          if (!val.cod) {
            if (val.bkash) setPayment("bkash");
            else if (val.nagad) setPayment("nagad");
          }
        }
      } catch (err) {
        console.error("Error fetching payment settings:", err);
      }
    };
    fetchPaymentSettings();
  }, []);

  const { saveIncomplete, markConverted } = useIncompleteOrder({
    pageSource: "cod_modal",
    products: [{ name: product.name, id: product.id, price: product.price, quantity, image: product.images[0] }],
  });

  const debouncedSave = (n: string, p: string) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveIncomplete({ name: n, phone: p, formData: { address, shipping } });
    }, 2000);
  };

  const subtotal = product.price * quantity;
  const deliveryCharge = shippingOptions.find((s) => s.id === shipping)!.price;
  const total = subtotal + deliveryCharge;

  const handleApplyCoupon = () => {
    if (!coupon.trim()) return;
    toast.error("এই কুপনটি বৈধ নয়");
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("আপনার নাম দিন"); return; }
    const bdPhoneRegex = /^(01[3-9]\d{8})$/;
    if (!phone.trim() || !bdPhoneRegex.test(phone.trim())) {
      toast.error("১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)");
      return;
    }
    if (!address.trim()) { toast.error("আপনার ঠিকানা দিন"); return; }
    if (submitting) return;
    setSubmitting(true);

    try {
      const shippingLabel = shippingOptions.find((s) => s.id === shipping)!.label;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: "",
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          shipping_address: {
            division: shippingLabel,
            address: address.trim(),
          },
          payment_method: payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "bkash" ? "bKash" : "Nagad",
          subtotal,
          delivery_charge: deliveryCharge,
          total_amount: total,
          notes: orderNote.trim() || null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_name: product.name,
        unit_price: product.price,
        quantity,
        total_price: subtotal,
      });
      if (itemsError) throw itemsError;

      await markConverted(order.id);
      onOpenChange(false);
      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
      navigate(`/order-success/${order.order_number}`, {
        state: {
          id: order.id,
          orderNumber: order.order_number,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: "",
          shippingAddress: {
            division: shippingLabel,
            district: "",
            thana: "",
            address: address.trim(),
          },
          paymentMethod: payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "bkash" ? "bKash" : "Nagad",
          items: [{
            name: product.name,
            image: product.images[0],
            quantity,
            unitPrice: product.price,
            totalPrice: subtotal,
          }],
          subtotal,
          deliveryCharge,
          total,
        },
      });
    } catch (err: any) {
      console.error("COD order error:", err);
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-lg p-0 backdrop-blur-xl bg-background/95 border-border/60 shadow-2xl shadow-accent/10 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/40 shrink-0">
          <DialogTitle className="text-center font-display text-base sm:text-xl font-extrabold text-foreground">
            অর্ডার করতে আপনার তথ্য দিন
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label className="font-bengali text-xs sm:text-sm font-semibold text-foreground">
              আপনার নাম <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={name} onChange={(e) => { setName(e.target.value); debouncedSave(e.target.value, phone); }} placeholder="আপনার নাম" className="rounded-xl pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="font-bengali text-xs sm:text-sm font-semibold text-foreground">
              ফোন নাম্বার <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={phone} onChange={(e) => { setPhone(e.target.value); debouncedSave(name, e.target.value); }} placeholder="ফোন নাম্বার" className="rounded-xl pl-9 sm:pl-10 h-9 sm:h-10 text-sm" type="tel" />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="font-bengali text-xs sm:text-sm font-semibold text-foreground">
              এড্রেস <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="এড্রেস"
                className="flex min-h-[50px] sm:min-h-[60px] w-full rounded-xl border border-input bg-background pl-9 sm:pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Order Note */}
          <div className="space-y-1">
            <label className="font-bengali text-xs sm:text-sm font-semibold text-foreground">অর্ডার নোট (ঐচ্ছিক)</label>
            <Input value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="অর্ডার সম্পর্কে কোনো বিশেষ তথ্য বা নির্দেশনা থাকলে এখানে লিখুন..." className="rounded-xl h-9 sm:h-10 text-sm" />
          </div>

          {/* Shipping Method */}
          <div className="space-y-2">
            <h3 className="font-bengali text-xs sm:text-sm font-semibold text-foreground">শিপিং মেথড</h3>
            <div className="space-y-1 rounded-xl border bg-card p-1">
              {shippingOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 sm:px-4 sm:py-3 transition-colors ${
                    shipping === opt.id ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full border-2 ${
                      shipping === opt.id ? "border-accent" : "border-muted-foreground/40"
                    }`}>
                      {shipping === opt.id && <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-accent" />}
                    </div>
                    <span className="font-bengali text-xs sm:text-sm text-foreground">{opt.label}</span>
                  </div>
                  <span className="font-display text-xs sm:text-sm font-bold text-foreground">Tk {opt.price.toFixed(2)}</span>
                  <input type="radio" name="shipping" className="sr-only" checked={shipping === opt.id} onChange={() => setShipping(opt.id)} />
                </label>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <h3 className="font-bengali text-xs sm:text-sm font-semibold text-foreground">পেমেন্ট মেথড</h3>
            <div className="flex flex-wrap justify-center items-stretch gap-2">
              {([
                { id: "cod" as const, label: "ক্যাশ অন ডেলিভারি", icon: Banknote, enabled: activePayments.cod },
                { id: "bkash" as const, label: "bKash", icon: Smartphone, enabled: activePayments.bkash },
                { id: "nagad" as const, label: "Nagad", icon: CreditCard, enabled: activePayments.nagad },
              ]).filter(p => p.enabled).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPayment(id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all flex-1 min-w-[100px] max-w-[140px] ${
                    payment === id
                      ? "border-accent bg-accent/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 text-accent" />
                  <span className="text-[10px] sm:text-xs font-semibold leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Coupon */}
          <div className="flex gap-2">
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="কুপন কোড" className="rounded-xl h-9 sm:h-10 text-sm" />
            <Button type="button" onClick={handleApplyCoupon} className="shrink-0 rounded-xl bg-accent px-4 sm:px-6 text-accent-foreground hover:bg-accent/90 h-9 sm:h-10 text-xs sm:text-sm">
              এপ্লাই
            </Button>
          </div>

          {/* Product Summary */}
          <div className="flex items-center gap-2 sm:gap-3 rounded-xl border bg-card p-2 sm:p-3">
            <div className="relative">
              <img src={product.images[0]} alt={product.name} className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg object-cover" />
              {quantity > 1 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-accent text-[8px] sm:text-[10px] font-bold text-accent-foreground">
                  {quantity}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs sm:text-sm font-bold text-card-foreground line-clamp-1">{product.name}</p>
            </div>
            <p className="font-display text-xs sm:text-sm font-bold text-foreground">{formatPrice(subtotal)}</p>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 sm:space-y-2 rounded-xl border bg-secondary/30 p-3 sm:p-4">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="font-bengali font-semibold text-muted-foreground">সাব টোটাল</span>
              <span className="font-display font-bold text-foreground">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="font-bengali font-semibold text-muted-foreground">ডেলিভারি চার্জ</span>
              <span className="font-display font-bold text-foreground">{formatPrice(deliveryCharge)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 sm:pt-2">
              <span className="font-bengali text-sm sm:text-base font-bold text-foreground">সর্বমোট</span>
              <span className="font-display text-lg sm:text-xl font-extrabold text-foreground">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-border/40 shrink-0 bg-background/95">
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={submitting}
            className="w-full rounded-xl bg-success py-5 sm:py-6 text-sm sm:text-base font-bold text-success-foreground shadow-lg transition-all hover:bg-success/90"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : null}
            {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodOrderModal;
