import { describe, it, expect } from "vitest";

// Ported logic from IncompleteOrderConvertModal to test phone validation and pricing in isolation
const bdPhoneRegex = /^(01[3-9]\d{8})$/;

interface ProductInfo {
  name: string;
  price: number;
  quantity: number;
}

function calculatePricing(products: ProductInfo[], shippingType: "dhaka" | "outside") {
  const subtotal = products.reduce((s, p) => s + p.price * (p.quantity || 1), 0);
  const deliveryCharge = shippingType === "dhaka" ? 70 : 130;
  const total = subtotal + deliveryCharge;
  return { subtotal, deliveryCharge, total };
}

function generateTelegramMessage({
  orderNumber,
  name,
  phone,
  address,
  shippingLabel,
  products,
  subtotal,
  deliveryCharge,
  total,
}: {
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  shippingLabel: string;
  products: ProductInfo[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
}) {
  const itemsList = products
    .map((p) => `• ${p.name} (Qty: ${p.quantity || 1}) - ৳${p.price * (p.quantity || 1)}`)
    .join("\n");

  return `🔄 <b>অর্ডার কনভার্ট করা হয়েছে (ইনকমপ্লিট থেকে)!</b>\n\n` +
    `<b>অর্ডার নং:</b> #${orderNumber}\n` +
    `<b>গ্রাহকের নাম:</b> ${name.trim()}\n` +
    `<b>মোবাইল:</b> ${phone.trim()}\n` +
    `<b>ঠিকানা:</b> ${address.trim()} (${shippingLabel})\n` +
    `<b>পেমেন্ট মেথড:</b> ক্যাশ অন ডেলিভারি\n\n` +
    `<b>পণ্যসমূহ:</b>\n${itemsList}\n\n` +
    `<b>সাবটোটাল:</b> ৳${subtotal}\n` +
    `<b>ডেলিভারি চার্জ:</b> ৳${deliveryCharge}\n` +
    `<b>সর্বমোট পরিমাণ:</b> ৳${total}`;
}

describe("Incomplete Orders Admin Feature Verification", () => {
  describe("Phone Number Validation", () => {
    it("should accept valid Bangladeshi mobile numbers", () => {
      expect(bdPhoneRegex.test("01796463912")).toBe(true);
      expect(bdPhoneRegex.test("01912345678")).toBe(true);
      expect(bdPhoneRegex.test("01312345678")).toBe(true);
      expect(bdPhoneRegex.test("01800000000")).toBe(true);
    });

    it("should reject invalid mobile numbers", () => {
      expect(bdPhoneRegex.test("1796463912")).toBe(false); // short
      expect(bdPhoneRegex.test("01296463912")).toBe(false); // 012 is not valid in BD (only 3-9)
      expect(bdPhoneRegex.test("017964639123")).toBe(false); // long
      expect(bdPhoneRegex.test("0179646391a")).toBe(false); // non-digits
      expect(bdPhoneRegex.test("")).toBe(false);
    });
  });

  describe("Pricing Calculations", () => {
    const products: ProductInfo[] = [
      { name: "Product A", price: 850, quantity: 1 },
      { name: "Product B", price: 150, quantity: 2 },
    ];

    it("should calculate correct totals for inside Dhaka", () => {
      const { subtotal, deliveryCharge, total } = calculatePricing(products, "dhaka");
      expect(subtotal).toBe(1150); // 850 + 300
      expect(deliveryCharge).toBe(70);
      expect(total).toBe(1220);
    });

    it("should calculate correct totals for outside Dhaka", () => {
      const { subtotal, deliveryCharge, total } = calculatePricing(products, "outside");
      expect(subtotal).toBe(1150);
      expect(deliveryCharge).toBe(130);
      expect(total).toBe(1280);
    });
  });

  describe("Telegram Notification Message formatting", () => {
    it("should format message correctly", () => {
      const products = [{ name: "Acrylic Key Holder", price: 850, quantity: 1 }];
      const pricing = calculatePricing(products, "dhaka");
      const msg = generateTelegramMessage({
        orderNumber: "1001",
        name: "mopkarrom",
        phone: "01796463912",
        address: "Mirpur 10",
        shippingLabel: "ঢাকা সিটির ভিতরে",
        products,
        ...pricing,
      });

      expect(msg).toContain("🔄 <b>অর্ডার কনভার্ট করা হয়েছে (ইনকমপ্লিট থেকে)!</b>");
      expect(msg).toContain("<b>অর্ডার নং:</b> #1001");
      expect(msg).toContain("<b>মোবাইল:</b> 01796463912");
      expect(msg).toContain("<b>ডেলিভারি চার্জ:</b> ৳70");
      expect(msg).toContain("<b>সর্বমোট পরিমাণ:</b> ৳920");
    });
  });
});
