
-- Seed hero_banner, contact_info, homepage_sections into store_settings
INSERT INTO public.store_settings (key, value) VALUES
('hero_banner', '{
  "title": "প্রিমিয়াম গ্যাজেট কালেকশন",
  "subtitle": "বাংলাদেশের সবচেয়ে বিশ্বস্ত গ্যাজেট স্টোর",
  "cta_text": "শপিং শুরু করুন",
  "cta_link": "#products",
  "banner_image_url": "",
  "banner_video_url": "",
  "badge_text": "✦ PREMIUM COLLECTION ✦",
  "enabled": true
}'::jsonb),
('contact_info', '{
  "phone": "+8801XXXXXXXXX",
  "whatsapp": "8801XXXXXXXXX",
  "email": "info@gadgetgram.com",
  "address": "ঢাকা, বাংলাদেশ",
  "facebook_url": "",
  "instagram_url": ""
}'::jsonb),
('homepage_sections', '{
  "show_categories": true,
  "show_featured": true,
  "show_flash_sale": true,
  "show_why_choose": true,
  "show_testimonials": true,
  "show_newsletter": true
}'::jsonb)
ON CONFLICT DO NOTHING;
