import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { updateTrackingConfig, trackPageView } from "@/lib/tracking";
import { initMetaPixel } from "@/lib/meta/pixel";
import { captureAttribution } from "@/lib/meta/attribution";

export default function TrackingProvider() {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const lastPathname = useRef("");

  // Sync settings and initialize tracking when loaded or changed
  useEffect(() => {
    captureAttribution();

    if (settings?.storeInfo?.tracking) {
      const tracking = settings.storeInfo.tracking;
      updateTrackingConfig(tracking);
    }
  }, [settings]);

  // Track PageViews on SPA route changes
  useEffect(() => {
    if (location.pathname !== lastPathname.current) {
      lastPathname.current = location.pathname;
      captureAttribution();
      trackPageView(location.pathname);
    }
  }, [location.pathname]);

  return null;
}
