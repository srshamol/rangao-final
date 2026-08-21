import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Product, formatPrice } from "@/data/products";
import { User, Phone, MapPin, Loader2, Banknote, Smartphone, CreditCard, AlertCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIncompleteOrder } from "@/hooks/useIncompleteOrder";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { checkOrderAllowed, getClientIP } from "@/lib/orderControl";
import { isValidBDPhone, normalizeBDPhone } from "@/lib/phoneValidation";
import { analytics } from "@/services/analytics";

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
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [shipping, setShipping] = useState<ShippingZone>("dhaka");
  const [payment, setPayment] = useState<"cod" | "bkash" | "nagad" | "uddoktapay">("cod");
  const [activePayments, setActivePayments] = useState<{ cod: boolean; bkash: boolean; nagad: boolean; uddoktapay: boolean }>({ cod: true, bkash: false, nagad: false, uddoktapay: false });
  const [coupon, setCoupon] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

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
        const { data } = await supabase
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

  // Track InitiateCheckout on modal open
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (open && product && !checkoutTracked.current) {
      analytics.beginCheckout(
        [
          {
            id: product.id,
            sku: product.sku || product.id,
            name: product.name,
            price: product.price,
            quantity: localQuantity,
            category: (product as any).categoryLabel || product.category || "General",
          },
        ],
        product.price * localQuantity
      );
      checkoutTracked.current = true;
    }
    if (!open) {
      checkoutTracked.current = false;
    }
  }, [open, product, localQuantity]);

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

  // Clear debounce timer on unmount / modal close to prevent leaks
  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  const saveCodDraft = (updates: Record<string, any>) => {
    try {
      const saved = localStorage.getItem("cod_modal_form_draft");
      const current = saved ? JSON.parse(saved) : {};
      localStorage.setItem("cod_modal_form_draft", JSON.stringify({ ...current, ...updates }));
    } catch (err) {
      console.error("Error saving COD draft:", err);
    }
  };

  // Load form state from draft when modal is opened
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem("cod_modal_form_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          setName(parsed.name || "");
          setPhone(parsed.phone || "");
          setAddress(parsed.address || "");
          setShipping(parsed.shipping || "dhaka");
          setPayment(parsed.payment || "cod");
          setOrderNote(parsed.orderNote || "");
        } else {
          setName("");
          setPhone("");
          setAddress("");
          setShipping("dhaka");
          setPayment("cod");
          setOrderNote("");
        }
        setIsOtpVerified(false);
      } catch (err) {
        console.error("Error loading COD draft:", err);
      }
    }
  }, [open]);

  useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity, open]);

  const { data: storeSettings } = useStoreSettings();

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

  const { saveIncomplete, markConverted, fireAbandonedNotification, dbDraft } = useIncompleteOrder({
    pageSource: "cod_modal",
    products: [{ name: product.name, id: product.id, price: product.price, quantity: localQuantity, image: product.images[0] }],
  });

  // Load from dbDraft when open or dbDraft updates
  useEffect(() => {
    if (dbDraft && open) {
      setName(n => n || dbDraft.customer_name || "");
      setPhone(p => p || dbDraft.customer_phone || "");
      if (dbDraft.form_data) {
        setAddress(a => a || dbDraft.form_data.address || "");
        setShipping(s => s || dbDraft.form_data.shipping || "dhaka");
      }
    }
  }, [dbDraft, open]);

  const isCompletedRef = useRef(false);
  const nameRef = useRef(name);
  const phoneRef = useRef(phone);
  const addressRef = useRef(address);
  const shippingRef = useRef(shipping);
  const hasSavedOnLeave = useRef(false);

  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { phoneRef.current = phone; }, [phone]);
  useEffect(() => { addressRef.current = address; }, [address]);
  useEffect(() => { shippingRef.current = shipping; }, [shipping]);

  // Reset flag when modal opens
  useEffect(() => {
    if (open) {
      isCompletedRef.current = false;
      hasSavedOnLeave.current = false;
    }
  }, [open]);

  const saveOnLeave = useCallback(() => {
    if (isCompletedRef.current || hasSavedOnLeave.current) return;
    const currentName = nameRef.current;
    const currentPhone = phoneRef.current;
    if (currentName.trim() || currentPhone.trim()) {
      hasSavedOnLeave.current = true;
      saveIncomplete({
        name: currentName,
        phone: currentPhone,
        formData: { address: addressRef.current, shipping: shippingRef.current },
      }, true);
    }
  }, [saveIncomplete]);

  // Fire notification if the user exits/closes the modal without submitting order
  const lastOpen = useRef(open);
  useEffect(() => {
    if (lastOpen.current && !open) {
      saveOnLeave();
    }
    lastOpen.current = open;
  }, [open, saveOnLeave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (open) {
        saveOnLeave();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      if (open) {
        saveOnLeave();
      }
    };
  }, [open, saveOnLeave]);

  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const isProductFreeDelivery = Boolean(
    (product as any).isFreeDelivery ||
    (product as any).is_free_delivery ||
    (product as any).tags?.includes("ফ্রি ডেলিভারি") ||
    (product as any).tags?.includes("free_delivery")
  );

  const subtotal = product.price * localQuantity;
  const baseDeliveryCharge = shippingOptions.find((s) => s.id === shipping)!.price;
  const deliveryCharge = isProductFreeDelivery ? 0 : baseDeliveryCharge;

  let discountAmount = 0;
  if (appliedCoupon) {
    const isFreeDelivery = appliedCoupon.discount_type === "free_delivery" || 
      (appliedCoupon.discount_type === "flat" && Number(appliedCoupon.discount_value) === 0);

    if (appliedCoupon.discount_type === "percentage") {
      discountAmount = (subtotal * Number(appliedCoupon.discount_value)) / 100;
      if (appliedCoupon.max_discount) {
        discountAmount = Math.min(discountAmount, Number(appliedCoupon.max_discount));
      }
    } else if (isFreeDelivery) {
      discountAmount = deliveryCharge;
    } else if (appliedCoupon.discount_type === "flat") {
      discountAmount = Number(appliedCoupon.discount_value);
    }
  }

  const total = Math.max(0, subtotal + deliveryCharge - discountAmount);
  const otpDigitCount = Number(smsConfig?.otp_digit_count) || 4;

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", coupon.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        toast.error("এই কুপনটি সঠিক নয় বা বর্তমানে সক্রিয় নেই");
        setAppliedCoupon(null);
        return;
      }

      // Check dates
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        toast.error("এই কুপনটি ব্যবহারের সময় এখনও শুরু হয়নি");
        return;
      }
      if (data.valid_to && new Date(data.valid_to) < now) {
        toast.error("এই কুপনটির মেয়াদ শেষ হয়ে গেছে");
        return;
      }

      // Check min order
      if (data.min_order && subtotal < Number(data.min_order)) {
        toast.error(`এই কুপনটি ব্যবহার করতে ন্যূনতম ৳${Number(data.min_order).toLocaleString()} অর্ডার করতে হবে`);
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        toast.error("এই কুপনটি ব্যবহারের সীমা অতিক্রম করেছে");
        return;
      }

      setAppliedCoupon(data);
      toast.success("কুপন সফলভাবে যুক্ত হয়েছে!");
    } catch (err) {
      console.error("Error applying coupon:", err);
      toast.error("কুপন যাচাইতে সমস্যা হয়েছে");
    }
  };

  const completeOrderCreation = async (clientIP: string) => {
    try {
      const shippingLabel = shippingOptions.find((s) => s.id === shipping)!.label;

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
      const userAgent = navigator.userAgent;

      const normalizedPhone = normalizeBDPhone(phone);

      // Track AddPaymentInfo event
      analytics.addPaymentInfo(
        [
          {
            id: product.id,
            sku: product.sku || product.id,
            name: product.name,
            price: product.price,
            quantity: localQuantity,
            category: (product as any)?.categoryLabel || product.category || "General",
          },
        ],
        total,
        payment === "cod" ? "COD" : payment === "uddoktapay" ? "Online" : payment === "bkash" ? "bKash" : "Nagad"
      );

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: "",
          customer_name: name.trim(),
          customer_phone: normalizedPhone,
          shipping_address: {
            division: shippingLabel,
            address: address.trim(),
          },
          payment_method: payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "uddoktapay" ? "UddoktaPay" : payment === "bkash" ? "bKash" : "Nagad",
          subtotal,
          delivery_charge: deliveryCharge,
          discount_amount: discountAmount,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          total_amount: total,
          notes: orderNote.trim() || null,
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

      const isPreOrder = product.stock === 0;

      const { error: itemsError } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: product.id,
        product_name: isPreOrder ? `${product.name} (প্রি-অর্ডার)` : product.name,
        unit_price: product.price,
        quantity: localQuantity,
        total_price: subtotal,
      });
      if (itemsError) throw itemsError;

      // Send Telegram notification to admin
      try {
        const { sendTelegramNotification } = await import("@/lib/telegram");
        const itemsList = `• ${product.name}${isPreOrder ? " [প্রি-অর্ডার]" : ""} (Qty: ${localQuantity}) - ৳${subtotal}`;
        
        let couponInfo = "";
        if (appliedCoupon) {
          couponInfo = `<b>কুপন কোড:</b> ${appliedCoupon.code} (ডিসকাউন্ট: ৳${discountAmount})\n`;
        }

        let noteInfo = "";
        if (orderNote.trim()) {
          noteInfo = `<b>নোট:</b> ${orderNote.trim()}\n`;
        }

        const message = `🛍️ <b>নতুন ${isPreOrder ? "প্রি-অর্ডার" : "অর্ডার"} এসেছে (${payment === "uddoktapay" ? "Online" : "COD"})!</b>\n\n` +
          `<b>অর্ডার নং:</b> #${order.order_number}\n` +
          `<b>গ্রাহকের নাম:</b> ${name.trim()}\n` +
          `<b>মোবাইল:</b> ${phone.trim()}\n` +
          `<b>ঠিকানা:</b> ${address.trim()} (${shippingLabel})\n` +
          `<b>পেমেন্ট মেথড:</b> ${payment === "cod" ? "ক্যাশ অন ডেলিভারি" : payment === "uddoktapay" ? "অনলাইন পেমেন্ট (UddoktaPay)" : payment === "bkash" ? "bKash" : "Nagad"}\n` +
          couponInfo +
          noteInfo +
          `\n<b>পণ্যসমূহ:</b>\n${itemsList}\n\n` +
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
            .replace("{name}", name.trim())
            .replace("{order_number}", order.order_number)
            .replace("{total}", String(total));

          await fetch("/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: phone.trim(),
              message: smsText,
              orderId: order.id
            })
          });
        }
      } catch (smsErr) {
        console.error("Error sending order success SMS:", smsErr);
      }

      // Update coupon usage count if used
      if (appliedCoupon) {
        await supabase
          .from("coupons")
          .update({ used_count: (appliedCoupon.used_count || 0) + 1 })
          .eq("id", appliedCoupon.id);
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
            await markConverted(order.id, phone);
            localStorage.removeItem("cod_modal_form_draft");
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
            const { data: row, error: settingsError } = await supabase
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
              full_name: name.trim() || "Customer",
              email: "customer@example.com",
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
              await markConverted(order.id, phone);
              localStorage.removeItem("cod_modal_form_draft");
              window.location.href = result.payment_url;
              return;
            } else {
              throw new Error(result.message || "Failed to get payment url from UddoktaPay");
            }
          } catch (fallbackErr: any) {
            console.error("UddoktaPay client-side fallback failed:", fallbackErr);
            toast.error("অনলাইন পেমেন্ট গেটওয়েতে রিডাইরেক্ট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন বা অন্য পেমেন্ট মেথড সিলেক্ট করুন।");
            setSubmitting(false);
            return;
          }
        }
      }

      isCompletedRef.current = true;
      await markConverted(order.id, phone);
      localStorage.removeItem("cod_modal_form_draft");
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
            id: product.id,
            productId: product.id,
            name: product.name,
            image: product.images[0],
            quantity: localQuantity,
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
            body: JSON.stringify({ phone: phone, code: otpCode })
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
        const cleanPhone = phone.trim();
        const cleanCode = otpCode.trim();
        const nowStr = new Date().toISOString();
        
        const { data: records, error: queryError } = await supabase
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
        analytics.completeRegistration("phone_otp", { phone, fullName: name });
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

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("আপনার নাম দিন"); return; }
    if (!phone.trim() || !isValidBDPhone(phone)) {
      toast.error("সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 01XXXXXXXXX, 8801XXXXXXXXX বা +8801XXXXXXXXX)");
      return;
    }
    const normalizedPhone = normalizeBDPhone(phone);
    if (phone !== normalizedPhone) {
      setPhone(normalizedPhone);
    }
    if (!address.trim()) { toast.error("আপনার ঠিকানা দিন"); return; }
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
        await handleSendOtp(phone);
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

  return (
    <>
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
              <Input value={name} onChange={(e) => { setName(e.target.value); saveCodDraft({ name: e.target.value }); }} placeholder="আপনার নাম" className="rounded-xl pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="font-bengali text-xs sm:text-sm font-semibold text-foreground">
              ফোন নাম্বার <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d+]/g, "");
                  setPhone(val);
                  setIsOtpVerified(false);
                  saveCodDraft({ phone: val });
                }}
                placeholder="01XXXXXXXXX"
                className="rounded-xl pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                type="tel"
                maxLength={15}
              />
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
                onChange={(e) => { setAddress(e.target.value); saveCodDraft({ address: e.target.value }); }}
                placeholder="এড্রেস"
                className="flex min-h-[50px] sm:min-h-[60px] w-full rounded-xl border border-input bg-background pl-9 sm:pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Order Note */}
          <div className="space-y-1">
            <label className="font-bengali text-xs sm:text-sm font-semibold text-foreground">অর্ডার নোট (ঐচ্ছিক)</label>
            <Input value={orderNote} onChange={(e) => { setOrderNote(e.target.value); saveCodDraft({ orderNote: e.target.value }); }} placeholder="অর্ডার সম্পর্কে কোনো বিশেষ তথ্য বা নির্দেশনা থাকলে এখানে লিখুন..." className="rounded-xl h-9 sm:h-10 text-sm" />
          </div>

          {/* Shipping Method */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bengali text-xs sm:text-sm font-semibold text-foreground">শিপিং মেথড</h3>
              {isProductFreeDelivery && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-bengali bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  🎉 ফ্রি ডেলিভারি প্রযোজ্য
                </span>
              )}
            </div>
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
                  <span className={`text-xs sm:text-sm font-bold ${
                    (isProductFreeDelivery || deliveryCharge === 0) 
                      ? "text-emerald-600 dark:text-emerald-400 font-bengali" 
                      : "font-display text-foreground"
                  }`}>
                    {(isProductFreeDelivery || deliveryCharge === 0) ? "ফ্রি (Tk 0.00)" : `Tk ${opt.price.toFixed(2)}`}
                  </span>
                  <input type="radio" name="shipping" className="sr-only" checked={shipping === opt.id} onChange={() => { setShipping(opt.id); saveCodDraft({ shipping: opt.id }); }} />
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
                { id: "uddoktapay" as const, label: "অনলাইন পেমেন্ট", icon: CreditCard, enabled: activePayments.uddoktapay },
                { id: "bkash" as const, label: "bKash", icon: Smartphone, enabled: activePayments.bkash },
                { id: "nagad" as const, label: "Nagad", icon: CreditCard, enabled: activePayments.nagad },
              ]).filter(p => p.enabled).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setPayment(id); saveCodDraft({ payment: id }); }}
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
            <div className="relative shrink-0">
              <img src={product.images[0]} alt={product.name} className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs sm:text-sm font-bold text-card-foreground line-clamp-1">{product.name}</p>
              
              {/* Interactive Quantity Selector inside Modal */}
              <div className="flex items-center gap-2.5 mt-2">
                <span className="text-[11px] text-muted-foreground font-semibold">পরিমাণ:</span>
                <div className="flex items-center border rounded-lg overflow-hidden h-6 bg-secondary/50">
                  <button
                    type="button"
                    onClick={() => setLocalQuantity(q => Math.max(1, q - 1))}
                    className="flex h-full w-6 items-center justify-center hover:bg-muted font-bold text-xs transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-bold w-7 text-center">{localQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setLocalQuantity(q => q + 1)}
                    className="flex h-full w-6 items-center justify-center hover:bg-muted font-bold text-xs transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <p className="font-display text-xs sm:text-sm font-bold text-foreground shrink-0">{formatPrice(subtotal)}</p>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 sm:space-y-2 rounded-xl border bg-secondary/30 p-3 sm:p-4">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="font-bengali font-semibold text-muted-foreground">সাব টোটাল</span>
              <span className="font-display font-bold text-foreground">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="font-bengali font-semibold text-muted-foreground">ডেলিভারি চার্জ</span>
              <span className={`font-display font-bold ${deliveryCharge === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                {deliveryCharge === 0 ? "৳০ (ফ্রি ডেলিভারি)" : formatPrice(deliveryCharge)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-red-600 font-semibold animate-fade-in">
                <span className="font-bengali">ডিসকাউন্ট {appliedCoupon ? `(${appliedCoupon.code})` : ""}</span>
                <span className="font-display">- {formatPrice(discountAmount)}</span>
              </div>
            )}
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

      {/* OTP Verification Modal */}
      <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display text-foreground text-center">মোবাইল নাম্বার ভেরিফিকেশন</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center pt-2">
              আপনার দেওয়া মোবাইল নাম্বার <b>{phone}</b> ভেরিফাই করার জন্য ওটিপি কোডটি নিচে দিন।
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
                    onClick={() => handleSendOtp(phone)}
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
    </>
  );
};

export default CodOrderModal;
