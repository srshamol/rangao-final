import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yglexjxvypwmvjvsspil.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

const NEW_TOKEN = "EAAfYwacNz5IBRs2ZAttdZCS71owXJVuuh6jqVA9okQyCAochqMDGOwoSWel2UaOkriSUFbATRXZBoxM8z7O8l2KjRX0frObZBVevIsRs4dAqTpWIS6TMrBa1JfdT8gWWbpgzMvfO3lNXZA0DZCerWu2GX3Bn8fB8WOo6dZAURSBeZBHVNb7ppSpPa1JMOohxHA0zUgZDZD";

async function main() {
  // Sign in as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "bdinfosky@gmail.com",
    password: "11223311",
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  console.log("Authenticated successfully as admin!");
  supabase.auth.setSession(authData.session);

  // 1. Fetch tracking_settings
  const { data: trackingRow, error: getTrackingError } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "tracking_settings")
    .single();

  if (getTrackingError) {
    console.error("Error fetching tracking_settings:", getTrackingError.message);
  }

  const currentTracking = trackingRow ? trackingRow.value : {};
  console.log("Current tracking settings:", currentTracking);

  // Update tracking_settings
  const nextTracking = {
    ...currentTracking,
    meta_access_token: NEW_TOKEN,
    meta_capi_enabled: true, // make sure CAPI is enabled
    meta_pixel_enabled: true // make sure Meta Pixel is enabled
  };

  const { error: saveTrackingError } = await supabase
    .from("store_settings")
    .upsert({
      key: "tracking_settings",
      value: nextTracking,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

  if (saveTrackingError) {
    console.error("Error saving tracking_settings:", saveTrackingError.message);
  } else {
    console.log("Successfully updated tracking_settings.");
  }

  // 2. Fetch facebook_pixel settings
  const { data: pixelRow, error: getPixelError } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "facebook_pixel")
    .single();

  const currentPixel = pixelRow ? pixelRow.value : {};
  const nextPixel = {
    ...currentPixel,
    access_token: NEW_TOKEN,
    enabled: true
  };

  const { error: savePixelError } = await supabase
    .from("store_settings")
    .upsert({
      key: "facebook_pixel",
      value: nextPixel,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

  if (savePixelError) {
    console.error("Error saving facebook_pixel:", savePixelError.message);
  } else {
    console.log("Successfully updated facebook_pixel settings.");
  }

  // 3. Update public_tracking_settings (exclude tokens)
  const { meta_access_token, tiktok_access_token, ...publicTracking } = nextTracking;
  const { error: savePublicError } = await supabase
    .from("store_settings")
    .upsert({
      key: "public_tracking_settings",
      value: publicTracking,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

  if (savePublicError) {
    console.error("Error saving public_tracking_settings:", savePublicError.message);
  } else {
    console.log("Successfully updated public_tracking_settings.");
  }

  // 4. Update store_info.tracking for immediate sync
  const { data: storeInfoRow } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "store_info")
    .single();

  if (storeInfoRow) {
    const nextStoreInfo = {
      ...storeInfoRow.value,
      tracking: publicTracking
    };
    const { error: saveStoreInfoError } = await supabase
      .from("store_settings")
      .upsert({
        key: "store_info",
        value: nextStoreInfo,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });

    if (saveStoreInfoError) {
      console.error("Error updating store_info:", saveStoreInfoError.message);
    } else {
      console.log("Successfully updated store_info tracking settings.");
    }
  }
}

main().catch(console.error);
