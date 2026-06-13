import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials (URL/Key) are missing in environment variables.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: "Phone number and OTP code are required" });
  }

  const cleanPhone = phone.trim();
  const cleanCode = code.trim();

  try {
    const supabase = getSupabaseClient();

    // Query matching verification record
    const nowStr = new Date().toISOString();
    const { data: records, error: queryError } = await supabase
      .from("otp_verifications" as any)
      .select("id, code, expires_at, verified")
      .eq("phone", cleanPhone)
      .eq("code", cleanCode)
      .eq("verified", false)
      .gt("expires_at", nowStr)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Database query failed:", queryError);
      return res.status(500).json({ error: "Failed to query verification records" });
    }

    if (!records || records.length === 0) {
      return res.status(400).json({ error: "সঠিক ওটিপি কোড দিন অথবা কোডের মেয়াদ শেষ হয়ে গেছে।" });
    }

    const matchedRecord = records[0];

    // Mark as verified
    const { error: updateError } = await supabase
      .from("otp_verifications" as any)
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq("id", matchedRecord.id);

    if (updateError) {
      console.error("Failed to mark OTP as verified:", updateError);
      return res.status(500).json({ error: "Failed to complete verification" });
    }

    return res.status(200).json({ status: "success", message: "OTP verified successfully" });
  } catch (err: any) {
    console.error("verify-otp handler exception:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
