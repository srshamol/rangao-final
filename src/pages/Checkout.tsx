import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Trash2, ArrowLeft, ShoppingBag, Banknote, CreditCard, Smartphone, Loader2, AlertCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackInitiateCheckout, trackAddPaymentInfo } from "@/lib/tracking";
import { analytics } from "@/services/analytics";
import { useIncompleteOrder } from "@/hooks/useIncompleteOrder";
import { useCustomer } from "@/context/CustomerContext";
import { checkOrderAllowed, getClientIP } from "@/lib/orderControl";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import SEO from "@/components/SEO";

const divisions = [
  "ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ",
];

type PaymentMethod = "cod" | "bkash" | "nagad";

const Checkout = () => {
  const { items, subtotal, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const { user, profile } = useCustomer();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", division: "", district: "", thana: "", address: "",
  });
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [activePayments, setActivePayments] = useState<{ cod: boolean; bkash: boolean; nagad: boolean }>({ cod: true, bkash: false, nagad: false });

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

  // Autofill from profile
  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        name: f.name || profile.full_name || "",
        phone: f.phone || profile.phone || "",
        email: f.email || profile.email || "",
        division: f.division || (profile.default_address as any)?.division || "",
        address: f.address || (profile.default_address as any)?.address || "",
      }));
    }
  }, [profile]);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("checkout_form_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm(f => ({
          ...f,
          name: parsed.name || f.name,
          phone: parsed.phone || f.phone,
          email: parsed.email || f.email,
          division: parsed.division || f.division,
          district: parsed.district || f.district,
          thana: parsed.thana || f.thana,
          address: parsed.address || f.address,
        }));
      }
    } catch (err) {
      console.error("Error loading checkout form draft:", err);
    }
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      analytics.beginCheckout(items, total);
    }
  }, []);

  const { data: storeSettings } = useStoreSettings();

  const deliveryChargeSettings = storeSettings?.deliveryCharges;
  const isDhaka = form.division === "ঢাকা";
  
  let deliveryCharge = 120; // Default fallback
  if (deliveryChargeSettings) {
    const inside = Number(deliveryChargeSettings.dhaka_inside) ?? 70;
    const outside = Number(deliveryChargeSettings.dhaka_outside) ?? 130;
    const minFree = Number(deliveryChargeSettings.free_delivery_min) ?? 0;
    
    if (minFree > 0 && subtotal >= minFree) {
      deliveryCharge = 0;
    } else {
      deliveryCharge = isDhaka ? inside : outside;
    }
  } else {
    deliveryCharge = subtotal >= 5000 ? 0 : 120;
  }
  const total = subtotal + deliveryCharge;

  const { saveIncomplete, markConverted } = useIncompleteOrder({
    pageSource: "checkout",
    products: items.map((i) => ({
      name: i.product.name,
      id: i.product.id,
      price: i.product.price,
      quantity: i.quantity,
      image: i.product.images[0],
    })),
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Clear debounce timer on unmount to prevent state update on unmounted component
  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newForm = { ...form, [e.target.name]: e.target.value };
    setForm(newForm);
    localStorage.setItem("checkout_form_draft", JSON.stringify(newForm));

    // Debounced save for incomplete tracking on any field change
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveIncomplete({
        name: newForm.name,
        phone: newForm.phone,
        email: newForm.email,
        formData: { division: newForm.division, address: newForm.address },
      });
    }, 2000);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address || !form.division) {
      toast.error("সকল প্রয়োজনীয় তথ্য পূরণ করুন");
      return;
    }
    const bdPhoneRegex = /^(01[3-9]\d{8})$/;
    if (!bdPhoneRegex.test(form.phone.trim())) {
      toast.error("১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)");
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      // Check order control (rate limiting + block check)
      const clientIP = await getClientIP();
      const check = await checkOrderAllowed(form.phone, clientIP);
      if (!check.allowed) {
        const whatsapp = storeSettings?.contactInfo?.whatsapp || "";
        toast.custom((t) => (
          <div className="flex w-full max-w-[360px] md:max-w-md items-center justify-between gap-3 rounded-2xl border border-destructive/15 bg-background p-4 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-foreground">অর্ডার সীমাবদ্ধতা</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{check.message}</p>
              </div>
            </div>
            {whatsapp && (
              <button
                onClick={() => {
                  window.open(`https://wa.me/${whatsapp}`, "_blank");
                  toast.dismiss(t);
                }}
                className="shrink-0 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#20ba56] transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            )}
          </div>
        ), { duration: 8000 });
        setSubmitting(false);
        return;
      }

      trackAddPaymentInfo(items.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity })), total);

      // 1. Insert order (order_number auto-generated by trigger)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: "",
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email || null,
          user_id: user?.id || null,
          shipping_address: {
            division: form.division,
            district: form.district,
            thana: form.thana,
            address: form.address,
          },
          payment_method: payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "bkash" ? "bKash" : "Nagad",
          subtotal,
          delivery_charge: deliveryCharge,
          total_amount: total,
          ip_address: clientIP || null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // 2. Insert order items
      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.stock === 0 ? `${i.product.name} (প্রি-অর্ডার)` : i.product.name,
        unit_price: i.product.price,
        quantity: i.quantity,
        total_price: i.product.price * i.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Mark incomplete as converted
      await markConverted(order.id);

      // Send Telegram notification to admin
      try {
        const { sendTelegramNotification } = await import("@/lib/telegram");
        const hasPreOrder = items.some((i) => i.product.stock === 0);
        const itemsList = items
          .map((i) => `• ${i.product.name}${i.product.stock === 0 ? " [প্রি-অর্ডার]" : ""} (Qty: ${i.quantity}) - ৳${i.product.price * i.quantity}`)
          .join("\n");

        const message = `🛍️ <b>নতুন ${hasPreOrder ? "প্রি-অর্ডার / " : ""}অর্ডার এসেছে!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${order.order_number}\n` +
          `<b>গ্রাহকের নাম:</b> ${form.name}\n` +
          `<b>মোবাইল:</b> ${form.phone}\n` +
          `<b>ঠিকানা:</b> ${form.address}, ${form.thana || ""}, ${form.district || ""}, ${form.division}\n` +
          `<b>পেমেন্ট মেথড:</b> ${payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "bkash" ? "bKash" : "Nagad"}\n\n` +
          `<b>পণ্যসমূহ:</b>\n${itemsList}\n\n` +
          `<b>সাবটোটাল:</b> ৳${subtotal}\n` +
          `<b>ডেলিভারি চার্জ:</b> ৳${deliveryCharge}\n` +
          `<b>সর্বমোট পরিমাণ:</b> ৳${total}`;

        await sendTelegramNotification(message, { isNewOrder: true, orderId: order.id } as any);
      } catch (tgErr) {
        console.error("Error triggering telegram notification:", tgErr);
      }

      // 4. Success — pass full order data to success page
      clearCart();
      localStorage.removeItem("checkout_form_draft");
      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
      navigate(`/order-success/${order.order_number}`, {
        state: {
          id: order.id,
          orderNumber: order.order_number,
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email,
          shippingAddress: {
            division: form.division,
            district: form.district,
            thana: form.thana,
            address: form.address,
          },
          paymentMethod: payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "bkash" ? "bKash" : "Nagad",
          items: items.map((i) => ({
            name: i.product.name,
            image: i.product.images[0],
            quantity: i.quantity,
            unitPrice: i.product.price,
            totalPrice: i.product.price * i.quantity,
          })),
          subtotal,
          deliveryCharge,
          total,
        },
      });
    } catch (err: any) {
      console.error("Order error:", err);
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20">
          <p className="font-bengali text-xl text-muted-foreground">আপনার কার্ট খালি</p>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" /> শপিংয়ে ফিরে যান
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO title="কার্ট ও চেকআউট" description="আপনার কার্ট রিভিউ করুন এবং নিরাপদভাবে ক্যাশ অন ডেলিভারিতে অর্ডার সম্পন্ন করুন।" noIndex={true} />
      <main className="py-8 md:py-12">
        <div className="container">
          <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> পিছনে যান
          </button>

          <h1 className="mb-8 font-display text-3xl font-extrabold text-foreground md:text-4xl">চেকআউট</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
              {/* Left: Form */}
              <div className="space-y-8 lg:col-span-3">
                {/* Personal Info */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-2xl border bg-card p-6">
                  <h2 className="font-display text-lg font-bold text-card-foreground">ব্যক্তিগত তথ্য</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">নাম *</label>
                      <Input name="name" value={form.name} onChange={handleChange} placeholder="আপনার নাম" className="h-11 rounded-xl" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">ফোন নাম্বার *</label>
                      <Input name="phone" value={form.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className="h-11 rounded-xl" required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">ইমেইল</label>
                      <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@gmail.com" className="h-11 rounded-xl" />
                    </div>
                  </div>
                </motion.div>

                {/* Address */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 rounded-2xl border bg-card p-6">
                  <h2 className="font-display text-lg font-bold text-card-foreground">ডেলিভারি ঠিকানা</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">বিভাগ *</label>
                      <select name="division" value={form.division} onChange={handleChange} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" required>
                        <option value="">বিভাগ নির্বাচন করুন</option>
                        {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">জেলা</label>
                      <Input name="district" value={form.district} onChange={handleChange} placeholder="জেলা" className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">থানা/উপজেলা</label>
                      <Input name="thana" value={form.thana} onChange={handleChange} placeholder="থানা" className="h-11 rounded-xl" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">বিস্তারিত ঠিকানা *</label>
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="বাড়ি নং, রোড, এলাকা..."
                        className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        required
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Payment */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4 rounded-2xl border bg-card p-6">
                  <h2 className="font-display text-lg font-bold text-card-foreground">পেমেন্ট মেথড</h2>
                  <div className="flex flex-wrap justify-center items-stretch gap-2.5 sm:gap-4">
                    {([
                      { id: "cod" as const, label: "ক্যাশ অন ডেলিভারি", icon: Banknote, enabled: activePayments.cod },
                      { id: "bkash" as const, label: "bKash", icon: Smartphone, enabled: activePayments.bkash },
                      { id: "nagad" as const, label: "Nagad", icon: CreditCard, enabled: activePayments.nagad },
                    ]).filter(p => p.enabled).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPayment(id)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 sm:p-4 text-xs sm:text-sm font-medium transition-all flex-1 min-w-[110px] max-w-[160px] ${
                          payment === id
                            ? "border-accent bg-accent/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-accent/50"
                        }`}
                      >
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right: Summary */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-24">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4 rounded-2xl border bg-card p-6">
                    <h2 className="font-display text-lg font-bold text-card-foreground">অর্ডার সামারি</h2>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-3">
                          <img src={item.product.images[0]} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-card-foreground line-clamp-1">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity}x {formatPrice(item.product.price)}</p>
                          </div>
                          <p className="font-display text-sm font-bold text-foreground">{formatPrice(item.product.price * item.quantity)}</p>
                          <button type="button" onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>সাবটোটাল</span>
                        <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>ডেলিভারি চার্জ</span>
                        <span className={`font-semibold ${deliveryCharge === 0 ? "text-success" : "text-foreground"}`}>
                          {deliveryCharge === 0 ? "ফ্রি" : formatPrice(deliveryCharge)}
                        </span>
                      </div>
                      {deliveryCharge > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {deliveryChargeSettings && Number(deliveryChargeSettings.free_delivery_min) > 0 
                            ? `৳${Number(deliveryChargeSettings.free_delivery_min).toLocaleString()}+ অর্ডারে ফ্রি ডেলিভারি`
                            : "৳৫,০০০+ অর্ডারে ফ্রি ডেলিভারি"
                          }
                        </p>
                      )}
                      <div className="flex justify-between border-t pt-3">
                        <span className="font-bengali text-base font-bold text-foreground">মোট</span>
                        <span className="font-display text-2xl font-extrabold text-foreground">{formatPrice(total)}</span>
                      </div>
                    </div>
                    <Button type="submit" size="lg" disabled={submitting} className="w-full rounded-xl bg-success py-6 text-base font-bold text-success-foreground shadow-lg hover:bg-success/90">
                      {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingBag className="mr-2 h-5 w-5" />}
                      {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
