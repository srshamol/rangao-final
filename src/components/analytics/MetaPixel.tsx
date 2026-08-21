import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { initMetaPixel, trackPageView } from "@/lib/meta";
import { captureAttribution } from "@/lib/meta/attribution";

export default function MetaPixel() {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const initializedRef = useRef(false);
  const lastPathnameRef = useRef("");

  // 1. Capture initial attribution and init Meta Pixel when settings are loaded
  useEffect(() => {
    captureAttribution();

    const tracking = settings?.storeInfo?.tracking;
    const pixelId =
      tracking?.meta_pixel_id ||
      (typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_META_PIXEL_ID || process.env?.VITE_META_PIXEL_ID : "") ||
      "";

    const isEnabled = tracking?.global_enabled !== false && tracking?.meta_pixel_enabled !== false;

    if (isEnabled && pixelId && !initializedRef.current) {
      initializedRef.current = true;
      initMetaPixel(pixelId, { autoPageView: true });
      lastPathnameRef.current = location.pathname;
    }
  }, [settings]);

  // 2. Track PageView on SPA route changes (avoid duplicate during initial mount)
  useEffect(() => {
    if (!lastPathnameRef.current) {
      lastPathnameRef.current = location.pathname;
      return;
    }

    if (location.pathname !== lastPathnameRef.current) {
      lastPathnameRef.current = location.pathname;
      captureAttribution();
      trackPageView(window.location.href);
    }
  }, [location.pathname]);

  return null;
}
