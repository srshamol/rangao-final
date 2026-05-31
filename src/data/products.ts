import appleWatchImg from "@/assets/products/apple-watch-ultra-2.jpg";
import samsungWatchImg from "@/assets/products/samsung-galaxy-watch-6.jpg";
import sonyEarbudsImg from "@/assets/products/sony-wf-1000xm5.jpg";
import airpodsImg from "@/assets/products/airpods-pro-2.jpg";
import ankerImg from "@/assets/products/anker-powercore-26800.jpg";
import samsungBatteryImg from "@/assets/products/samsung-wireless-battery.jpg";
import echoDotImg from "@/assets/products/echo-dot-5.jpg";
import nestMiniImg from "@/assets/products/google-nest-mini.jpg";

export type Category = "smartwatch" | "earphone" | "powerbank" | "smarthome";

export interface Product {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  price: number;
  originalPrice?: number;
  category: Category;
  categoryLabel: string;
  images: string[];
  specs: { label: string; value: string }[];
  stock: number;
  featured: boolean;
  rating: number;
  reviewCount: number;
}

export const categories: { id: Category; name: string; icon: string }[] = [
  { id: "smartwatch", name: "স্মার্ট ওয়াচ", icon: "Watch" },
  { id: "earphone", name: "ওয়্যারলেস ইয়ারফোন", icon: "Headphones" },
  { id: "powerbank", name: "পাওয়ার ব্যাংক", icon: "BatteryCharging" },
  { id: "smarthome", name: "স্মার্ট হোম", icon: "Home" },
];

export const products: Product[] = [
  {
    id: "sw-001",
    name: "Apple Watch Ultra 2",
    shortDescription: "প্রিমিয়াম টাইটানিয়াম স্মার্টওয়াচ",
    fullDescription: "Apple Watch Ultra 2 হলো Apple-এর সবচেয়ে শক্তিশালী এবং টেকসই স্মার্টওয়াচ। টাইটানিয়াম কেসিং, ডুয়াল-ফ্রিকোয়েন্সি GPS, এবং 36 ঘণ্টা পর্যন্ত ব্যাটারি লাইফ সহ এটি অ্যাডভেঞ্চার প্রেমীদের জন্য আদর্শ।",
    features: [
      "অসাধারণ টেকসইতা: গ্রেড-৫ টাইটানিয়াম কেস যা হালকা হওয়ার পাশাপাশি অত্যন্ত মজবুত।",
      "সবচেয়ে উজ্জ্বল ডিসপ্লে: 3000 নিট পর্যন্ত উজ্জ্বলতা, সরাসরি সূর্যের আলোতেও স্পষ্ট দেখা যায়।",
      "প্রিসিশন ডুয়াল-ফ্রিকোয়েন্সি GPS: ঘন জঙ্গল বা শহরের মধ্যেও নির্ভুল লোকেশন ট্র্যাকিং।",
      "দীর্ঘ ব্যাটারি লাইফ: সাধারণ ব্যবহারে ৩৬ ঘণ্টা এবং লো পাওয়ার মোডে ৭২ ঘণ্টা পর্যন্ত।",
    ],
    price: 89999,
    originalPrice: 95000,
    category: "smartwatch",
    categoryLabel: "স্মার্ট ওয়াচ",
    images: [appleWatchImg, appleWatchImg, appleWatchImg, appleWatchImg, appleWatchImg],
    specs: [
      { label: "ডিসপ্লে", value: "49mm Always-On Retina LTPO OLED" },
      { label: "ব্যাটারি", value: "৩৬ ঘণ্টা (সাধারণ ব্যবহার)" },
      { label: "ওয়াটার রেজিস্ট্যান্স", value: "100m / EN13319" },
      { label: "প্রসেসর", value: "S9 SiP" },
      { label: "স্টোরেজ", value: "64GB" },
    ],
    stock: 5,
    featured: true,
    rating: 4.9,
    reviewCount: 2340,
  },
  {
    id: "sw-002",
    name: "Samsung Galaxy Watch 6 Classic",
    shortDescription: "ক্লাসিক ডিজাইনের স্মার্টওয়াচ",
    fullDescription: "Samsung Galaxy Watch 6 Classic তার রোটেটিং বেজেল ডিজাইনের জন্য বিখ্যাত। Wear OS চালিত, BioActive সেন্সর সহ স্বাস্থ্য মনিটরিং এবং স্টাইলিশ লুকের এক অনন্য সমন্বয়।",
    features: [
      "ক্লাসিক রোটেটিং বেজেল: সহজে নেভিগেট করুন, ঠিক যেন একটি ঐতিহ্যবাহী ঘড়ি ব্যবহার করছেন।",
      "BioActive সেন্সর: হার্ট রেট, ব্লাড প্রেশার, এবং বডি কম্পোজিশন মনিটর করুন।",
      "দীর্ঘস্থায়ী ব্যাটারি: একবার চার্জে ৪০ ঘণ্টারও বেশি ব্যবহার করুন।",
    ],
    price: 34999,
    category: "smartwatch",
    categoryLabel: "স্মার্ট ওয়াচ",
    images: [samsungWatchImg, samsungWatchImg, samsungWatchImg, samsungWatchImg, samsungWatchImg],
    specs: [
      { label: "ডিসপ্লে", value: "47mm Super AMOLED" },
      { label: "ব্যাটারি", value: "৪০+ ঘণ্টা" },
      { label: "OS", value: "Wear OS 4" },
      { label: "সেন্সর", value: "BioActive Sensor" },
    ],
    stock: 12,
    featured: true,
    rating: 4.7,
    reviewCount: 1850,
  },
  {
    id: "ep-001",
    name: "Sony WF-1000XM5",
    shortDescription: "আল্টিমেট নয়েজ ক্যান্সেলিং ইয়ারবাড",
    fullDescription: "Sony WF-1000XM5 বিশ্বের সেরা নয়েজ ক্যান্সেলিং ট্রু ওয়্যারলেস ইয়ারবাড। LDAC, DSEE Extreme, এবং মাল্টিপয়েন্ট কানেকশন সহ এটি অডিওফাইলদের জন্য তৈরি।",
    features: [
      "নিখুঁত শব্দ অভিজ্ঞতা: Sony-র ডুয়াল প্রসেসর প্রযুক্তি প্রতিটি নোটকে স্পষ্ট করে তোলে।",
      "সারাদিন আরাম: হালকা ওজনের ডিজাইন এবং নরম ইয়ারটিপস আপনার কানে চাপ অনুভব করতে দেয় না।",
      "ইন্ডাস্ট্রি-লিডিং ANC: চারপাশের গোলমাল সম্পূর্ণ বন্ধ করে নিজের জগতে ডুবে যান।",
      "হাই-রেজ অডিও: LDAC কোডেক সহ স্টুডিও-কোয়ালিটি সাউন্ড উপভোগ করুন।",
    ],
    price: 25000,
    category: "earphone",
    categoryLabel: "ওয়্যারলেস ইয়ারফোন",
    images: [sonyEarbudsImg, sonyEarbudsImg, sonyEarbudsImg, sonyEarbudsImg, sonyEarbudsImg],
    specs: [
      { label: "ড্রাইভার", value: "8.4mm Dynamic" },
      { label: "ANC", value: "Industry Leading" },
      { label: "ব্যাটারি", value: "8 ঘণ্টা (ANC On)" },
      { label: "ব্লুটুথ", value: "5.3" },
      { label: "কোডেক", value: "LDAC, AAC, SBC" },
    ],
    stock: 3,
    featured: true,
    rating: 4.8,
    reviewCount: 3200,
  },
  {
    id: "ep-002",
    name: "AirPods Pro (2nd Gen)",
    shortDescription: "অ্যাডাপ্টিভ অডিও সহ প্রিমিয়াম ইয়ারবাড",
    fullDescription: "AirPods Pro 2nd Generation এ রয়েছে H2 চিপ, অ্যাডাপ্টিভ অডিও, পার্সোনালাইজড স্প্যাশিয়াল অডিও এবং USB-C চার্জিং। Apple ইকোসিস্টেমের জন্য সেরা।",
    features: [
      "অ্যাডাপ্টিভ অডিও: পরিবেশ অনুযায়ী স্বয়ংক্রিয়ভাবে সাউন্ড অ্যাডজাস্ট করে।",
      "পার্সোনালাইজড স্প্যাশিয়াল অডিও: আপনার কানের গঠন অনুযায়ী 3D সাউন্ড তৈরি করে।",
      "MagSafe ও USB-C চার্জিং: চার্জিং কেসে ওয়্যারলেস ও ওয়্যার্ড দুটোই সাপোর্ট করে।",
    ],
    price: 22999,
    category: "earphone",
    categoryLabel: "ওয়্যারলেস ইয়ারফোন",
    images: [airpodsImg, airpodsImg, airpodsImg, airpodsImg, airpodsImg],
    specs: [
      { label: "চিপ", value: "Apple H2" },
      { label: "ANC", value: "অ্যাডাপ্টিভ ট্রান্সপারেন্সি" },
      { label: "ব্যাটারি", value: "6 ঘণ্টা (ANC On)" },
      { label: "চার্জিং", value: "USB-C, MagSafe, Qi" },
    ],
    stock: 8,
    featured: true,
    rating: 4.7,
    reviewCount: 5600,
  },
  {
    id: "pb-001",
    name: "Anker PowerCore 26800mAh",
    shortDescription: "হাই-ক্যাপাসিটি পাওয়ার ব্যাংক",
    fullDescription: "Anker PowerCore 26800mAh পাওয়ার ব্যাংক দিয়ে আপনার ফোন ৬ বারেরও বেশি চার্জ করুন। ডুয়াল ইনপুট, ট্রিপল আউটপুট এবং PowerIQ টেকনোলজি সহ।",
    features: [
      "বিশাল ক্যাপাসিটি: 26800mAh দিয়ে iPhone ৬+ বার ও iPad ২+ বার চার্জ করুন।",
      "PowerIQ টেকনোলজি: ডিভাইস শনাক্ত করে সর্বোচ্চ দ্রুততায় চার্জ করে।",
      "তিনটি আউটপুট: একসাথে ৩টি ডিভাইস চার্জ করুন।",
    ],
    price: 4500,
    category: "powerbank",
    categoryLabel: "পাওয়ার ব্যাংক",
    images: [ankerImg, ankerImg, ankerImg, ankerImg, ankerImg],
    specs: [
      { label: "ক্যাপাসিটি", value: "26800mAh" },
      { label: "আউটপুট", value: "3x USB-A (3A max)" },
      { label: "ইনপুট", value: "Micro-USB + USB-C" },
      { label: "ওজন", value: "495g" },
    ],
    stock: 20,
    featured: false,
    rating: 4.5,
    reviewCount: 890,
  },
  {
    id: "pb-002",
    name: "Samsung 25W Wireless Battery Pack",
    shortDescription: "ওয়্যারলেস চার্জিং পাওয়ার ব্যাংক",
    fullDescription: "Samsung 25W Wireless Battery Pack এ রয়েছে 10,000mAh ক্যাপাসিটি, 25W সুপার ফাস্ট চার্জিং এবং Qi ওয়্যারলেস চার্জিং সাপোর্ট।",
    features: [
      "ওয়্যারলেস চার্জিং: ফোন রাখলেই চার্জ শুরু, কোনো তার লাগবে না।",
      "25W সুপার ফাস্ট চার্জিং: USB-C দিয়ে দ্রুত চার্জ করুন।",
      "স্লিম ও স্টাইলিশ ডিজাইন: পকেটে বা ব্যাগে সহজে বহনযোগ্য।",
    ],
    price: 5999,
    originalPrice: 6999,
    category: "powerbank",
    categoryLabel: "পাওয়ার ব্যাংক",
    images: [samsungBatteryImg, samsungBatteryImg, samsungBatteryImg, samsungBatteryImg, samsungBatteryImg],
    specs: [
      { label: "ক্যাপাসিটি", value: "10,000mAh" },
      { label: "ওয়্যারলেস", value: "Qi 15W" },
      { label: "ফাস্ট চার্জ", value: "25W USB-C PD" },
    ],
    stock: 15,
    featured: true,
    rating: 4.6,
    reviewCount: 1200,
  },
  {
    id: "sh-001",
    name: "Amazon Echo Dot (5th Gen)",
    shortDescription: "Alexa সহ স্মার্ট স্পিকার",
    fullDescription: "Amazon Echo Dot 5th Gen এ রয়েছে উন্নত অডিও কোয়ালিটি, বিল্ট-ইন তাপমাত্রা সেন্সর, এবং Alexa ভয়েস কন্ট্রোল। আপনার স্মার্ট হোমের কেন্দ্রবিন্দু।",
    features: [
      "উন্নত সাউন্ড: আগের প্রজন্মের চেয়ে অনেক ভালো অডিও কোয়ালিটি।",
      "স্মার্ট হোম হাব: হাজারো স্মার্ট ডিভাইস কন্ট্রোল করুন ভয়েস কমান্ডে।",
      "বিল্ট-ইন সেন্সর: ঘরের তাপমাত্রা মনিটর করুন এবং অটোমেশন সেটআপ করুন।",
    ],
    price: 4999,
    category: "smarthome",
    categoryLabel: "স্মার্ট হোম",
    images: [echoDotImg, echoDotImg, echoDotImg, echoDotImg, echoDotImg],
    specs: [
      { label: "অ্যাসিস্ট্যান্ট", value: "Amazon Alexa" },
      { label: "স্পিকার", value: "1.73\" Full-Range" },
      { label: "কানেক্টিভিটি", value: "Wi-Fi, Bluetooth 5.0" },
      { label: "সেন্সর", value: "তাপমাত্রা" },
    ],
    stock: 10,
    featured: true,
    rating: 4.4,
    reviewCount: 4500,
  },
  {
    id: "sh-002",
    name: "Google Nest Mini",
    shortDescription: "Google Assistant স্মার্ট স্পিকার",
    fullDescription: "Google Nest Mini দিয়ে আপনার বাড়িকে স্মার্ট করুন। Google Assistant দিয়ে লাইট নিয়ন্ত্রণ, মিউজিক প্লে, এবং প্রশ্নের উত্তর পান।",
    features: [
      "Google Assistant: প্রশ্ন করুন, মিউজিক চালান, রিমাইন্ডার সেট করুন — সব ভয়েসে।",
      "কমপ্যাক্ট ডিজাইন: যেকোনো ঘরে সুন্দরভাবে মানানসই।",
      "মাল্টি-রুম অডিও: একাধিক স্পিকার জুড়ে একই গান চালান।",
    ],
    price: 3999,
    category: "smarthome",
    categoryLabel: "স্মার্ট হোম",
    images: [nestMiniImg, nestMiniImg, nestMiniImg, nestMiniImg, nestMiniImg],
    specs: [
      { label: "অ্যাসিস্ট্যান্ট", value: "Google Assistant" },
      { label: "স্পিকার", value: "40mm Driver" },
      { label: "কানেক্টিভিটি", value: "Wi-Fi, Bluetooth 5.0" },
    ],
    stock: 0,
    featured: false,
    rating: 4.3,
    reviewCount: 3100,
  },
];

export const WHATSAPP_NUMBER = "8801XXXXXXXXX";
export const PHONE_NUMBER = "+8801XXXXXXXXX";

export function getWhatsAppLink(productName?: string) {
  const message = productName
    ? `হ্যালো, আমি ${productName} সম্পর্কে জানতে চাই।`
    : "হ্যালো, আমি GadgetGram থেকে একটি প্রোডাক্ট সম্পর্কে জানতে চাই।";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function formatPrice(price: number) {
  return `৳${price.toLocaleString("bn-BD")}`;
}

export function getStockLabel(stock: number) {
  if (stock === 0) return { text: "স্টক আউট", color: "text-destructive" };
  if (stock <= 5) return { text: `মাত্র ${stock}টি বাকি`, color: "text-destructive" };
  return { text: "স্টকে আছে", color: "text-success" };
}

export function getCategoryLabel(category: Category) {
  return categories.find((c) => c.id === category)?.name ?? category;
}
