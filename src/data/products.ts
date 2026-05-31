export type Category = 
  | "wall_canvas" 
  | "key_holder" 
  | "wooden_decor" 
  | "nikahnama" 
  | "acrylic_decor" 
  | "led_decor" 
  | "baby_frame" 
  | "natural_canvas";

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
  { id: "wall_canvas", name: "ইসলামিক ওয়াল ক্যানভাস", icon: "Image" },
  { id: "key_holder", name: "কাঠের কি-হোল্ডার", icon: "Key" },
  { id: "wooden_decor", name: "কাঠের ডেকোর", icon: "Sparkles" },
  { id: "nikahnama", name: "নিকাহনামা ক্যানভাস", icon: "Heart" },
  { id: "acrylic_decor", name: "এক্রিলিক ডেকোর", icon: "Layers" },
  { id: "led_decor", name: "এলইডি ডেকোর", icon: "Lightbulb" },
  { id: "baby_frame", name: "বেবি বার্থ ফ্রেম", icon: "Gift" },
  { id: "natural_canvas", name: "ন্যাচারাল ক্যানভাস", icon: "Palette" },
];

export const products: Product[] = [
  {
    id: "wc-001",
    name: "Ayatul Kursi Wooden Wall Art",
    shortDescription: "অভিজাত ক্যালিগ্রাফি কাঠের ৩ডি ওয়াল আর্ট",
    fullDescription: "রাঙাও ক্যানভাস সিরিজের প্রিমিয়াম আয়াতুল কুরসি কাঠের ওয়াল আর্টটি আপনার ড্রয়িং রুম বা বেডরুমের দেয়ালে ইসলামিক নান্দনিকতা যোগ করবে। প্রিমিয়াম ফিনিশিং, নিখুঁত লেজার কাটিং এবং দীর্ঘস্থায়ী কাঠ ব্যবহার করে এটি তৈরি করা হয়েছে।",
    features: [
      "প্রিমিয়াম ফিনিশিং: উন্নত মানের ৮মিমি আমদানিকৃত পাইন কাঠের ক্যালিগ্রাফি।",
      "৩ডি ডেপথ ইফেক্ট: দেয়াল থেকে চমৎকারভাবে প্রজেক্ট করা থাকে, যা দেখতে খুবই চোখ ধাঁধানো দেখায়।",
      "নিখুঁত লেজার কাটিং: সর্বাধুনিক লেজার মেশিনের মাধ্যমে প্রতিটি হরফ অত্যন্ত নিখুঁতভাবে কাটা হয়েছে।",
      "সহজ ইনস্টলেশন: দেয়ালে ঝুলানোর জন্য পেছনে বিশেষ হুক বা স্ট্রং ডাবল-সাইড গ্লু মাউন্টিং যুক্ত।",
    ],
    price: 3450,
    originalPrice: 4200,
    category: "wall_canvas",
    categoryLabel: "ইসলামিক ওয়াল ক্যানভাস",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "উপাদান", value: "আমদানিকৃত প্রিমিয়াম পাইন উড (৮মিমি)" },
      { label: "সাইজ", value: "২৪ x ৩৬ ইঞ্চি এবং ৩৬ x ৪৮ ইঞ্চি" },
      { label: "ফিনিশিং", value: "ম্যাট এবং অ্যান্টি-স্ক্র্যাচ কোটিং" },
      { label: "ডিজাইন", value: "মডার্ন ৩ডি ইসলামিক ক্যালিগ্রাফি" },
      { label: "ইনস্টলেশন", value: "হ্যাংগিং হুকস এবং ডাবল মাউন্টিং টেপ" },
    ],
    stock: 12,
    featured: true,
    rating: 4.9,
    reviewCount: 340,
  },
  {
    id: "kh-001",
    name: "Wooden Bismillah Key Holder",
    shortDescription: "বিসমিল্লাহ খোদাই করা প্রিমিয়াম কাঠের চাবির রিং হোল্ডার",
    fullDescription: "রাঙাও কাঠের কি-হোল্ডার কালেকশনের একটি প্রিমিয়াম ঘর সাজানোর সামগ্রী। এটি আপনার দরজার পাশে দেয়ালে স্থাপন করতে পারেন যা আপনার চাবিগুলো গুছিয়ে রাখার পাশাপাশি ঘরের সৌন্দর্য বৃদ্ধি করবে।",
    features: [
      "প্রিমিয়াম পাইন উড ব্যাকবোর্ড ও মেটাল কপার প্লেটেড হুকস।",
      "লেজার এনগ্রেভিং পদ্ধতিতে অত্যন্ত চমৎকার 'বিসমিল্লাহ' ক্যালিগ্রাফি ফুটিয়ে তোলা হয়েছে।",
      "৫টি মেটাল হুক চাবি ঝুলানোর জন্য যা ভারী চাবির রিংও ধরে রাখতে সক্ষম।",
    ],
    price: 850,
    originalPrice: 1100,
    category: "key_holder",
    categoryLabel: "কাঠের কি-হোল্ডার",
    images: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "উপাদান", value: "সেগুন কাঠ ও কপার হুকস" },
      { label: "সাইজ", value: "১২ x ৬ ইঞ্চি" },
      { label: "হুক সংখ্যা", value: "৫টি হেভি ডিউটি হুকস" },
    ],
    stock: 25,
    featured: true,
    rating: 4.8,
    reviewCount: 156,
  },
  {
    id: "wd-001",
    name: "Geometric Wooden Quran Stand",
    shortDescription: "ফোল্ডিং ডিজাইনের প্রিমিয়াম কাঠের রেহাল",
    fullDescription: "পবিত্র কুরআন তিলাওয়াত করার জন্য সম্পূর্ণ হাতে খোদাইকৃত ও বার্নিশ করা প্রিমিয়াম রেহাল। এর জিওমেট্রিক আকৃতির খোদাই নকশা ও চমৎকার ফিনিশিং একে অন্যান্য রেহাল থেকে অনন্য করে তোলে।",
    features: [
      "উন্নত মানের মেহগনি কাঠ দিয়ে তৈরি এবং সম্পূর্ণ প্রিমিয়াম ফিনিশড।",
      "ফোল্ডেবল ডিজাইন, সহজে যেকোনো জায়গায় বহন ও সংরক্ষণযোগ্য।",
      "জিহাদ এবং জ্যামিতিক নকশার প্রিমিয়াম অ্যান্টিক ফিনিশিং।",
    ],
    price: 1850,
    originalPrice: 2200,
    category: "wooden_decor",
    categoryLabel: "কাঠের ডেকোর",
    images: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "কাঠের ধরন", value: "প্রিমিয়াম মেহগনি উড" },
      { label: "ডিজাইন", value: "জিওমেট্রিক কার্ভিং অ্যান্ড অ্যান্টিক বার্নিশ" },
      { label: "ওজন", value: "৮৫০ গ্রাম" },
    ],
    stock: 8,
    featured: true,
    rating: 4.7,
    reviewCount: 98,
  },
  {
    id: "nk-001",
    name: "Royal Golden Nikahnama Canvas",
    shortDescription: "প্রিমিয়াম মেটালিক গোল্ড ফয়েল সম্বলিত নিকাহনামা ক্যানভাস",
    fullDescription: "আপনার জীবনের বিশেষ দিনটিকে স্মরণীয় করে রাখতে রাঙাও-এর প্রিমিয়াম রয়্যাল গোল্ডেন নিকাহনামা ক্যানভাস। প্রিমিয়াম আর্ট ক্যানভাসের ওপর কাস্টম গোল্ড ফয়েলিং ও নিখুঁত ক্যালিগ্রাফির অসাধারণ নান্দনিকতা।",
    features: [
      "পার্সোনালাইজড ডিজাইন: কাস্টম নাম, সাইন এবং বিবাহের তারিখ যুক্ত করার সুবিধা।",
      "রিয়েল গোল্ড ফয়েল শাইন: আলোতে চকচক করা প্রিমিয়াম মেটালিক গোল্ডেন ফিনিশ।",
      "প্রিমিয়াম ক্যানভাস টেক্সচার: শত বছরেও বিবর্ণ হবে না এমন হাই-রেজুলিউশন প্রিন্ট।",
    ],
    price: 2450,
    originalPrice: 3200,
    category: "nikahnama",
    categoryLabel: "নিকাহনামা ক্যানভাস",
    images: [
      "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "প্রিন্ট টাইপ", value: "রিয়েল ফয়েলিং ও মেটালিক পিগমেন্ট প্রিন্ট" },
      { label: "ক্যানভাস মিডিয়া", value: "৩৮০ জিএসএম কটন ক্যানভাস" },
      { label: "কাস্টমাইজেশন", value: "বর-কনে নাম, তারিখ ও স্বাক্ষর প্যানেল" },
    ],
    stock: 15,
    featured: true,
    rating: 5.0,
    reviewCount: 412,
  },
  {
    id: "ad-001",
    name: "Acrylic Subhanallah Desk Decor",
    shortDescription: "মিরর গোল্ডেন এক্রিলিক মডার্ন ডেস্ক শো-পিস",
    fullDescription: "অফিস ডেস্ক, স্টাডি টেবিল কিংবা ড্রয়িং রুমের কেবিনেট সাজাতে প্রিমিয়াম কোয়ালিটির মিরর এক্রিলিক ডেকোর শো-পিস। মেহগনি কাঠের ওপর বসানো মিরর গোল্ড ফিনিশিং।",
    features: [
      "উচ্চ মানের ৩মিমি মিরর এক্রিলিক যা হুবহু কাচের মতো স্বচ্ছ ও উজ্জ্বল।",
      "ভারী ও নিখুঁত ফিনিশিং এর মেহগনি কাঠের স্ট্যান্ড বেস।",
      "সহজে পরিষ্কার করা যায় এবং স্ক্র্যাচ-প্রতিরোধী প্রলেপ যুক্ত।",
    ],
    price: 1250,
    originalPrice: 1500,
    category: "acrylic_decor",
    categoryLabel: "এক্রিলিক ডেকোর",
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "উপাদান", value: "রয়্যাল মিরর গোল্ডেন এক্রিলিক" },
      { label: "বেস", value: "মেহগনি উড বেস" },
      { label: "সাইজ", value: "৮ x ৮ ইঞ্চি" },
    ],
    stock: 20,
    featured: false,
    rating: 4.6,
    reviewCount: 78,
  },
  {
    id: "ld-001",
    name: "Warm LED Shahada Wall Ring",
    shortDescription: "নান্দনিক ওয়ার্ম এলইডি লাইট সম্বলিত শাহাদাহ ফ্রেম",
    fullDescription: "দেয়ালের জন্য প্রিমিয়াম এলইডি ইসলামিক ডেকোর। ব্যাকলিট ওয়ার্ম এলইডি লাইটের ব্যবহার যা রাত্রে চমৎকার একটি প্রশান্তিদায়ক পরিবেশ সৃষ্টি করে।",
    features: [
      "উষ্ণ ও আরামদায়ক ওয়ার্ম হোয়াইট ব্যাকলিট লাইটিং ইফেক্ট।",
      "আমদানিকৃত এক্রিলিক ও ফাইবার বডি রিং যা অত্যন্ত টেকসই ও লাইটওয়েট।",
      "কম বিদ্যুৎ খরচসম্পন্ন উন্নত লাইফটাইম এলইডি স্ট্রিপ।"
    ],
    price: 4999,
    originalPrice: 6500,
    category: "led_decor",
    categoryLabel: "এলইডি ডেকোর",
    images: [
      "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "বডি", value: "ম্যাট ব্ল্যাক পাউডার কোটেড মেটাল অ্যান্ড এক্রিলিক" },
      { label: "লাইটিং", value: "১২ ভোল্ট লো-ভোল্টেজ প্রিমিয়াম এলইডি" },
      { label: "পাওয়ার", value: "১২ভি অ্যাডাপ্টার সহ (প্যাকেজে অন্তর্ভুক্ত)" },
    ],
    stock: 6,
    featured: true,
    rating: 4.9,
    reviewCount: 225,
  },
  {
    id: "bf-001",
    name: "Floral Baby Birth Memory Frame",
    shortDescription: "শিশু জন্মের তথ্য সম্বলিত নান্দনিক কাস্টমাইজড মেমোরি ফ্রেম",
    fullDescription: "আপনার আদরের ছোট্ট সোনামণির জন্মের বিশেষ স্মৃতি আজীবন আগলে রাখতে তৈরি করুন এই ফ্রেমটি। এতে শিশুর নাম, জন্মতারিখ, সময়, ওজন ও মা-বাবার নাম সুন্দরভাবে যুক্ত করে নিতে পারবেন।",
    features: [
      "হাই-কোয়ালিটি গ্লসি আর্ট পেপার প্রিন্টিং এবং ম্যাট ফিনিশড ফ্রেম।",
      "শতভাগ কাস্টমাইজেশনের সুবিধা — শিশুর ছবি যুক্ত করার সুযোগ।",
      "উপহার দেয়ার জন্য চমৎকার প্রি-প্যাকেজড বক্স লাক্সারি রিবন ফিনিশ।"
    ],
    price: 1450,
    originalPrice: 1950,
    category: "baby_frame",
    categoryLabel: "বেবি বার্থ ফ্রেম",
    images: [
      "https://images.unsplash.com/photo-1519689680058-324335c77eb2?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "ফ্রেম মেটেরিয়াল", value: "ফাইবার বডি ও ফ্রন্ট কাচ" },
      { label: "প্রিন্ট কোয়ালিটি", value: "ম্যাট ৩০০ জিএসএম ফোটো পেপার" },
      { label: "সাইজ", value: "১০ x ১২ ইঞ্চি" },
    ],
    stock: 18,
    featured: true,
    rating: 4.8,
    reviewCount: 144,
  },
  {
    id: "nc-001",
    name: "Hand-painted Natural Canvas Art",
    shortDescription: "হাতে আঁকা ক্যানভাস পেইন্টিং ইসলামিক ও ল্যান্ডস্কেপ",
    fullDescription: "আমাদের পেশাদার শিল্পীদের দ্বারা সম্পূর্ণ হাতে আঁকা ক্যানভাস পেইন্টিং। এর প্রতিটি স্ট্রোক আপনার বসার ঘরকে করবে জীবন্ত এবং চমৎকার নান্দনিকতায় মুখরিত।",
    features: [
      "শতভাগ হাতে আঁকা অরিজিনাল আর্টওয়ার্ক (কোনো প্রিন্ট বা ক্যাটালগ নয়)।",
      "উচ্চ মানের অ্যাক্রিলিক অয়েল পেইন্ট যা কখনো রঙ হারায় না বা ফেটে যায় না।",
      "কাঠের মজবুত ব্যাক-ফ্রেম বা ক্যানভাস মাউন্ট করা।"
    ],
    price: 6800,
    originalPrice: 8500,
    category: "natural_canvas",
    categoryLabel: "ন্যাচারাল ক্যানভাস",
    images: [
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=600&q=80"
    ],
    specs: [
      { label: "পেইন্টিং মিডিয়া", value: "ক্যানভাসে অ্যাক্রিলিক ওয়েট-অন-ওয়েট অয়েল পেইন্ট" },
      { label: "ফ্রেম", value: "মেহগনি উড স্ট্রেন্থনার ইনার ফ্রেম" },
      { label: "সাইজ", value: "২৪ x ৩০ ইঞ্চি" },
    ],
    stock: 4,
    featured: false,
    rating: 5.0,
    reviewCount: 36,
  }
];

export const WHATSAPP_NUMBER = "8801XXXXXXXXX";
export const PHONE_NUMBER = "+8801XXXXXXXXX";

export function getWhatsAppLink(productName?: string) {
  const message = productName
    ? `হ্যালো, আমি ${productName} সম্পর্কে জানতে চাই।`
    : "হ্যালো, আমি Rangao থেকে একটি প্রোডাক্ট সম্পর্কে জানতে চাই।";
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
