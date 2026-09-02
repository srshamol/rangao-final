import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Helper: Normalize Bangladesh Phone Number
function normalizeBDPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let cleaned = String(phone).trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(bengaliDigits[i], i.toString());
  }
  cleaned = cleaned.replace(/\D/g, "");
  if (cleaned.startsWith("880") && cleaned.length === 13) cleaned = cleaned.substring(2);
  if (cleaned.startsWith("80") && cleaned.length === 12) cleaned = "0" + cleaned.substring(2);
  if (!cleaned.startsWith("0") && cleaned.length === 10) cleaned = "0" + cleaned;
  return cleaned;
}

// Helper: Hash OTP Code with phone salt
function hashOtp(phone: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone.trim()}:${code.trim()}`)
    .digest("hex");
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authoritative OTP verification.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, code } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ error: "Phone number and OTP code are required" });
  }

  const cleanPhone = normalizeBDPhone(phone);
  const cleanCode = String(code).trim();

  if (!cleanPhone || !cleanCode) {
    return res.status(400).json({ error: "Invalid phone or OTP code" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const nowStr = new Date().toISOString();

    // Query the latest active, unexpired, unverified OTP record for this phone
    const { data: records, error: queryError } = await supabase
      .from("otp_verifications")
      .select("id, code_hash, attempts, max_attempts, expires_at, verified")
      .eq("phone", cleanPhone)
      .eq("verified", false)
      .gt("expires_at", nowStr)
      .order("created_at", { ascending: false })
      .limit(1);

    if (queryError) {
      console.error("Database query failed:", queryError);
      return res.status(500).json({ error: "Failed to query verification records" });
    }

    if (!records || records.length === 0) {
      return res.status(400).json({ error: "ওটিপির মেয়াদ শেষ হয়ে গেছে বা কোনো সক্রিয় ওটিপি পাওয়া যায়নি। নতুন ওটিপি চেয়ে নিন।" });
    }

    const matchedRecord = records[0];
    const currentAttempts = matchedRecord.attempts || 0;
    const maxAttempts = matchedRecord.max_attempts || 3;

    // Check brute-force attempt limits
    if (currentAttempts >= maxAttempts) {
      return res.status(429).json({
        error: "আপনি একাধিকবার ভুল ওটিপি দিয়েছেন। সুরক্ষার স্বার্থে এই কোডটি বাতিল করা হয়েছে। নতুন ওটিপি চেয়ে নিন।",
        max_attempts_exceeded: true,
      });
    }

    const candidateHash = hashOtp(cleanPhone, cleanCode);
    const targetHash = matchedRecord.code_hash || "";

    // Constant-time comparison
    let isMatch = false;
    if (targetHash && candidateHash.length === targetHash.length) {
      try {
        isMatch = crypto.timingSafeEqual(
          Buffer.from(candidateHash, "utf8"),
          Buffer.from(targetHash, "utf8")
        );
      } catch {
        isMatch = candidateHash === targetHash;
      }
    }

    if (!isMatch) {
      const nextAttempts = currentAttempts + 1;
      await supabase
        .from("otp_verifications")
        .update({
          attempts: nextAttempts,
          updated_at: nowStr,
        })
        .eq("id", matchedRecord.id);

      const remainingAttempts = Math.max(0, maxAttempts - nextAttempts);
      if (remainingAttempts === 0) {
        return res.status(400).json({
          error: "ভুল ওটিপি কোড। সর্বোচ্চ চেষ্টা অতিক্রম করায় কোডটি বাতিল করা হয়েছে।",
          remaining_attempts: 0,
        });
      }

      return res.status(400).json({
        error: `ভুল ওটিপি কোড। আপনার আর ${remainingAttempts} বার চেষ্টা করার সুযোগ আছে।`,
        remaining_attempts: remainingAttempts,
      });
    }

    // Mark as verified for one-time use
    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({
        verified: true,
        updated_at: nowStr,
      })
      .eq("id", matchedRecord.id);

    if (updateError) {
      console.error("Failed to mark OTP as verified:", updateError);
      return res.status(500).json({ error: "Failed to complete verification" });
    }

    return res.status(200).json({
      status: "success",
      message: "ওটিপি সফলভাবে ভেরিফাই হয়েছে",
    });
  } catch (err: any) {
    console.error("verify-otp handler exception:", err);
    return res.status(500).json({ error: "ভেরিফিকেশন সম্পন্ন করতে সমস্যা হয়েছে।" });
  }
}
