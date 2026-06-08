import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials (URL/Key) are missing in environment variables.");
  }
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: any, res: any) {
  try {
    // Keep database hot with a lightweight query
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
      recordFetched: !!data,
    });
  } catch (err: any) {
    console.error("Keep-alive database ping failed:", err);
    return res.status(500).json({
      alive: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
