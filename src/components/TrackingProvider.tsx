import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { updateTrackingConfig, trackPageView } from "@/lib/tracking";

export default function TrackingProvider() {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const lastPathname = useRef("");

  // Sync settings when loaded or changed
  useEffect(() => {
    if (settings?.storeInfo?.tracking) {
      updateTrackingConfig(settings.storeInfo.tracking);
    }
  }, [settings]);

  // Track PageViews on route change
  useEffect(() => {
    if (location.pathname !== lastPathname.current) {
      lastPathname.current = location.pathname;
      trackPageView(location.pathname);
    }
  }, [location.pathname]);

  return null;
}
