import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Trash2, ArrowLeft, ShoppingBag, Banknote, CreditCard, Smartphone, Loader2, AlertCircle, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { isValidBDPhone, normalizeBDPhone } from "@/lib/phoneValidation";
import { analytics } from "@/services/analytics";
import { useIncompleteOrder } from "@/hooks/useIncompleteOrder";
import { useCustomer } from "@/context/CustomerContext";
import { checkOrderAllowed, getClientIP } from "@/lib/orderControl";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import SEO from "@/components/SEO";

const divisions = [
  "ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ",
];

type PaymentMethod = "cod" | "bkash" | "nagad" | "uddoktapay";

const Checkout = () => {
  const { items, subtotal, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const { user, profile } = useCustomer();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", division: "", district: "", thana: "", address: "",
  });
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [activePayments, setActivePayments] = useState<{ cod: boolean; bkash: boolean; nagad: boolean; uddoktapay: boolean }>({ cod: true, bkash: false, nagad: false, uddoktapay: false });
  const { data: storeSettings } = useStoreSettings();

  // SMS & OTP States
  const [smsConfig, setSmsConfig] = useState<any>(null);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Fetch SMS Settings on mount
  useEffect(() => {
    const fetchSmsSettings = async () => {
      try {
        const { data }: { data: any } = await supabase
          .from("store_settings" as any)
          .select("value")
          .eq("key", "sms_settings")
          .maybeSingle();
        if (data && data.value) {
          setSmsConfig(data.value);
        }
      } catch (e) {
        console.error("Error fetching SMS settings:", e);
      }
    };
    fetchSmsSettings();
  }, []);

  // OTP Resend timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleSendOtp = async (phoneStr: string) => {
    setOtpCode("");
    try {
      let data: any = null;
      let isFallback = false;
      
      const isSandboxMode = smsConfig?.sandbox_mode || smsConfig?.gateway === "sandbox" || !smsConfig?.enabled;
      
      if (isSandboxMode) {
        isFallback = true;
      } else {
        try {
          const res = await fetch("/api/sms/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: phoneStr })
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            data = await res.json();
          } else {
            isFallback = true;
          }
        } catch (e) {
          isFallback = true;
        }
      }

      if (isFallback) {
        console.warn("SMS OTP serverless function unavailable, attempting direct client-side fallback");
        const digitCount = Number(smsConfig?.otp_digit_count) || 4;
        let code = "";
        if (digitCount === 6) {
          code = String(Math.floor(100000 + Math.random() * 900000));
        } else {
          code = String(Math.floor(1000 + Math.random() * 9000));
        }
        
        const cleanPhone = phoneStr.trim();
        if (cleanPhone === "01700000000" || cleanPhone === "01711111111") {
          code = "1234";
        }
        
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        
        const { error: insertError } = await supabase
          .from("otp_verifications" as any)
          .insert({
            phone: cleanPhone,
            code,
            verified: false,
            expires_at: expiresAt
          });
          
        if (insertError) throw insertError;
        
        data = {
          status: "success",
          sandbox: true,
          code: code
        };
      }

      toast.success("আপনার ফোনে একটি ওটিপি কোড পাঠানো হয়েছে");
      setOtpSent(true);
      setOtpTimer(60);
      setOtpModalOpen(true);
      
      if (data.sandbox && data.code) {
        toast.info(`স্যান্ডবক্স মোড: আপনার ওটিপি কোড ${data.code}`, { duration: 10000 });
        setOtpCode(data.code);
      }
    } catch (err: any) {
      toast.error(err.message || "ওটিপি পাঠাতে ব্যর্থ হয়েছে।");
      throw err;
    }
  };

  useEffect(() => {
    if (storeSettings?.paymentMethods) {
      const val = storeSettings.paymentMethods;
      setActivePayments({
        cod: val.cod ?? true,
        bkash: val.bkash ?? false,
        nagad: val.nagad ?? false,
        uddoktapay: val.uddoktapay ?? false
      });
      if (!val.cod) {
        if (val.uddoktapay) setPayment("uddoktapay");
        else if (val.bkash) setPayment("bkash");
        else if (val.nagad) setPayment("nagad");
      }
    }
  }, [storeSettings]);

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


  const deliveryChargeSettings = storeSettings?.deliveryCharges;
  const isDhaka = form.division === "ঢাকা";
  
  const hasFreeDeliveryItem = items.some(
    (item) =>
      Boolean((item.product as any).isFreeDelivery) ||
      Boolean((item.product as any).is_free_delivery) ||
      Boolean((item.product as any).tags?.includes("ফ্রি ডেলিভারি")) ||
      Boolean((item.product as any).tags?.includes("free_delivery"))
  );

  let deliveryCharge = 120; // Default fallback
  if (hasFreeDeliveryItem) {
    deliveryCharge = 0;
  } else if (deliveryChargeSettings) {
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
  const otpDigitCount = Number(smsConfig?.otp_digit_count) || 4;

  const { saveIncomplete, markConverted, dbDraft } = useIncompleteOrder({
    pageSource: "checkout",
    products: items.map((i) => ({
      name: i.product.name,
      id: i.product.id,
      price: i.product.price,
      quantity: i.quantity,
      image: i.product.images[0],
    })),
  });

  // Load from dbDraft on mount/fetch
  useEffect(() => {
    if (dbDraft) {
      setForm(f => ({
        ...f,
        name: f.name || dbDraft.customer_name || "",
        phone: f.phone || dbDraft.customer_phone || "",
        email: f.email || dbDraft.customer_email || "",
        division: f.division || dbDraft.form_data?.division || "",
        district: f.district || dbDraft.form_data?.district || "",
        thana: f.thana || dbDraft.form_data?.thana || "",
        address: f.address || dbDraft.form_data?.address || "",
      }));
    }
  }, [dbDraft]);

  const isCompletedRef = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;
  const hasSavedOnLeave = useRef(false);

  const saveOnLeave = useCallback(() => {
    if (isCompletedRef.current || hasSavedOnLeave.current) return;
    const currentForm = formRef.current;
    if (currentForm.name.trim() || currentForm.phone.trim()) {
      hasSavedOnLeave.current = true;
      saveIncomplete({
        name: currentForm.name,
        phone: currentForm.phone,
        email: currentForm.email,
        formData: { division: currentForm.division, address: currentForm.address },
      }, true);
    }
  }, [saveIncomplete]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveOnLeave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      saveOnLeave();
    };
  }, [saveOnLeave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newForm = { ...form, [e.target.name]: e.target.value };
    setForm(newForm);
    if (e.target.name === "phone") {
      setIsOtpVerified(false);
    }
    localStorage.setItem("checkout_form_draft", JSON.stringify(newForm));
  };

  const [submitting, setSubmitting] = useState(false);

  const completeOrderCreation = async (clientIP: string) => {
    try {
      trackAddPaymentInfo(items.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity })), total);

      const { getAttributionContext } = await import("@/lib/meta/attribution");
      const attribution = getAttributionContext();
      let fbp = attribution.fbp || "";
      let fbc = attribution.fbc || "";

      if (!fbp || !fbc) {
        try {
          const { default: clientParamBuilder } = await import("meta-capi-param-builder-clientjs");
          if (!fbp) fbp = clientParamBuilder.getFbp() || "";
          if (!fbc) fbc = clientParamBuilder.getFbc() || "";
        } catch (err) {
          // ignore
        }
      }
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
      // Track AddPaymentInfo event
      analytics.addPaymentInfo(
        items.map((i) => ({
          id: i.product?.id || i.id,
          sku: i.product?.sku || i.sku || i.product?.id || i.id,
          name: i.product?.name || i.name,
          price: i.product?.price ?? i.price ?? 0,
          quantity: i.quantity || 1,
          category: (i.product as any)?.categoryLabel || (i.product as any)?.category || "General",
        })),
        total,
        payment === "cod" ? "COD" : payment === "uddoktapay" ? "Online" : payment === "bkash" ? "bKash" : "Nagad"
      );

      // 1. Insert order (order_number auto-generated by trigger)
      const cleanPhone = normalizeBDPhone(form.phone);
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: "",
          customer_name: form.name,
          customer_phone: cleanPhone,
          customer_email: form.email || null,
          user_id: user?.id || null,
          shipping_address: {
            division: form.division,
            district: form.district,
            thana: form.thana,
            address: form.address,
          },
          payment_method: payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "uddoktapay" ? (storeSettings?.paymentMethods?.uddoktapay_display_name || "অনলাইন পেমেন্ট") : payment === "bkash" ? "bKash" : "Nagad",
          subtotal,
          delivery_charge: deliveryCharge,
          total_amount: total,
          ip_address: clientIP || null,
          user_agent: userAgent,
          fbp: fbp || null,
          fbc: fbc || null,
          fbclid: attribution.fbclid || null,
          utm_source: attribution.utm_source || null,
          utm_medium: attribution.utm_medium || null,
          utm_campaign: attribution.utm_campaign || null,
          utm_content: attribution.utm_content || null,
          utm_term: attribution.utm_term || null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // 2. Insert order items
      const isValidUUID = (id?: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: isValidUUID(i.product.id) ? i.product.id : null,
        product_name: i.product.stock === 0 ? `${i.product.name} (প্রি-অর্ডার)` : i.product.name,
        unit_price: i.product.price,
        quantity: i.quantity,
        total_price: i.product.price * i.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Mark incomplete as converted
      await markConverted(order.id, form.phone);

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
          `<b>পেমেন্ট মেথড:</b> ${payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "uddoktapay" ? (storeSettings?.paymentMethods?.uddoktapay_display_name || "অনলাইন পেমেন্ট") : payment === "bkash" ? "bKash" : "Nagad"}\n\n` +
          `<b>পণ্যসমূহ:</b>\n${itemsList}\n\n` +
          `<b>সাবটোটাল:</b> ৳${subtotal}\n` +
          `<b>ডেলিভারি চার্জ:</b> ৳${deliveryCharge}\n` +
          `<b>সর্বমোট পরিমাণ:</b> ৳${total}`;

        await sendTelegramNotification(message, { isNewOrder: true, orderId: order.id } as any);
      } catch (tgErr) {
        console.error("Error triggering telegram notification:", tgErr);
      }

      // Send Order Success SMS to customer if enabled
      try {
        if (smsConfig && smsConfig.enabled && smsConfig.order_success_sms_enabled) {
          const smsText = (smsConfig.order_success_sms_template || "Dear {name}, your order #{order_number} has been received. Total: ৳{total}.")
            .replace("{name}", form.name)
            .replace("{order_number}", order.order_number)
            .replace("{total}", String(total));

          await fetch("/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: form.phone,
              message: smsText,
              orderId: order.id
            })
          });
        }
      } catch (smsErr) {
        console.error("Error sending order success SMS:", smsErr);
      }

      // If UddoktaPay is selected, redirect to the gateway page
      if (payment === "uddoktapay") {
        try {
          const initiateRes = await fetch("/api/uddoktapay/initiate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: order.id,
              origin: window.location.origin,
            }),
          });

          const contentType = initiateRes.headers.get("content-type") || "";
          if (!initiateRes.ok || contentType.includes("text/html")) {
            throw new Error("Serverless relay unavailable (returned HTML/error)");
          }

          const initiateData = await initiateRes.json();
          if (initiateData.payment_url) {
            isCompletedRef.current = true;
            clearCart();
            localStorage.removeItem("checkout_form_draft");
            // Redirect user to UddoktaPay payment page
            window.location.href = initiateData.payment_url;
            return;
          } else {
            throw new Error(initiateData.error || "Failed to create payment session");
          }
        } catch (payErr: any) {
          console.warn("UddoktaPay serverless function unavailable, attempting direct client-side fallback:", payErr);
          
          try {
            // Fetch credentials directly from settings (simulating serverless function behavior)
            const { data: row, error: settingsError }: { data: any; error: any } = await supabase
              .from("store_settings" as any)
              .select("value")
              .eq("key", "payment_methods")
              .maybeSingle();

            if (settingsError || !row || !row.value) {
              throw new Error("Payment settings not found in database.");
            }

            const { uddoktapay_api_key, uddoktapay_base_url } = row.value as any;
            if (!uddoktapay_api_key || !uddoktapay_base_url) {
              throw new Error("UddoktaPay API key or Base URL is missing in settings.");
            }

            let baseUrl = uddoktapay_base_url.trim().replace(/\/$/, "");
            if (baseUrl.endsWith("/api")) {
              baseUrl = baseUrl.slice(0, -4).replace(/\/$/, "");
            }
            const apiKey = uddoktapay_api_key.trim();

            const uddoktaPayPayload = {
              full_name: form.name.trim() || "Customer",
              email: form.email.trim() || "customer@example.com",
              amount: String(total),
              currency: "BDT",
              metadata: {
                order_id: order.id,
                order_number: order.order_number,
              },
              redirect_url: `${window.location.origin}/order-success/${order.order_number}`,
              return_type: "GET",
              cancel_url: `${window.location.origin}/checkout?payment_status=cancelled`,
              webhook_url: `${window.location.origin}/api/uddoktapay/webhook`,
            };

            const apiResponse = await fetch(`${baseUrl}/api/checkout-v2`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
                "RT-UDDOKTAPAY-API-KEY": apiKey,
              },
              body: JSON.stringify(uddoktaPayPayload),
            });

            if (!apiResponse.ok) {
              throw new Error(`UddoktaPay API returned HTTP status ${apiResponse.status}`);
            }

            const result = await apiResponse.json();
            if (result.status && result.payment_url) {
              isCompletedRef.current = true;
              clearCart();
              localStorage.removeItem("checkout_form_draft");
              window.location.href = result.payment_url;
              return;
            } else {
              throw new Error(result.message || "Failed to get payment url from UddoktaPay");
            }
          } catch (fallbackErr: any) {
            console.error("UddoktaPay client-side fallback failed:", fallbackErr);
            toast.error("অনলাইন পেমেন্ট গেটওয়েতে রিডাইরেক্ট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন বা অন্য পেমেন্ট মেথড সিলেক্ট করুন।");
            return;
          }
        }
      }

      // 4. Success for other payment methods (COD, etc.) — pass full order data to success page
      isCompletedRef.current = true;
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
            id: i.product.id,
            productId: i.product.id,
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
      console.error("Order completion error:", err);
      toast.error("অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpAndPlaceOrder = async (clientIP: string) => {
    const minDigits = Number(smsConfig?.otp_digit_count) || 4;
    if (!otpCode || otpCode.length < minDigits) {
      toast.error(`দয়া করে সঠিক ${minDigits} ডিজিটের ওটিপি কোড দিন`);
      return;
    }
    setVerifyingOtp(true);
    try {
      let verified = false;
      let isFallback = false;
      
      const isSandboxMode = smsConfig?.sandbox_mode || smsConfig?.gateway === "sandbox" || !smsConfig?.enabled;
      
      if (isSandboxMode) {
        isFallback = true;
      } else {
        try {
          const res = await fetch("/api/sms/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: form.phone, code: otpCode })
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const data = await res.json();
            verified = true;
          } else {
            isFallback = true;
          }
        } catch (e) {
          isFallback = true;
        }
      }
      
      if (isFallback) {
        console.warn("SMS OTP verification serverless function unavailable, attempting direct client-side fallback");
        const cleanPhone = form.phone.trim();
        const cleanCode = otpCode.trim();
        const nowStr = new Date().toISOString();
        
        const { data: records, error: queryError }: { data: any[] | null; error: any } = await supabase
          .from("otp_verifications" as any)
          .select("id, code, expires_at, verified")
          .eq("phone", cleanPhone)
          .eq("code", cleanCode)
          .eq("verified", false)
          .gt("expires_at", nowStr)
          .order("created_at", { ascending: false });
          
        if (queryError) throw queryError;
        if (!records || records.length === 0) {
          throw new Error("সঠিক ওটিপি কোড দিন অথবা কোডের মেয়াদ শেষ হয়ে গেছে।");
        }
        
        const matchedRecord = records[0];
        const { error: updateError } = await supabase
          .from("otp_verifications" as any)
          .update({ verified: true, updated_at: new Date().toISOString() })
          .eq("id", matchedRecord.id);
          
        if (updateError) throw updateError;
        verified = true;
      }
      
      if (verified) {
        toast.success("আপনার ফোন ভেরিফিকেশন সফল হয়েছে!");
        setIsOtpVerified(true);
        setOtpModalOpen(false);
        analytics.completeRegistration("phone_otp", { phone: form.phone, fullName: form.name });
        setSubmitting(true);
        await completeOrderCreation(clientIP);
      }
    } catch (err: any) {
      toast.error(err.message || "ভেরিফিকেশন কোড মিলছে না। আবার চেষ্টা করুন।");
    } finally {
      setVerifyingOtp(false);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address || !form.division) {
      toast.error("সকল প্রয়োজনীয় তথ্য পূরণ করুন");
      return;
    }
    if (!isValidBDPhone(form.phone)) {
      toast.error("সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 01XXXXXXXXX, 8801XXXXXXXXX বা +8801XXXXXXXXX)");
      return;
    }
    const normalizedPhone = normalizeBDPhone(form.phone);
    if (form.phone !== normalizedPhone) {
      setForm(f => ({ ...f, phone: normalizedPhone }));
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      // Check order control (rate limiting + block check)
      const clientIP = await getClientIP();
      const check = await checkOrderAllowed(normalizedPhone, clientIP);
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
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            )}
          </div>
        ), { duration: 8000 });
        setSubmitting(false);
        return;
      }

      // Check if OTP verification is active for COD payment method
      if (smsConfig && smsConfig.enabled && smsConfig.otp_enabled && payment === "cod" && !isOtpVerified) {
        await handleSendOtp(form.phone);
        setSubmitting(false);
        return;
      }

      await completeOrderCreation(clientIP);
    } catch (err: any) {
      console.error("Order error:", err);
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
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
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                        ফোন নাম্বার <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d+]/g, "");
                            handleChange({ target: { name: "phone", value: val } } as any);
                          }}
                          placeholder="01XXXXXXXXX"
                          className="h-11 rounded-xl pl-9"
                          required
                        />
                      </div>
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
                      { id: "uddoktapay" as const, label: storeSettings?.paymentMethods?.uddoktapay_display_name || "অনলাইন পেমেন্ট", icon: CreditCard, enabled: activePayments.uddoktapay },
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
                      {hasFreeDeliveryItem ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-bengali">
                          🎉 ফ্রি ডেলিভারি আইটেম অন্তর্ভুক্ত থাকায় ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!
                        </p>
                      ) : deliveryCharge > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {deliveryChargeSettings && Number(deliveryChargeSettings.free_delivery_min) > 0 
                            ? `৳${Number(deliveryChargeSettings.free_delivery_min).toLocaleString()}+ অর্ডারে ফ্রি ডেলিভারি`
                            : "৳৫,০০০+ অর্ডারে ফ্রি ডেলিভারি"
                          }
                        </p>
                      ) : null}
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

      {/* OTP Verification Modal */}
      <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display text-foreground text-center">মোবাইল নাম্বার ভেরিফিকেশন</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center pt-2">
              আপনার দেওয়া মোবাইল নাম্বার <b>{form.phone}</b> ভেরিফাই করার জন্য ওটিপি কোডটি নিচে দিন।
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-6 py-4">
            <InputOTP
              maxLength={otpDigitCount}
              value={otpCode}
              onChange={(val) => setOtpCode(val)}
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: otpDigitCount }).map((_, i) => (
                  <InputOTPSlot 
                    key={i} 
                    index={i} 
                    className="h-12 w-12 border-2 rounded-xl text-lg font-bold text-foreground focus-visible:ring-accent"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            <div className="flex flex-col gap-2 w-full">
              <Button
                onClick={async () => {
                  const clientIP = await getClientIP();
                  await handleVerifyOtpAndPlaceOrder(clientIP);
                }}
                disabled={verifyingOtp || otpCode.length < otpDigitCount}
                className="w-full h-11 bg-success text-success-foreground hover:bg-success/90 font-bold rounded-xl"
              >
                {verifyingOtp ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                কোড নিশ্চিত করুন
              </Button>

              <div className="flex items-center justify-between text-xs px-1 mt-2">
                <span className="text-muted-foreground">কোড পাননি?</span>
                {otpTimer > 0 ? (
                  <span className="text-muted-foreground font-semibold">({otpTimer} সেকেন্ড পর আবার পাঠান)</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp(form.phone)}
                    className="text-accent hover:underline font-bold"
                  >
                    পুনরায় ওটিপি পাঠান
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
